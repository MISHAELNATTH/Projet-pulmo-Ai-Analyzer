from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
import os
from database import get_db
import models
import auth
import upload_router
import scans_router

app = FastAPI(
    title="PneumoGuard AI Backend",
    description="Local Medical Image Analysis Platform API",
    version="1.0.0"
)

# Configure CORS middleware
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize storage and temp folders on app startup
@app.on_event("startup")
def startup_event():
    os.makedirs("./temp_uploads", exist_ok=True)
    os.makedirs("./storage/dicom_uploads", exist_ok=True)

@app.get("/")
async def root():
    return {
        "status": "online",
        "service": "PneumoGuard AI Backend",
        "version": "1.0.0"
    }

# Auth Routes
@app.post("/api/auth/register", status_code=status.HTTP_201_CREATED)
async def register(
    email: str, 
    password: str, 
    first_name: str = None, 
    last_name: str = None, 
    role: str = "radiologist", 
    db: Session = Depends(get_db)
):
    # Check if user already exists
    db_user = db.query(models.User).filter(models.User.email == email).first()
    if db_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    if role not in ["admin", "radiologist", "auditor"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role"
        )

    new_user = models.User(
        email=email,
        hashed_password=auth.get_password_hash(password),
        first_name=first_name,
        last_name=last_name,
        role=role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return {
        "id": new_user.id,
        "email": new_user.email,
        "role": new_user.role,
        "first_name": new_user.first_name,
        "last_name": new_user.last_name
    }

@app.post("/api/auth/token")
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):
    user = db.query(models.User).filter(models.User.email == form_data.username).first()
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": user.email, "role": user.role})
    return {
        "access_token": access_token, 
        "token_type": "bearer",
        "role": user.role,
        "email": user.email,
        "name": f"{user.first_name} {user.last_name}" if user.first_name else user.email
    }

# Register Scan Upload Router
app.include_router(upload_router.router)
app.include_router(scans_router.router)

# RBAC Test Routes
@app.get("/api/test/radiologist-only")
async def test_radiologist_route(
    current_user: models.User = Depends(auth.require_radiologist)
):
    return {
        "message": f"Welcome Dr. {current_user.last_name}, you have successfully accessed this Radiologist-only route.",
        "user_email": current_user.email,
        "user_role": current_user.role
    }

@app.get("/api/test/admin-only")
async def test_admin_route(
    current_user: models.User = Depends(auth.require_admin)
):
    return {
        "message": "Welcome System Administrator, access authorized.",
        "user_email": current_user.email,
        "user_role": current_user.role
    }

@app.get("/api/test/any-user")
async def test_any_user_route(
    current_user: models.User = Depends(auth.require_any_user)
):
    return {
        "message": "Access authorized to all authenticated personnel.",
        "user_email": current_user.email,
        "user_role": current_user.role
    }
