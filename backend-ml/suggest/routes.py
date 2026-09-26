"""
Flask blueprint: /api/suggest/*   (registered by ml_server.py)

  GET  /api/suggest/health
  POST /api/suggest/complete    {field, text (before caret), doctorId?, context?: {medicine}}
                                → {ghost, items: [{text, detail?, kind, fuzzy?}], replaceLength, prefix}
  POST /api/suggest/check       {field, text, doctorId?, caret?, ignore?: [word]}
                                → {issues: [{start, end, word, suggestions}]}
  POST /api/suggest/learn       {field, text, doctorId, context?: {medicine}}   → 204
  POST /api/suggest/dictionary  {doctorId, word}                               → 204

If the models are missing the endpoints answer 503 and the frontend falls back to plain inputs.
"""
import os
import threading
import traceback

from flask import Blueprint, jsonify, request

from .engine import ALL_FIELDS, SuggestEngine

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS_DIR = os.environ.get("SUGGEST_MODELS_DIR", os.path.join(HERE, "models"))
PERSONAL_DB = os.environ.get("SUGGEST_PERSONAL_DB", os.path.join(HERE, "data", "personal.sqlite"))

bp = Blueprint("suggest", __name__, url_prefix="/api/suggest")
_engine = None
_engine_error = None
_lock = threading.Lock()


def engine():
    global _engine, _engine_error
    if _engine is None and _engine_error is None:
        with _lock:
            if _engine is None and _engine_error is None:
                try:
                    _engine = SuggestEngine(MODELS_DIR, PERSONAL_DB)
                    print(f"Suggestion engine loaded in {_engine.load_seconds}s: {_engine.stats()}")
                except Exception as e:  # models not built / unreadable
                    _engine_error = f"{type(e).__name__}: {e}"
                    traceback.print_exc()
    return _engine


def warm_up():
    """Load models in the background so the first keystroke isn't slow."""
    threading.Thread(target=engine, daemon=True).start()


def _body():
    return request.get_json(silent=True) or {}


def _doctor_id(body):
    try:
        v = body.get("doctorId")
        return int(v) if v is not None else None
    except (TypeError, ValueError):
        return None


def _unavailable():
    return jsonify({"error": "suggestions unavailable", "detail": _engine_error}), 503


def _bad_field(field):
    return jsonify({"error": f"unknown field '{field}'", "fields": sorted(ALL_FIELDS)}), 400


@bp.get("/health")
def health():
    e = engine()
    if e is None:
        return _unavailable()
    return jsonify({"status": "ok", **e.stats()})


@bp.post("/complete")
def complete():
    e = engine()
    if e is None:
        return _unavailable()
    b = _body()
    field = b.get("field")
    if field not in ALL_FIELDS:
        return _bad_field(field)
    text = str(b.get("text") or "")[-2000:]
    ctx = b.get("context") if isinstance(b.get("context"), dict) else {}
    return jsonify(e.complete(field, text, _doctor_id(b), ctx))


@bp.post("/check")
def check():
    e = engine()
    if e is None:
        return _unavailable()
    b = _body()
    field = b.get("field")
    if field not in ALL_FIELDS:
        return _bad_field(field)
    text = str(b.get("text") or "")[:10000]
    caret = b.get("caret") if isinstance(b.get("caret"), int) else None
    ignore = [str(w) for w in (b.get("ignore") or [])][:200]
    return jsonify({"issues": e.check(field, text, _doctor_id(b), caret, ignore)})


@bp.post("/learn")
def learn():
    e = engine()
    if e is None:
        return _unavailable()
    b = _body()
    field = b.get("field")
    if field not in ALL_FIELDS:
        return _bad_field(field)
    ctx = b.get("context") if isinstance(b.get("context"), dict) else {}
    e.learn(field, str(b.get("text") or ""), _doctor_id(b), ctx)
    return ("", 204)


@bp.post("/dictionary")
def dictionary():
    e = engine()
    if e is None:
        return _unavailable()
    b = _body()
    e.add_word(_doctor_id(b), str(b.get("word") or ""))
    return ("", 204)
