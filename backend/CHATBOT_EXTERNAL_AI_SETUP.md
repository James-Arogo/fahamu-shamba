# External AI Chatbot Setup (Agriculture-Only)

The chatbot endpoint (`POST /api/farmer-chat` and `POST /api/chat`) now supports a provider chain of external AI agents and enforces agriculture-only output.

## 1) Configure environment variables

Add these to your backend `.env`:

```bash
# Order of providers to try (comma-separated)
AI_PROVIDER_CHAIN=openrouter,groq,custom

# OpenRouter (free-tier models available)
OPENROUTER_API_KEY=your_openrouter_key
OPENROUTER_MODEL=meta-llama/llama-3.1-8b-instruct:free
OPENROUTER_API_URL=https://openrouter.ai/api/v1/chat/completions

# Groq (free-tier available)
GROQ_API_KEY=your_groq_key
GROQ_MODEL=llama-3.1-8b-instant
GROQ_API_URL=https://api.groq.com/openai/v1/chat/completions

# Optional custom free agent endpoint
FREE_AI_AGENT_URL=https://your-custom-free-agent/chat/completions
FREE_AI_AGENT_KEY=your_custom_key
FREE_AI_MODEL=free-model

# Optional app metadata header used by OpenRouter
APP_BASE_URL=http://localhost:5000
```

## 2) Behavior

- The chatbot first applies local agriculture intent checks.
- Non-agriculture user queries are refused.
- For agriculture queries, it tries providers in `AI_PROVIDER_CHAIN` order.
- If a provider fails, it automatically falls back to the next one.
- If external output is out-of-scope (non-agriculture), it is discarded.
- If no provider returns valid content, local agronomy response is used.

## 3) Restart backend

```bash
cd /home/james-arogo/Desktop/fahamu-shamba/backend
npm start
```

## 4) Quick test

Agriculture query (should answer):
```bash
curl -X POST http://localhost:5000/api/farmer-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"My soil pH is 5.6 in Bondo during long rains, what crop do you recommend?"}'
```

Out-of-scope query (should refuse):
```bash
curl -X POST http://localhost:5000/api/farmer-chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Who will win the football match tonight?"}'
```
