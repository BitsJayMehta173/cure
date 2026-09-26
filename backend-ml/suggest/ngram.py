"""
Word n-gram language models for next-word suggestion and word completion.

NgramModel  — frozen, pruned global model trained offline (compact, id-based, pickled).
LiveNgram   — small incremental model per doctor, updated whenever they save text.

Both expose the same scoring interface keyed by lowercase word, so the engine can blend a
doctor's personal model with the global one:
    next_scores(context_keys) -> {key: score}          (stupid-backoff probabilities)
    prefix_scores(prefix)     -> {key: unigram score}  (fallback completion candidates)
    surface(key)              -> preferred display form ("ECG", "paracetamol", "Tab.")
"""
import bisect
import math
from collections import Counter, defaultdict

from . import textproc as T

ORDER = 4                  # up to 3 words of context
BACKOFF = 0.4              # stupid-backoff penalty per order dropped
BOS = "<s>"


def _sentence_keys(sentence_tokens):
    return [BOS, BOS, BOS] + [T.key(t) for t in sentence_tokens]


class NgramModel:
    def __init__(self):
        self.keys = []             # id -> key
        self.index = {}            # key -> id
        self.surfaces = []         # id -> display form
        self.counts = []           # id -> weighted unigram count
        self.total = 1.0
        self.ctx = {}              # tuple(ids) -> (total, ((id, count), ...))   context length 1..3
        self.prefix_top = {}       # 1..3-char prefix -> (ids ...) by count
        self.sorted_keys = []      # for bisect on longer prefixes
        self.sorted_ids = []

    # ─── training ──────────────────────────────────────────────────────────
    @classmethod
    def train(cls, weighted_sentences, min_count=2.0, min_ctx_count=2.0, top_k=12):
        """weighted_sentences: iterable of (tokens, weight)."""
        uni = Counter()
        casing = defaultdict(Counter)
        grams = defaultdict(Counter)          # context tuple(keys) -> Counter(next key)
        sents = list(weighted_sentences)
        for toks, w in sents:
            for i, t in enumerate(toks):
                k = T.key(t)
                uni[k] += w
                if i > 0:                      # sentence-initial capitals don't decide casing
                    casing[k][t] += w
                else:
                    casing[k][t] += w * 0.01
        vocab = {k for k, c in uni.items() if c >= min_count}
        vocab.add(BOS)
        for toks, w in sents:
            seq = _sentence_keys(toks)
            for i in range(3, len(seq)):
                nxt = seq[i]
                if nxt not in vocab:
                    continue
                for L in (1, 2, 3):
                    c = tuple(seq[i - L:i])
                    if all(x in vocab for x in c):
                        grams[c][nxt] += w

        m = cls()
        ordered = sorted(vocab - {BOS}, key=lambda k: -uni[k])
        m.keys = [BOS] + ordered
        m.index = {k: i for i, k in enumerate(m.keys)}
        m.surfaces = [BOS] + [casing[k].most_common(1)[0][0] if casing[k] else k for k in ordered]
        m.counts = [0.0] + [float(uni[k]) for k in ordered]
        m.total = float(sum(m.counts)) or 1.0
        for c, nexts in grams.items():
            tot = sum(nexts.values())
            if tot < min_ctx_count:
                continue
            best = tuple((m.index[k], float(v)) for k, v in nexts.most_common(top_k))
            m.ctx[tuple(m.index[x] for x in c)] = (float(tot), best)
        m._build_prefix_index()
        return m

    def _build_prefix_index(self):
        tops = defaultdict(list)
        for i, k in enumerate(self.keys):
            if i == 0 or k in T.PUNCT:
                continue
            for L in (1, 2, 3):
                if len(k) >= L and len(tops[k[:L]]) < 40:
                    tops[k[:L]].append(i)     # ids are already in descending count order
        self.prefix_top = {p: tuple(ids) for p, ids in tops.items()}
        pairs = sorted((k, i) for i, k in enumerate(self.keys) if i and k not in T.PUNCT)
        self.sorted_keys = [p[0] for p in pairs]
        self.sorted_ids = [p[1] for p in pairs]

    # ─── scoring ──────────────────────────────────────────────────────────
    def _ids(self, context_keys):
        return [self.index.get(k, -1) for k in context_keys]

    def next_scores(self, context_keys):
        ids = self._ids(context_keys)
        scores = {}
        alpha = 1.0
        for L in (3, 2, 1):
            if len(ids) >= L:
                entry = self.ctx.get(tuple(ids[-L:]))
                if entry:
                    tot, conts = entry
                    for wid, cnt in conts:
                        k = self.keys[wid]
                        s = alpha * cnt / tot
                        if s > scores.get(k, 0.0):
                            scores[k] = s
            alpha *= BACKOFF
        return scores

    def prefix_scores(self, prefix, limit=40):
        prefix = prefix.lower()
        if not prefix:
            return {}
        if len(prefix) <= 3:
            ids = self.prefix_top.get(prefix, ())
        else:
            lo = bisect.bisect_left(self.sorted_keys, prefix)
            hi = bisect.bisect_left(self.sorted_keys, prefix + "￿")
            ids = sorted(self.sorted_ids[lo:min(hi, lo + 3000)], key=lambda i: -self.counts[i])[:limit]
        scale = BACKOFF ** 3
        return {self.keys[i]: scale * self.counts[i] / self.total for i in ids}

    def count(self, key):
        i = self.index.get(key)
        return self.counts[i] if i is not None else 0.0

    def surface(self, key):
        i = self.index.get(key)
        return self.surfaces[i] if i is not None else key

    def known(self, key):
        return key in self.index


