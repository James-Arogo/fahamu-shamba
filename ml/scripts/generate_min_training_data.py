#!/usr/bin/env python3
"""Generate minimum synthetic training CSV datasets for ML ingestion."""

from __future__ import annotations

import csv
import random
from datetime import date
from pathlib import Path
import argparse


REPO_ROOT = Path(__file__).resolve().parents[2]
RAW_DIR = REPO_ROOT / "ml" / "data" / "raw"

SUBCOUNTIES = ["bondo", "ugunja", "yala", "gem", "alego"]
CROPS = ["maize", "beans", "rice", "sorghum", "millet", "groundnuts", "tomatoes", "kale"]
SOIL_BY_SUBCOUNTY = {
    "bondo": "sandy",
    "ugunja": "loam",
    "yala": "loam",
    "gem": "clay",
    "alego": "loam",
}
BASE_MARKET_PRICE = {
    "maize": 62,
    "beans": 86,
    "rice": 118,
    "sorghum": 94,
    "millet": 108,
    "groundnuts": 112,
    "tomatoes": 72,
    "kale": 48,
}

CROP_PREFS = {
    ("loam", "long_rains"): [("maize", 0.26), ("beans", 0.22), ("tomatoes", 0.14), ("kale", 0.10), ("rice", 0.08), ("sorghum", 0.08), ("millet", 0.07), ("groundnuts", 0.05)],
    ("loam", "short_rains"): [("beans", 0.24), ("maize", 0.18), ("kale", 0.16), ("groundnuts", 0.12), ("sorghum", 0.10), ("millet", 0.08), ("rice", 0.07), ("tomatoes", 0.05)],
    ("loam", "dry"): [("sorghum", 0.25), ("millet", 0.20), ("groundnuts", 0.17), ("beans", 0.12), ("kale", 0.10), ("maize", 0.07), ("rice", 0.05), ("tomatoes", 0.04)],
    ("clay", "long_rains"): [("rice", 0.26), ("beans", 0.18), ("maize", 0.17), ("kale", 0.12), ("sorghum", 0.10), ("tomatoes", 0.08), ("groundnuts", 0.05), ("millet", 0.04)],
    ("clay", "short_rains"): [("beans", 0.22), ("rice", 0.19), ("sorghum", 0.15), ("kale", 0.13), ("groundnuts", 0.12), ("maize", 0.09), ("millet", 0.06), ("tomatoes", 0.04)],
    ("clay", "dry"): [("sorghum", 0.26), ("millet", 0.22), ("groundnuts", 0.16), ("beans", 0.14), ("kale", 0.09), ("rice", 0.06), ("maize", 0.04), ("tomatoes", 0.03)],
    ("sandy", "long_rains"): [("groundnuts", 0.23), ("beans", 0.20), ("sorghum", 0.16), ("millet", 0.15), ("maize", 0.10), ("tomatoes", 0.08), ("kale", 0.05), ("rice", 0.03)],
    ("sandy", "short_rains"): [("groundnuts", 0.22), ("sorghum", 0.20), ("beans", 0.18), ("millet", 0.16), ("kale", 0.10), ("maize", 0.08), ("tomatoes", 0.04), ("rice", 0.02)],
    ("sandy", "dry"): [("sorghum", 0.29), ("millet", 0.22), ("groundnuts", 0.20), ("beans", 0.12), ("kale", 0.08), ("maize", 0.05), ("tomatoes", 0.03), ("rice", 0.01)],
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--yield-rows", type=int, default=450, help="Synthetic yield row count")
    parser.add_argument("--seed", type=int, default=42, help="Random seed")
    return parser.parse_args()


def season_for_month(month: int) -> str:
    if 3 <= month <= 8:
        return "long_rains"
    if 10 <= month <= 12:
        return "short_rains"
    return "dry"


def month_start_series(start_year: int, start_month: int, count: int) -> list[date]:
    out: list[date] = []
    y = start_year
    m = start_month
    for _ in range(count):
        out.append(date(y, m, 1))
        m += 1
        if m > 12:
            m = 1
            y += 1
    return out


def write_csv(path: Path, headers: list[str], rows: list[list[object]]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.writer(f)
        writer.writerow(headers)
        writer.writerows(rows)


def build_weather_rows() -> list[list[object]]:
    # 12 months: 2025-03 to 2026-02
    months = month_start_series(2025, 3, 12)
    rows: list[list[object]] = []
    for d in months:
        season = season_for_month(d.month)
        for sc in SUBCOUNTIES:
            if season == "long_rains":
                rainfall = random.uniform(85, 220)
                temp = random.uniform(23.5, 29.0)
                humidity = random.uniform(70, 90)
            elif season == "short_rains":
                rainfall = random.uniform(60, 170)
                temp = random.uniform(24.5, 30.5)
                humidity = random.uniform(65, 85)
            else:
                rainfall = random.uniform(5, 45)
                temp = random.uniform(26.0, 33.0)
                humidity = random.uniform(45, 72)
            wind = random.uniform(8, 22)
            rows.append(
                [
                    sc,
                    d.isoformat(),
                    season,
                    round(temp + random.uniform(-0.6, 0.6), 1),
                    round(max(0, rainfall + random.uniform(-10, 10)), 1),
                    round(max(20, min(95, humidity + random.uniform(-4, 4))), 1),
                    round(max(2, wind + random.uniform(-2, 2)), 1),
                    "synthetic_demo",
                ]
            )
    return rows


def build_market_rows() -> list[list[object]]:
    # 6 months: 2025-09 to 2026-02
    months = month_start_series(2025, 9, 6)
    rows: list[list[object]] = []
    for d in months:
        for crop in CROPS:
            base = BASE_MARKET_PRICE[crop]
            for sc in SUBCOUNTIES:
                geo_adj = {
                    "bondo": random.uniform(-2, 3),
                    "ugunja": random.uniform(-3, 2),
                    "yala": random.uniform(-1, 4),
                    "gem": random.uniform(-2, 2),
                    "alego": random.uniform(-3, 3),
                }[sc]
                month_adj = random.uniform(-4, 6)
                price = max(15, base + geo_adj + month_adj)
                trend = random.choice(["up", "down", "stable"])
                rows.append(
                    [
                        sc,
                        f"{sc.title()} Market",
                        crop,
                        round(price, 1),
                        trend,
                        d.isoformat(),
                        "synthetic_demo",
                    ]
                )
    return rows


def build_soil_rows() -> list[list[object]]:
    rows: list[list[object]] = []
    sample_dates = [date(2025, 4, 15), date(2025, 10, 15)]
    for sc in SUBCOUNTIES:
        for d in sample_dates:
            soil_type = SOIL_BY_SUBCOUNTY[sc]
            ph_center = {"sandy": 5.8, "clay": 6.2, "loam": 6.5}[soil_type]
            rows.append(
                [
                    sc,
                    d.isoformat(),
                    soil_type,
                    round(ph_center + random.uniform(-0.35, 0.35), 2),
                    round(random.uniform(1.1, 2.6), 2),
                    round(random.uniform(0.07, 0.18), 3),
                    round(random.uniform(9.0, 24.0), 1),
                    round(random.uniform(110, 220), 1),
                    "synthetic_demo",
                ]
            )
    return rows


def build_yield_rows(count: int = 300) -> list[list[object]]:
    rows: list[list[object]] = []
    for idx in range(1, count + 1):
        sc = random.choice(SUBCOUNTIES)
        season = random.choice(["long_rains", "short_rains", "dry"])
        crop = random.choice(CROPS)
        soil_type = SOIL_BY_SUBCOUNTY[sc]
        weighted = CROP_PREFS.get((soil_type, season)) or CROP_PREFS.get(("loam", season))
        if weighted:
            crop = random.choices(
                [x[0] for x in weighted],
                weights=[x[1] for x in weighted],
                k=1,
            )[0]
        start_month = 3 if season == "long_rains" else 10
        if season == "dry":
            start_month = 1
        planting = date(2025 if season == "long_rains" else 2025, start_month, random.randint(5, 25))
        harvest = date(planting.year, min(12, planting.month + random.randint(3, 4)), random.randint(10, 28))
        farm_size = round(random.uniform(0.6, 6.0), 2)

        yield_per_ha = {
            "maize": random.uniform(1.8, 4.8),
            "beans": random.uniform(0.9, 2.8),
            "rice": random.uniform(2.2, 5.8),
            "sorghum": random.uniform(1.2, 3.6),
            "millet": random.uniform(1.1, 3.1),
            "groundnuts": random.uniform(1.0, 2.7),
            "tomatoes": random.uniform(5.0, 15.0),
            "kale": random.uniform(4.5, 12.0),
        }[crop]
        season_boost = 1.0
        if season == "long_rains":
            season_boost = 1.08
        elif season == "dry":
            season_boost = 0.83

        if crop in ("sorghum", "millet", "groundnuts") and season == "dry":
            season_boost += 0.12
        if crop == "rice" and soil_type == "clay":
            season_boost += 0.10
        if crop in ("tomatoes", "kale") and season == "dry":
            season_boost -= 0.08

        yield_per_ha = max(0.6, yield_per_ha * season_boost)
        total_yield = yield_per_ha * farm_size
        market = BASE_MARKET_PRICE[crop] + random.uniform(-8, 10)
        if season == "dry":
            market += random.uniform(4, 14)
        elif season == "long_rains":
            market += random.uniform(-5, 2)
        revenue = total_yield * 1000 * market / 1000  # keep scale manageable in demo
        input_cost = random.uniform(7000, 38000) * farm_size
        if crop in ("tomatoes", "kale", "rice"):
            input_cost *= 1.18
        if crop in ("sorghum", "millet"):
            input_cost *= 0.86
        profit = revenue - input_cost

        rows.append(
            [
                f"FR-SYN-{idx:05d}",
                sc,
                season,
                crop,
                planting.isoformat(),
                harvest.isoformat(),
                farm_size,
                round(yield_per_ha, 2),
                round(input_cost, 2),
                round(revenue, 2),
                round(profit, 2),
                "synthetic_demo",
            ]
        )
    return rows


def main() -> None:
    args = parse_args()
    random.seed(args.seed)
    weather_rows = build_weather_rows()
    soil_rows = build_soil_rows()
    market_rows = build_market_rows()
    yield_rows = build_yield_rows(args.yield_rows)

    write_csv(
        RAW_DIR / "weather_min_training.csv",
        [
            "sub_county",
            "observation_date",
            "season",
            "temperature_c",
            "rainfall_mm",
            "humidity_pct",
            "wind_speed_kmh",
            "source",
        ],
        weather_rows,
    )

    write_csv(
        RAW_DIR / "soil_min_training.csv",
        [
            "sub_county",
            "sample_date",
            "soil_type",
            "soil_ph",
            "organic_carbon_pct",
            "nitrogen_pct",
            "phosphorus_mgkg",
            "potassium_mgkg",
            "source",
        ],
        soil_rows,
    )

    write_csv(
        RAW_DIR / "market_min_training.csv",
        [
            "sub_county",
            "market_center",
            "crop",
            "price_ksh_per_kg",
            "trend",
            "price_date",
            "source",
        ],
        market_rows,
    )

    write_csv(
        RAW_DIR / "yield_min_training.csv",
        [
            "farmer_id",
            "sub_county",
            "season",
            "crop",
            "planting_date",
            "harvest_date",
            "farm_size_ha",
            "yield_ton_per_ha",
            "input_cost_ksh",
            "revenue_ksh",
            "profit_ksh",
            "source",
        ],
        yield_rows,
    )

    print("Generated:")
    print(f"  weather_min_training.csv rows={len(weather_rows)}")
    print(f"  soil_min_training.csv rows={len(soil_rows)}")
    print(f"  market_min_training.csv rows={len(market_rows)}")
    print(f"  yield_min_training.csv rows={len(yield_rows)}")


if __name__ == "__main__":
    main()
