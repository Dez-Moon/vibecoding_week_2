import json

from sqlalchemy.orm import Session

from app import models, schemas


def get_templates(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Template).offset(skip).limit(limit).all()


def get_template(db: Session, template_id: int):
    return db.query(models.Template).filter(models.Template.id == template_id).first()


def create_template(db: Session, template: schemas.TemplateCreate):
    db_template = models.Template(
        name=template.name,
        category=template.category,
        description=template.description,
        content=template.content,
        default_variables=json.dumps(template.default_variables or {}),
    )
    db.add(db_template)
    db.commit()
    db.refresh(db_template)
    return db_template


def update_template(db: Session, template_id: int, updates: schemas.TemplateUpdate):
    db_template = get_template(db, template_id)
    if not db_template:
        return None
    update_data = updates.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if field == "default_variables" and value is not None:
            setattr(db_template, field, json.dumps(value))
        else:
            setattr(db_template, field, value)
    db.commit()
    db.refresh(db_template)
    return db_template


def delete_template(db: Session, template_id: int):
    db_template = get_template(db, template_id)
    if not db_template:
        return None
    db.delete(db_template)
    db.commit()
    return db_template
