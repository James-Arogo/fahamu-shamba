#!/usr/bin/env python3
"""Ingest yield outcomes CSV into yield_outcomes table."""

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


REQUIRED_COLUMNS = ("sub_county", "season", "crop")


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
    ensure_table_exists(conn, "yield_outcomes")

    inserted = 0
    skipped = 0

    sql = """
    INSERT INTO yield_outcomes (
      farmer_id, sub_county, season, crop, planting_date, harvest_date,
      farm_size_ha, yield_ton_per_ha, input_cost_ksh, revenue_ksh, profit_ksh, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    try:
        for row in rows:
            try:
                sub_county = normalize_sub_county(row.get("sub_county"))
                season = normalize_text(row.get("season"))
                crop = normalize_text(row.get("crop"))
                if not sub_county or not season or not crop:
                    skipped += 1
                    continue

                conn.execute(
                    sql,
                    (
                        normalize_text(row.get("farmer_id")),
                        sub_county,
                        season.lower(),
                        crop.lower(),
                        parse_date(row.get("planting_date")),
                        parse_date(row.get("harvest_date")),
                        parse_float(row.get("farm_size_ha")),
                        parse_float(row.get("yield_ton_per_ha")),
                        parse_float(row.get("input_cost_ksh")),
                        parse_float(row.get("revenue_ksh")),
                        parse_float(row.get("profit_ksh")),
                        normalize_text(row.get("source")) or "import_csv",
                    ),
                )
                inserted += 1
            except Exception:
                skipped += 1

        conn.commit()
    finally:
        conn.close()

    print(f"yield_outcomes: inserted={inserted}, skipped={skipped}")


if __name__ == "__main__":
    main()
