# Saraswati AI 🪷

> Multi-agent, GraphRAG-powered academic research & writing platform.

## Project Structure

```
Saraswati AI/
├── frontend/          # Next.js (App Router) — UI
└── backend/           # FastAPI — Multi-agent API
```

## Getting Started

### Frontend

```bash
cd frontend
cp .env.local.example .env.local
# Fill in your Supabase keys in .env.local
npm install
npm run dev             # Runs on http://localhost:3000
```

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Fill in your keys in .env
uvicorn app.main:app --reload   # Runs on http://localhost:8000
```

## Environment Variables

| Key | Where | Description |
|-----|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | frontend | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | frontend | Supabase anon key |
| `NEXT_PUBLIC_API_URL` | frontend | Backend URL (default localhost:8000) |
| `SUPABASE_URL` | backend | Same Supabase URL |
| `SUPABASE_SERVICE_ROLE_KEY` | backend | Supabase service role key (keep secret) |
| `GEMINI_API_KEY` | backend | Google Gemini API key |
| `NEO4J_URI` | backend | Neo4j Aura connection URI |
| `NEO4J_PASSWORD` | backend | Neo4j password |

## API Endpoints (current stubs)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/v1/auth/verify` | Verify JWT token |
| GET | `/api/v1/projects/` | List user projects |
| POST | `/api/v1/projects/` | Create project |
| GET | `/api/v1/projects/{id}` | Get project |
| POST | `/api/v1/chat/` | Send chat message |
