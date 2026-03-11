# Demo Readiness Pack (Hackathon)

## Model Context
- Model: `random_forest`
- Artifact: `ml/models/crop_recommender_model.joblib`
- Inference script: `ml/scripts/predict_top3.py`
- Data basis: synthetic training data (`weather/soil/market/yield`)

## 3 Sample Farmer Scenarios + Expected Outputs

### Scenario 1: Smallholder, Long Rains (Bondo)
**Input**
- `subCounty`: `bondo`
- `soilType`: `loam`
- `season`: `long_rains`
- `budget`: `5000`
- `farmSize`: `2`
- `waterSource`: `Rainfall`

**Expected top-3 recommendation output**
1. `sorghum` - confidence `25.94%`
2. `beans` - confidence `22.10%`
3. `maize` - confidence `14.40%`

---

### Scenario 2: Medium Farm, Short Rains (Gem)
**Input**
- `subCounty`: `gem`
- `soilType`: `clay`
- `season`: `short_rains`
- `budget`: `12000`
- `farmSize`: `3.5`
- `waterSource`: `Irrigation`

**Expected top-3 recommendation output**
1. `beans` - confidence `32.02%`
2. `maize` - confidence `20.16%`
3. `sorghum` - confidence `18.49%`

---

### Scenario 3: Low Budget, Dry Season (Ugunja)
**Input**
- `subCounty`: `ugunja`
- `soilType`: `sandy`
- `season`: `dry`
- `budget`: `3500`
- `farmSize`: `1`
- `waterSource`: `Rainfall`

**Expected top-3 recommendation output**
1. `sorghum` - confidence `26.29%`
2. `beans` - confidence `18.53%`
3. `maize` - confidence `17.59%`

## Synthetic Data Disclaimer (Short)
This demo uses **synthetic, rule-driven datasets** to simulate farm, weather, soil, and market conditions because complete real field datasets are not yet available. Recommendations are for proof-of-concept and system demonstration, not final agronomic advisory.

## Real-Data Roadmap (Short)
1. Integrate real weather feeds per sub-county and store daily observations.
2. Ingest verified market price logs from market centers.
3. Capture farmer-reported and extension-verified yield outcomes each season.
4. Add soil lab samples (pH/NPK/organic carbon) at ward/sub-county level.
5. Retrain model each season, compare against baseline, and publish updated metrics.
