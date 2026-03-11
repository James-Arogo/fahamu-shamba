#!/usr/bin/env python3
"""Train baseline crop recommendation classifiers from training_dataset."""

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
DEFAULT_METADATA_PATH = REPO_ROOT / "ml" / "models" / "crop_recommender_metadata.json"
DEFAULT_METRICS_PATH = REPO_ROOT / "ml" / "reports" / "model_metrics.json"
EAT = timezone(timedelta(hours=3), name="EAT")

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
    parser.add_argument("--target", default="recommended_crop", help="Target column name")
    parser.add_argument("--test-size", type=float, default=0.2, help="Test split ratio")
    parser.add_argument("--random-state", type=int, default=42, help="Random seed")
    parser.add_argument("--model-out", type=Path, default=DEFAULT_MODEL_PATH, help="Output model path")
    parser.add_argument(
        "--metadata-out",
        type=Path,
        default=DEFAULT_METADATA_PATH,
        help="Output metadata JSON path",
    )
    parser.add_argument(
        "--metrics-out",
        type=Path,
        default=DEFAULT_METRICS_PATH,
        help="Output metrics JSON path",
    )
    parser.add_argument(
        "--min-top3-accuracy",
        type=float,
        default=0.70,
        help="Minimum acceptable top-3 accuracy threshold",
    )
    parser.add_argument(
        "--enforce-min-top3",
        action="store_true",
        help="Exit non-zero when selected model top-3 accuracy is below threshold",
    )
    return parser.parse_args()


def import_dependencies():
    try:
        import joblib  # type: ignore
        import pandas as pd  # type: ignore
        from sklearn.compose import ColumnTransformer  # type: ignore
        from sklearn.ensemble import RandomForestClassifier  # type: ignore
        from sklearn.impute import SimpleImputer  # type: ignore
        from sklearn.linear_model import LogisticRegression  # type: ignore
        from sklearn.metrics import accuracy_score, classification_report, f1_score  # type: ignore
        from sklearn.model_selection import train_test_split  # type: ignore
        from sklearn.pipeline import Pipeline  # type: ignore
        from sklearn.preprocessing import OneHotEncoder, StandardScaler  # type: ignore
    except ModuleNotFoundError as exc:
        missing = str(exc).split("'")[1] if "'" in str(exc) else str(exc)
        raise RuntimeError(
            "Missing ML dependency: "
            f"{missing}. Install requirements with: pip install -r ml/requirements.txt"
        ) from exc

    return {
        "joblib": joblib,
        "pd": pd,
        "ColumnTransformer": ColumnTransformer,
        "RandomForestClassifier": RandomForestClassifier,
        "SimpleImputer": SimpleImputer,
        "LogisticRegression": LogisticRegression,
        "accuracy_score": accuracy_score,
        "classification_report": classification_report,
        "f1_score": f1_score,
        "train_test_split": train_test_split,
        "Pipeline": Pipeline,
        "OneHotEncoder": OneHotEncoder,
        "StandardScaler": StandardScaler,
    }


def load_training_frame(db_path: Path, pd):
    conn = sqlite3.connect(str(db_path))
    try:
        frame = pd.read_sql_query("SELECT * FROM training_dataset", conn)
    finally:
        conn.close()
    return frame


def top_k_accuracy(model, x_test, y_true, classes, k: int = 3) -> float:
    if not hasattr(model, "predict_proba"):
        return float((model.predict(x_test) == y_true).mean())

    proba = model.predict_proba(x_test)
    class_to_index = {label: idx for idx, label in enumerate(classes)}
    hits = 0
    for i, true_label in enumerate(y_true):
        top_indices = proba[i].argsort()[-k:]
        if class_to_index.get(true_label) in top_indices:
            hits += 1
    return hits / len(y_true) if len(y_true) else 0.0


