"""
Clinical autocomplete / autocorrect for doctors (Phase 2 prototype).

  build.py     — builds the models from the raw datasets + synthetic Indian OPD corpus
  engine.py    — SuggestEngine: per-field completion, ghost text, spelling checks
  routes.py    — Flask blueprint mounted at /api/suggest (registered by ml_server.py)
  evaluate.py  — offline quality metrics (keystroke savings, accuracy, false corrections)

Python 3.10 compatible (the ML service Docker image is python:3.10-slim).
"""
