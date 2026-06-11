#!/usr/bin/env python3
"""
AI Browser Bridge Server

Local HTTP server at http://127.0.0.1:9876
AI models send commands here -> Browser extension polls and executes them

Usage:
    python bridge_server.py
"""

import http.server
import json
import os
import threading
import time
import uuid
import sys
from urllib.parse import urlparse

HOST = '127.0.0.1'
PORT = 9876

# Bearer token auth — set BRIDGE_TOKEN env var to enable.
# If unset, the bridge runs in open mode (development only).
BRIDGE_TOKEN = os.environ.get('BRIDGE_TOKEN', '').strip()

command_queue = []
command_lock = threading.Lock()
results_store = {}
results_lock = threading.Lock()
server_running = True


def _check_auth(handler) -> bool:
    """Return True if the request is authorized. Always True if no token configured."""
    if not BRIDGE_TOKEN:
        return True  # open mode
    auth = handler.headers.get('Authorization', '')
    # Accept "Bearer <token>" or just "<token>" for convenience
    token = auth[7:].strip() if auth.lower().startswith('bearer ') else auth.strip()
    # Constant-time comparison
    if not token or len(token) != len(BRIDGE_TOKEN):
        return False
    result = 0
    for a, b in zip(token, BRIDGE_TOKEN):
        result |= ord(a) ^ ord(b)
    return result == 0


class BridgeHandler(http.server.BaseHTTPRequestHandler):
    """Handles bridge API requests."""

    def log_message(self, format, *args):
        print("[Bridge] %s %s %s" % args)

    def _send_json(self, data, status=200):
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type, Authorization')
        self.send_header('Access-Control-Expose-Headers', 'WWW-Authenticate')
        self.end_headers()
        self.wfile.write(json.dumps(data).encode('utf-8'))

    def _send_unauthorized(self):
        self.send_response(401)
        self.send_header('Content-Type', 'application/json')
        self.send_header('WWW-Authenticate', 'Bearer realm="karma-bridge"')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps({'error': 'unauthorized', 'message': 'Invalid or missing Bearer token'}).encode('utf-8'))

    def do_OPTIONS(self):
        self._send_json({})

    def do_GET(self):
        # Auth gate (status is public so clients can detect 401 vs offline)
        parsed = urlparse(self.path)
        if parsed.path != '/status' and not _check_auth(self):
            return self._send_unauthorized()

        path = parsed.path

        if path == '/status':
            payload = {
                'status': 'running',
                'queue_length': len(command_queue),
                'results_available': len(results_store),
                'auth': 'required' if BRIDGE_TOKEN else 'open',
            }
            return self._send_json(payload)
        elif path == '/command/poll':
            with command_lock:
                if command_queue:
                    cmd = command_queue.pop(0)
                    self._send_json(cmd)
                else:
                    self._send_json({}, status=204)
        elif path.startswith('/result/'):
            job_id = path.split('/result/')[1]
            with results_lock:
                result = results_store.pop(job_id, None)
            if result:
                self._send_json({'job_id': job_id, 'result': result})
            else:
                self._send_json({'error': 'not_found'}, status=404)
        else:
            self._send_json({'error': 'not_found'}, status=404)

    def do_POST(self):
        # Auth gate (auth check before reading body)
        if not _check_auth(self):
            # Still need to drain the request body to avoid client hang
            cl = int(self.headers.get('Content-Length', 0))
            if cl:
                try: self.rfile.read(cl)
                except: pass
            return self._send_unauthorized()

        parsed = urlparse(self.path)
        path = parsed.path
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length).decode('utf-8') if content_length else '{}'

        try:
            data = json.loads(body)
        except json.JSONDecodeError:
            self._send_json({'error': 'invalid_json'}, status=400)
            return

        if path == '/command/send':
            job_id = str(uuid.uuid4())[:8]
            cmd = {
                'job_id': job_id,
                'action': data.get('action'),
                'params': data.get('params', {})
            }
            with command_lock:
                command_queue.append(cmd)
            print("[Bridge] Queued job %s: %s" % (job_id, data.get('action')))
            self._send_json({'job_id': job_id, 'status': 'queued'})
        elif path == '/command/result':
            job_id = data.get('job_id')
            result = data.get('result', {})
            if job_id:
                with results_lock:
                    results_store[job_id] = {
                        'result': result,
                        '_ts': time.time()
                    }
                print("[Bridge] Got result for job %s" % job_id)
            self._send_json({'status': 'ok'})
        elif path == '/stop':
            global server_running
            server_running = False
            self._send_json({'status': 'stopping'})
            threading.Thread(target=self.server.shutdown, daemon=True).start()
        else:
            self._send_json({'error': 'not_found'}, status=404)


def cleanup_old_results():
    while server_running:
        time.sleep(60)
        cutoff = time.time() - 300
        with results_lock:
            stale = [k for k, v in results_store.items()
                     if v.get('_ts', 0) < cutoff]
            for k in stale:
                del results_store[k]
            if stale:
                print("[Bridge] Cleaned %d stale results" % len(stale))


if __name__ == '__main__':
    # Force UTF-8 output encoding for Windows compatibility
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')

    print()
    print('+' + '-' * 44 + '+')
    print('|        AI Browser Bridge Server          |')
    print('|  Any AI -> http://%(host)s:%(port)s -> Browser  |' % {'host': HOST, 'port': PORT})
    print('+' + '-' * 44 + '+')
    print()
    print('Commands:')
    print('  POST /command/send    - Send an action for the browser')
    print('  GET  /command/poll    - Extension polls for next command')
    print('  POST /command/result  - Extension posts execution result')
    print('  GET  /result/<job_id> - AI polls for result')
    print('  GET  /status          - Server status')
    print()
    print('Actions: navigate, click, type, extract, screenshot, evaluate, scroll,')
    print('         hover, tab_list, tab_switch, tab_close, select, keypress,')
    print('         upload_video, pinned_comment')
    print()
    if BRIDGE_TOKEN:
        print('Auth:       ENABLED — set BRIDGE_TOKEN env var to bypass')
        print('             Clients must send "Authorization: Bearer <token>" header')
    else:
        print('Auth:       DISABLED — running in open mode (development only)')
        print('             Set BRIDGE_TOKEN env var to require authentication')

    print('Listening on http://%(host)s:%(port)s' % {'host': HOST, 'port': PORT})
    print('Press Ctrl+C to stop')

    cleanup = threading.Thread(target=cleanup_old_results, daemon=True)
    cleanup.start()
    server = http.server.HTTPServer((HOST, PORT), BridgeHandler)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print()
        print("[Bridge] Shutting down...")
        server.server_close()
