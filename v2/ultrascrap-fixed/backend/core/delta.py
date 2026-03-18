"""
UltraScrap — Delta Store
SQLite-backed store that tracks which URLs have been scraped per dataset.
Used by scheduled/recurring jobs to only scrape NEW pages since last run.
"""

from __future__ import annotations

import hashlib
import sqlite3
import time
from pathlib import Path

DB_PATH = Path(__file__).parent.parent.parent / "exports" / "delta.db"


def _conn() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("""
        CREATE TABLE IF NOT EXISTS seen_urls (
            schedule_id TEXT NOT NULL,
            url         TEXT NOT NULL,
            scraped_at  REAL NOT NULL,
            PRIMARY KEY (schedule_id, url)
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS run_log (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            schedule_id TEXT NOT NULL,
            ran_at      REAL NOT NULL,
            new_urls    INTEGER DEFAULT 0,
            skipped     INTEGER DEFAULT 0,
            status      TEXT DEFAULT 'done'
        )
    """)
    conn.commit()
    return conn


def filter_new_urls(schedule_id: str, urls: list[str]) -> tuple[list[str], int]:
    """
    Return (new_urls, skipped_count) — only URLs not previously seen
    for this schedule_id are returned.
    """
    if not urls:
        return [], 0
    conn = _conn()
    try:
        placeholders = ",".join("?" * len(urls))
        rows = conn.execute(
            f"SELECT url FROM seen_urls WHERE schedule_id=? AND url IN ({placeholders})",
            [schedule_id, *urls],
        ).fetchall()
        seen = {r["url"] for r in rows}
        new   = [u for u in urls if u not in seen]
        skipped = len(urls) - len(new)
        return new, skipped
    finally:
        conn.close()


def mark_scraped(schedule_id: str, urls: list[str]) -> None:
    """Record that these URLs were scraped for this schedule."""
    if not urls:
        return
    now = time.time()
    conn = _conn()
    try:
        conn.executemany(
            "INSERT OR REPLACE INTO seen_urls (schedule_id, url, scraped_at) VALUES (?,?,?)",
            [(schedule_id, url, now) for url in urls],
        )
        conn.commit()
    finally:
        conn.close()


def log_run(schedule_id: str, new_urls: int, skipped: int, status: str = "done") -> None:
    conn = _conn()
    try:
        conn.execute(
            "INSERT INTO run_log (schedule_id, ran_at, new_urls, skipped, status) VALUES (?,?,?,?,?)",
            (schedule_id, time.time(), new_urls, skipped, status),
        )
        conn.commit()
    finally:
        conn.close()


def get_run_history(schedule_id: str, limit: int = 10) -> list[dict]:
    conn = _conn()
    try:
        rows = conn.execute(
            "SELECT * FROM run_log WHERE schedule_id=? ORDER BY ran_at DESC LIMIT ?",
            (schedule_id, limit),
        ).fetchall()
        return [dict(r) for r in rows]
    finally:
        conn.close()


def get_seen_count(schedule_id: str) -> int:
    conn = _conn()
    try:
        row = conn.execute(
            "SELECT COUNT(*) as cnt FROM seen_urls WHERE schedule_id=?",
            (schedule_id,),
        ).fetchone()
        return row["cnt"] if row else 0
    finally:
        conn.close()


def clear_delta(schedule_id: str) -> None:
    """Reset seen URLs for a schedule (forces full re-scrape next run)."""
    conn = _conn()
    try:
        conn.execute("DELETE FROM seen_urls WHERE schedule_id=?", (schedule_id,))
        conn.commit()
    finally:
        conn.close()