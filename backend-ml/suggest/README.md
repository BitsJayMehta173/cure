# Clinical autocomplete & autocorrect ("Grammarly for doctors") — prototype

Served by the ML Flask app (`ml_server.py`, port 5000) under `/api/suggest`. Used only by the doctor's
**report** (title, body), **prescription** (medicine, dosage, frequency, duration, instructions) and
**general advice** inputs, through `frontend/src/smart-input/SmartTextInput.tsx`. It is not used in search boxes.

Quality numbers on held-out text are in [EVALUATION.md](EVALUATION.md).

## What the doctor sees

| Field | Behaviour |
|---|---|
| Report body, advice | Grey **ghost text** for the rest of the word/phrase (`Tab` or `→` accepts, can span several words: "Lungs clear to" → *auscultation bilaterally*). When the next word is likely but not certain, a small pick-list (`3 days · 1 week · 2 weeks`). Misspellings get a red wavy underline; click → suggestions, *Ignore*, or *Add to my words*. Clinical shorthand (c/o, k/c/o, BD, TDS, 1-0-1, HTN, T2DM …) is never flagged. |
| Report title | Whole-title suggestions + spelling underline. |
| Medicine | Brand/generic search over 253,973 Indian SKUs with composition shown; "Did you mean" for misspelt brands. **Never auto-replaced.** |
| Dosage | Pre-filled from the chosen medicine's strength and form (Augmentin 625 Duo → `625mg`, `1 tab`). |
| Frequency / duration / instructions | Common Indian prescription phrases (`BD`, `1-0-1`, `5 days`, `After food` …). |

Everything **learns per doctor**: whatever a doctor saves is posted to `/api/suggest/learn`, and their own
phrases, medicines, doses-per-medicine and vocabulary rank first — for that doctor only.

## How it works

- **Free text** (`ngram.py`, `engine.py`) — word 4-gram language model with stupid backoff, pruned to the top
  12 continuations per context. Separate models for *report* and *advice*. Word completion uses the context
  first, then a unigram prefix index. Ghost text is emitted only when the model is confident (greedy
  continuation with thresholds and a margin over the runner-up).
- **Spelling** (`corrector.py`) — SymSpell (edit distance 1 for ≤5 letters, else 2), ranked by distance, then
  frequency × context. Only flags; the doctor decides. Skips: the word being typed, words <4 letters,
  shorthand/abbreviations, tokens with digits, capitalised mid-sentence words (names), known medical/English
  words, medicine names, and the doctor's own words.
- **Medicines** (`medicine.py`) — prefix index over normalised names, ranked by a curated list of common OPD
  brands, brand-family size and the doctor's own usage; discontinued SKUs sink. Compositions are parsed for
  generic-name search and dose suggestions.
- **Phrases** (`phrases.py`) — whole-field search for title/frequency/duration/instructions/dosage.
- **Personalisation** (`personal.py`) — SQLite (`suggest/data/personal.sqlite`, tables `events`, `words`)
  replayed into an in-memory profile per doctor on first use: live n-grams for report/advice, phrase counters
  (also per medicine), medicine counter, vocabulary. Blended with the global model at weight 1.5.

Typical request latency is under 5 ms; models load in about 2 s in a background thread when the server starts.
The frontend calls `http://127.0.0.1:5000` (`VITE_ML_URL` overrides; `localhost` adds ~200 ms on Windows) and
backs off for 30 s if the service is down — the inputs then behave like plain text boxes.

## Training data

