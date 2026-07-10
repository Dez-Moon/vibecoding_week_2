# Legal Document Templates — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Create a structured dataset of legal document templates (NDA, Employment Agreement, MSA, etc.) with a FastAPI backend that can serve templates and accept user modifications.

**Architecture:** JSON seed data in `backend/data/templates/` loaded at startup into an in-memory SQLite database (via SQLAlchemy). A FastAPI REST layer exposes CRUD endpoints. The frontend will consume these endpoints to display and edit templates.

**Tech Stack:** FastAPI + Pydantic + SQLAlchemy + SQLite + pytest

---

## Task 1: Scaffold project structure and dependencies

**Files:**
- Create: `backend/pyproject.toml`
- Create: `backend/app/__init__.py`
- Create: `backend/app/main.py`
- Create: `backend/app/models.py`
- Create: `backend/app/schemas.py`
- Create: `backend/app/crud.py`
- Create: `backend/app/routes.py`
- Create: `backend/data/templates/.gitkeep`
- Create: `backend/tests/__init__.py`
- Create: `backend/tests/test_templates.py`
- Modify: `.gitignore` (already covers `backend/`, `data/`)

**Interfaces:**
- Produces: `backend/app/models.Template` SQLAlchemy model, `backend/app/schemas.TemplateCreate`, `backend/app/schemas.TemplateRead` Pydantic schemas, `backend/app/crud` functions, `backend/app/routes` router, `backend/data/templates/*.json` seed files

- [ ] **Step 1: Create `backend/pyproject.toml`**

```toml
[project]
name = "legal-doc-platform"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.115.0",
    "uvicorn[standard]>=0.32.0",
    "sqlalchemy>=2.0.0",
    "pydantic>=2.0.0",
    "pytest>=8.0.0",
    "httpx>=0.27.0",
]

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

- [ ] **Step 2: Create `backend/app/__init__.py`**

```python
```

- [ ] **Step 3: Create `backend/app/models.py`**

```python
from sqlalchemy import Column, Integer, String, Text
from sqlalchemy.orm import declarative_base

Base = declarative_base()


class Template(Base):
    __tablename__ = "templates"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    category = Column(String(100), nullable=False)
    description = Column(Text, nullable=True)
    content = Column(Text, nullable=False)  # template body with {{placeholders}}
    default_variables = Column(Text, nullable=True)  # JSON string of variable defaults
```

- [ ] **Step 4: Create `backend/app/schemas.py`**

```python
from pydantic import BaseModel
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

    class Config:
        from_attributes = True
```

- [ ] **Step 5: Create `backend/app/crud.py`**

```python
from sqlalchemy.orm import Session
from backend.app import models, schemas


def get_templates(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.Template).offset(skip).limit(limit).all()


def get_template(db: Session, template_id: int):
    return db.query(models.Template).filter(models.Template.id == template_id).first()


def create_template(db: Session, template: schemas.TemplateCreate):
    import json
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
    import json
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
```

- [ ] **Step 6: Create `backend/app/routes.py`**

```python
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from backend.app import crud, schemas
from backend.app.main import get_db

router = APIRouter(prefix="/templates", tags=["templates"])


