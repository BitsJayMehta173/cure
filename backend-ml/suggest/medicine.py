"""
Medicine field: brand + generic search over the Indian medicine dataset.

Safety rules (medicine names are never silently changed):
  - suggestions only; nothing is auto-replaced
  - every suggestion carries its composition ("Paracetamol 650mg") so look-alike brands
    can't be confused
  - typo matches are marked fuzzy ("Did you mean …?")
"""
import bisect
import math
import re
from collections import defaultdict

from . import textproc as T
from . import vocab_lists as V

FORM_WORDS = {
    "tablet": "tablet", "tablets": "tablet", "capsule": "capsule", "capsules": "capsule", "syrup": "syrup",
    "suspension": "suspension", "drop": "drops", "drops": "drops", "injection": "injection", "cream": "cream",
    "ointment": "ointment", "gel": "gel", "lotion": "lotion", "inhaler": "inhaler", "respules": "respules",
    "sachet": "sachet", "powder": "powder", "solution": "solution", "spray": "spray", "soap": "soap",
    "shampoo": "shampoo", "rotacap": "capsule", "rotacaps": "capsule",
}
_STRENGTH_RE = re.compile(r"\(([^)]*)\)")
_NUM_UNIT_RE = re.compile(r"^\s*([\d.]+)\s*(mg|mcg|g|gm|iu|ml|%.*)?", re.I)


def normalize(s):
    s = s.lower().replace("&", " and ")
    s = re.sub(r"[^a-z0-9%/.+ ]+", " ", s)
    return re.sub(r"\s+", " ", s).strip()


def strip_form_prefix(q):
    """'Tab. Dolo 6' → 'dolo 6' (doctors often type the form first)."""
    parts = normalize(q).split(" ")
    while parts and parts[0].rstrip(".") in T.MEDICINE_FORM_PREFIXES:
        parts = parts[1:]
    return " ".join(parts)


def parse_composition(raw):
    """'Amoxycillin  (500mg) ' → ('Amoxycillin', '500mg')."""
    if not isinstance(raw, str) or not raw.strip():
        return None
    raw = raw.strip()
    m = _STRENGTH_RE.search(raw)
    strength = m.group(1).replace(" ", "") if m else ""
    generic = re.sub(r"\s+", " ", _STRENGTH_RE.sub("", raw)).strip()
    return (generic, strength) if generic else None


def detect_form(name, pack_label):
    for src in (name, pack_label):
        if isinstance(src, str):
            for w in reversed(src.lower().replace("-", " ").split()):
                if w in FORM_WORDS:
                    return FORM_WORDS[w]
    return "tablet"


