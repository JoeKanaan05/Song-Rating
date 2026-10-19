#!/usr/bin/env python3
"""
Static file server for Song Ratings.

Ratings are stored in each visitor's browser, so this only serves the site's
files. Uses only the Python standard library, so there's nothing to install.

    python3 server.py                          # http://localhost:8000
    python3 server.py --port 8080              # use a different port
    python3 server.py --host 0.0.0.0 --no-browser   # on the Pi (see README)
"""

import argparse
import os
import webbrowser
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

ROOT = os.path.dirname(os.path.abspath(__file__))


class Handler(SimpleHTTPRequestHandler):
    extensions_map = {
        **SimpleHTTPRequestHandler.extensions_map,
        ".webmanifest": "application/manifest+json",
        ".js": "text/javascript",
    }

    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def end_headers(self):
        # Make the browser re-check files on every load, so CSS/JS edits
        # show up on refresh instead of a stale cached copy.
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def log_message(self, format, *args):
        # Only log errors, not every CSS/JS request.
        if len(args) > 1 and str(args[1])[0] in "45":
            super().log_message(format, *args)


def main():
    parser = argparse.ArgumentParser(description="Serve the Song Ratings site.")
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--host", default="127.0.0.1",
                        help="use 0.0.0.0 to allow other devices on the network")
    parser.add_argument("--no-browser", action="store_true",
                        help="don't open a browser window on start")
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), Handler)
    url = f"http://localhost:{args.port}"
    print(f"Song Ratings running at {url}")
    print("Press Ctrl+C to stop.")
    if not args.no_browser:
        webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
