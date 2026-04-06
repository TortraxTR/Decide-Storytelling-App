from typing import Optional

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel, EmailStr

from ..auth import hash_password, verify_password
from db import db

router = APIRouter(prefix="/auth", tags=["Auth"])


class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    username: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    user_id: str


class RegisterResponse(BaseModel):
    user_id: str


@router.post("/register", response_model=RegisterResponse, status_code=status.HTTP_201_CREATED)
async def register(payload: RegisterRequest):
    existing = await db.user.find_unique(where={"email": payload.email})
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already registered")

    data = {
        "email": payload.email,
        "passwordHash": hash_password(payload.password),
    }
    if payload.username:
        data["username"] = payload.username

    user = await db.user.create(data=data)
    return RegisterResponse(user_id=user.id)


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    user = await db.user.find_unique(where={"email": payload.email})
    if not user or not user.passwordHash or not verify_password(payload.password, user.passwordHash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    return LoginResponse(user_id=user.id)


class ResetPasswordRequest(BaseModel):
    email: EmailStr
    new_password: str


@router.post("/reset-password", status_code=status.HTTP_204_NO_CONTENT)
async def reset_password(payload: ResetPasswordRequest):
    user = await db.user.find_unique(where={"email": payload.email})
    if not user:
        # Return 204 regardless to prevent email enumeration
        return

    if len(payload.new_password) < 6:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Password must be at least 6 characters")

    await db.user.update(
        where={"id": user.id},
        data={"passwordHash": hash_password(payload.new_password)},
    )