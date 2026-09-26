"""Tokenisation, normalisation and the rules that keep clinical shorthand intact."""
import re

# Tokens (in priority order):
#   - clinical number patterns: 1-0-1, 1/2-0-1/2, 130/80, 98.6, 500mg, 2.5ml, 10%, 1.5x
#   - slashed shorthand: c/o, k/c/o, h/o, o/e, b/l, s/o, mg/dl
#   - words (with internal hyphens/apostrophes): x-ray, patient's, non-tender
#   - single punctuation
TOKEN_RE = re.compile(
    r"\d+(?:[./-]\d+)*(?:[a-zA-Z%]+)?"          # numbers, dose patterns, ratios, 500mg, 10%
    r"|[A-Za-z]+(?:/[A-Za-z]+)+"                  # c/o, k/c/o, mg/dl
    r"|[A-Za-z]+\d[A-Za-z0-9]*"                   # alphanumeric codes: T2DM, SpO2, HbA1c, NS1, B12, q8h
    r"|[A-Za-z]+(?:['\-][A-Za-z]+)*"              # words
    r"|[.,:;()?!+]"                               # punctuation we keep as context
)

WORD_RE = re.compile(r"^[A-Za-z]+(?:['\-][A-Za-z]+)*$")
SENTENCE_END = {".", "?", "!"}
PUNCT = {".", ",", ":", ";", "(", ")", "?", "!", "+"}

# Shorthand doctors write that must never be "corrected" (compared lowercase).
PROTECTED = {
    # frequency / timing
    "od", "bd", "bid", "tds", "tid", "qid", "qds", "hs", "sos", "prn", "stat", "ac", "pc", "qhs", "qam", "qpm",
    "bbf", "abf", "q4h", "q6h", "q8h", "q12h",
    # routes / forms
    "po", "iv", "im", "sc", "sl", "pr", "tab", "tabs", "cap", "caps", "syp", "syr", "inj", "oint", "gtt", "susp",
    "tsp", "tsf", "tbsp", "neb", "mdi", "rotacap",
    # history / exam shorthand
    "c/o", "k/c/o", "h/o", "o/e", "b/l", "s/o", "n/v", "r/o", "f/u", "w/o", "d/d", "a/w", "s/p", "p/a",
    "adv", "imp", "dx", "ddx", "rx", "hx", "sx", "tx", "fx", "pt", "pts", "yo", "yrs", "wk", "wks", "mo",
    "nad", "wnl", "nil", "neg", "pos", "hpi", "ros", "pmh", "psh", "fh", "sh", "cc",
    # vitals / units
    "bp", "pr", "hr", "rr", "spo2", "temp", "gcs", "bmi", "mmhg", "bpm", "kg", "cm", "mg", "mcg", "ml", "iu",
    "gm", "g", "dl", "mmol", "cumm", "lakh", "lakhs",
    # common clinical abbreviations
    "dm", "t2dm", "t1dm", "htn", "cad", "ckd", "copd", "ihd", "tb", "ba", "uti", "urti", "lrti", "age", "apd",
    "gerd", "cva", "mi", "af", "chf", "ards", "aki", "dvt", "pe", "ra", "oa", "pcos", "ibs", "cbc", "esr", "crp",
    "lft", "kft", "rft", "tft", "tsh", "fbs", "ppbs", "rbs", "hba1c", "ecg", "ekg", "echo", "usg", "ct", "mri",
    "cxr", "abg", "ns1", "rbc", "wbc", "tlc", "dlc", "hb", "pcv", "mcv", "sgot", "sgpt", "alp", "ldl", "hdl",
    "vldl", "tg", "inr", "pt/inr", "aptt", "hiv", "hbsag", "hcv", "vdrl", "cvs", "rs", "cns", "p/a", "ent",
    "ivf", "ors", "npo", "icu", "opd", "ipd", "er", "lmp", "edd", "ga", "nsaid", "nsaids", "ppi", "ocp",
}

