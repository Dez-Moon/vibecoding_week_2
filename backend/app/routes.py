from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.app import crud, schemas
from backend.app.database import get_db

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/", response_model=List[schemas.TemplateRead])
def list_templates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_templates(db, skip=skip, limit=limit)


@router.post("/{template_id}/render")
def render_template(template_id: int, variables: dict, db: Session = Depends(get_db)):
    template = crud.get_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    import re
    content = template.content
    for key, value in variables.items():
        content = re.sub(r"\{\{\s*" + re.escape(key) + r"\s*\}\}", str(value), content)
    return {"template_id": template_id, "rendered_content": content}


@router.get("/{template_id}", response_model=schemas.TemplateRead)
def get_template(template_id: int, db: Session = Depends(get_db)):
    template = crud.get_template(db, template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@router.post("/", response_model=schemas.TemplateRead, status_code=201)
def create_template(template: schemas.TemplateCreate, db: Session = Depends(get_db)):
    return crud.create_template(db, template)


@router.patch("/{template_id}", response_model=schemas.TemplateRead)
def update_template(template_id: int, updates: schemas.TemplateUpdate, db: Session = Depends(get_db)):
    updated = crud.update_template(db, template_id, updates)
    if not updated:
        raise HTTPException(status_code=404, detail="Template not found")
    return updated


@router.delete("/{template_id}", status_code=204)
def delete_template(template_id: int, db: Session = Depends(get_db)):
    deleted = crud.delete_template(db, template_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Template not found")
    return None
