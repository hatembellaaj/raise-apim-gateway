# Frontend (React + Vite)

A simple chat interface that streams tokens from the backend using Server-Sent Events (SSE).

## Local development
```bash
npm install
npm run dev -- --host --port 5173
```

The app reads the backend URL from `VITE_BACKEND_URL`. Docker Compose maps this from `BACKEND_URL` in the root `.env` file.