@router.get("/", response_model=List[schemas.TemplateRead])
def list_templates(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    return crud.get_templates(db, skip=skip, limit=limit)


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
```

- [ ] **Step 7: Create `backend/app/main.py`**

```python
import json
import os
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from backend.app import models, routes

DATABASE_URL = "sqlite:///./backend/data/legal_docs.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def seed_templates(db):
    data_dir = Path("backend/data/templates")
    for filepath in data_dir.glob("*.json"):
        with open(filepath) as f:
            data = json.load(f)
        for template_data in data:
            import backend.app.schemas as schemas_mod
            existing = db.query(models.Template).filter_by(name=template_data["name"]).first()
            if not existing:
                schema = schemas_mod.TemplateCreate(**template_data)
                import backend.app.crud as crud_mod
                crud_mod.create_template(db, schema)


@asynccontextmanager
async def lifespan(app: FastAPI):
    models.Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        seed_templates(db)
    finally:
        db.close()
    yield


app = FastAPI(title="Legal Document Platform", version="0.1.0", lifespan=lifespan)
app.include_router(routes.router)
```

- [ ] **Step 8: Create placeholder data dir and gitkeep**

```bash
mkdir -p backend/data/templates
touch backend/data/templates/.gitkeep
```

- [ ] **Step 9: Commit**

```bash
git add backend/pyproject.toml backend/app/__init__.py backend/app/main.py backend/app/models.py backend/app/schemas.py backend/app/crud.py backend/app/routes.py backend/data/templates/.gitkeep backend/tests/
git commit -m "feat: scaffold FastAPI backend with template CRUD and in-memory SQLite"
```

---

## Task 2: Create the legal document template dataset

**Files:**
- Create: `backend/data/templates/01-nda.json`
- Create: `backend/data/templates/02-employment-agreement.json`
- Create: `backend/data/templates/03-master-services-agreement.json`
- Create: `backend/data/templates/04-confidentiality-policy.json`
- Create: `backend/data/templates/05-consulting-agreement.json`

**Interfaces:**
- Produces: JSON seed files consumed by `seed_templates()` in `backend/app/main.py`

- [ ] **Step 1: Create `backend/data/templates/01-nda.json`**

```json
[
  {
    "name": "Non-Disclosure Agreement (Mutual)",
    "category": "Confidentiality",
    "description": "A mutual NDA where both parties agree to keep each other's confidential information private. Suitable for business discussions, partnerships, and vendor onboarding.",
    "content": "NON-DISCLOSURE AGREEMENT\n\nThis Non-Disclosure Agreement (\"Agreement\") is entered into as of {{effective_date}} by and between:\n\nParty A: {{party_a_name}} (\"Disclosing Party\")\nParty B: {{party_b_name}} (\"Receiving Party\")\n\n1. CONFIDENTIAL INFORMATION\n\"Confidential Information\" means any data or information, oral or written, disclosed by either party including but not limited to: business plans, financial data, trade secrets, technical specifications, customer lists, and proprietary processes.\n\n2. OBLIGATIONS\nThe Receiving Party agrees to: (a) hold all Confidential Information in strict confidence; (b) not disclose any Confidential Information to third parties without prior written consent; (c) use Confidential Information solely for the purpose of {{purpose}}.\n\n3. TERM\nThis Agreement shall remain in effect for {{term_years}} years from the Effective Date.\n\n4. GOVERNING LAW\nThis Agreement shall be governed by the laws of {{governing_state}}.\n\nIN WITNESS WHEREOF, the parties have executed this Agreement.\n\n__________________________\nParty A: {{party_a_name}}\nDate: _____________________\n\n__________________________\nParty B: {{party_b_name}}\nDate: _____________________",
    "default_variables": {
      "effective_date": "2026-07-11",
      "party_a_name": "[Party A Name]",
      "party_b_name": "[Party B Name]",
      "purpose": "[Purpose of disclosure]",
      "term_years": "2",
      "governing_state": "[State/Country]"
    }
  }
]
```

- [ ] **Step 2: Create `backend/data/templates/02-employment-agreement.json`**

```json
[
  {
    "name": "Employment Agreement",
    "category": "Employment",
    "description": "A standard full-time employment contract covering role, compensation, duties, and termination conditions.",
    "content": "EMPLOYMENT AGREEMENT\n\nThis Employment Agreement (\"Agreement\") is entered into as of {{start_date}} by and between {{employer_name}} (\"Employer\") and {{employee_name}} (\"Employee\").\n\n1. POSITION AND DUTIES\nEmployee is hired as {{job_title}} reporting to {{supervisor_name}}. Employee shall perform duties as assigned and comply with all company policies.\n\n2. COMPENSATION\nEmployee shall receive an annual base salary of {{annual_salary}} USD, payable in accordance with Employer's standard payroll schedule. Employee may be eligible for a bonus of up to {{bonus_percentage}}% of base salary based on performance.\n\n3. BENEFITS\nEmployee is entitled to: {{PTO_days}} days of paid time off annually, health insurance coverage as per the company health plan, and {{other_benefits}}.\n\n4. CONFIDENTIALITY\nEmployee agrees to maintain the confidentiality of all proprietary information during and after employment.\n\n5. TERMINATION\nEither party may terminate this Agreement with {{notice_weeks}} weeks written notice. Employer may terminate immediately for cause.\n\n6. GOVERNING LAW\nGoverned by the laws of {{governing_state}}.\n\n__________________________\nEmployer: {{employer_name}}\nDate: _____________________\n\n__________________________\nEmployee: {{employee_name}}\nDate: _____________________",
    "default_variables": {
      "start_date": "2026-07-11",
      "employer_name": "[Employer Name]",
      "employee_name": "[Employee Name]",
      "job_title": "[Job Title]",
      "supervisor_name": "[Supervisor Name]",
      "annual_salary": "[Annual Salary]",
      "bonus_percentage": "[Bonus %]",
      "PTO_days": "15",
      "other_benefits": "[Other Benefits]",
      "notice_weeks": "2",
      "governing_state": "[State/Country]"
    }
  }
]
```

- [ ] **Step 3: Create `backend/data/templates/03-master-services-agreement.json`**

```json
[
  {
    "name": "Master Services Agreement",
    "category": "Services",
    "description": "An MSA governing the provision of professional services, including scope, payment terms, IP ownership, and liability.",
    "content": "MASTER SERVICES AGREEMENT\n\nThis Master Services Agreement (\"Agreement\") is made effective as of {{effective_date}} between {{client_name}} (\"Client\") and {{provider_name}} (\"Provider\").\n\n1. SERVICES\nProvider agrees to perform the services described in individual Statements of Work (\"SOW\") to be executed under this Agreement.\n\n2. COMPENSATION\nClient shall pay Provider at the rate of {{hourly_rate}} USD per hour, or as specified in each SOW. Payment is due within {{payment_terms_days}} days of invoice receipt.\n\n3. INTELLECTUAL PROPERTY\nAll work product created by Provider under this Agreement shall be owned by {{ip_owner}}. Provider retains rights to any pre-existing materials (\"Provider Materials\") and grants Client a perpetual license to use Provider Materials incorporated into deliverables.\n\n4. WARRANTIES\nProvider warrants that all services will be performed in a professional and workmanlike manner consistent with industry standards.\n\n5. LIABILITY\nEach party's liability under this Agreement shall not exceed {{liability_cap}} USD. Neither party shall be liable for indirect, consequential, or punitive damages.\n\n6. TERM AND TERMINATION\nThis Agreement shall remain in effect for {{term_months}} months. Either party may terminate with {{notice_days}} days written notice.\n\n7. GOVERNING LAW\nGoverned by the laws of {{governing_state}}.\n\n__________________________\nClient: {{client_name}}\nDate: _____________________\n\n__________________________\nProvider: {{provider_name}}\nDate: _____________________",
    "default_variables": {
      "effective_date": "2026-07-11",
      "client_name": "[Client Name]",
      "provider_name": "[Provider Name]",
      "hourly_rate": "[Hourly Rate]",
      "payment_terms_days": "30",
      "ip_owner": "Client",
      "liability_cap": "100,000",
      "term_months": "12",
      "notice_days": "30",
      "governing_state": "[State/Country]"
    }
  }
]
```

- [ ] **Step 4: Create `backend/data/templates/04-confidentiality-policy.json`**

```json
[
  {
    "name": "Corporate Confidentiality Policy",
    "category": "Policy",
    "description": "An internal policy document defining how employees must handle confidential information, data classification levels, and breach reporting procedures.",
    "content": "CONFIDENTIALITY AND DATA PROTECTION POLICY\n\nEffective Date: {{effective_date}}\nPolicy Owner: {{policy_owner}}\n\n1. PURPOSE\nThis policy establishes requirements for protecting Confidential Information and ensuring compliance with applicable data protection laws including {{applicable_laws}}.\n\n2. SCOPE\nThis policy applies to all employees, contractors, and third parties with access to Company systems or Confidential Information.\n\n3. DATA CLASSIFICATION\n- PUBLIC: Information approved for public release\n- INTERNAL: Information for internal business use only\n- CONFIDENTIAL: Sensitive business information requiring strict controls\n- RESTRICTED: Highly sensitive data (PII, financial records, trade secrets)\n\n4. HANDLING REQUIREMENTS\nEmployees must: encrypt RESTRICTED data at rest and in transit; store CONFIDENTIAL data only on approved systems; label all physical documents containing CONFIDENTIAL information; and use secure destruction methods for all sensitive waste.\n\n5. ACCESS CONTROLS\nAccess to CONFIDENTIAL and RESTRICTED information shall be granted on a need-to-know basis, documented, and reviewed quarterly.\n\n6. INCIDENT REPORTING\nAny suspected breach must be reported to {{security_contact}} within {{reporting_hours}} hours of discovery.\n\n7. NON-COMPLIANCE\nViolations may result in disciplinary action up to and including termination of employment or contract.\n\nApproved by: {{approver_name}}\nDate: {{approval_date}}",
    "default_variables": {
      "effective_date": "2026-07-11",
      "policy_owner": "[Policy Owner Name/Title]",
      "applicable_laws": "[GDPR, CCPA, HIPAA, etc.]",
      "security_contact": "[security@company.com]",
      "reporting_hours": "24",
      "approver_name": "[Approver Name]",
      "approval_date": "2026-07-11"
    }
  }
]
```

- [ ] **Step 5: Create `backend/data/templates/05-consulting-agreement.json`**

```json
[
  {
    "name": "Independent Contractor Agreement",
    "category": "Services",
    "description": "An agreement for engaging independent contractors, covering scope of work, deliverables, compensation, and independence provisions.",
    "content": "INDEPENDENT CONTRACTOR AGREEMENT\n\nThis Agreement is entered into as of {{effective_date}} between {{client_name}} (\"Client\") and {{consultant_name}} (\"Consultant\") of {{consultant_address}}.\n\n1. ENGAGEMENT\nClient engages Consultant to provide consulting services as described in Exhibit A (\"Services\"). Consultant is an independent contractor and not an employee of Client.\n\n2. COMPENSATION\nClient shall pay Consultant {{compensation_amount}} for the Services, payable as follows: {{payment_schedule}}. Consultant shall submit invoices {{invoice_frequency}} and Client shall pay within {{payment_terms_days}} days.\n\n3. EXPENSES\nClient shall reimburse Consultant for pre-approved, documented expenses up to {{expense_limit}} USD. All other expenses are the responsibility of Consultant.\n\n4. DELIVERABLES\nConsultant shall deliver: {{deliverable_1}}, {{deliverable_2}}, and {{deliverable_3}}, by {{delivery_date}}.\n\n5. INTELLECTUAL PROPERTY\nAll work product created by Consultant under this Agreement shall be the sole property of Client. Consultant assigns all rights, title, and interest in the deliverables to Client.\n\n6. NON-SOLICITATION\nDuring the term and for {{non_solicit_months}} months thereafter, Consultant shall not solicit Client's employees or clients.\n\n7. TERMINATION\nEither party may terminate with {{notice_days}} days written notice. Client shall pay for all work completed prior to termination.\n\n8. GOVERNING LAW\nGoverned by the laws of {{governing_state}}.\n\n__________________________\nClient: {{client_name}}\nDate: _____________________\n\n__________________________\nConsultant: {{consultant_name}}\nDate: _____________________",
    "default_variables": {
      "effective_date": "2026-07-11",
      "client_name": "[Client Name]",
      "consultant_name": "[Consultant Name]",
      "consultant_address": "[Consultant Address]",
      "compensation_amount": "[Amount]",
      "payment_schedule": "[e.g., 50% upfront, 50% on completion]",
      "invoice_frequency": "monthly",
      "payment_terms_days": "30",
      "expense_limit": "500",
      "deliverable_1": "[Deliverable 1]",
      "deliverable_2": "[Deliverable 2]",
      "deliverable_3": "[Deliverable 3]",
      "delivery_date": "[Delivery Date]",
      "non_solicit_months": "6",
      "notice_days": "14",
      "governing_state": "[State/Country]"
    }
  }
]
```

- [ ] **Step 6: Commit**

```bash
git add backend/data/templates/
git commit -m "feat: add 5 legal document template seed files (NDA, Employment, MSA, Confidentiality Policy, Contractor Agreement)"
```

---

## Task 3: Write tests for the template API

**Files:**
- Modify: `backend/tests/__init__.py` (already created in Task 1)
- Modify: `backend/tests/test_templates.py` (already created in Task 1)

**Interfaces:**
- Consumes: `backend/app.main.app`, `backend.app.routes`
- Produces: `backend/tests/test_templates.py` with passing tests

- [ ] **Step 1: Write `backend/tests/test_templates.py`**

```python
import pytest
from fastapi.testclient import TestClient
from backend.app.main import app, engine, get_db
from backend.app import models

models.Base.metadata.create_all(bind=engine)


@pytest.fixture
def client():
    # Use a fresh in-memory DB for each test
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    test_engine = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)
    models.Base.metadata.create_all(bind=test_engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


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
```

- [ ] **Step 2: Run tests**

```bash
cd /Users/konstantin/Documents/projects/vibecoding_week_2
pip install -e backend 2>/dev/null || pip install fastapi uvicorn sqlalchemy pydantic pytest httpx
pytest backend/tests/test_templates.py -v
```
Expected: All 7 tests PASS

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_templates.py
git commit -m "test: add pytest suite for template CRUD API"
```

---

## Task 4: Add template variables endpoint and finalize

**Files:**
- Modify: `backend/app/routes.py` — add `POST /templates/{id}/render` endpoint
- Modify: `backend/tests/test_templates.py` — add render tests

**Interfaces:**
- Consumes: `TemplateRead`, `backend/app/routes`
- Produces: `POST /templates/{id}/render` accepting `{variables: dict}` and returning filled content

- [ ] **Step 1: Add render endpoint to `backend/app/routes.py`**

Add after the `list_templates` router:

```python
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
```

- [ ] **Step 2: Add test for render endpoint to `backend/tests/test_templates.py`**

```python
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
```

- [ ] **Step 3: Run tests**

```bash
pytest backend/tests/test_templates.py -v
```
Expected: All 8 tests PASS

- [ ] **Step 4: Commit**

```bash
git add backend/app/routes.py backend/tests/test_templates.py
git commit -m "feat: add template variable substitution endpoint"
```

---

## Self-Review Checklist

- [x] Spec coverage: KAN-2 requires "a dataset of legal document templates that the system be able to modify for the user" — Task 1 creates the infrastructure, Task 2 creates the dataset, Task 3 tests it, Task 4 adds the modification (render) endpoint.
- [x] No placeholders: All JSON template content is real and runnable; all Python code is complete.
- [x] Type consistency: `TemplateCreate`, `TemplateRead`, `TemplateUpdate` schemas match CRUD function signatures in `crud.py` and route handlers in `routes.py`.
- [x] Every task is independently testable and ends with a commit.
