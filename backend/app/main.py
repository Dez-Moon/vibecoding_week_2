import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from app import chat_routes, models, routes
from app.api import auth as auth_router
from app.api import documents as documents_router
from app.api import health as health_router
from app.database import SessionLocal, engine

BACKEND_ROOT = Path(__file__).parent.parent
FRONTEND_OUT = BACKEND_ROOT.parent / "frontend" / "out"
INDEX_FILE = FRONTEND_OUT / "index.html"
NOT_FOUND_FILE = FRONTEND_OUT / "404.html"


def get_frontend_file(path: str) -> Path:
    normalized = path.strip("/")
    if not normalized:
        return INDEX_FILE

    html_path = FRONTEND_OUT / f"{normalized}.html"
    if html_path.exists():
        return html_path

    direct_path = FRONTEND_OUT / normalized
    if direct_path.exists() and direct_path.is_file():
        return direct_path

    nested_index = FRONTEND_OUT / normalized / "index.html"
    if nested_index.exists():
        return nested_index

    return NOT_FOUND_FILE


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
allowed_origins = [
    origin.strip()
    for origin in os.getenv(
        "ALLOWED_ORIGINS",
        "http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(routes.router)
app.include_router(auth_router.router)
app.include_router(documents_router.router)
app.include_router(health_router.router)
app.include_router(chat_routes.router, prefix="/api")

if FRONTEND_OUT.exists():
    next_static_dir = FRONTEND_OUT / "_next"

    if next_static_dir.exists():
        app.mount("/_next", StaticFiles(directory=next_static_dir), name="next-static")

    @app.get("/", include_in_schema=False)
    def frontend_index():
        return FileResponse(INDEX_FILE)

    @app.get("/{full_path:path}", include_in_schema=False)
    def frontend_routes(full_path: str):
        target = get_frontend_file(full_path)
        status_code = 404 if target == NOT_FOUND_FILE else 200
        return FileResponse(target, status_code=status_code)