class LiveNgram:
    """Tiny incremental model for one doctor (no pruning; texts are short)."""

    def __init__(self):
        self.uni = Counter()
        self.grams = defaultdict(Counter)
        self.casing = defaultdict(Counter)
        self.total = 0.0

    def add_text(self, text, weight=1.0):
        for sent in T.split_sentences(T.tokens(text)):
            seq = _sentence_keys(sent)
            for i, t in enumerate(sent):
                k = T.key(t)
                self.uni[k] += weight
                self.casing[k][t] += weight
                self.total += weight
            for i in range(3, len(seq)):
                for L in (1, 2, 3):
                    self.grams[tuple(seq[i - L:i])][seq[i]] += weight

    # One-word contexts are weak evidence in a tiny corpus: a single "after food" shouldn't make
    # "food" follow every "after". Require repetition before they count.
    MIN_BIGRAM_COUNT = 2.0

    def next_scores(self, context_keys):
        scores = {}
        alpha = 1.0
        for L in (3, 2, 1):
            if len(context_keys) >= L:
                nexts = self.grams.get(tuple(context_keys[-L:]))
                if nexts:
                    tot = sum(nexts.values())
                    for k, cnt in nexts.items():
                        if L == 1 and cnt < self.MIN_BIGRAM_COUNT:
                            continue
                        s = alpha * cnt / tot
                        if s > scores.get(k, 0.0):
                            scores[k] = s
            alpha *= BACKOFF
        return scores

    def prefix_scores(self, prefix, limit=20):
        prefix = prefix.lower()
        if not prefix or not self.total:
            return {}
        hits = [(k, c) for k, c in self.uni.items() if k.startswith(prefix) and k not in T.PUNCT]
        hits.sort(key=lambda kc: -kc[1])
        return {k: (BACKOFF ** 2) * c / self.total for k, c in hits[:limit]}

    def surface(self, key):
        c = self.casing.get(key)
        return c.most_common(1)[0][0] if c else None

    def known(self, key):
        return key in self.uni


def entropy_margin(sorted_scores):
    """How clearly the best candidate beats the runner-up (1.0 = unrivalled)."""
    if not sorted_scores:
        return 0.0
    if len(sorted_scores) == 1:
        return 1.0
    a, b = sorted_scores[0], sorted_scores[1]
    return 1.0 - (b / a if a else 1.0)


def log_score(x):
    return math.log(x) if x > 0 else -99.0
