import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI

from backend.app import models, routes
from backend.app.database import engine, SessionLocal


def seed_templates():
    data_dir = Path(__file__).parent.parent / "data" / "templates"
    db = SessionLocal()
    try:
        for filepath in data_dir.glob("*.json"):
            with open(filepath) as f:
                data = json.load(f)
            for template_data in data:
                from backend.app import schemas as schemas_mod
                existing = db.query(models.Template).filter_by(name=template_data["name"]).first()
                if not existing:
                    schema = schemas_mod.TemplateCreate(**template_data)
                    from backend.app import crud as crud_mod
                    crud_mod.create_template(db, schema)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    models.Base.metadata.create_all(bind=engine)
    seed_templates()
    yield


app = FastAPI(title="Legal Document Platform", version="0.1.0", lifespan=lifespan)
app.include_router(routes.router)
