import sqlalchemy
import sqlalchemy.pool
import pytest
from fastapi.testclient import TestClient
from backend.app import models


@pytest.fixture
def client():
    from sqlalchemy import create_engine, event
    from sqlalchemy.orm import sessionmaker

    # StaticPool + check_same_thread=False keeps a single connection alive across threads
    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=sqlalchemy.pool.StaticPool,
    )

    # Ensure foreign-keys work in SQLite
    @event.listens_for(test_engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    models.Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    from backend.app.database import get_db
    import backend.app.database as db_mod
    import backend.app.main as main_mod

    original_engine = db_mod.engine
    original_session_local = db_mod.SessionLocal
    db_mod.engine = test_engine
    db_mod.SessionLocal = TestingSessionLocal
    main_mod.engine = test_engine
    main_mod.SessionLocal = TestingSessionLocal

    from backend.app.main import app
    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c

    app.dependency_overrides.clear()
    db_mod.engine = original_engine
    db_mod.SessionLocal = original_session_local
    main_mod.engine = original_engine
    main_mod.SessionLocal = original_session_local


def test_list_templates_empty(client):
    response = client.get("/templates/")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


def test_create_template(client):
    payload = {
        "name": "Test NDA",
        "category": "Confidentiality",
        "description": "A test NDA",
        "content": "This NDA is between {{party_a}} and {{party_b}}.",
        "default_variables": {"party_a": "Acme Corp", "party_b": "Beta LLC"},
    }
    response = client.post("/templates/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test NDA"
    assert data["id"] is not None


def test_get_template(client):
    payload = {
        "name": "Employment Agreement",
        "category": "Employment",
        "description": "Test employment",
        "content": "Employee: {{employee_name}}",
        "default_variables": {},
    }
    create_response = client.post("/templates/", json=payload)
    template_id = create_response.json()["id"]

    response = client.get(f"/templates/{template_id}")
    assert response.status_code == 200
    assert response.json()["name"] == "Employment Agreement"


def test_get_template_not_found(client):
    response = client.get("/templates/99999")
    assert response.status_code == 404


def test_update_template(client):
    payload = {
        "name": "Original Name",
        "category": "Test",
        "description": "Original desc",
        "content": "Original content",
        "default_variables": {},
    }
    create_resp = client.post("/templates/", json=payload)
    template_id = create_resp.json()["id"]

    update_resp = client.patch(f"/templates/{template_id}", json={"name": "Updated Name"})
    assert update_resp.status_code == 200
    assert update_resp.json()["name"] == "Updated Name"


def test_delete_template(client):
    payload = {
        "name": "To Delete",
        "category": "Test",
        "description": "Will be deleted",
        "content": "Content",
        "default_variables": {},
    }
    create_resp = client.post("/templates/", json=payload)
    template_id = create_resp.json()["id"]

    del_resp = client.delete(f"/templates/{template_id}")
    assert del_resp.status_code == 204

    get_resp = client.get(f"/templates/{template_id}")
    assert get_resp.status_code == 404


def test_list_templates_after_create(client):
    client.post("/templates/", json={
        "name": "Template A",
        "category": "Cat",
        "description": "Desc",
        "content": "Content",
        "default_variables": {},
    })
    response = client.get("/templates/")
    assert response.status_code == 200
    assert len(response.json()) >= 1


def test_render_template(client):
    payload = {
        "name": "Render Test NDA",
        "category": "Confidentiality",
        "description": "Test render",
        "content": "Party A: {{party_a}}. Party B: {{party_b}}.",
        "default_variables": {"party_a": "DefaultA", "party_b": "DefaultB"},
    }
    create_resp = client.post("/templates/", json=payload)
    template_id = create_resp.json()["id"]

    render_resp = client.post(
        f"/templates/{template_id}/render",
        json={"party_a": "Alice Corp", "party_b": "Bob LLC"}
    )
    assert render_resp.status_code == 200
    data = render_resp.json()
    assert "Alice Corp" in data["rendered_content"]
    assert "Bob LLC" in data["rendered_content"]
