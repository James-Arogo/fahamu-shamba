#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PY_BIN="${PY_BIN:-$ROOT_DIR/.venv/bin/python}"
DB_PATH="${DB_PATH:-$ROOT_DIR/backend/fahamu_shamba.db}"
API_BASE="${API_BASE:-http://localhost:5000}"

if [[ ! -x "$PY_BIN" ]]; then
  echo "Python venv not found at $PY_BIN"
  echo "Create it with: python3 -m venv $ROOT_DIR/.venv && source $ROOT_DIR/.venv/bin/activate && pip install -r $ROOT_DIR/ml/requirements.txt"
  exit 1
fi

echo "[1/3] Rebuilding deterministic demo dataset + model..."
"$PY_BIN" "$ROOT_DIR/ml/scripts/run_full_improvement_pipeline.py" --db "$DB_PATH" --min-top3-accuracy 0.70

echo "[2/3] Activating backend demo mode..."
curl -sS -X POST "$API_BASE/api/demo-mode/activate" -H "Content-Type: application/json" >/dev/null

echo "[3/3] Demo mode status:"
curl -sS "$API_BASE/api/demo-mode/status"
echo ""
echo "Hackathon Demo Mode ready."
