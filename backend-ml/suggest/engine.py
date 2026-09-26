"""
SuggestEngine — the per-field brain behind /api/suggest.

Fields (sent by the frontend):
  free text  : report_body, advice                → n-gram next word / word completion / ghost text
  phrase     : report_title, frequency, duration,
               instructions, dosage                → whole-field phrase suggestions
  medicine   : medicine                            → brand/generic search (never auto-replaced)
Spelling checks run on report_body, advice, report_title and instructions.
"""
import gc
import gzip
import os
import pickle
import re
import time

from . import textproc as T
from .ngram import BOS
from .personal import PersonalStore
from .phrases import PhraseField
from . import vocab_lists as V

FREE_FIELDS = {"report_body": "report", "advice": "advice"}
PHRASE_FIELDS = {"report_title", "frequency", "duration", "instructions", "dosage"}
CHECK_FIELDS = {"report_body": "report", "advice": "advice", "report_title": "report", "instructions": "advice"}
ALL_FIELDS = set(FREE_FIELDS) | PHRASE_FIELDS | {"medicine"}

PERSONAL_WEIGHT = 1.5          # doctor's own model vs global model
NEXT_WORD_PICKS = 3            # pick-list size when the next word is likely but not certain
NEXT_WORD_MIN_SCORE = 0.05     # each pick must be at least this likely …
NEXT_WORD_MIN_MASS = 0.18      # … and together they must cover this much probability (not a flat guess)
_PARTIAL_RE = re.compile(r"([A-Za-z][A-Za-z0-9'\-/]*)$")     # T2 → T2DM, Hb → HbA1c
_STRENGTH_RE = re.compile(r"^[\d.]+\s*(mg|mcg|g|gm|iu|%)\b", re.I)


def load_pickle(path):
    with gzip.open(path, "rb") as f:
        return pickle.load(f)


def context_keys(before_text):
    """Last 3 lowercase tokens of the current sentence (BOS-padded)."""
    toks = T.tokens(before_text)
    sent = []
    for t in toks:
        if t in T.SENTENCE_END:
            sent = []
        else:
            sent.append(t)
    keys = [BOS, BOS, BOS] + [T.key(t) for t in sent]
    return keys[-3:]


