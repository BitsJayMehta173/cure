"""
Synthetic Indian OPD corpus. No open dataset captures Indian clinical shorthand
("c/o fever x 3 days", "k/c/o DM, HTN", "Tab. Dolo 650 1-0-1 x 5 days after food"), so we
generate it from templates over the curated vocabularies. Deterministic for a given seed.
"""
import random

from . import vocab_lists as V


def _vitals(rng):
    return {
        "temp": rng.choice(["98.6", "99", "99.4", "100", "100.4", "101", "101.6", "102", "103"]),
        "pr": rng.choice(["72", "78", "84", "88", "92", "96", "104", "110"]),
        "bp": rng.choice(["110/70", "120/80", "124/82", "130/80", "136/88", "140/90", "150/94", "160/100"]),
        "spo2": rng.choice(["95", "96", "97", "98", "99"]),
        "rr": rng.choice(["16", "18", "20", "22", "24"]),
        "hb": rng.choice(["9.8", "10.6", "11.2", "12.4", "13.1", "14.2"]),
        "tlc": rng.choice(["4,200", "6,800", "8,400", "11,600", "14,200"]),
        "plt": rng.choice(["0.9", "1.2", "1.8", "2.4", "3.1"]),
        "esr": rng.choice(["12", "18", "26", "40", "56"]),
        "fbs": rng.choice(["96", "112", "138", "164", "210"]),
        "ppbs": rng.choice(["128", "168", "212", "264", "310"]),
        "a1c": rng.choice(["5.6", "6.4", "7.2", "8.1", "9.4"]),
        "tsh": rng.choice(["1.8", "3.2", "6.8", "9.4", "14.2"]),
        "chol": rng.choice(["168", "196", "224", "248"]), "ldl": rng.choice(["96", "128", "152", "176"]),
        "hdl": rng.choice(["34", "38", "44", "52"]), "tg": rng.choice(["120", "164", "210", "260"]),
        "cr": rng.choice(["0.8", "1.0", "1.4", "2.1"]), "urea": rng.choice(["22", "34", "48", "66"]),
        "ast": rng.choice(["24", "38", "62", "110"]), "alt": rng.choice(["28", "44", "78", "132"]),
        "pus": rng.choice(["2-3", "4-6", "10-12", "plenty"]), "stone": rng.choice(["4", "6", "8", "11"]),
        "ef": rng.choice(["35", "45", "55", "60", "65"]),
    }


def _rx_line(rng):
    brand = rng.choice(V.COMMON_BRANDS)
    form = rng.choice(["Tab.", "Tab", "Cap.", "Syp.", "Tab."]) if not brand.lower().startswith(("syp", "inj")) else ""
    freq = rng.choice([f for f, _ in V.FREQUENCIES[:12]])
    dur = rng.choice(V.DURATIONS[:9])
    instr = rng.choice(V.INSTRUCTIONS[:8]).lower()
    pattern = rng.choice([
        "{form} {brand} {freq} x {dur}", "{form} {brand} {freq} x {dur} {instr}", "{form} {brand} {freq} {instr}",
        "{form} {brand} {freq} for {dur}",
    ])
    return pattern.format(form=form, brand=brand, freq=freq, dur=dur, instr=instr).strip()


def report_sentences(rng, n):
    out = []
    for _ in range(n):
        v = _vitals(rng)
        sym = rng.choice(V.SYMPTOMS)
        sym2 = rng.choice(V.SYMPTOMS)
        dur = rng.choice(V.DURATION_PHRASES)
        kind = rng.random()
        if kind < 0.18:
            out.append(rng.choice([
                f"C/o {sym} {dur}", f"c/o {sym} {dur}", f"Pt c/o {sym} {dur}",
                f"C/o {sym} {dur}, associated with {sym2}", f"Patient complains of {sym} {dur}",
                f"C/o {sym} and {sym2} {dur}", f"Presented with {sym} {dur}",
            ]))
        elif kind < 0.30:
            c1, c2 = rng.sample(V.COMORBIDITIES, 2)
            out.append(rng.choice([
                f"K/c/o {c1}, {c2} on regular medication", f"K/c/o {c1} on treatment", f"k/c/o {c1}",
                "No k/c/o DM/HTN/TB/BA", "No h/o drug allergy", "H/o similar complaints in the past",
                f"Known case of {c1} since {rng.choice(['2', '5', '8', '10'])} years", "No significant past history",
                "No h/o fever, cough or breathlessness", "Not a k/c/o DM or HTN",
            ]))
        elif kind < 0.50:
            out.append(rng.choice(V.EXAM_FINDINGS).format(**v))
        elif kind < 0.60:
            out.append(rng.choice([
                f"Imp: {rng.choice(V.DIAGNOSES)}", f"Provisional diagnosis: {rng.choice(V.DIAGNOSES)}",
                f"Diagnosis: {rng.choice(V.DIAGNOSES)}", f"Impression: {rng.choice(V.DIAGNOSES)}",
                f"Likely {rng.choice(V.DIAGNOSES).lower()}",
            ]))
        elif kind < 0.72:
            inv = ", ".join(rng.sample(V.INVESTIGATIONS, rng.randint(2, 5)))
            out.append(rng.choice([f"Adv: {inv}", f"Advised {inv}", f"Investigations advised: {inv}",
                                   f"Get {inv} done"]))
        elif kind < 0.84:
            out.append(rng.choice(V.LAB_RESULT_LINES).format(**v))
        elif kind < 0.92:
            out.append(rng.choice(V.IMAGING_LINES).format(**v))
        else:
            out.append(_rx_line(rng))
    return out


def advice_sentences(rng, n):
    out = []
    for _ in range(n):
        r = rng.random()
        if r < 0.55:
            out.append(rng.choice(V.ADVICE_SENTENCES))
        elif r < 0.75:
            a, b = rng.sample(V.ADVICE_SENTENCES, 2)
            out.append(f"{a}, {b[0].lower()}{b[1:]}")
        elif r < 0.9:
            out.append(rng.choice(V.FOLLOW_UP))
        else:
            s = rng.choice(V.ADVICE_SENTENCES)
            out.append(f"{rng.choice(V.ADVICE_OPENERS)} {s[0].lower()}{s[1:]}")
    return out


def instruction_sentences(rng, n):
    return [rng.choice(V.INSTRUCTIONS) for _ in range(n)]


def generate(seed=7, n_report=9000, n_advice=5000):
    rng = random.Random(seed)
    return {
        "report": report_sentences(rng, n_report),
        "advice": advice_sentences(rng, n_advice),
        "instructions": instruction_sentences(rng, 1500),
    }
