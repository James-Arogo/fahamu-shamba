#!/usr/bin/env python3
"""Shared helpers for ML ingestion scripts."""

from __future__ import annotations

import csv
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Iterable, Optional


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = REPO_ROOT / "backend" / "fahamu_shamba.db"


def connect_db(db_path: Path) -> sqlite3.Connection:
    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    return conn


def ensure_table_exists(conn: sqlite3.Connection, table_name: str) -> None:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
        (table_name,),
    ).fetchone()
    if not row:
        raise RuntimeError(
            f"Table '{table_name}' not found. Run ml/scripts/create_ml_tables.sql first."
        )


def load_csv_rows(csv_path: Path) -> list[dict[str, str]]:
    with csv_path.open("r", encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        return list(reader)


def require_columns(rows: list[dict[str, str]], required_columns: Iterable[str]) -> None:
    if not rows:
        raise ValueError("CSV has no data rows.")
    if rows[0] is None:
        raise ValueError("CSV does not contain a header row.")
    headers = set(rows[0].keys())
    missing = [col for col in required_columns if col not in headers]
    if missing:
        raise ValueError(f"Missing required CSV columns: {', '.join(missing)}")


def normalize_text(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned if cleaned else None


def normalize_sub_county(value: Optional[str]) -> Optional[str]:
    text = normalize_text(value)
    return text.lower() if text else None


def parse_float(value: Optional[str]) -> Optional[float]:
    text = normalize_text(value)
    if text is None:
        return None
    return float(text)


def parse_date(value: Optional[str]) -> Optional[str]:
    text = normalize_text(value)
    if text is None:
        return None
    # Accept YYYY-MM-DD and ISO-like timestamps.
    if len(text) >= 10:
        text = text[:10]
    datetime.strptime(text, "%Y-%m-%d")
    return text
