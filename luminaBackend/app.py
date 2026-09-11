"""Entry point LUMINA backend.

Jalankan:
    python app.py
atau:
    flask --app app run --debug
"""
import os

from lumina import create_app

app = create_app()

if __name__ == "__main__":
    app.run(
        host=os.getenv("HOST", "127.0.0.1"),
        port=int(os.getenv("PORT", 5000)),
        debug=app.config.get("DEBUG", False),
    )
