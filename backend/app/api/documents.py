import json

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List

from app import crud, models, schemas
from app.auth import get_current_user
from app.database import get_db

router = APIRouter(prefix="/api/documents", tags=["documents"])


@router.get("/", response_model=List[schemas.DocumentRead])
def list_documents(
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    return db.query(models.Document).filter(models.Document.user_id == user.id).all()


@router.post("/", response_model=schemas.DocumentRead, status_code=201)
def save_document(
    body: schemas.DocumentCreate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    document = models.Document(
        user_id=user.id,
        template_id=body.template_id,
        name=body.name,
        doc_type=body.doc_type,
        content=body.content,
        variables=json.dumps(body.variables) if body.variables else None,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


@router.get("/{document_id}", response_model=schemas.DocumentRead)
def get_document(
    document_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    document = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.user_id == user.id,
    ).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    return document


@router.put("/{document_id}", response_model=schemas.DocumentRead)
def update_document(
    document_id: int,
    body: schemas.DocumentUpdate,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    document = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.user_id == user.id,
    ).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    if body.name is not None:
        document.name = body.name
    if body.content is not None:
        document.content = body.content
    if body.variables is not None:
        document.variables = json.dumps(body.variables)
    db.commit()
    db.refresh(document)
    return document


@router.delete("/{document_id}", status_code=204)
def delete_document(
    document_id: int,
    db: Session = Depends(get_db),
    user: models.User = Depends(get_current_user),
):
    document = db.query(models.Document).filter(
        models.Document.id == document_id,
        models.Document.user_id == user.id,
    ).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
    db.delete(document)
    db.commit()
    return None
