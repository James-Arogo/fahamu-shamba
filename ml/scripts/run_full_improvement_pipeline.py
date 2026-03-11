#!/usr/bin/env python3
"""Run end-to-end synthetic-data ML improvement pipeline."""

from __future__ import annotations

import argparse
import sqlite3
import subprocess
import sys
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = REPO_ROOT / "backend" / "fahamu_shamba.db"
SCRIPTS_DIR = REPO_ROOT / "ml" / "scripts"
RAW_DIR = REPO_ROOT / "ml" / "data" / "raw"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH, help="SQLite DB path")
    parser.add_argument("--seed", type=int, default=42, help="Synthetic data seed")
    parser.add_argument("--yield-rows", type=int, default=450, help="Synthetic yield row count")
    parser.add_argument("--min-top3-accuracy", type=float, default=0.70, help="Quality gate threshold")
    parser.add_argument("--skip-reset", action="store_true", help="Do not clear existing source tables before ingest")
    return parser.parse_args()


def run_step(step_no: int, title: str, cmd: list[str]) -> None:
    print(f"\n[{step_no}] {title}")
    print("  $", " ".join(cmd))
    subprocess.run(cmd, check=True, cwd=str(REPO_ROOT))


def reset_source_tables(db_path: Path) -> None:
    tables = [
        "weather_observations",
        "soil_samples",
        "market_prices",
        "yield_outcomes",
        "training_dataset",
    ]
    conn = sqlite3.connect(str(db_path))
    try:
        for t in tables:
            conn.execute(f"DELETE FROM {t}")
        conn.commit()
    finally:
        conn.close()


def main() -> int:
    args = parse_args()
    py = sys.executable
    db_path = args.db if args.db.is_absolute() else args.db.resolve()

    try:
        if not args.skip_reset:
            print("\n[0] Reset source/training tables")
            reset_source_tables(db_path)
            print("  Cleared weather_observations, soil_samples, market_prices, yield_outcomes, training_dataset")

        run_step(
            1,
            "Generate synthetic minimum training data",
            [
                py,
                str(SCRIPTS_DIR / "generate_min_training_data.py"),
                "--seed",
                str(args.seed),
                "--yield-rows",
                str(args.yield_rows),
            ],
        )
        run_step(
            2,
            "Ingest weather CSV",
            [py, str(SCRIPTS_DIR / "ingest_weather.py"), "--csv", str(RAW_DIR / "weather_min_training.csv"), "--db", str(db_path)],
        )
        run_step(
            3,
            "Ingest soil CSV",
            [py, str(SCRIPTS_DIR / "ingest_soil.py"), "--csv", str(RAW_DIR / "soil_min_training.csv"), "--db", str(db_path)],
        )
        run_step(
            4,
            "Ingest market CSV",
            [py, str(SCRIPTS_DIR / "ingest_market.py"), "--csv", str(RAW_DIR / "market_min_training.csv"), "--db", str(db_path)],
        )
        run_step(
            5,
            "Ingest yield CSV",
            [py, str(SCRIPTS_DIR / "ingest_yield.py"), "--csv", str(RAW_DIR / "yield_min_training.csv"), "--db", str(db_path)],
        )
        run_step(
            6,
            "Build joined training_dataset",
            [py, str(SCRIPTS_DIR / "build_training_dataset.py"), "--db", str(db_path), "--mode", "replace"],
        )
        run_step(
            7,
            "Train baseline model with top-3 quality gate",
            [
                py,
                str(SCRIPTS_DIR / "train_baseline_model.py"),
                "--db",
                str(db_path),
                "--min-top3-accuracy",
                str(args.min_top3_accuracy),
                "--enforce-min-top3",
            ],
        )
        run_step(
            8,
            "Evaluate bias/disparities by group",
            [py, str(SCRIPTS_DIR / "evaluate_bias.py"), "--db", str(db_path)],
        )
        run_step(
            9,
            "Run 3 panel demo scenarios",
            [py, str(SCRIPTS_DIR / "run_demo_scenarios.py")],
        )
    except subprocess.CalledProcessError as exc:
        print(f"\nPipeline failed at command: {' '.join(exc.cmd)}")
        return exc.returncode or 1

    print("\nPipeline complete.")
    print("Artifacts:")
    print(f"  - {REPO_ROOT / 'ml' / 'models' / 'crop_recommender_model.joblib'}")
    print(f"  - {REPO_ROOT / 'ml' / 'reports' / 'model_metrics.json'}")
    print(f"  - {REPO_ROOT / 'ml' / 'reports' / 'bias_report.json'}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
