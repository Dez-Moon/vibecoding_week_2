from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session

from app import crud, models, schemas
from app.auth import get_current_user, hash_password, verify_password, create_access_token
from app.database import get_db

router = APIRouter(prefix="/api/auth", tags=["auth"])

COOKIE_NAME = "access_token"
COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days in seconds


@router.post("/signup", response_model=schemas.UserRead, status_code=201)
def signup(body: schemas.UserCreate, db: Session = Depends(get_db)):
    existing = db.query(models.User).filter(models.User.email == body.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = models.User(
        email=body.email,
        hashed_password=hash_password(body.password),
        name=body.name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/signin")
def signin(body: schemas.SignInRequest, response: Response, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == body.email).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user.id)
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=COOKIE_MAX_AGE,
        httponly=True,
        samesite="lax",
        secure=False,  # True in production with HTTPS
    )
    return {"id": user.id, "email": user.email, "name": user.name}


@router.post("/signout")
def signout(response: Response):
    response.delete_cookie(COOKIE_NAME, httponly=True, samesite="lax", secure=False)
    return {"ok": True}


@router.get("/me", response_model=schemas.UserRead)
def get_me(user: models.User = Depends(get_current_user)):
    return user
