"""
Offline quality report for the clinical autocomplete prototype.

    cd backend-ml && python -m suggest.evaluate          → writes suggest/EVALUATION.md

Models are re-trained with 10% of MTSamples documents held out, and synthetic Indian OPD test
sentences come from a different random seed than training, so nothing below was seen in training.

Metrics
  Keystroke savings  — simulate a doctor typing each test sentence; whenever the grey ghost text
                       matches what they intend next, they press Tab (1 key) instead of typing it.
  Next-word top-3    — at each word boundary, is the actual next word among the top 3 predictions?
  Completion @2      — after typing 2 letters of a word (≥4 letters), is it in the top 3 completions?
  Autocorrect        — inject one realistic typo into a known word: is it flagged, and is the right
                       word the first / among the top-3 suggestions?
  False alarms       — share of correct words wrongly underlined in clean held-out text.
  Shorthand safety   — shorthand/abbreviations (BD, TDS, c/o, k/c/o, HTN, 1-0-1 …) wrongly flagged.
  Medicine search    — typing the first N letters of a real brand: is it in the top 5?
"""
import json
import os
import random
import re
import tempfile
import time

import pandas as pd

from . import synthetic
from . import textproc as T
from . import vocab_lists as V
from .build import RAW, build_all
from .engine import SuggestEngine, context_keys

HERE = os.path.dirname(os.path.abspath(__file__))
rng = random.Random(2026)


def detok(tokens):
    s = " ".join(tokens)
    s = re.sub(r"\s+([.,:;)?!])", r"\1", s)
    return re.sub(r"\(\s+", "(", s)


def mt_test_sentences(heldout, n, min_tokens=5):
    out = []
    for row in heldout.itertuples(index=False):
        _, sections = T.clean_mtsamples(row.transcription)
        for _, body in sections:
            for sent in T.split_sentences(T.tokens(body)):
                if len(sent) >= min_tokens:
                    out.append(detok(sent))
    rng.shuffle(out)
    return out[:n]


# ─── typing simulation ─────────────────────────────────────────────────
def keystroke_savings(engine, field, sentences):
    total_chars = keys = accepted = 0
    for target in sentences:
        pos = 0
        while pos < len(target):
            g = engine.complete(field, target[:pos])["ghost"]
            if g and len(g) > 1 and target[pos:].lower().startswith(g.lower()):
                keys += 1                   # Tab
                pos += len(g)
                accepted += 1
            else:
                keys += 1
                pos += 1
        total_chars += len(target)
    return {"sentences": len(sentences), "characters": total_chars, "keystrokes": keys,
            "savings_pct": round(100 * (1 - keys / total_chars), 1) if total_chars else 0.0,
            "ghosts_accepted": accepted}


def next_word_top3(engine, group, sentences):
    hits = total = 0
    for s in sentences:
        toks = T.tokens(s)
        for i in range(1, len(toks)):
            target = T.key(toks[i])
            if target in T.PUNCT:
                continue
            ctx = context_keys(" ".join(toks[:i]))
            ranked = [k for k, _ in sorted(engine._merged_next(group, ctx, None).items(), key=lambda kv: -kv[1])
                      if k not in T.PUNCT][:3]
            hits += target in ranked
            total += 1
    return {"predictions": total, "top3_pct": round(100 * hits / total, 1) if total else 0.0}


def completion_at2(engine, field, sentences):
    hits = total = 0
    for s in sentences:
        for m in re.finditer(r"[A-Za-z]{4,}", s):
            word = m.group(0)
            before = s[:m.start()] + word[:2]
            r = engine.complete(field, before)
            cands = [it["text"].lower() for it in r["items"][:3]]
            if r["ghost"]:
                cands.append((word[:2] + r["ghost"].split(" ")[0]).lower())
            hits += word.lower() in cands
            total += 1
    return {"words": total, "top3_pct": round(100 * hits / total, 1) if total else 0.0}


# ─── autocorrect ───────────────────────────────────────────────────────
def typo(word):
    i = rng.randrange(1, len(word))       # keep the first letter (as real typos usually do)
    op = rng.choice(["delete", "insert", "substitute", "transpose"])
    letters = "abcdefghijklmnopqrstuvwxyz"
    if op == "delete":
        return word[:i] + word[i + 1:]
    if op == "insert":
        return word[:i] + rng.choice(letters) + word[i:]
    if op == "substitute":
        return word[:i] + rng.choice([c for c in letters if c != word[i]]) + word[i + 1:]
    if i < len(word) - 1:
        return word[:i] + word[i + 1] + word[i] + word[i + 2:]
    return word[:i] + word[i + 1:]