| Source | Used for | Licence |
|---|---|---|
| [MTSamples](https://huggingface.co/datasets/harishnair04/mtsamples) — `mtsamples.csv`, 17,007,236 bytes, sha256 `a92cb78569f460606661ee7da50c92305b60d0fac2be4b06c8d2de0f234612d4` | Clinical vocabulary & sentence patterns (2,357 de-duplicated transcriptions) | Apache-2.0 (originally CC0, mtsamples.com) |
| [Indian Medicine Dataset](https://github.com/junioralive/Indian-Medicine-Dataset) — `DATA/indian_medicine_data.csv`, 31,807,827 bytes, sha256 `c9de0182474f652b7790a85bf534d0df9bd814575fcbda7109696d0fb3bec042` | Medicine names, compositions, forms, strengths | MIT |
| SymSpell English frequency dictionary (bundled with `symspellpy`) | Everyday English words are never flagged | MIT |
| `synthetic.py` + `vocab_lists.py` (ours) | Indian OPD style: `C/o fever x 3 days`, `K/c/o HTN, T2DM`, `O/E: BP 130/80`, `Tab. Pan 40mg 1-0-0 before food`, `Adv: …` | — |

MTSamples is US dictation; Indian OPD notes are shorter and shorthand-heavy, so synthetic OPD text is weighted
higher when training. GPL-licensed medical word lists were deliberately not used. No patient data from this
app is used in the global model.

## Rebuilding the models

Built models live in `suggest/models/` (~12 MB, committed). The raw CSVs are gitignored; to rebuild:

```bash
cd backend-ml
pip install -r requirements.txt
mkdir -p suggest/data/raw
curl -L -o suggest/data/raw/mtsamples.csv https://huggingface.co/datasets/harishnair04/mtsamples/resolve/main/mtsamples.csv
curl -L -o suggest/data/raw/indian_medicine_data.csv https://raw.githubusercontent.com/junioralive/Indian-Medicine-Dataset/main/DATA/indian_medicine_data.csv
python -m suggest.build        # ~1 min → suggest/models/*.pkl.gz + meta.json
python -m suggest.evaluate     # ~40 s → EVALUATION.md, evaluation.json (retrains with a held-out split)
```

Keep the code Python 3.10-compatible (the Docker image is `python:3.10-slim`).

## Deploying (Render free tier, 512 MB)

PyTorch plus the suggestion models don't fit in one 512 MB instance, so run them as two services from the same repo:

| Render web service | Root directory | Dockerfile path | Env vars |
|---|---|---|---|
| ML scorer (existing) | `backend-ml` | `./Dockerfile` | `ENABLE_SUGGEST=0` |
| Suggestions (new) | `backend-ml` | `./Dockerfile.suggest` | — (Render sets `PORT`) |

Health check: `/health` for both. On Vercel, set `VITE_ML_URL` to the suggestions service URL (no trailing slash) and
redeploy the frontend. The suggestions service uses about 350 MB. On the free tier its disk is wiped on every
redeploy/restart, so per-doctor learning resets. For a pilot, attach a persistent disk and point `SUGGEST_PERSONAL_DB` at it.
On a bigger single host, leave `ENABLE_SUGGEST` unset and `ml_server.py` serves both.

## API (`/api/suggest`)

| Method | Path | Body → Response |
|---|---|---|
| GET | `/health` | → model stats, `status: ok` (503 while loading / if models are missing) |
| POST | `/complete` | `{field, text (before caret), doctorId?, context?: {medicine}}` → `{ghost, items: [{text, kind, detail?, form?, fuzzy?, discontinued?}], replaceLength, prefix?}` |
| POST | `/check` | `{field, text, doctorId?, caret?, ignore?: []}` → `{issues: [{start, end, word, suggestions}]}` |
| POST | `/learn` | `{field, text, doctorId, context?: {medicine}}` → 204 |
| POST | `/dictionary` | `{doctorId, word}` → 204 (adds to the doctor's words) |

Fields: `report_title`, `report_body`, `medicine`, `dosage`, `frequency`, `duration`, `instructions`, `advice`.
Environment overrides: `SUGGEST_MODELS_DIR`, `SUGGEST_PERSONAL_DB`.

## Privacy note

`personal.sqlite` stores the text doctors save (reports, prescriptions, advice), keyed by doctor id. That is
clinical data: it is gitignored, never leaves the ML server, and each doctor's profile only affects their own
suggestions. Before a real pilot, add authentication to `/api/suggest` (the doctor id is currently trusted
from the request, like the rest of the prototype), a retention policy, and a per-doctor "forget my data" action.
