import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def engine():
    """Shared in-memory SQLite engine for a single test module."""
    from sqlalchemy import create_engine, event
    from sqlalchemy.orm import sessionmaker
    import sqlalchemy.pool

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

    from backend.app.models import Base

    Base.metadata.create_all(bind=test_engine)
    return test_engine


@pytest.fixture
def client(engine):
    """FastAPI TestClient with in-memory DB overridden."""
    from sqlalchemy.orm import sessionmaker

    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    from backend.app.main import app
    from backend.app.database import get_db

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    with TestClient(app, raise_server_exceptions=True) as c:
        yield c


class TestRenderEndpoint:
    """Extended render tests covering variable substitution edge cases."""

    def _create_nda_template(self, client: TestClient) -> int:
        """Create an NDA template and return its ID."""
        payload = {
            "name": "NDA",
            "category": "NDA",
            "description": "Mutual NDA",
            "content": (
                "Party A: {{party_a_name}}. "
                "Party B: {{party_b_name}}. "
                "Date: {{effective_date}}. "
                "Purpose: {{purpose}}. "
                "Term: {{term_years}} years. "
                "State: {{governing_state}}."
            ),
            "default_variables": {
                "party_a_name": "[Party A Name]",
                "party_b_name": "[Party B Name]",
                "effective_date": "2026-07-11",
                "purpose": "[Business Purpose]",
                "term_years": "2",
                "governing_state": "[State/Country]",
            },
        }
        resp = client.post("/templates/", json=payload)
        return resp.json()["id"]

    def test_all_variables_substituted(self, client: TestClient):
        """All variables in the request body are replaced in the output."""
        template_id = self._create_nda_template(client)

        resp = client.post(
            f"/templates/{template_id}/render",
            json={
                "variables": {
                    "party_a_name": "Acme Corp.",
                    "party_b_name": "Beta LLC",
                    "effective_date": "2026-07-15",
                    "purpose": "Partnership evaluation",
                    "term_years": "3",
                    "governing_state": "New York, USA",
                }
            },
        )
        assert resp.status_code == 200
        content = resp.json()["rendered_content"]
        assert "Acme Corp." in content
        assert "Beta LLC" in content
        assert "2026-07-15" in content
        assert "Partnership evaluation" in content
        assert "3 years" in content
        assert "New York, USA" in content

    def test_partial_override_uses_defaults(self, client: TestClient):
        """Variables not in the request body fall back to template defaults."""
        template_id = self._create_nda_template(client)

        resp = client.post(
            f"/templates/{template_id}/render",
            json={"variables": {"party_a_name": "Acme Corp."}},
        )
        assert resp.status_code == 200
        content = resp.json()["rendered_content"]
        assert "Acme Corp." in content
        # Defaults used for the rest
        assert "[Party B Name]" in content
        assert "[Business Purpose]" in content

    def test_no_variables_returns_defaults(self, client: TestClient):
        """With no variables provided, all defaults are used."""
        template_id = self._create_nda_template(client)

        resp = client.post(f"/templates/{template_id}/render", json={})
        assert resp.status_code == 200
        content = resp.json()["rendered_content"]
        # No custom values — defaults should be visible
        assert "[Party A Name]" in content
        assert "[Party B Name]" in content

    def test_special_characters_in_variable(self, client: TestClient):
        """Special characters in variable values are preserved."""
        template_id = self._create_nda_template(client)

        resp = client.post(
            f"/templates/{template_id}/render",
            json={"variables": {"party_a_name": 'Acme & Co. "LLC"'}},
        )
        assert resp.status_code == 200
        content = resp.json()["rendered_content"]
        assert 'Acme & Co. "LLC"' in content

    def test_unicode_in_variable(self, client: TestClient):
        """Unicode characters in variable values are preserved."""
        template_id = self._create_nda_template(client)

        resp = client.post(
            f"/templates/{template_id}/render",
            json={
                "variables": {
                    "party_a_name": "Müller GmbH",
                    "governing_state": "München, Deutschland",
                    "purpose": "Évaluation du partenariat",
                }
            },
        )
        assert resp.status_code == 200
        content = resp.json()["rendered_content"]
        assert "Müller GmbH" in content
        assert "München" in content
        assert "Évaluation" in content

    def test_render_nonexistent_template_returns_404(self, client: TestClient):
        """Requesting render for a non-existent template returns 404."""
        resp = client.post(
            "/templates/99999/render",
            json={"variables": {"party_a_name": "Test"}},
        )
        assert resp.status_code == 404
        assert resp.json()["detail"] == "Template not found"

    def test_response_contains_template_id(self, client: TestClient):
        """The render response includes the template_id."""
        template_id = self._create_nda_template(client)

        resp = client.post(
            f"/templates/{template_id}/render",
            json={"variables": {"party_a_name": "Test"}},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "template_id" in data
        assert data["template_id"] == template_id
        assert "rendered_content" in data
