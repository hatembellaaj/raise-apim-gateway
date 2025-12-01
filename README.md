# Azure APIM AI Chat Sandbox

This project is a minimal full-stack example for experimenting with Azure AI Foundry chat completions through Azure API Management. The stack uses FastAPI on the backend, React with Vite on the frontend, and Docker Compose for orchestration. Streaming responses are proxied end-to-end so tokens flow from Azure to the browser via Server-Sent Events (SSE).

## Prerequisites
- Docker
- Docker Compose

## Environment setup
1. Copy `.env.example` to `.env` at the repository root and fill in values:
   - `APIM_ENDPOINT`
   - `APIM_SUBSCRIPTION_KEY`
   - `AZURE_DEPLOYMENT_ID`
   - `AZURE_API_VERSION`
   - `FRONTEND_PORT` (default `8095`)
   - `BACKEND_PORT` (default `8096`)
   - `BACKEND_INTERNAL_PORT` (default `8000`)
   - `BACKEND_URL` (default `http://backend:8000` for Docker networking)

2. The backend reads environment variables from the process environment provided by Docker Compose. No secrets live inside the backend folder.
3. The frontend consumes `VITE_BACKEND_URL`, which Compose maps from `BACKEND_URL`.

## Running the stack
```bash
docker-compose up --build
```

- Frontend: http://localhost:8095
- Backend: http://localhost:8096

Stop the services with:
```bash
docker-compose down
```

## How it works
- The frontend sends `POST /api/chat` requests with the conversation history to the backend.
- The backend forwards the request to Azure API Management, which proxies Azure AI Foundry chat completions with streaming enabled.
- Streaming tokens flow back from Azure, through the backend, to the browser using SSE-style chunking.

## Local development (optional)
- Backend (outside Docker): `uvicorn app:app --reload --host 0.0.0.0 --port 8000`
- Frontend (outside Docker): `npm install && npm run dev -- --host --port 5173`

This repository is intended for experimentation and is not production-hardened.
