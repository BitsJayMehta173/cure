"""
Per-doctor personalisation. Every time a doctor saves a report / prescription / advice the
frontend posts it to /api/suggest/learn; we persist it in SQLite and keep a live model per
doctor in memory, so their own phrases, medicines and usual doses rank first.

Scope: a doctor's personal model only ever influences that doctor's own suggestions.
"""
import os
import sqlite3
import threading
from collections import Counter, defaultdict
from contextlib import contextmanager

from . import textproc as T
from .medicine import normalize as med_norm
from .ngram import LiveNgram

# Free-text fields feed the doctor's n-gram models; short structured fields (incl. instructions)
# are learned as whole phrases instead, so "After food" never leaks into advice sentences.
TEXT_GROUPS = {"report_body": "report", "advice": "advice"}
PHRASE_FIELDS = {"report_title", "dosage", "frequency", "duration", "instructions"}


class DoctorProfile:
    def __init__(self):
        self.text = {"report": LiveNgram(), "advice": LiveNgram()}
        self.phrases = defaultdict(Counter)            # field -> Counter(lower phrase)
        self.phrases_by_med = defaultdict(Counter)     # (field, medicine) -> Counter(lower phrase)
        self.display = {}                              # lower phrase -> doctor's casing
        self.medicines = Counter()                     # normalized medicine name -> uses
        self.vocab = set()                             # every word they've written or added

    def add(self, field, text, context_medicine=None):
        text = (text or "").strip()
        if not text:
            return
        for tok in T.tokens(text):
            if T.is_word(tok):
                self.vocab.add(tok.lower())
        if field in TEXT_GROUPS:
            self.text[TEXT_GROUPS[field]].add_text(text)
        if field == "medicine":
            self.medicines[med_norm(text)] += 1
        if field in PHRASE_FIELDS:
            k = text.lower()
            self.phrases[field][k] += 1
            self.display[k] = text
            if context_medicine:
                self.phrases_by_med[(field, med_norm(context_medicine))][k] += 1


class PersonalStore:
    def __init__(self, path):
        self.path = path
        os.makedirs(os.path.dirname(path), exist_ok=True)
        self._lock = threading.Lock()
        self._profiles = {}
        with self._conn() as c:
            c.execute("CREATE TABLE IF NOT EXISTS events (id INTEGER PRIMARY KEY AUTOINCREMENT, doctor_id INTEGER, "
                      "field TEXT, text TEXT, context_medicine TEXT, created_at TEXT DEFAULT CURRENT_TIMESTAMP)")
            c.execute("CREATE INDEX IF NOT EXISTS idx_events_doctor ON events (doctor_id)")
            c.execute("CREATE TABLE IF NOT EXISTS words (doctor_id INTEGER, word TEXT, PRIMARY KEY (doctor_id, word))")

    @contextmanager
    def _conn(self):
        """Commit on success and always close (sqlite3's own context manager never closes)."""
        c = sqlite3.connect(self.path, timeout=5)
        try:
            with c:
                yield c
        finally:
            c.close()

    def profile(self, doctor_id):
        if doctor_id is None:
            return None
        with self._lock:
            p = self._profiles.get(doctor_id)
            if p is None:
                p = DoctorProfile()
                with self._conn() as c:
                    for field, text, med in c.execute(
                            "SELECT field, text, context_medicine FROM events WHERE doctor_id = ? ORDER BY id",
                            (doctor_id,)):
                        p.add(field, text, med)
                    for (w,) in c.execute("SELECT word FROM words WHERE doctor_id = ?", (doctor_id,)):
                        p.vocab.add(w)
                self._profiles[doctor_id] = p
            return p

    def learn(self, doctor_id, field, text, context_medicine=None):
        text = (text or "").strip()
        if doctor_id is None or not text or len(text) > 5000:
            return
        p = self.profile(doctor_id)
        with self._lock:
            with self._conn() as c:
                c.execute("INSERT INTO events (doctor_id, field, text, context_medicine) VALUES (?, ?, ?, ?)",
                          (doctor_id, field, text, context_medicine))
            p.add(field, text, context_medicine)

    def add_word(self, doctor_id, word):
        word = (word or "").strip().lower()
        if doctor_id is None or not word:
            return
        p = self.profile(doctor_id)
        with self._lock:
            with self._conn() as c:
                c.execute("INSERT OR IGNORE INTO words (doctor_id, word) VALUES (?, ?)", (doctor_id, word))
            p.vocab.add(word)
