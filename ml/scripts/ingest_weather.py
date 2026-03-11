#!/usr/bin/env python3
"""Ingest weather observations CSV into weather_observations table."""

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


REQUIRED_COLUMNS = ("sub_county", "observation_date")


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
    ensure_table_exists(conn, "weather_observations")

    inserted = 0
    skipped = 0

    sql = """
    INSERT INTO weather_observations (
      sub_county, observation_date, season, temperature_c, rainfall_mm,
      humidity_pct, wind_speed_kmh, source
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    """

    try:
        for row in rows:
            try:
                sub_county = normalize_sub_county(row.get("sub_county"))
                observation_date = parse_date(row.get("observation_date"))
                if not sub_county or not observation_date:
                    skipped += 1
                    continue

                conn.execute(
                    sql,
                    (
                        sub_county,
                        observation_date,
                        normalize_text(row.get("season")),
                        parse_float(row.get("temperature_c")),
                        parse_float(row.get("rainfall_mm")) or 0.0,
                        parse_float(row.get("humidity_pct")),
                        parse_float(row.get("wind_speed_kmh")),
                        normalize_text(row.get("source")) or "import_csv",
                    ),
                )
                inserted += 1
            except Exception:
                skipped += 1

        conn.commit()
    finally:
        conn.close()

    print(f"weather_observations: inserted={inserted}, skipped={skipped}")


if __name__ == "__main__":
    main()
