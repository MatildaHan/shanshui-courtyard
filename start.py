"""Serve the offline courtyard locally. Python 3.9+, no third-party packages."""
import argparse
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import threading
import webbrowser

parser = argparse.ArgumentParser(description='Open the Shanshui courtyard in your browser.')
parser.add_argument('--port', type=int, default=0, help='0 chooses an available local port')
parser.add_argument('--no-browser', action='store_true')
args = parser.parse_args()
handler = partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parent))
with ThreadingHTTPServer(('127.0.0.1', args.port), handler) as server:
    url = f'http://127.0.0.1:{server.server_port}/'
    print(f'Courtyard: {url}', flush=True)
    print('Press Ctrl+C to stop. Localhost only; no inference API is used.', flush=True)
    if not args.no_browser:
        threading.Timer(.4, webbrowser.open, args=(url,)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
