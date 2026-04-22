from pydantic import BaseModel, Field, EmailStr
from typing import Optional

# Fasilitas Models
class FasilitasBase(BaseModel):
    nama: str = Field(..., min_length=3)
    jenis: str
    alamat: Optional[str] = None
    longitude: float
    latitude: float

class FasilitasCreate(FasilitasBase):
    pass

class FasilitasUpdate(BaseModel):
    nama: Optional[str] = None
    jenis: Optional[str] = None
    alamat: Optional[str] = None
    longitude: Optional[float] = None
    latitude: Optional[float] = None

# Auth Models
class UserCreate(BaseModel):
    username: str = Field(..., min_length=3)
    email: EmailStr
    password: str = Field(..., min_length=6)

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
