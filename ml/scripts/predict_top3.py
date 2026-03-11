#!/usr/bin/env python3
"""Run top-3 crop prediction using the saved sklearn pipeline model."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--model", required=True, type=Path, help="Path to .joblib model")
    parser.add_argument("--metadata", required=True, type=Path, help="Path to metadata JSON")
    parser.add_argument("--input-json", required=True, help="Input payload JSON string")
    return parser.parse_args()


def import_dependencies():
    try:
        import joblib  # type: ignore
        import pandas as pd  # type: ignore
    except ModuleNotFoundError as exc:
        missing = str(exc).split("'")[1] if "'" in str(exc) else str(exc)
        raise RuntimeError(f"Missing dependency: {missing}") from exc
    return joblib, pd


def build_feature_row(payload: dict, feature_columns: list[str]) -> dict:
    row = {col: None for col in feature_columns}

    # Map API payload fields into training feature names.
    mapping = {
        "sub_county": str(payload.get("subCounty", "")).strip().lower() or None,
        "season": str(payload.get("season", "")).strip().lower() or None,
        "soil_type": str(payload.get("soilType", "")).strip().lower() or None,
        "farm_size_ha": payload.get("farmSize"),
        "input_cost_ksh": payload.get("budget"),
    }
    for key, value in mapping.items():
        if key in row:
            row[key] = value

    # Optional numerical context fields if provided by caller.
    optional_map = {
        "soil_ph": payload.get("soilPH"),
        "avg_temperature_c": payload.get("temperatureC"),
        "total_rainfall_mm": payload.get("rainfallMm"),
        "avg_humidity_pct": payload.get("humidityPct"),
        "avg_wind_speed_kmh": payload.get("windSpeedKmh"),
        "avg_market_price_ksh_per_kg": payload.get("marketPriceKshPerKg"),
        "revenue_ksh": payload.get("revenueKsh"),
        "profit_ksh": payload.get("profitKsh"),
        "yield_ton_per_ha": payload.get("yieldTonPerHa"),
    }
    for key, value in optional_map.items():
        if key in row and value is not None:
            row[key] = value

    return row


def main() -> int:
    args = parse_args()

    try:
        joblib, pd = import_dependencies()
        metadata = json.loads(args.metadata.read_text(encoding="utf-8"))
        payload = json.loads(args.input_json)

        feature_columns = metadata.get("feature_columns") or []
        if not feature_columns:
            raise RuntimeError("feature_columns missing in metadata.")

        model = joblib.load(args.model)
        row = build_feature_row(payload, feature_columns)
        frame = pd.DataFrame([row], columns=feature_columns)

        if not hasattr(model, "predict_proba"):
            pred = model.predict(frame)
            top = [{"crop": str(pred[0]), "confidence": 100.0, "probability": 1.0}]
            print(json.dumps({"success": True, "top_recommendations": top}))
            return 0

        probs = model.predict_proba(frame)[0]
        classes = list(model.named_steps["classifier"].classes_)
        ranked = sorted(zip(classes, probs), key=lambda x: x[1], reverse=True)[:3]
        top = [
            {
                "crop": str(label),
                "confidence": round(float(prob) * 100, 2),
                "probability": round(float(prob), 6),
            }
            for label, prob in ranked
        ]
        top3_combined_confidence = round(sum(item["confidence"] for item in top), 2)

        print(
            json.dumps(
                {
                    "success": True,
                    "top_recommendations": top,
                    "top3_combined_confidence": top3_combined_confidence,
                    "selected_model": metadata.get("selected_model"),
                }
            )
        )
        return 0
    except Exception as exc:
        print(json.dumps({"success": False, "error": str(exc)}))
        return 1


if __name__ == "__main__":
    sys.exit(main())
