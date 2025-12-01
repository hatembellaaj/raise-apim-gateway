# Backend (FastAPI)

The backend exposes a `/api/chat` endpoint that proxies chat completion requests to Azure AI Foundry via Azure API Management. Responses are streamed back to the browser using Server-Sent Events (SSE).

## Local development
```bash
uvicorn app:app --reload --host 0.0.0.0 --port 8000
```

Environment variables are provided by Docker Compose from the root `.env`. No secrets should be stored inside this folder.
