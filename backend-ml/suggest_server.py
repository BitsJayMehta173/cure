"""
Standalone clinical autocomplete service (only /api/suggest, no PyTorch).

Lets the suggestions run as their own small deployment — e.g. a second Render free instance —
so they don't share 512 MB with the search scorer. Locally, ml_server.py serves both.

    python suggest_server.py            (PORT env var, default 5001)
"""
import os

from flask import Flask
from flask_cors import CORS

from suggest.routes import bp, warm_up

app = Flask(__name__)
CORS(app)
app.register_blueprint(bp)


@app.get("/health")
def health():
    return {"status": "ok"}


if __name__ == "__main__":
    warm_up()
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5001)), debug=False)