def autocorrect_fix_rate(engine, sentences, n=1000):
    cases = []
    for s in sentences:
        toks = T.tokens(s)
        for i, t in enumerate(toks):
            if (T.is_word(t) and t.islower() and len(t) >= 5 and engine.corrector.is_known(t)
                    and not T.is_protected(t)):
                cases.append((toks, i))
    rng.shuffle(cases)
    flagged = top1 = top3 = 0
    done = 0
    for toks, i in cases:
        bad = typo(toks[i])
        if engine.corrector.is_known(bad):
            continue                         # the typo is itself a real word — not a spelling error
        text = detok(toks[:i] + [bad] + toks[i + 1:])
        issues = engine.check("report_body", text)
        hit = next((x for x in issues if x["word"] == bad), None)
        done += 1
        if hit:
            flagged += 1
            sugg = [x.lower() for x in hit["suggestions"]]
            top1 += bool(sugg) and sugg[0] == toks[i].lower()
            top3 += toks[i].lower() in sugg[:3]
        if done >= n:
            break
    return {"typos": done, "flagged_pct": round(100 * flagged / done, 1), "top1_fixed_pct": round(100 * top1 / done, 1),
            "top3_fixed_pct": round(100 * top3 / done, 1)}


def false_alarms(engine, sentences):
    words = flagged = 0
    examples = []
    for s in sentences:
        words += sum(1 for t in T.tokens(s) if T.is_word(t))
        for x in engine.check("report_body", s):
            flagged += 1
            if len(examples) < 12:
                examples.append(x["word"])
    return {"words": words, "false_alarms": flagged,
            "rate_pct": round(100 * flagged / words, 2) if words else 0.0, "examples": examples}


def shorthand_safety(engine, sentences):
    shorthand = flagged = 0
    for s in sentences:
        issues = {(x["start"], x["end"]) for x in engine.check("report_body", s)}
        for tok, st, en in T.tokenize(s):
            if T.is_protected(tok) or T.looks_like_abbreviation(tok):
                shorthand += 1
                flagged += (st, en) in issues
    return {"shorthand_tokens": shorthand, "wrongly_flagged": flagged}


# ─── medicines ─────────────────────────────────────────────────────────
def medicine_search(engine, n=500):
    df = pd.read_csv(os.path.join(RAW, "indian_medicine_data.csv"))
    df = df[df["Is_discontinued"].astype(str).str.lower() != "true"]
    sample = df["name"].sample(n, random_state=7).tolist()
    common = []
    for b in V.COMMON_BRANDS:
        i = engine.medicine.find(b)
        if i is not None:
            common.append(engine.medicine.names[i])
    out = {}
    for label, names in (("random_brands", sample), ("common_opd_brands", common)):
        res = {}
        for N in (3, 4, 6):
            hits = sum(1 for name in names if name in [it["text"] for it in engine.complete("medicine", name[:N])["items"][:5]])
            res[f"top5_after_{N}_chars_pct"] = round(100 * hits / len(names), 1)
        res["count"] = len(names)
        out[label] = res
    fixed = total = 0
    for name in common:
        first = name.split(" ")[0]
        if len(first) < 5 or not first.isalpha():
            continue
        bad = typo(first.lower())
        items = engine.complete("medicine", bad)["items"][:5]
        fixed += any(it["text"].split(" ")[0].lower() == first.lower() for it in items)
        total += 1
    out["typo_in_brand_top5_pct"] = round(100 * fixed / total, 1) if total else 0.0
    out["typo_cases"] = total
    return out


