"""
Development Server Runner for Lumina AI & WebGIS Backend
Usage: python run.py
Default host: 127.0.0.1 (or 0.0.0.0 via env), port: 5000
Swagger Docs: http://127.0.0.1:5000/docs
"""

import os
from api import create_app

if __name__ == "__main__":
    host = os.getenv("HOST", "0.0.0.0")
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_DEBUG", "True").lower() in ["true", "1", "yes"]

    app = create_app("development")
    print("\n" + "=" * 65)
    print("  LUMINA Geo-AI & WebGIS Backend Server Active")
    print(f"  Swagger API Documentation : http://localhost:{port}/docs")
    print(f"  Direct Health Check       : http://localhost:{port}/health")
    print(f"  WebGIS GeoJSON Layer      : http://localhost:{port}/api/v1/webgis/api-geojson")
    print(f"  External / LAN Access     : http://{host}:{port}/docs")
    print("=" * 65 + "\n")

    app.run(host=host, port=port, debug=debug)
