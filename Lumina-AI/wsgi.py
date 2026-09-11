"""
Production WSGI Entrypoint for Lumina AI & WebGIS Backend
Usage with Gunicorn: gunicorn -w 4 -b 0.0.0.0:5000 wsgi:app
"""

import os
from api import create_app

env_mode = os.getenv("FLASK_ENV", "production")
app = create_app(env_mode)

if __name__ == "__main__":
    app.run()
