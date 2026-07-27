import sqlalchemy.pool
import pytest
from fastapi.testclient import TestClient

from app import models


@pytest.fixture
def client(monkeypatch):
    from sqlalchemy import create_engine, event
    from sqlalchemy.orm import sessionmaker

    test_engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=sqlalchemy.pool.StaticPool,
    )

    @event.listens_for(test_engine, "connect")
    def set_sqlite_pragma(dbapi_conn, connection_record):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    models.Base.metadata.create_all(bind=test_engine)
    testing_session_local = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

    monkeypatch.setenv("COOKIE_SECURE", "true")

    from app.auth import hash_password
    from app.database import get_db
    from app.main import app

    from app.api import auth as auth_api
    auth_api.COOKIE_SECURE = True

    def override_get_db():
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    db = testing_session_local()
    db.add(
        models.User(
            email="user@example.com",
            hashed_password=hash_password("password123"),
            name="Test User",
        )
    )
    db.commit()
    db.close()

    monkeypatch.setenv("COOKIE_SECURE", "true")

    with TestClient(app, raise_server_exceptions=True) as test_client:
        yield test_client

    app.dependency_overrides.clear()


def test_signin_sets_secure_cookie_when_https_origin_enabled(client: TestClient):
    response = client.post(
        "/api/auth/signin",
        json={"email": "user@example.com", "password": "password123"},
    )

    assert response.status_code == 200
    assert "Secure" in response.headers["set-cookie"]
