#!/usr/bin/env python3
"""
Local server for Song Ratings.

Serves the website and saves your ratings to data/ratings.json.
Uses only the Python standard library, so there's nothing to install.

    python3 server.py            # then open http://localhost:8000
    python3 server.py 8080       # use a different port

API:
    GET /api/albums   -> the saved albums (JSON array)
    PUT /api/albums   -> replace the saved albums with the request body
"""

import json
import os
import sys
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(ROOT, "data")
DATA_FILE = os.path.join(DATA_DIR, "ratings.json")
BACKUP_FILE = os.path.join(DATA_DIR, "ratings.backup.json")
API_PATH = "/api/albums"


def read_albums():
    try:
        with open(DATA_FILE, encoding="utf-8") as f:
            return json.load(f)
    except FileNotFoundError:
        return []


def write_albums(albums):
    os.makedirs(DATA_DIR, exist_ok=True)
    # Keep the previous version, in case a save ever goes wrong.
    if os.path.exists(DATA_FILE):
        os.replace(DATA_FILE, BACKUP_FILE)
    # Write to a temp file first so a crash can't leave a half-written file.
    tmp = DATA_FILE + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(albums, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, DATA_FILE)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # Make the browser re-check files on every load, so CSS/JS edits
        # show up on refresh instead of a stale cached copy.
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def send_json(self, status, payload):
        body = json.dumps(payload).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        if self.path.split("?")[0] == API_PATH:
            try:
                self.send_json(200, read_albums())
            except (OSError, json.JSONDecodeError) as err:
                self.send_json(500, {"error": f"Could not read {DATA_FILE}: {err}"})
            return
        super().do_GET()

    def do_PUT(self):
        if self.path.split("?")[0] != API_PATH:
            self.send_json(404, {"error": "Not found"})
            return
        try:
            length = int(self.headers.get("Content-Length", 0))
            albums = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(albums, list):
                raise ValueError("Expected a JSON array of albums.")
            write_albums(albums)
            self.send_json(200, {"ok": True, "albums": len(albums)})
        except (ValueError, OSError) as err:
            self.send_json(400, {"error": str(err)})

    def log_message(self, format, *args):
        # Only log API calls and errors, not every CSS/JS request.
        if API_PATH in self.path or (len(args) > 1 and str(args[1])[0] in "45"):
            super().log_message(format, *args)


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    server = ThreadingHTTPServer(("127.0.0.1", port), Handler)
    url = f"http://localhost:{port}"
    print(f"Song Ratings running at {url}")
    print(f"Ratings file: {DATA_FILE}")
    print("Press Ctrl+C to stop.")
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
