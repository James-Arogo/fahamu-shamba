#!/usr/bin/env python3
"""Evaluate model performance disparities across key groups."""

from __future__ import annotations

import argparse
import json
import sqlite3
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DB_PATH = REPO_ROOT / "backend" / "fahamu_shamba.db"
DEFAULT_MODEL_PATH = REPO_ROOT / "ml" / "models" / "crop_recommender_model.joblib"
DEFAULT_REPORT_PATH = REPO_ROOT / "ml" / "reports" / "bias_report.json"
TARGET = "recommended_crop"
EAT = timezone(timedelta(hours=3), name="EAT")
GROUP_COLUMNS = ("sub_county", "soil_type", "season")
DROP_COLUMNS = {
    "id",
    "yield_outcome_id",
    "farmer_id",
    "source_row_created_at",
    "built_at",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--db", type=Path, default=DEFAULT_DB_PATH, help="SQLite DB path")
    parser.add_argument("--model", type=Path, default=DEFAULT_MODEL_PATH, help="Trained model .joblib")
    parser.add_argument("--report-out", type=Path, default=DEFAULT_REPORT_PATH, help="JSON output report")
    parser.add_argument("--test-size", type=float, default=0.2, help="Test split ratio")
    parser.add_argument("--random-state", type=int, default=42, help="Random seed")
    parser.add_argument("--min-support", type=int, default=5, help="Minimum rows per group for disparity checks")
    return parser.parse_args()


def import_dependencies():
    try:
        import joblib  # type: ignore
        import pandas as pd  # type: ignore
        from sklearn.metrics import accuracy_score, f1_score  # type: ignore
        from sklearn.model_selection import train_test_split  # type: ignore
    except ModuleNotFoundError as exc:
        missing = str(exc).split("'")[1] if "'" in str(exc) else str(exc)
        raise RuntimeError(f"Missing dependency: {missing}. Install ml/requirements.txt") from exc
    return joblib, pd, accuracy_score, f1_score, train_test_split


def load_training_frame(db_path: Path, pd):
    conn = sqlite3.connect(str(db_path))
    try:
        return pd.read_sql_query("SELECT * FROM training_dataset", conn)
    finally:
        conn.close()


def compute_top3_accuracy(proba, classes, y_true) -> float:
    class_to_index = {label: i for i, label in enumerate(classes)}
    hits = 0
    for idx, truth in enumerate(y_true):
        top3 = proba[idx].argsort()[-3:]
        if class_to_index.get(truth) in top3:
            hits += 1
    return hits / len(y_true) if len(y_true) else 0.0


def group_metrics(group_name, values, y_true_all, preds, probs, classes, accuracy_score, f1_score):
    groups = {}
    for i, value in enumerate(values):
        key = str(value) if value is not None and str(value).strip() else "unknown"
        groups.setdefault(key, {"idx": []})
        groups[key]["idx"].append(i)

    out = {}
    for key, entry in groups.items():
        idx = entry["idx"]
        y_true = [y_true_all[i] for i in idx]
        y_pred = [preds[i] for i in idx]
        subset_probs = probs[idx] if probs is not None else None
        out[key] = {
            "support": len(idx),
            "accuracy": float(accuracy_score(y_true, y_pred)),
            "f1_macro": float(f1_score(y_true, y_pred, average="macro", zero_division=0)),
            "top3_accuracy": float(
                compute_top3_accuracy(subset_probs, classes, y_true)
                if subset_probs is not None and classes
                else 0.0
            ),
        }
    return {group_name: out}


def disparity_summary(group_metrics_map: dict[str, dict], min_support: int) -> dict:
    rows = [
        metrics
        for metrics in group_metrics_map.values()
        if metrics.get("support", 0) >= min_support
    ]
    if not rows:
        return {"eligible_groups": 0, "accuracy_gap": None, "f1_macro_gap": None, "top3_accuracy_gap": None}

    acc = [r["accuracy"] for r in rows]
    f1 = [r["f1_macro"] for r in rows]
    top3 = [r["top3_accuracy"] for r in rows]
    return {
        "eligible_groups": len(rows),
        "accuracy_gap": float(max(acc) - min(acc)),
        "f1_macro_gap": float(max(f1) - min(f1)),
        "top3_accuracy_gap": float(max(top3) - min(top3)),
    }


def main() -> int:
    args = parse_args()
    try:
        joblib, pd, accuracy_score, f1_score, train_test_split = import_dependencies()
    except RuntimeError as err:
        print(str(err))
        return 1

    frame = load_training_frame(args.db, pd)
    if frame.empty:
        print("training_dataset is empty.")
        return 1
    if TARGET not in frame.columns:
        print(f"Target column '{TARGET}' not found in training_dataset.")
        return 1

    feature_columns = [c for c in frame.columns if c not in DROP_COLUMNS and c != TARGET]
    x = frame[feature_columns].copy()
    y = frame[TARGET].astype(str)

    split = train_test_split(
        x,
        y,
        test_size=args.test_size,
        random_state=args.random_state,
        stratify=y if y.nunique() > 1 else None,
    )
    x_test = split[1]
    y_test = split[3]

    model = joblib.load(args.model)
    preds = model.predict(x_test)
    proba = model.predict_proba(x_test) if hasattr(model, "predict_proba") else None
    classes = list(model.named_steps["classifier"].classes_) if hasattr(model, "named_steps") else []

    overall = {
        "accuracy": float(accuracy_score(y_test, preds)),
        "f1_macro": float(f1_score(y_test, preds, average="macro", zero_division=0)),
        "top3_accuracy": float(
            compute_top3_accuracy(proba, classes, list(y_test)) if proba is not None and classes else 0.0
        ),
        "support": int(len(y_test)),
    }

    test_frame = x_test.copy().reset_index(drop=True)
    y_test_reset = y_test.reset_index(drop=True)
    preds_list = list(preds)

    grouped = {}
    for col in GROUP_COLUMNS:
        if col not in test_frame.columns:
            continue
        merged = group_metrics(
            col,
            list(test_frame[col]),
            list(y_test_reset),
            preds_list,
            proba,
            classes,
            accuracy_score,
            f1_score,
        )
        grouped.update(merged)

    disparity = {
        col: disparity_summary(grouped[col], args.min_support)
        for col in grouped.keys()
    }

    report = {
        "generated_at": datetime.now(EAT).isoformat(),
        "model_path": str(args.model),
        "overall": overall,
        "group_metrics": grouped,
        "disparity_summary": disparity,
        "min_support": args.min_support,
    }
    args.report_out.parent.mkdir(parents=True, exist_ok=True)
    args.report_out.write_text(json.dumps(report, indent=2), encoding="utf-8")

    print(f"Bias evaluation complete. Report saved: {args.report_out}")
    print(
        "Overall: "
        f"accuracy={overall['accuracy']:.3f}, f1_macro={overall['f1_macro']:.3f}, "
        f"top3_accuracy={overall['top3_accuracy']:.3f}"
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
