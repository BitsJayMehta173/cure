"""
Build the suggestion models.

    cd backend-ml && python -m suggest.build

Inputs  (suggest/data/raw/, gitignored — see suggest/README.md for sources & licences):
  mtsamples.csv             — ~5k clinical transcriptions (Apache-2.0 / originally CC0)
  indian_medicine_data.csv  — 253,973 Indian medicine SKUs with compositions (MIT)
Outputs (suggest/models/):
  text_report.pkl.gz, text_advice.pkl.gz, corrector.pkl.gz, medicine.pkl.gz, phrases.pkl.gz, meta.json
"""
import gzip
import json
import os
import pickle
import random
import re
import time
from collections import Counter

import pandas as pd

from . import synthetic
from . import textproc as T
from . import vocab_lists as V
from .corrector import Corrector
from .medicine import MedicineIndex, normalize as med_norm
from .ngram import NgramModel
from .phrases import PhraseField

HERE = os.path.dirname(os.path.abspath(__file__))
RAW = os.path.join(HERE, "data", "raw")
MODELS = os.path.join(HERE, "models")

# Corpus weights: the synthetic Indian OPD style outweighs the US narrative style of MTSamples.
W_MT, W_SYN_REPORT, W_SYN_ADVICE, W_MT_ADVICE, W_MT_IN_ADVICE, W_INSTR = 1.0, 3.0, 4.0, 1.5, 0.15, 1.5


def load_mtsamples(path=os.path.join(RAW, "mtsamples.csv")):
    df = pd.read_csv(path)
    df = df.dropna(subset=["transcription"]).drop_duplicates(subset=["transcription"])
    return df.reset_index(drop=True)


def mtsamples_sentences(df):
    """→ (report_sentences, advice_sentences, titles) as token lists / strings."""
    report, advice, titles = [], [], []
    for row in df.itertuples(index=False):
        _, sections = T.clean_mtsamples(row.transcription)
        for header, body in sections:
            for sent in T.split_sentences(T.tokens(body)):
                if len(sent) >= 3:
                    report.append(sent)
                    if T.is_advice_header(header):
                        advice.append(sent)
        name = re.sub(r"\s*-\s*\d+\s*$", "", str(row.sample_name)).strip()
        if 3 <= len(name) <= 60:
            titles.append(name)
    return report, advice, titles


def build_text_models(mt_report, mt_advice, syn):
    tok = lambda sents: [s for text in sents for s in T.split_sentences(T.tokens(text)) if s]
    syn_report, syn_advice, syn_instr = tok(syn["report"]), tok(syn["advice"]), tok(syn["instructions"])
    report_model = NgramModel.train(
        [(s, W_MT) for s in mt_report] + [(s, W_SYN_REPORT) for s in syn_report])
    advice_model = NgramModel.train(
        [(s, W_MT_ADVICE) for s in mt_advice] + [(s, W_SYN_ADVICE) for s in syn_advice]
        + [(s, W_INSTR) for s in syn_instr] + [(s, W_MT_IN_ADVICE) for s in mt_report])
    return report_model, advice_model


def english_words():
    import importlib.resources
    path = importlib.resources.files("symspellpy") / "frequency_dictionary_en_82_765.txt"
    with path.open(encoding="utf-8") as f:
        for line in f:
            parts = line.split()
            if len(parts) == 2 and parts[0].isalpha():
                yield parts[0].lower(), int(parts[1])