class MedicineIndex:
    def __init__(self):
        self.names = []           # display names
        self.forms = []
        self.comps = []           # tuple((generic, strength), ...)
        self.discontinued = []
        self.base_score = []
        self.sorted_keys = []     # normalized names, sorted
        self.sorted_idx = []
        self.prefix_top = {}      # 1..2 char prefix -> top entry indices
        self.generics = {}        # normalized generic -> (display, n_brands)
        self.generic_keys = []    # sorted normalized generics
        self.fuzzy_words = {}     # normalized first-token -> count  (for SymSpell)
        self._symspell = None

    # ─── build ────────────────────────────────────────────────────────────
    @classmethod
    def build(cls, df):
        m = cls()
        family = defaultdict(int)
        for name in df["name"]:
            family[normalize(name).split(" ")[0]] += 1
        common = [normalize(b) for b in V.COMMON_BRANDS]
        gen_count = defaultdict(int)
        gen_display = {}
        for row in df.itertuples(index=False):
            name = str(row.name).strip()
            comps = tuple(c for c in (parse_composition(row.short_composition1),
                                      parse_composition(row.short_composition2)) if c)
            nk = normalize(name)
            disc = str(row.Is_discontinued).strip().lower() == "true"
            score = math.log1p(family[nk.split(" ")[0]])
            for rank, b in enumerate(common):
                if nk.startswith(b):
                    score += 12.0 - rank * 0.01     # common OPD brands first, in list order
                    break
            if disc:
                score -= 20.0
            score -= len(name) * 0.02
            m.names.append(name)
            m.forms.append(detect_form(name, row.pack_size_label))
            m.comps.append(comps)
            m.discontinued.append(disc)
            m.base_score.append(round(score, 3))
            for g, _ in comps:
                gk = normalize(g)
                gen_count[gk] += 1
                gen_display.setdefault(gk, g)
        pairs = sorted((normalize(n), i) for i, n in enumerate(m.names))
        m.sorted_keys = [p[0] for p in pairs]
        m.sorted_idx = [p[1] for p in pairs]
        tops = defaultdict(list)
        for i in sorted(range(len(m.names)), key=lambda i: -m.base_score[i]):
            nk = normalize(m.names[i])
            for L in (1, 2):
                if len(nk) >= L and len(tops[nk[:L]]) < 60:
                    tops[nk[:L]].append(i)
        m.prefix_top = {p: tuple(v) for p, v in tops.items()}
        m.generics = {gk: (gen_display[gk], gen_count[gk]) for gk in gen_display}
        m.generic_keys = sorted(m.generics)
        for fam, cnt in family.items():
            if len(fam) >= 4 and fam.isalpha():
                m.fuzzy_words[fam] = cnt
        for gk, (_, cnt) in m.generics.items():
            w = gk.split(" ")[0]
            if len(w) >= 4 and w.isalpha():
                m.fuzzy_words[w] = m.fuzzy_words.get(w, 0) + cnt
        return m

    # ─── lookup helpers ───────────────────────────────────────────────────
    def composition_text(self, i):
        return " + ".join(f"{g} {s}".strip() for g, s in self.comps[i])

    def find(self, name):
        """Exact (normalized) name → entry index, else best prefix match, else None."""
        nk = strip_form_prefix(name)
        if not nk:
            return None
        pos = bisect.bisect_left(self.sorted_keys, nk)
        if pos < len(self.sorted_keys) and self.sorted_keys[pos] == nk:
            return self.sorted_idx[pos]
        hits = self._prefix_indices(nk, 400)
        return max(hits, key=lambda i: self.base_score[i]) if hits else None

    def _prefix_indices(self, nk, cap=3000):
        if len(nk) <= 2:
            return list(self.prefix_top.get(nk, ()))
        lo = bisect.bisect_left(self.sorted_keys, nk)
        hi = bisect.bisect_left(self.sorted_keys, nk + "￿")
        return self.sorted_idx[lo:min(hi, lo + cap)]

    def _fuzzy_first_word(self, word):
        if self._symspell is None:
            from symspellpy import SymSpell
            sp = SymSpell(max_dictionary_edit_distance=2, prefix_length=6)
            for w, c in self.fuzzy_words.items():
                sp.create_dictionary_entry(w, c)
            self._symspell = sp
        from symspellpy import Verbosity
        res = self._symspell.lookup(word, Verbosity.CLOSEST, max_edit_distance=2 if len(word) > 5 else 1)
        return [r.term for r in res[:3]]

    # ─── search ───────────────────────────────────────────────────────────
    def search(self, query, k=8, personal=None):
        """
        personal: Counter of normalized medicine names this doctor has prescribed.
        Returns [{text, detail, form, kind, fuzzy, discontinued}].
        """
        personal = personal or {}
        q = strip_form_prefix(query)
        scored = {}

        def add(i, bonus=0.0, fuzzy=False):
            nk = normalize(self.names[i])
            s = self.base_score[i] + bonus + 10.0 * math.log1p(personal.get(nk, 0))
            if nk == q:
                s += 5.0
            prev = scored.get(i)
            if prev is None or s > prev[0]:
                scored[i] = (s, fuzzy)

        if not q:
            for nk, _ in sorted(personal.items(), key=lambda kv: -kv[1])[:k]:
                i = self.find(nk)
                if i is not None:
                    add(i)
            if len(scored) < k:
                for b in V.COMMON_BRANDS[:k * 2]:
                    i = self.find(b)
                    if i is not None:
                        add(i)
        else:
            for i in self._prefix_indices(q):
                add(i)
            # doctor's own medicines matching anywhere in the name
            for nk in personal:
                if q in nk:
                    i = self.find(nk)
                    if i is not None:
                        add(i, bonus=2.0)

        items = [self._item(i, fuzzy) for i, (s, fuzzy) in
                 sorted(scored.items(), key=lambda kv: -kv[1][0])[:k]]

        # generic names ("amoxy" → Amoxycillin)
        if q and len(q) >= 3:
            lo = bisect.bisect_left(self.generic_keys, q)
            hi = bisect.bisect_left(self.generic_keys, q + "￿")
            gens = sorted(self.generic_keys[lo:hi], key=lambda g: -self.generics[g][1])[:2]
            for g in reversed(gens):
                disp, n = self.generics[g]
                items.insert(min(1, len(items)), {"text": disp, "detail": f"Generic · {n:,} brands", "form": "",
                                                  "kind": "generic", "fuzzy": False, "discontinued": False})
            items = items[:k]

        # typo fallback — "augmentn" → Augmentin …
        if not items and q:
            first, _, rest = q.partition(" ")
            if len(first) >= 4:
                for corrected in self._fuzzy_first_word(first):
                    cq = (corrected + " " + rest).strip()
                    for i in self._prefix_indices(cq, 400):
                        add(i, fuzzy=True)
                    lo = bisect.bisect_left(self.generic_keys, corrected)
                    if lo < len(self.generic_keys) and self.generic_keys[lo].startswith(corrected):
                        g = self.generic_keys[lo]
                        disp, n = self.generics[g]
                        items.append({"text": disp, "detail": f"Generic · {n:,} brands", "form": "",
                                      "kind": "generic", "fuzzy": True, "discontinued": False})
                items += [self._item(i, True) for i, (s, f) in
                          sorted(scored.items(), key=lambda kv: -kv[1][0])[:k - len(items)]]
        return items[:k]

    def _item(self, i, fuzzy):
        return {"text": self.names[i], "detail": self.composition_text(i), "form": self.forms[i],
                "kind": "brand", "fuzzy": bool(fuzzy), "discontinued": self.discontinued[i]}

    # ─── dose suggestions ────────────────────────────────────────────────
    def dose_suggestions(self, medicine_name):
        """Dosage options derived from composition strength + form ('650mg', '1 tab', '5 ml')."""
        i = self.find(medicine_name) if medicine_name else None
        if i is None:
            # unknown/free-typed medicine: still use the form word in the name ("… Syrup" → 5 ml)
            if not medicine_name:
                return [], None
            form = detect_form(medicine_name, None)
            return list(V.GENERIC_DOSES.get(form, [])), form
        form = self.forms[i]
        out = []
        strengths = [s for _, s in self.comps[i] if s]
        if len(strengths) == 1 and form in ("tablet", "capsule", "injection"):
            out.append(strengths[0])
        elif len(strengths) >= 2 and form in ("tablet", "capsule"):
            parsed = [_NUM_UNIT_RE.match(s) for s in strengths]
            if all(p and p.group(2) and p.group(2).lower() == "mg" for p in parsed):
                total = sum(float(p.group(1)) for p in parsed)
                out.append(f"{total:g}mg")
        out += V.GENERIC_DOSES.get(form, ["1 tab"])
        seen, uniq = set(), []
        for d in out:
            if d.lower() not in seen:
                seen.add(d.lower())
                uniq.append(d)
        return uniq, form

    def __getstate__(self):
        state = self.__dict__.copy()
        state["_symspell"] = None
        return state