class SuggestEngine:
    def __init__(self, models_dir, personal_path, models=None):
        """Loads models from models_dir, or uses an in-memory `models` dict (evaluation)."""
        t0 = time.time()
        if models is None:
            models = {
                "report": load_pickle(os.path.join(models_dir, "text_report.pkl.gz")),
                "advice": load_pickle(os.path.join(models_dir, "text_advice.pkl.gz")),
                "corrector": load_pickle(os.path.join(models_dir, "corrector.pkl.gz")),
                "medicine": load_pickle(os.path.join(models_dir, "medicine.pkl.gz")),
                "phrases": load_pickle(os.path.join(models_dir, "phrases.pkl.gz")),
            }
        self.text = {"report": models["report"], "advice": models["advice"]}
        self.corrector = models["corrector"]
        self.medicine = models["medicine"]
        self.phrases = models["phrases"]
        self.personal = PersonalStore(personal_path)
        gc.collect()               # drop unpickling temporaries before serving
        self.load_seconds = round(time.time() - t0, 2)

    # ─── public API ──────────────────────────────────────────────────────
    def complete(self, field, text, doctor_id=None, context=None, k=6):
        """→ {ghost, items, replaceLength}. `text` is everything before the caret."""
        context = context or {}
        profile = self.personal.profile(doctor_id)
        if field in FREE_FIELDS:
            return self._complete_free(FREE_FIELDS[field], text, profile, k)
        if field == "medicine":
            items = self.medicine.search(text, k=k, personal=profile.medicines if profile else None)
            return {"ghost": self._whole_ghost(text, items), "items": items, "replaceLength": len(text)}
        if field in PHRASE_FIELDS:
            items = self._phrase_items(field, text, profile, context.get("medicine"), k)
            return {"ghost": self._whole_ghost(text, items), "items": items, "replaceLength": len(text)}
        return {"ghost": None, "items": [], "replaceLength": 0}

    def check(self, field, text, doctor_id=None, caret=None, ignore=()):
        group = CHECK_FIELDS.get(field)
        if not group or not text.strip():
            return []
        profile = self.personal.profile(doctor_id)
        return self.corrector.check(text, caret=caret, personal_vocab=profile.vocab if profile else (),
                                    ignore=ignore, context_model=self.text[group])

    def learn(self, field, text, doctor_id, context=None):
        if field in ALL_FIELDS:
            self.personal.learn(doctor_id, field, text, (context or {}).get("medicine"))

    def add_word(self, doctor_id, word):
        self.personal.add_word(doctor_id, word)

    def stats(self):
        return {
            "loadSeconds": self.load_seconds,
            "reportVocab": len(self.text["report"].keys),
            "reportContexts": len(self.text["report"].ctx),
            "adviceVocab": len(self.text["advice"].keys),
            "spellingDictionary": len(self.corrector.counts),
            "medicines": len(self.medicine.names),
            "generics": len(self.medicine.generics),
        }

    # ─── free text ───────────────────────────────────────────────────────
    def _merged_next(self, group, ctx, profile):
        scores = self.text[group].next_scores(ctx)
        if profile:
            for k, v in profile.text[group].next_scores(ctx).items():
                scores[k] = scores.get(k, 0.0) + PERSONAL_WEIGHT * v
        scores.pop(BOS, None)
        return scores

    def _surface(self, group, key, profile):
        if profile:
            s = profile.text[group].surface(key)
            if s:
                return s
        return self.text[group].surface(key)

    def _greedy(self, group, ctx, profile, max_words=4, first_threshold=0.30):
        """Confident continuation: keep adding the next word while the model is sure of it."""
        words, ctx = [], list(ctx)
        for step in range(max_words):
            sc = {k: v for k, v in self._merged_next(group, ctx, profile).items() if k not in T.PUNCT}
            if not sc:
                break
            ranked = sorted(sc.items(), key=lambda kv: -kv[1])
            top, s1 = ranked[0]
            s2 = ranked[1][1] if len(ranked) > 1 else 0.0
            threshold = first_threshold if step == 0 else 0.45
            if s1 < threshold or (s2 and s1 < 1.6 * s2 and s1 < 0.6):
                break
            words.append(top)
            ctx = (ctx + [top])[-3:]
        return words

    def _complete_free(self, group, text, profile, k):
        tail = text[-400:]
        m = _PARTIAL_RE.search(tail)
        partial = ""
        if m and (m.start() == 0 or not tail[m.start() - 1].isalnum()):
            partial = m.group(1)
        before = tail[:len(tail) - len(partial)]
        ctx = context_keys(before)
        sentence_start = ctx[-1] == BOS

        if partial:
            p = partial.lower()
            all_scores = self._merged_next(group, ctx, profile)
            ctx_scores = {kk: v for kk, v in all_scores.items()
                          if kk.startswith(p) and kk != p and kk not in T.PUNCT}
            fallback = dict(self.text[group].prefix_scores(p))
            if profile:
                for kk, v in profile.text[group].prefix_scores(p).items():
                    fallback[kk] = fallback.get(kk, 0.0) + PERSONAL_WEIGHT * v
            for kk, v in fallback.items():
                if kk != p and kk not in ctx_scores:
                    ctx_scores[kk] = v
            ranked = sorted(ctx_scores.items(), key=lambda kv: -kv[1])[:k]
            items = []
            for kk, _ in ranked:
                surf = T.match_case(self._surface(group, kk, profile), partial)
                if surf.lower().startswith(p):
                    items.append({"text": surf, "kind": "word"})
            ghost = None
            s1 = ranked[0][1] if ranked else 0.0
            s2 = ranked[1][1] if len(ranked) > 1 else 0.0
            # Is what they typed already a whole word the model expects here? ("Avoid oily")
            model = self.text[group]
            own = max(all_scores.get(p, 0.0), (0.4 ** 3) * model.count(p) / model.total)
            is_word = model.known(p) or (profile is not None and profile.text[group].known(p))
            if is_word and own >= s1:
                more = self._greedy(group, (ctx + [p])[-3:], profile, max_words=3)
                if more:
                    ghost = "".join(" " + self._surface(group, w, profile) for w in more)
            elif ranked and items:
                confident = (len(p) >= 2 and (s2 == 0 or s1 >= 2.0 * s2)) or (len(p) >= 4 and s1 >= 1.3 * s2)
                if confident:
                    rest = items[0]["text"][len(partial):]
                    more = self._greedy(group, (ctx + [ranked[0][0]])[-3:], profile, max_words=3,
                                        first_threshold=0.45)
                    ghost = rest + "".join(" " + self._surface(group, w, profile) for w in more)
            return {"ghost": ghost or None, "items": items if len(items) > 1 else [],
                    "replaceLength": len(partial), "prefix": ""}

        # no partial word → confident ghost, else a short pick-list of likely next words
        needs_space = bool(tail) and not tail[-1].isspace()
        words = self._greedy(group, ctx, profile)
        if words:
            surfaces = [self._surface(group, w, profile) for w in words]
            if sentence_start and surfaces[0][:1].islower():
                surfaces[0] = surfaces[0][0].upper() + surfaces[0][1:]
            ghost = (" " if needs_space else "") + " ".join(surfaces)
            return {"ghost": ghost, "items": [], "replaceLength": 0, "prefix": ""}
        picks = [(kk, v) for kk, v in sorted(self._merged_next(group, ctx, profile).items(), key=lambda kv: -kv[1])
                 if kk not in T.PUNCT and v >= NEXT_WORD_MIN_SCORE][:NEXT_WORD_PICKS]
        if sum(v for _, v in picks) < NEXT_WORD_MIN_MASS:
            picks = []
        items = []
        for kk, _ in picks:
            surf = self._surface(group, kk, profile)
            if sentence_start and surf[:1].islower():
                surf = surf[0].upper() + surf[1:]
            # complete short phrases: "3" → "3 days", "1" → "1 week"
            more = self._greedy(group, (ctx + [kk])[-3:], profile, max_words=2, first_threshold=0.45)
            text = surf + "".join(" " + self._surface(group, w, profile) for w in more)
            if all(it["text"] != text for it in items):
                items.append({"text": text, "kind": "next"})
        return {"ghost": None, "items": items if len(items) >= 2 else [], "replaceLength": 0,
                "prefix": " " if needs_space else ""}

    # ─── whole-field phrases ─────────────────────────────────────────────
    def _phrase_items(self, field, text, profile, medicine, k):
        personal = profile.phrases.get(field) if profile else None
        boosted = None
        display = profile.display if profile else None
        if profile and medicine:
            from .medicine import normalize as med_norm
            boosted = profile.phrases_by_med.get((field, med_norm(medicine)))
        if field == "dosage":
            doses, form = self.medicine.dose_suggestions(medicine) if medicine else ([], None)
            labelled = [(d, "strength" if _STRENGTH_RE.match(d) else (f"for {form}" if form else ""))
                        for d in doses]
            # extra options: only the selected medicine's form when known (no "1 cap" for a tablet)
            pool = V.GENERIC_DOSES.get(form) if form else None
            generic = [(d, "") for d in pool] if pool else [(d, "") for lst in V.GENERIC_DOSES.values() for d in lst]
            pf = PhraseField(labelled + generic)
            return pf.search(text, k=k, personal=personal, boosted=boosted, display=display)
        return self.phrases[field].search(text, k=k, personal=personal, boosted=boosted, display=display)

    @staticmethod
    def _whole_ghost(text, items):
        typed = text.strip()
        if not typed or not items or items[0].get("fuzzy"):
            return None
        top = items[0]["text"]
        if top.lower().startswith(text.lower()) and len(top) > len(text):
            return top[len(text):]
        return None
