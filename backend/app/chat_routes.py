from fastapi import APIRouter, Query
from fastapi.responses import StreamingResponse
import json
from app import chat_service
from app.schemas import (
    ChatRequest,
    ChatResponse,
    GreetingResponse,
)

router = APIRouter(prefix="/chat", tags=["chat"])


class ChatService:
    def get_greeting(self, template_name: str) -> str:
        return chat_service.get_greeting(template_name).greeting

    def process_message(self, history, template_name: str, user_message: str, extracted_fields: dict):
        return chat_service.process_message(history, template_name, user_message, extracted_fields)

    def process_message_stream(self, history, template_name: str, user_message: str, extracted_fields: dict):
        return chat_service.process_message_stream(history, template_name, user_message, extracted_fields)


_service = ChatService()


@router.get("/greeting", response_model=GreetingResponse)
def get_greeting(template_name: str = Query(...)):
    greeting = _service.get_greeting(template_name)
    return GreetingResponse(greeting=greeting)


@router.post("/message", response_model=ChatResponse)
def post_message(body: ChatRequest):
    result = _service.process_message(
        history=body.messages,
        template_name=body.template_name,
        user_message=body.messages[-1].content if body.messages else "",
        extracted_fields=body.extracted_fields or {},
    )
    return ChatResponse(**result)


@router.post("/message/stream")
def post_message_stream(body: ChatRequest):
    def event_stream():
        for event in chat_service.process_message_stream(
            history=body.messages,
            template_name=body.template_name,
            user_message=body.messages[-1].content if body.messages else "",
            extracted_fields=body.extracted_fields or {},
        ):
            yield f"data: {json.dumps(event)}\n\n"
        yield "data: [DONE]\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
