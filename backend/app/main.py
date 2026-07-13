import json
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app import models, routes, chat_routes
from app.api import auth as auth_router
from app.api import documents as documents_router
from app.api import health as health_router
from app.database import engine, SessionLocal

BACKEND_ROOT = Path(__file__).parent.parent


def seed_templates():
    data_dir = BACKEND_ROOT / "data" / "templates"
    db = SessionLocal()
    try:
        for filepath in data_dir.glob("*.json"):
            with open(filepath) as f:
                data = json.load(f)
            for template_data in data:
                from app import schemas as schemas_mod
                existing = db.query(models.Template).filter_by(name=template_data["name"]).first()
                if not existing:
                    schema = schemas_mod.TemplateCreate(**template_data)
                    from app import crud as crud_mod
                    crud_mod.create_template(db, schema)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    models.Base.metadata.create_all(bind=engine)
    seed_templates()
    yield


app = FastAPI(title="Legal Document Platform", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(routes.router)
app.include_router(auth_router.router)
app.include_router(documents_router.router)
app.include_router(health_router.router)
app.include_router(chat_routes.router, prefix="/api")
