from pydantic import BaseModel, EmailStr
from pydantic import BaseModel

class VerifyOTP(BaseModel):
    email: str
    otp: str

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: int
    email: EmailStr

    class Config:
        from_attributes = True

class CandidateCreate(BaseModel):
    name: str
    image: str | None = None
    visi_misi: str | None = None
    