def build_corrector(models, medicine):
    counts = Counter()
    for m in models:
        for key, c in zip(m.keys, m.counts):
            if T.is_word(key) and len(key) >= 3:
                counts[key] += c
    word_counts = {w: c for w, c in counts.items() if c >= 3}
    for g in medicine.generics:
        for w in g.split(" "):
            if T.is_word(w) and len(w) >= 3:
                word_counts[w] = max(word_counts.get(w, 0), 50)
    for b in V.COMMON_BRANDS:
        for w in med_norm(b).split(" "):
            if w.isalpha() and len(w) >= 4:
                word_counts[w] = max(word_counts.get(w, 0), 30)
    # Everyday English (SymSpell's bundled MIT dictionary): never flagged; the common words can also
    # be offered as fixes, but at the lowest weight so medical terms always win ("feaver" → fever).
    for w, c in english_words():
        if c >= 1_000_000 and len(w) >= 4 and w not in word_counts:
            word_counts[w] = 3
    known_extra = set(T.PROTECTED)
    known_extra |= {w for w, _ in english_words()}
    known_extra |= set(medicine.fuzzy_words)                     # brand family words: never "misspelt"
    curated = V.SYMPTOMS + V.DIAGNOSES + V.INVESTIGATIONS + V.ADVICE_SENTENCES + V.REPORT_TITLES + V.INSTRUCTIONS
    for phrase in curated:
        for tok in T.tokens(phrase):
            if T.is_word(tok):
                known_extra.add(tok.lower())
    return Corrector(word_counts, known_extra)


def build_phrases(titles):
    title_counts = Counter(titles)
    mt_titles = [(t, "") for t, _ in title_counts.most_common()]
    return {
        "report_title": PhraseField([(t, "") for t in V.REPORT_TITLES] + mt_titles),
        "frequency": PhraseField(V.FREQUENCIES),
        "duration": PhraseField([(d, "") for d in V.DURATIONS]),
        "instructions": PhraseField([(i, "") for i in V.INSTRUCTIONS]),
        # "dosage" is built per request from the selected medicine's composition
    }


def build_all(holdout_fraction=0.0, seed=13, synthetic_seed=7):
    """Build every model. With holdout_fraction > 0 returns held-out MTSamples docs for evaluation."""
    mt = load_mtsamples()
    heldout = None
    if holdout_fraction > 0:
        idx = list(range(len(mt)))
        random.Random(seed).shuffle(idx)
        cut = int(len(idx) * holdout_fraction)
        heldout, mt = mt.iloc[idx[:cut]], mt.iloc[idx[cut:]]
    mt_report, mt_advice, titles = mtsamples_sentences(mt)
    syn = synthetic.generate(seed=synthetic_seed)
    report_model, advice_model = build_text_models(mt_report, mt_advice, syn)
    medicine = MedicineIndex.build(pd.read_csv(os.path.join(RAW, "indian_medicine_data.csv")))
    corrector = build_corrector([report_model, advice_model], medicine)
    phrases = build_phrases(titles)
    models = {"report": report_model, "advice": advice_model, "corrector": corrector,
              "medicine": medicine, "phrases": phrases}
    stats = {"mtsamples_docs": len(mt), "mt_report_sentences": len(mt_report), "mt_advice_sentences": len(mt_advice),
             "synthetic_report": len(syn["report"]), "synthetic_advice": len(syn["advice"])}
    return models, heldout, stats


def save(obj, name):
    path = os.path.join(MODELS, name)
    with gzip.open(path, "wb", compresslevel=6) as f:
        pickle.dump(obj, f, protocol=pickle.HIGHEST_PROTOCOL)
    return os.path.getsize(path)


def main():
    t0 = time.time()
    os.makedirs(MODELS, exist_ok=True)
    models, _, stats = build_all()
    sizes = {
        "text_report.pkl.gz": save(models["report"], "text_report.pkl.gz"),
        "text_advice.pkl.gz": save(models["advice"], "text_advice.pkl.gz"),
        "corrector.pkl.gz": save(models["corrector"], "corrector.pkl.gz"),
        "medicine.pkl.gz": save(models["medicine"], "medicine.pkl.gz"),
        "phrases.pkl.gz": save(models["phrases"], "phrases.pkl.gz"),
    }
    meta = dict(stats, built_seconds=round(time.time() - t0, 1),
                report_vocab=len(models["report"].keys), report_contexts=len(models["report"].ctx),
                advice_vocab=len(models["advice"].keys), advice_contexts=len(models["advice"].ctx),
                spelling_dictionary=len(models["corrector"].counts), medicines=len(models["medicine"].names),
                generics=len(models["medicine"].generics),
                file_sizes_mb={k: round(v / 1e6, 2) for k, v in sizes.items()})
    with open(os.path.join(MODELS, "meta.json"), "w", encoding="utf-8") as f:
        json.dump(meta, f, indent=2)
    print(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
