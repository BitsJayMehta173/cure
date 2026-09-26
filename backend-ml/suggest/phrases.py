"""Whole-field phrase suggestions for short structured fields (title, frequency, duration, instructions)."""
import math


class PhraseField:
    def __init__(self, phrases):
        """phrases: [(text, label)] in default rank order (most common first)."""
        seen, self.items = set(), []
        for text, label in phrases:
            k = text.lower().strip()
            if k and k not in seen:
                seen.add(k)
                self.items.append((text.strip(), label or ""))

    def search(self, query, k=8, personal=None, boosted=None, display=None):
        """
        personal: Counter {lower phrase: uses} for this doctor (any context)
        boosted:  Counter {lower phrase: uses} for this doctor in the current context
                  (e.g. frequencies they use with the selected medicine)
        display:  {lower phrase: the doctor's own casing}
        """
        q = query.lower().strip()
        personal = personal or {}
        boosted = boosted or {}
        display = display or {}
        n = len(self.items)
        scored = {}

        def consider(text, label, base):
            key = text.lower()
            s = base + 6.0 * math.log1p(personal.get(key, 0)) + 12.0 * math.log1p(boosted.get(key, 0))
            if key not in scored or s > scored[key][0]:
                scored[key] = (s, text, label)

        for rank, (text, label) in enumerate(self.items):
            t = text.lower()
            base = 1.0 - rank / (n + 1)
            if not q:
                consider(text, label, base)
            elif t.startswith(q):
                consider(text, label, base + 3.0)
            elif any(w.startswith(q) for w in t.replace("(", " ").replace("/", " ").split()):
                consider(text, label, base + 1.0)
        # the doctor's own phrases even if not in the curated list
        for key, uses in list(personal.items()) + list(boosted.items()):
            if key not in scored and (not q or key.startswith(q)):
                consider(display.get(key, key), "", 2.0)
        ranked = sorted(scored.values(), key=lambda t: -t[0])[:k]
        return [{"text": text, "detail": label, "kind": "phrase"} for _, text, label in ranked]