# Leading form words doctors put before a medicine name ("Tab. Dolo 650").
MEDICINE_FORM_PREFIXES = {"tab", "tabs", "tablet", "cap", "caps", "capsule", "syp", "syr", "syrup", "inj",
                          "injection", "oint", "ointment", "gtt", "drop", "drops", "susp", "cream", "gel"}


def tokenize(text):
    """[(token, start, end)] for the whole text."""
    return [(m.group(0), m.start(), m.end()) for m in TOKEN_RE.finditer(text)]


def tokens(text):
    return [m.group(0) for m in TOKEN_RE.finditer(text)]


def key(token):
    """Model key: lowercase, except dose/number patterns keep their form."""
    return token.lower()


def is_word(token):
    return bool(WORD_RE.match(token))


def is_protected(token):
    t = token.lower().rstrip(".")
    return t in PROTECTED


def looks_like_abbreviation(token):
    """ALLCAPS short tokens (ECG, HTN, NAD) or tokens with digits are treated as abbreviations/codes."""
    stripped = token.rstrip(".")
    if any(ch.isdigit() for ch in stripped):
        return True
    return stripped.isupper() and 2 <= len(stripped) <= 6


def split_sentences(tokens_list):
    """Split a token list into sentences on . ? ! (keeps the terminator out)."""
    sent, out = [], []
    for t in tokens_list:
        if t in SENTENCE_END:
            if sent:
                out.append(sent)
            sent = []
        else:
            sent.append(t)
    if sent:
        out.append(sent)
    return out


def match_case(suggestion, typed_prefix):
    """Present a suggestion in the casing the doctor is typing in."""
    if not typed_prefix:
        return suggestion
    if typed_prefix.isupper() and len(typed_prefix) > 1:
        return suggestion.upper()
    if typed_prefix[0].isupper() and suggestion[:1].islower():
        return suggestion[0].upper() + suggestion[1:]
    return suggestion


# ─── MTSamples cleanup ──────────────────────────────────────────────────────
_HEADER_RE = re.compile(r"(?:^|,)\s*([A-Z][A-Z0-9 /&(),'\-]{2,60}):\s*,?", re.M)


def clean_mtsamples(text):
    """
    MTSamples was scraped with section headers glued by commas:
      'PREOPERATIVE DIAGNOSIS: , Morbid obesity.,POSTOPERATIVE DIAGNOSIS:  ,Morbid obesity.,'
    → 'PREOPERATIVE DIAGNOSIS: Morbid obesity. POSTOPERATIVE DIAGNOSIS: Morbid obesity.'
    Returns (cleaned_text, [(header, section_text)]).
    """
    if not isinstance(text, str):
        return "", []
    t = text.replace("\r", " ").replace("\n", " ")
    t = re.sub(r"\.,(?=\S)", ". ", t)                 # 'obesity.,POST' → 'obesity. POST'
    t = re.sub(r":\s*,\s*", ": ", t)                  # 'DIAGNOSIS: , Morbid' → 'DIAGNOSIS: Morbid'
    t = re.sub(r",\s*(?=[A-Z][A-Z /&()'\-]{2,60}:)", ". ", t)
    t = re.sub(r"\s+", " ", t).strip()
    sections, last_header, last_pos = [], "BODY", 0
    for m in re.finditer(r"([A-Z][A-Z0-9 /&()'\-]{2,60}):", t):
        body = t[last_pos:m.start()].strip(" .,")
        if body:
            sections.append((last_header, body))
        last_header, last_pos = m.group(1).strip(), m.end()
    tail = t[last_pos:].strip(" .,")
    if tail:
        sections.append((last_header, tail))
    return t, sections


ADVICE_HEADERS = ("PLAN", "RECOMMENDATION", "INSTRUCTION", "DISCHARGE INSTRUCTION", "FOLLOW-UP", "FOLLOW UP",
                  "DISPOSITION", "TREATMENT PLAN", "PATIENT EDUCATION", "DIET", "ACTIVITY")


def is_advice_header(header):
    h = header.upper()
    return any(k in h for k in ADVICE_HEADERS)
