# Architecture Diagram (Hackathon)

```mermaid
flowchart LR
    A[Farmer Web Dashboard] --> B[/api/analyze-farm]
    A --> C[/api/farmer-chat]
    A --> D[/api/model-eval]
    A --> E[/api/demo-mode/*]

    B --> F[Recommendation Engine]
    F --> G[(SQLite: farmers/predictions/feedback)]
    F --> H[ML Predictor\nml/scripts/predict_top3.py]
    H --> I[Model Artifacts\nml/models/*.joblib + metadata]

    C --> J[Agri Intent + Guardrails]
    J --> K[External Free AI Providers\nOpenRouter/Groq/Custom]
    J --> L[Local Agronomy Draft Fallback]

    B --> M[Explainability Builder]
    M --> A

    N[Monitoring Collector] --> O[/api/metrics]
    P[KPI Tracker] --> Q[/api/kpi]
    A --> O
    A --> Q

    R[Demo Mode Personas] --> E
    E --> B
```
