#!/usr/bin/env python3
"""Ingest market prices CSV into market_prices table."""

from __future__ import annotations

import argparse
from pathlib import Path

from _ingest_utils import (
    DEFAULT_DB_PATH,
    connect_db,
    ensure_table_exists,
    load_csv_rows,
    normalize_sub_county,
    normalize_text,
    parse_date,
    parse_float,
    require_columns,
)


REQUIRED_COLUMNS = ("sub_county", "crop", "price_ksh_per_kg", "price_date")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--csv", required=True, type=Path, help="Path to source CSV file")
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"SQLite DB path (default: {DEFAULT_DB_PATH})",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    rows = load_csv_rows(args.csv)
    require_columns(rows, REQUIRED_COLUMNS)

    conn = connect_db(args.db)
    ensure_table_exists(conn, "market_prices")

    inserted = 0
    skipped = 0

    sql = """
    INSERT INTO market_prices (
      sub_county, market_center, crop, price_ksh_per_kg, trend,
      price_date, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """

    try:
        for row in rows:
            try:
                sub_county = normalize_sub_county(row.get("sub_county"))
                crop = normalize_text(row.get("crop"))
                price = parse_float(row.get("price_ksh_per_kg"))
                price_date = parse_date(row.get("price_date"))
                if not sub_county or not crop or price is None or not price_date:
                    skipped += 1
                    continue

                conn.execute(
                    sql,
                    (
                        sub_county,
                        normalize_text(row.get("market_center")),
                        crop.lower(),
                        price,
                        (normalize_text(row.get("trend")) or "stable").lower(),
                        price_date,
                        normalize_text(row.get("source")) or "import_csv",
                    ),
                )
                inserted += 1
            except Exception:
                skipped += 1

        conn.commit()
    finally:
        conn.close()

    print(f"market_prices: inserted={inserted}, skipped={skipped}")


if __name__ == "__main__":
    main()
