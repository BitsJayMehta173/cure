"""
Spelling check for free-text clinical fields (SymSpell + context ranking).

It only *flags* words (the UI underlines them; the doctor clicks to fix). A word is left
alone when it is: being typed (touches the caret), shorter than 4 letters, protected
shorthand (BD, TDS, c/o, k/c/o …), an abbreviation (ECG, HTN) or contains digits (500mg,
1-0-1), capitalised mid-sentence (likely a name), a known medical/English word, a medicine or
generic name, or a word this doctor has used/added before.
"""
from symspellpy import SymSpell, Verbosity

from . import textproc as T


class Corrector:
    def __init__(self, word_counts, known_extra=()):
        """word_counts: {lowercase word: weighted count} — the correction dictionary."""
        self.counts = dict(word_counts)
        self.known = set(self.counts) | {w.lower() for w in known_extra}
        self._build_index()

    def _build_index(self):
        self.sym = SymSpell(max_dictionary_edit_distance=2, prefix_length=7)
        for w, c in self.counts.items():
            self.sym.create_dictionary_entry(w, max(1, int(c)))

    # The SymSpell delete-index is large; rebuild it on load instead of pickling it.
    def __getstate__(self):
        state = self.__dict__.copy()
        state.pop("sym", None)
        return state

    def __setstate__(self, state):
        self.__dict__.update(state)
        self._build_index()

    def is_known(self, word, personal_vocab=()):
        k = word.lower()
        return k in self.known or k in personal_vocab or k.replace("'s", "") in self.known

    def candidates(self, word, prev_key=None, context_model=None, k=3):
        w = word.lower()
        dist = 1 if len(w) <= 5 else 2
        res = self.sym.lookup(w, Verbosity.ALL, max_edit_distance=dist, include_unknown=False)
        if not res:
            return []
        ctx = context_model.next_scores([prev_key]) if (context_model and prev_key) else {}

        def rank(r):
            return (r.distance, -(r.count * (1.0 + 20.0 * ctx.get(r.term, 0.0))))

        best = sorted(res, key=rank)
        out = []
        for r in best:
            if r.count < 3 or r.term == w:
                continue
            out.append(T.match_case(r.term, word))
            if len(out) >= k:
                break
        return out

    def check(self, text, caret=None, personal_vocab=(), ignore=(), context_model=None):
        """→ [{start, end, word, suggestions}] for likely misspellings."""
        issues = []
        toks = T.tokenize(text)
        ignore = {w.lower() for w in ignore}
        prev_tok = None
        for idx, (tok, s, e) in enumerate(toks):
            at_sentence_start = prev_tok is None or prev_tok in T.SENTENCE_END or prev_tok == ":"
            prev_key = T.key(prev_tok) if prev_tok and T.is_word(prev_tok) else None
            prev_tok = tok
            if not T.is_word(tok) or len(tok) < 4:
                continue
            if caret is not None and s <= caret <= e:
                continue                      # still being typed
            if T.is_protected(tok) or T.looks_like_abbreviation(tok):
                continue
            if tok[0].isupper() and not at_sentence_start and not tok.isupper():
                continue                      # probably a name
            if tok.lower() in ignore or self.is_known(tok, personal_vocab):
                continue
            # hyphenated words: fine if every part is known
            if "-" in tok and all(self.is_known(p, personal_vocab) or len(p) < 4 for p in tok.split("-")):
                continue
            sugg = self.candidates(tok, prev_key, context_model)
            if sugg:
                issues.append({"start": s, "end": e, "word": tok, "suggestions": sugg})
        return issues
