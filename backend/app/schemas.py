import json

from pydantic import BaseModel, ConfigDict, field_validator
from typing import Optional


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
