# Model Improvement Runbook (Step-by-Step)

## 1) Activate Python environment
```bash
cd /home/james-arogo/Desktop/fahamu-shamba
python3 -m venv .venv
source .venv/bin/activate
pip install -r ml/requirements.txt
```

## 2) Run full pipeline (one command)
```bash
python ml/scripts/run_full_improvement_pipeline.py --db backend/fahamu_shamba.db --min-top3-accuracy 0.70
```

This executes:
1. Synthetic data generation (weather/soil/market/yield).
2. Ingestion into DB tables.
3. Training dataset build.
4. Model training with top-3 quality gate (`>=70%`).
5. Bias/disparity report generation.
6. Demo scenario execution.

## 3) Check outputs
- `ml/models/crop_recommender_model.joblib`
- `ml/models/crop_recommender_metadata.json`
- `ml/reports/model_metrics.json`
- `ml/reports/bias_report.json`

## 4) Optional: run each step manually
```bash
python ml/scripts/generate_min_training_data.py --seed 42 --yield-rows 450
python ml/scripts/ingest_weather.py --csv ml/data/raw/weather_min_training.csv --db backend/fahamu_shamba.db
python ml/scripts/ingest_soil.py --csv ml/data/raw/soil_min_training.csv --db backend/fahamu_shamba.db
python ml/scripts/ingest_market.py --csv ml/data/raw/market_min_training.csv --db backend/fahamu_shamba.db
python ml/scripts/ingest_yield.py --csv ml/data/raw/yield_min_training.csv --db backend/fahamu_shamba.db
python ml/scripts/build_training_dataset.py --db backend/fahamu_shamba.db --mode replace
python ml/scripts/train_baseline_model.py --db backend/fahamu_shamba.db --min-top3-accuracy 0.70 --enforce-min-top3
python ml/scripts/evaluate_bias.py --db backend/fahamu_shamba.db
python ml/scripts/run_demo_scenarios.py
```
