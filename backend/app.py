import logging
import os
from typing import List, Literal

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, field_validator
from dotenv import load_dotenv

app = FastAPI(title="Azure APIM AI Chat Proxy")

# Load local .env during development; Docker supplies environment variables directly.
load_dotenv()

origins = ["http://localhost:8095"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger("uvicorn.error")

APIM_ENDPOINT = os.getenv("APIM_ENDPOINT")
APIM_SUBSCRIPTION_KEY = os.getenv("APIM_SUBSCRIPTION_KEY")
AZURE_DEPLOYMENT_ID = os.getenv("AZURE_DEPLOYMENT_ID")
AZURE_API_VERSION = os.getenv("AZURE_API_VERSION", "2024-02-15-preview")


class Message(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class ChatRequest(BaseModel):
    messages: List[Message]

    @field_validator("messages")
    @classmethod
    def validate_messages(cls, value: List[Message]):
        if not value:
            raise ValueError("messages must be a non-empty list")
        return value


def build_apim_url() -> str:
    if not APIM_ENDPOINT or not AZURE_DEPLOYMENT_ID:
        raise HTTPException(status_code=500, detail="Backend is missing Azure configuration")
    return (
        f"{APIM_ENDPOINT}/openai/deployments/{AZURE_DEPLOYMENT_ID}/chat/completions"
        f"?api-version={AZURE_API_VERSION}"
    )


@app.post("/api/chat")
async def chat(request: ChatRequest):
    """Proxy chat completions through Azure API Management with streaming passthrough."""

    url = build_apim_url()
    headers = {
        "Content-Type": "application/json",
        "Ocp-Apim-Subscription-Key": APIM_SUBSCRIPTION_KEY or "",
        "Accept": "text/event-stream",
    }
    payload = {"messages": [msg.model_dump() for msg in request.messages], "stream": True}

    async def event_stream():
        # Stream bytes from APIM directly to the frontend.
        async with httpx.AsyncClient(timeout=None) as client:
            async with client.stream("POST", url, headers=headers, json=payload) as response:
                if response.status_code != 200:
                    body = await response.aread()
                    logger.error("APIM error %s: %s", response.status_code, body)
                    raise HTTPException(status_code=500, detail="Upstream error from APIM")

                async for chunk in response.aiter_bytes():
                    # Yield raw SSE chunks as they arrive.
                    yield chunk
                # Signal completion to the browser.
                yield b"data: [DONE]\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
