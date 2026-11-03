"""Local Clonexx AI chat server. Chat data stays in this folder."""
from __future__ import annotations

import json
import os
import sqlite3
import subprocess
import threading
import urllib.error
import urllib.request
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "clonexx.sqlite3"
HOST = "127.0.0.1"
PORT = int(os.environ.get("CLONEXX_PORT", "8000"))
OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")
MODEL = os.environ.get("CLONEXX_MODEL", "qwen2.5:7b")
DB_LOCK = threading.Lock()


def connect():
    db = sqlite3.connect(DB_PATH, timeout=20)
    db.row_factory = sqlite3.Row
    db.execute("PRAGMA journal_mode=WAL")
    return db


def initialize():
    with connect() as db:
        db.executescript("""
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY, title TEXT NOT NULL DEFAULT 'New chat',
                created_at TEXT NOT NULL, updated_at TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                sender TEXT NOT NULL CHECK(sender IN ('user','ai')),
                content TEXT NOT NULL, created_at TEXT NOT NULL
            );
            CREATE INDEX IF NOT EXISTS messages_conversation_idx
                ON messages(conversation_id, id);
        """)


def now():
    return datetime.now(timezone.utc).isoformat()


def ollama_request(path, payload=None, timeout=15):
    data = json.dumps(payload).encode() if payload is not None else None
    req = urllib.request.Request(OLLAMA_URL + path, data=data,
        headers={"Content-Type": "application/json"} if data else {})
    with urllib.request.urlopen(req, timeout=timeout) as response:
        return json.loads(response.read().decode())


class Handler(BaseHTTPRequestHandler):
    server_version = "ClonexxLocal/1.0"

    def log_message(self, fmt, *args):
        print("[%s] %s" % (self.log_date_time_string(), fmt % args))

    def send_json(self, status, obj):
        raw = json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(raw)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.end_headers()
        self.wfile.write(raw)

    def do_OPTIONS(self):
        self.send_json(200, {"ok": True})

    def body(self):
        length = min(int(self.headers.get("Content-Length", "0")), 2_000_000)
        return json.loads(self.rfile.read(length) or b"{}")

    def do_GET(self):
        path = urlparse(self.path).path
        if path == "/api/health":
            try:
                tags = ollama_request("/api/tags", timeout=2).get("models", [])
                installed = any(m.get("name", "").split(":")[0] == MODEL.split(":")[0] for m in tags)
                self.send_json(200, {"ok": True, "model": MODEL, "model_installed": installed,
                                     "runtime": "Ollama connected", "database": "SQLite ready"})
            except Exception:
                self.send_json(200, {"ok": True, "model": MODEL, "model_installed": False,
                                     "runtime": "Ollama offline", "database": "SQLite ready"})
        elif path == "/api/user":
            self.send_json(200, {"user": {"fullName": "Clonexx User", "email": "Local device"}})
        elif path == "/api/chats":
            with DB_LOCK, connect() as db:
                rows = db.execute("SELECT m.conversation_id AS session_id,m.sender,m.content,m.created_at "
                    "FROM messages m JOIN conversations c ON c.id=m.conversation_id "
                    "ORDER BY c.updated_at DESC,m.id").fetchall()
            self.send_json(200, {"chats": [dict(r) for r in rows]})
        else:
            self.send_json(404, {"error": "Not found"})

    def do_POST(self):
        path = urlparse(self.path).path
        try:
            payload = self.body()
            if path == "/api/chats":
                sid, sender, content = str(payload.get("session_id", "")), payload.get("sender"), payload.get("content", "")
                if not sid or sender not in ("user", "ai") or not isinstance(content, str):
                    return self.send_json(400, {"error": "Invalid chat message"})
                stamp = now()
                with DB_LOCK, connect() as db:
                    db.execute("INSERT OR IGNORE INTO conversations(id,title,created_at,updated_at) VALUES(?,?,?,?)",
                               (sid, content[:70] if sender == "user" else "New chat", stamp, stamp))
                    db.execute("INSERT INTO messages(conversation_id,sender,content,created_at) VALUES(?,?,?,?)", (sid, sender, content, stamp))
                    db.execute("UPDATE conversations SET updated_at=? WHERE id=?", (stamp, sid))
                return self.send_json(200, {"ok": True})
            if path == "/api/chat":
                message = str(payload.get("message", "")).strip()
                sid = str(payload.get("session_id", ""))
                if not message or len(message) > 100_000:
                    return self.send_json(400, {"error": "Enter a message up to 100,000 characters."})
                if not sid:
                    return self.send_json(400, {"error": "Missing conversation id"})
                with DB_LOCK, connect() as db:
                    history = db.execute("SELECT sender,content FROM messages WHERE conversation_id=? ORDER BY id DESC LIMIT 20", (sid,)).fetchall()
                # The browser persists the current user turn before requesting generation.
                if history and history[0]["sender"] == "user" and history[0]["content"] == message:
                    history = history[1:]
                messages = [{"role": "system", "content": "You are Clonexx AI, a helpful, clear assistant. Use the conversation history to understand follow-up questions. Be honest about uncertainty."}]
                for row in reversed(history):
                    messages.append({"role": "user" if row["sender"] == "user" else "assistant", "content": row["content"]})
                messages.append({"role": "user", "content": message})
                try:
                    result = ollama_request("/api/chat", {"model": MODEL, "messages": messages,
                        "stream": False, "options": {"num_ctx": 8192, "temperature": 0.65}}, timeout=600)
                    return self.send_json(200, {"reply": result.get("message", {}).get("content", ""), "model": MODEL})
                except urllib.error.URLError as e:
                    return self.send_json(503, {"error": "Ollama is not running. Start Ollama and download the model using setup-model.ps1.", "detail": str(e)})
                except Exception as e:
                    return self.send_json(503, {"error": "The local model could not answer. Check Ollama and model status.", "detail": str(e)})
            self.send_json(404, {"error": "Not found"})
        except (ValueError, json.JSONDecodeError):
            self.send_json(400, {"error": "Invalid JSON request"})


if __name__ == "__main__":
    initialize()
    print(f"Clonexx AI local server: http://127.0.0.1:{PORT}")
    print(f"Model: {MODEL} | Database: {DB_PATH}")
    ThreadingHTTPServer((HOST, PORT), Handler).serve_forever()