def main() -> int:
    args = parse_args()

    try:
        deps = import_dependencies()
    except RuntimeError as err:
        print(str(err))
        return 1

    pd = deps["pd"]
    frame = load_training_frame(args.db, pd)
    if frame.empty:
        print("training_dataset is empty. Run build_training_dataset.py first.")
        return 1
    if args.target not in frame.columns:
        print(f"Target column '{args.target}' not found in training_dataset.")
        return 1

    frame = frame.dropna(subset=[args.target]).copy()
    y = frame[args.target].astype(str)
    feature_columns = [c for c in frame.columns if c not in DROP_COLUMNS and c != args.target]
    x = frame[feature_columns].copy()

    # Robust dtype split for sklearn pipelines (handles pandas object/string/category dtypes).
    categorical_cols = [c for c in x.columns if not pd.api.types.is_numeric_dtype(x[c])]
    numeric_cols = [c for c in x.columns if pd.api.types.is_numeric_dtype(x[c])]

    OneHotEncoder = deps["OneHotEncoder"]
    SimpleImputer = deps["SimpleImputer"]
    StandardScaler = deps["StandardScaler"]
    ColumnTransformer = deps["ColumnTransformer"]
    Pipeline = deps["Pipeline"]

    categorical_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="most_frequent")),
            ("encoder", OneHotEncoder(handle_unknown="ignore")),
        ]
    )
    numeric_pipe = Pipeline(
        steps=[
            ("imputer", SimpleImputer(strategy="median")),
            ("scaler", StandardScaler()),
        ]
    )
    preprocess = ColumnTransformer(
        transformers=[
            ("num", numeric_pipe, numeric_cols),
            ("cat", categorical_pipe, categorical_cols),
        ]
    )

    train_test_split = deps["train_test_split"]
    x_train, x_test, y_train, y_test = train_test_split(
        x,
        y,
        test_size=args.test_size,
        random_state=args.random_state,
        stratify=y if y.nunique() > 1 else None,
    )

    models = {
        "logistic_regression": Pipeline(
            steps=[
                ("preprocess", preprocess),
                (
                    "classifier",
                    deps["LogisticRegression"](
                        max_iter=1200,
                        class_weight="balanced",
                    ),
                ),
            ]
        ),
        "random_forest": Pipeline(
            steps=[
                ("preprocess", preprocess),
                (
                    "classifier",
                    deps["RandomForestClassifier"](
                        n_estimators=300,
                        max_depth=18,
                        min_samples_leaf=2,
                        class_weight="balanced_subsample",
                        random_state=args.random_state,
                    ),
                ),
            ]
        ),
    }

    accuracy_score = deps["accuracy_score"]
    f1_score = deps["f1_score"]
    classification_report = deps["classification_report"]

    evaluation = {}
    best_name = None
    best_model = None
    best_f1 = -1.0

    for name, model in models.items():
        model.fit(x_train, y_train)
        preds = model.predict(x_test)
        classes = list(model.named_steps["classifier"].classes_)

        acc = float(accuracy_score(y_test, preds))
        f1_macro = float(f1_score(y_test, preds, average="macro"))
        top3 = float(top_k_accuracy(model, x_test, list(y_test), classes, k=3))
        report = classification_report(y_test, preds, output_dict=True, zero_division=0)

        evaluation[name] = {
            "accuracy": acc,
            "f1_macro": f1_macro,
            "top3_accuracy": top3,
            "classes": classes,
            "classification_report": report,
        }

        if f1_macro > best_f1:
            best_f1 = f1_macro
            best_name = name
            best_model = model

    if best_model is None or best_name is None:
        print("No model was trained.")
        return 1

    args.model_out.parent.mkdir(parents=True, exist_ok=True)
    args.metrics_out.parent.mkdir(parents=True, exist_ok=True)
    args.metadata_out.parent.mkdir(parents=True, exist_ok=True)

    deps["joblib"].dump(best_model, args.model_out)

    generated_at = datetime.now(EAT).isoformat()

    metrics_payload = {
        "generated_at": generated_at,
        "target": args.target,
        "dataset_rows": int(len(frame)),
        "train_rows": int(len(x_train)),
        "test_rows": int(len(x_test)),
        "selected_model": best_name,
        "selected_model_metrics": {
            "accuracy": evaluation[best_name]["accuracy"],
            "f1_macro": evaluation[best_name]["f1_macro"],
            "top3_accuracy": evaluation[best_name]["top3_accuracy"],
        },
        "quality_gate": {
            "min_top3_accuracy": float(args.min_top3_accuracy),
            "selected_model_top3_accuracy": float(evaluation[best_name]["top3_accuracy"]),
            "passed": bool(evaluation[best_name]["top3_accuracy"] >= args.min_top3_accuracy),
            "enforced": bool(args.enforce_min_top3),
        },
        "models": evaluation,
    }
    args.metrics_out.write_text(json.dumps(metrics_payload, indent=2), encoding="utf-8")

    metadata_payload = {
        "generated_at": generated_at,
        "target": args.target,
        "selected_model": best_name,
        "feature_columns": feature_columns,
        "numeric_columns": numeric_cols,
        "categorical_columns": categorical_cols,
        "labels": evaluation[best_name]["classes"],
        "model_path": str(args.model_out),
    }
    args.metadata_out.write_text(json.dumps(metadata_payload, indent=2), encoding="utf-8")

    print("Training complete.")
    print(f"Selected model: {best_name}")
    print(f"Model saved: {args.model_out}")
    print(f"Metrics saved: {args.metrics_out}")
    print(f"Metadata saved: {args.metadata_out}")
    if evaluation[best_name]["top3_accuracy"] < args.min_top3_accuracy:
      print(
          f"WARNING: selected model top3_accuracy={evaluation[best_name]['top3_accuracy']:.4f} "
          f"is below threshold={args.min_top3_accuracy:.4f}."
      )
      if args.enforce_min_top3:
          print("Failing due to --enforce-min-top3.")
          return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
