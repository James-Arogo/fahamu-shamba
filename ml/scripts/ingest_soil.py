#!/usr/bin/env python3
"""Ingest soil samples CSV into soil_samples table."""

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


REQUIRED_COLUMNS = ("sub_county", "sample_date", "soil_type")


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
    ensure_table_exists(conn, "soil_samples")

    inserted = 0
    skipped = 0

    sql = """
    INSERT INTO soil_samples (
      sub_county, sample_date, soil_type, soil_ph, organic_carbon_pct,
      nitrogen_pct, phosphorus_mgkg, potassium_mgkg, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """

    try:
        for row in rows:
            try:
                sub_county = normalize_sub_county(row.get("sub_county"))
                sample_date = parse_date(row.get("sample_date"))
                soil_type = normalize_text(row.get("soil_type"))
                if not sub_county or not sample_date or not soil_type:
                    skipped += 1
                    continue

                conn.execute(
                    sql,
                    (
                        sub_county,
                        sample_date,
                        soil_type.lower(),
                        parse_float(row.get("soil_ph")),
                        parse_float(row.get("organic_carbon_pct")),
                        parse_float(row.get("nitrogen_pct")),
                        parse_float(row.get("phosphorus_mgkg")),
                        parse_float(row.get("potassium_mgkg")),
                        normalize_text(row.get("source")) or "import_csv",
                    ),
                )
                inserted += 1
            except Exception:
                skipped += 1

        conn.commit()
    finally:
        conn.close()

    print(f"soil_samples: inserted={inserted}, skipped={skipped}")


if __name__ == "__main__":
    main()
