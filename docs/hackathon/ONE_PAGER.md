# Fahamu Shamba One-Pager

## Problem
Farmers need fast, local, and practical decisions on **what to plant**, **when to plant**, and **how to manage risk** using soil, weather, and market evidence.

## Solution
Fahamu Shamba provides:
- AI crop recommendation (top-3 options),
- explainability on decision factors,
- season planning scenarios,
- agricultural chatbot restricted to farm-domain support.

## Core Features
- Personalized recommendation endpoint (`/api/analyze-farm`)
- Real-time weather + market context
- Season Planning Lab with scenario comparison
- Demo Mode with deterministic personas for live judging
- Monitoring + KPI dashboards

## AI/ML Evaluation
- Accuracy, F1-macro, Top-3 accuracy in `ml/reports/model_metrics.json`
- Bias/disparity reporting in `ml/reports/bias_report.json`
- Model + metadata versioned in `ml/models/`

## Trust and Guardrails
- Agriculture-only chatbot policy and external-agent fallback chain
- Input validation and API reliability fallback behavior
- Synthetic data disclosure and production roadmap

## Expected Impact
- Higher recommendation relevance per farm context
- Better seasonal planning under weather/price uncertainty
- Improved farmer decision confidence and yield potential

## Next Milestones
1. Integrate verified field datasets (weather, soil labs, yields, market logs)
2. Retrain seasonally and publish drift/fairness checks
3. Expand to SMS/USSD-assisted decision workflows
