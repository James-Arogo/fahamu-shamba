#!/usr/bin/env python3
"""Build a joined ML training dataset from core source tables."""

from __future__ import annotations

import argparse
import sqlite3
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = REPO_ROOT / "backend" / "fahamu_shamba.db"

REQUIRED_TABLES = (
    "weather_observations",
    "soil_samples",
    "market_prices",
    "yield_outcomes",
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--db",
        type=Path,
        default=DEFAULT_DB_PATH,
        help=f"SQLite DB path (default: {DEFAULT_DB_PATH})",
    )
    parser.add_argument(
        "--mode",
        choices=("replace", "append"),
        default="replace",
        help="replace: recreate training_dataset table; append: add new rows",
    )
    return parser.parse_args()


def ensure_table_exists(conn: sqlite3.Connection, table_name: str) -> None:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name = ?",
        (table_name,),
    ).fetchone()
    if not row:
        raise RuntimeError(f"Required table '{table_name}' not found.")


def create_training_table(conn: sqlite3.Connection, replace: bool) -> None:
    if replace:
        conn.execute("DROP TABLE IF EXISTS training_dataset")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS training_dataset (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          yield_outcome_id INTEGER UNIQUE,
          farmer_id TEXT,
          sub_county TEXT NOT NULL,
          season TEXT NOT NULL,
          recommended_crop TEXT NOT NULL,
          farm_size_ha REAL,
          yield_ton_per_ha REAL,
          input_cost_ksh REAL,
          revenue_ksh REAL,
          profit_ksh REAL,
          soil_type TEXT,
          soil_ph REAL,
          organic_carbon_pct REAL,
          nitrogen_pct REAL,
          phosphorus_mgkg REAL,
          potassium_mgkg REAL,
          avg_temperature_c REAL,
          total_rainfall_mm REAL,
          avg_humidity_pct REAL,
          avg_wind_speed_kmh REAL,
          avg_market_price_ksh_per_kg REAL,
          source_row_created_at TEXT,
          built_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
        """
    )

    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_training_location_season ON training_dataset(sub_county, season)"
    )
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_training_crop ON training_dataset(recommended_crop)"
    )


def build_query() -> str:
    # One row per yield outcome; join nearest/aggregated soil, weather, market context.
    return """
    WITH base AS (
      SELECT
        y.id AS yield_outcome_id,
        y.farmer_id,
        lower(trim(y.sub_county)) AS sub_county,
        lower(trim(y.season)) AS season,
        lower(trim(y.crop)) AS recommended_crop,
        y.farm_size_ha,
        y.yield_ton_per_ha,
        y.input_cost_ksh,
        y.revenue_ksh,
        y.profit_ksh,
        y.planting_date,
        y.harvest_date,
        y.created_at AS source_row_created_at
      FROM yield_outcomes y
      WHERE y.sub_county IS NOT NULL
        AND y.season IS NOT NULL
        AND y.crop IS NOT NULL
    ),
    weather_agg AS (
      SELECT
        lower(trim(sub_county)) AS sub_county,
        lower(trim(season)) AS season,
        AVG(temperature_c) AS avg_temperature_c,
        SUM(rainfall_mm) AS total_rainfall_mm,
        AVG(humidity_pct) AS avg_humidity_pct,
        AVG(wind_speed_kmh) AS avg_wind_speed_kmh
      FROM weather_observations
      GROUP BY lower(trim(sub_county)), lower(trim(season))
    ),
    soil_ranked AS (
      SELECT
        lower(trim(s.sub_county)) AS sub_county,
        lower(trim(s.soil_type)) AS soil_type,
        s.soil_ph,
        s.organic_carbon_pct,
        s.nitrogen_pct,
        s.phosphorus_mgkg,
        s.potassium_mgkg,
        s.sample_date,
        ROW_NUMBER() OVER (
          PARTITION BY lower(trim(s.sub_county))
          ORDER BY s.sample_date DESC, s.id DESC
        ) AS rn
      FROM soil_samples s
    ),
    soil_latest AS (
      SELECT
        sub_county,
        soil_type,
        soil_ph,
        organic_carbon_pct,
        nitrogen_pct,
        phosphorus_mgkg,
        potassium_mgkg
      FROM soil_ranked
      WHERE rn = 1
    ),
    market_agg AS (
      SELECT
        lower(trim(sub_county)) AS sub_county,
        lower(trim(crop)) AS crop,
        AVG(price_ksh_per_kg) AS avg_market_price_ksh_per_kg
      FROM market_prices
      GROUP BY lower(trim(sub_county)), lower(trim(crop))
    )
    SELECT
      b.yield_outcome_id,
      b.farmer_id,
      b.sub_county,
      b.season,
      b.recommended_crop,
      b.farm_size_ha,
      b.yield_ton_per_ha,
      b.input_cost_ksh,
      b.revenue_ksh,
      b.profit_ksh,
      sl.soil_type,
      sl.soil_ph,
      sl.organic_carbon_pct,
      sl.nitrogen_pct,
      sl.phosphorus_mgkg,
      sl.potassium_mgkg,
      wa.avg_temperature_c,
      wa.total_rainfall_mm,
      wa.avg_humidity_pct,
      wa.avg_wind_speed_kmh,
      ma.avg_market_price_ksh_per_kg,
      b.source_row_created_at
    FROM base b
    LEFT JOIN soil_latest sl
      ON sl.sub_county = b.sub_county
    LEFT JOIN weather_agg wa
      ON wa.sub_county = b.sub_county
     AND wa.season = b.season
    LEFT JOIN market_agg ma
      ON ma.sub_county = b.sub_county
     AND ma.crop = b.recommended_crop
    """


def main() -> None:
    args = parse_args()
    conn = sqlite3.connect(str(args.db))
    conn.row_factory = sqlite3.Row

    try:
      for table in REQUIRED_TABLES:
          ensure_table_exists(conn, table)

      create_training_table(conn, replace=(args.mode == "replace"))

      select_sql = build_query()
      rows = conn.execute(select_sql).fetchall()
      if not rows:
          print("No source rows found in yield_outcomes; nothing to build.")
          return

      insert_sql = """
      INSERT OR REPLACE INTO training_dataset (
        yield_outcome_id, farmer_id, sub_county, season, recommended_crop,
        farm_size_ha, yield_ton_per_ha, input_cost_ksh, revenue_ksh, profit_ksh,
        soil_type, soil_ph, organic_carbon_pct, nitrogen_pct, phosphorus_mgkg, potassium_mgkg,
        avg_temperature_c, total_rainfall_mm, avg_humidity_pct, avg_wind_speed_kmh,
        avg_market_price_ksh_per_kg, source_row_created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      """

      payload = [
          (
              r["yield_outcome_id"],
              r["farmer_id"],
              r["sub_county"],
              r["season"],
              r["recommended_crop"],
              r["farm_size_ha"],
              r["yield_ton_per_ha"],
              r["input_cost_ksh"],
              r["revenue_ksh"],
              r["profit_ksh"],
              r["soil_type"],
              r["soil_ph"],
              r["organic_carbon_pct"],
              r["nitrogen_pct"],
              r["phosphorus_mgkg"],
              r["potassium_mgkg"],
              r["avg_temperature_c"],
              r["total_rainfall_mm"],
              r["avg_humidity_pct"],
              r["avg_wind_speed_kmh"],
              r["avg_market_price_ksh_per_kg"],
              r["source_row_created_at"],
          )
          for r in rows
      ]
      conn.executemany(insert_sql, payload)
      conn.commit()

      built_count = conn.execute("SELECT COUNT(*) AS c FROM training_dataset").fetchone()["c"]
      print(f"training_dataset build complete: inserted_or_updated={len(payload)}, total_rows={built_count}")
    finally:
        conn.close()


if __name__ == "__main__":
    main()
