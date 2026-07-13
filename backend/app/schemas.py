import json

from pydantic import BaseModel, ConfigDict, field_validator
from typing import Dict, List, Literal, Optional


class TemplateBase(BaseModel):
    name: str
    category: str
    description: Optional[str] = None
    content: str
    default_variables: Optional[dict] = {}


class TemplateCreate(TemplateBase):
    pass


class TemplateUpdate(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    description: Optional[str] = None
    content: Optional[str] = None
    default_variables: Optional[dict] = None


class TemplateRead(TemplateBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

    @field_validator("default_variables", mode="before")
    @classmethod
    def parse_default_variables(cls, v):
        if isinstance(v, str):
            return json.loads(v)
        return v


class RenderRequest(BaseModel):
    variables: dict = {}


class RenderResponse(BaseModel):
    template_id: int
    rendered_content: str


class ExtractedField(BaseModel):
    field_name: str
    field_value: str
    confidence: str  # "high" | "medium" | "low"


class FieldExtraction(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    extracted_fields: List[ExtractedField] = []
    is_complete: bool = False
    missing_fields: List[str] = []


class ChatMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    template_name: str
    extracted_fields: Optional[Dict[str, str]] = {}


class ChatResponse(BaseModel):
    response: str
    extracted_fields: Dict[str, str] = {}
    is_complete: bool = False
    missing_fields: List[str] = []


class GreetingResponse(BaseModel):
    greeting: str


# --- Auth schemas ---

class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None


class UserRead(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class SignInRequest(BaseModel):
    email: str
    password: str


# --- Document schemas ---

class DocumentCreate(BaseModel):
    template_id: int
    name: str
    doc_type: str
    content: str
    variables: Optional[dict] = None


class DocumentUpdate(BaseModel):
    name: Optional[str] = None
    content: Optional[str] = None
    variables: Optional[dict] = None


class DocumentRead(BaseModel):
    id: int
    user_id: int
    template_id: int
    name: str
    doc_type: str
    content: str
    variables: Optional[dict] = None
    model_config = ConfigDict(from_attributes=True)

    @field_validator("variables", mode="before")
    @classmethod
    def parse_variables(cls, v):
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                return None
        return v
