#!/usr/bin/env python3
"""Small local server for Yuan's Planner.

Run with:
  python3 backend/app.py

Then open:
  http://127.0.0.1:8765
"""

# This file is run directly with `python3 backend/app.py`, so importing the
# neighboring `db.py` module by name keeps the entry point beginner-friendly.

from __future__ import annotations

import socket
from http.server import ThreadingHTTPServer

from config import planner_db_path, planner_host, planner_port
from db import init_database
from http_server import PlannerHandler
from reminder_service import start_reminder_worker


HOST = planner_host()
PORT = planner_port()


def local_network_ip() -> str:
    with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as sock:
        try:
            sock.connect(("8.8.8.8", 80))
            return sock.getsockname()[0]
        except OSError:
            return "127.0.0.1"


def main() -> None:
    init_database()
    server = ThreadingHTTPServer((HOST, PORT), PlannerHandler)
    start_reminder_worker()
    lan_ip = local_network_ip()
    print(f"Yuan's Planner listening at http://127.0.0.1:{PORT}")
    print(f"LAN URL: http://{lan_ip}:{PORT}")
    print(f"SQLite database: {planner_db_path()}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping Yuan's Planner...")
    finally:
        server.server_close()


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        pass