def main():
    t0 = time.time()
    print("Training evaluation models (10% of MTSamples held out)…")
    models, heldout, stats = build_all(holdout_fraction=0.1)
    engine = SuggestEngine(None, os.path.join(tempfile.gettempdir(), "suggest_eval.sqlite"), models=models)

    syn_test = synthetic.generate(seed=99, n_report=400, n_advice=300)
    mt_report = mt_test_sentences(heldout, 400)
    indian_report = syn_test["report"][:400]
    indian_advice = syn_test["advice"][:300]

    print("Typing simulations…")
    results = {
        "training": stats,
        "keystroke_savings": {
            "indian_opd_report": keystroke_savings(engine, "report_body", indian_report[:250]),
            "indian_opd_advice": keystroke_savings(engine, "advice", indian_advice[:250]),
            "us_transcription_report": keystroke_savings(engine, "report_body", mt_report[:150]),
        },
        "next_word_top3": {
            "indian_opd_report": next_word_top3(engine, "report", indian_report),
            "us_transcription_report": next_word_top3(engine, "report", mt_report),
        },
        "completion_at_2_letters": {
            "indian_opd_report": completion_at2(engine, "report_body", indian_report[:200]),
            "us_transcription_report": completion_at2(engine, "report_body", mt_report[:150]),
        },
    }
    print("Autocorrect…")
    results["autocorrect"] = autocorrect_fix_rate(engine, mt_report + indian_report)
    results["false_alarms"] = {
        "indian_opd": false_alarms(engine, indian_report + indian_advice),
        "us_transcription": false_alarms(engine, mt_report),
    }
    results["shorthand_safety"] = shorthand_safety(engine, indian_report + indian_advice)
    print("Medicine search…")
    results["medicine"] = medicine_search(engine)
    results["seconds"] = round(time.time() - t0, 1)

    with open(os.path.join(HERE, "evaluation.json"), "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2)
    write_markdown(results)
    print(json.dumps(results, indent=2))


def write_markdown(r):
    ks, nw, c2 = r["keystroke_savings"], r["next_word_top3"], r["completion_at_2_letters"]
    ac, fa, sh, md = r["autocorrect"], r["false_alarms"], r["shorthand_safety"], r["medicine"]
    lines = [
        "# Clinical autocomplete — evaluation",
        "",
        "Generated by `python -m suggest.evaluate`. Models were retrained with 10% of MTSamples documents held out;",
        "Indian OPD test sentences come from a different random seed than training. Nothing below was seen in training.",
        "",
        "## Typing effort",
        "",
        "| Test set | Keystrokes saved | Ghost suggestions accepted | Next word in top 3 | Word in top 3 after 2 letters |",
        "|---|---|---|---|---|",
        f"| Indian OPD reports | **{ks['indian_opd_report']['savings_pct']}%** | {ks['indian_opd_report']['ghosts_accepted']} | "
        f"{nw['indian_opd_report']['top3_pct']}% | {c2['indian_opd_report']['top3_pct']}% |",
        f"| Indian OPD advice | **{ks['indian_opd_advice']['savings_pct']}%** | {ks['indian_opd_advice']['ghosts_accepted']} | – | – |",
        f"| US-style transcriptions (MTSamples) | **{ks['us_transcription_report']['savings_pct']}%** | "
        f"{ks['us_transcription_report']['ghosts_accepted']} | {nw['us_transcription_report']['top3_pct']}% | "
        f"{c2['us_transcription_report']['top3_pct']}% |",
        "",
        "Keystrokes saved counts only exact matches of the grey ghost text accepted with one Tab — picking from the",
        "dropdown and per-doctor learning (which improves with use) are not included, so real savings are higher.",
        "",
        "## Autocorrect",
        "",
        f"- Typos injected into known words: **{ac['typos']}**",
        f"- Flagged: **{ac['flagged_pct']}%** · correct word first: **{ac['top1_fixed_pct']}%** · in top 3: **{ac['top3_fixed_pct']}%**",
        f"- False alarms on clean Indian OPD text: **{fa['indian_opd']['rate_pct']}%** of words "
        f"({fa['indian_opd']['false_alarms']} of {fa['indian_opd']['words']})",
        f"- False alarms on clean MTSamples text: **{fa['us_transcription']['rate_pct']}%** of words "
        f"({fa['us_transcription']['false_alarms']} of {fa['us_transcription']['words']}); examples: "
        f"{', '.join(fa['us_transcription']['examples']) or '–'}",
        f"- Shorthand & abbreviations wrongly flagged: **{sh['wrongly_flagged']} of {sh['shorthand_tokens']}**",
        "",
        "## Medicine search (253,973 Indian brands)",
        "",
        "| Brands | Top 5 after 3 letters | after 4 | after 6 |",
        "|---|---|---|---|",
        f"| Common OPD brands ({md['common_opd_brands']['count']}) | {md['common_opd_brands']['top5_after_3_chars_pct']}% | "
        f"{md['common_opd_brands']['top5_after_4_chars_pct']}% | {md['common_opd_brands']['top5_after_6_chars_pct']}% |",
        f"| Random brands ({md['random_brands']['count']}) | {md['random_brands']['top5_after_3_chars_pct']}% | "
        f"{md['random_brands']['top5_after_4_chars_pct']}% | {md['random_brands']['top5_after_6_chars_pct']}% |",
        "",
        f"Misspelt brand names (one typo) recovered in the top 5: **{md['typo_in_brand_top5_pct']}%** "
        f"({md['typo_cases']} cases). Random brands include long-tail SKUs that share a prefix with dozens of",
        "variants; per-doctor learning moves a doctor's own medicines to the top after first use.",
        "",
        "## How to read these numbers",
        "",
        "- **Indian OPD figures are optimistic.** Those test sentences are new, but they are generated from the same",
        "  templates and vocabulary as the synthetic training text, so they show how well the model learned that style —",
        "  not how it will do on real notes from real doctors.",
        "- **The MTSamples row is the honest generalisation figure**: real clinical dictation from documents never seen",
        "  in training, in a longer, US narrative style that is harder to predict than Indian OPD shorthand.",
        "- Real-world numbers should land between the two, and rise per doctor as their own notes are learned.",
        "  The next step is to measure keystroke savings on anonymised notes from pilot doctors.",
        "",
    ]
    with open(os.path.join(HERE, "EVALUATION.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


if __name__ == "__main__":
    main()
