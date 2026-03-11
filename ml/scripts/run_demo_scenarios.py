#!/usr/bin/env python3
"""Execute demo scenarios and print a panel-ready summary table."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SCENARIOS_PATH = REPO_ROOT / "ml" / "reports" / "demo_scenarios.json"
DEFAULT_MODEL_PATH = REPO_ROOT / "ml" / "models" / "crop_recommender_model.joblib"
DEFAULT_METADATA_PATH = REPO_ROOT / "ml" / "models" / "crop_recommender_metadata.json"


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--scenarios", type=Path, default=DEFAULT_SCENARIOS_PATH, help="Path to demo_scenarios.json")
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL_PATH, help="Path to model .joblib")
    parser.add_argument("--metadata", type=Path, default=DEFAULT_METADATA_PATH, help="Path to model metadata JSON")
    return parser.parse_args()


def import_dependencies():
    try:
        import joblib  # type: ignore
        import pandas as pd  # type: ignore
    except ModuleNotFoundError as exc:
        missing = str(exc).split("'")[1] if "'" in str(exc) else str(exc)
        raise RuntimeError(f"Missing dependency: {missing}. Activate .venv and install ml/requirements.txt") from exc
    return joblib, pd


def build_feature_row(payload: dict[str, Any], feature_columns: list[str]) -> dict[str, Any]:
    row = {col: None for col in feature_columns}

    mapped = {
        "sub_county": str(payload.get("subCounty", "")).strip().lower() or None,
        "season": str(payload.get("season", "")).strip().lower() or None,
        "soil_type": str(payload.get("soilType", "")).strip().lower() or None,
        "farm_size_ha": payload.get("farmSize"),
        "input_cost_ksh": payload.get("budget"),
    }

    for key, value in mapped.items():
        if key in row:
            row[key] = value

    return row


def score_scenario(model, pd, feature_columns: list[str], scenario_input: dict[str, Any]) -> list[dict[str, Any]]:
    row = build_feature_row(scenario_input, feature_columns)
    frame = pd.DataFrame([row], columns=feature_columns)

    if not hasattr(model, "predict_proba"):
        pred = model.predict(frame)
        return [{"crop": str(pred[0]), "confidence_percent": 100.0}]

    probs = model.predict_proba(frame)[0]
    classes = list(model.named_steps["classifier"].classes_)
    ranked = sorted(zip(classes, probs), key=lambda x: x[1], reverse=True)[:3]
    return [{"crop": str(label), "confidence_percent": round(float(prob) * 100, 2)} for label, prob in ranked]


def print_table(headers: list[str], rows: list[list[str]]) -> None:
    widths = [len(h) for h in headers]
    for row in rows:
        for i, cell in enumerate(row):
            widths[i] = max(widths[i], len(cell))

    def fmt_row(cells: list[str]) -> str:
        return " | ".join(cell.ljust(widths[i]) for i, cell in enumerate(cells))

    separator = "-+-".join("-" * w for w in widths)
    print(fmt_row(headers))
    print(separator)
    for row in rows:
        print(fmt_row(row))


def main() -> int:
    args = parse_args()
    try:
        joblib, pd = import_dependencies()
    except RuntimeError as err:
        print(str(err))
        return 1

    scenarios_doc = json.loads(args.scenarios.read_text(encoding="utf-8"))
    metadata = json.loads(args.metadata.read_text(encoding="utf-8"))
    model = joblib.load(args.model)

    feature_columns = metadata.get("feature_columns") or []
    if not feature_columns:
        print("feature_columns missing in metadata.")
        return 1

    scenarios = scenarios_doc.get("scenarios", [])
    if not scenarios:
        print("No scenarios found in scenario file.")
        return 1

    table_rows: list[list[str]] = []
    for idx, scenario in enumerate(scenarios, start=1):
        name = scenario.get("name", f"Scenario {idx}")
        payload = scenario.get("input", {})
        predictions = score_scenario(model, pd, feature_columns, payload)
        input_brief = f"{payload.get('subCounty','-')}/{payload.get('soilType','-')}/{payload.get('season','-')}"

        top_cells = []
        for rank in range(3):
            if rank < len(predictions):
                item = predictions[rank]
                top_cells.append(f"{item['crop']} ({item['confidence_percent']:.2f}%)")
            else:
                top_cells.append("-")

        top3_combined = round(sum([p["confidence_percent"] for p in predictions[:3]]), 2)
        table_rows.append([name, input_brief, top_cells[0], top_cells[1], top_cells[2], f"{top3_combined:.2f}%"])

    print("\nFahamu Shamba Demo Scenarios (Live Model Output)\n")
    print_table(
        ["Scenario", "Input (sub/soil/season)", "Top 1", "Top 2", "Top 3", "Top-3 Combined"],
        table_rows,
    )
    print("\nModel:", metadata.get("selected_model", "unknown"))
    print("Artifact:", args.model)
    return 0


if __name__ == "__main__":
    sys.exit(main())
