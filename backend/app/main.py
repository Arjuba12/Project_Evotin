from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import timedelta
from typing import List
import random

from pydantic import BaseModel

from .database import get_db, Base, engine
from .models import User, Candidate, Vote
from . import models, schemas, database
from datetime import datetime, timezone
from pytz import timezone as tz

import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from dotenv import load_dotenv
import os

load_dotenv() 

MAIL_USERNAME = os.getenv("MAIL_USERNAME")
MAIL_PASSWORD = os.getenv("MAIL_PASSWORD")
print(MAIL_USERNAME, MAIL_PASSWORD)


from jose import jwt, JWTError
from .utils.jwt_handler import SECRET_KEY, ALGORITHM

from .utils.hashing import hash_password, verify_password
from .utils.jwt_handler import (
    create_access_token,
    decode_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

WIB = tz("Asia/Jakarta")

def to_utc(dt: datetime):
    """Konversi datetime naive/WIB ke UTC"""
    if dt.tzinfo is None:
        dt = WIB.localize(dt)  # kalau naive → anggap WIB
    return dt.astimezone(timezone.utc)

security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials",
            )
        return username
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token",
        )

app = FastAPI()

class VotingPeriodBase(BaseModel):
    start_date: datetime
    end_date: datetime

class VotingPeriodCreate(VotingPeriodBase):
    pass

class VotingPeriodResponse(VotingPeriodBase):
    id: int

    class Config:
        orm_mode = True
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
        
class CandidateCreate(BaseModel):
    name: str
    image: str | None = None
    visi_misi: str | None = None

class CandidateResponse(BaseModel):
    id: int
    name: str
    image: str | None
    visi_misi: str | None

class Config:
        orm_mode = True
        
class VoteRequest(BaseModel):
    candidate_id: int


import re
def validate_password(password: str):
    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password minimal 8 karakter")
    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="Password harus mengandung huruf besar")
    if not re.search(r"[0-9]", password):
        raise HTTPException(status_code=400, detail="Password harus mengandung angka")
    if not re.search(r"[@$!%*?&]", password):
        raise HTTPException(status_code=400, detail="Password harus mengandung simbol (@$!%*?&)")
    return True

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", "https://project-evotin.vercel.app" 
        ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ⬇️ bikin tabel saat start
Base.metadata.create_all(bind=engine)


class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str

class ResendOTPRequest(BaseModel):
    email: str
    
# Fungsi kirim email
# Fungsi kirim email
def send_email_otp(to_email: str, otp: str):
    # Ambil dari .env
    smtp_server = "smtp.gmail.com"
    smtp_port = 587
    sender_email = MAIL_USERNAME        # dari .env
    sender_password = MAIL_PASSWORD     # dari .env

    msg = MIMEMultipart()
    msg["From"] = sender_email
    msg["To"] = to_email
    msg["Subject"] = "NEOVOTE OTP Verification"

    body = f"Kode OTP Anda: {otp}\n\nJangan bagikan kode ini ke siapa pun."
    msg.attach(MIMEText(body, "plain"))

    try:
        server = smtplib.SMTP(smtp_server, smtp_port)
        server.starttls()
        server.login(sender_email, sender_password)
        server.send_message(msg)
        server.quit()
        print(f"✅ OTP dikirim ke {to_email}")
    except Exception as e:
        print(f"⚠️ Gagal kirim email: {e}")


@app.post("/register")
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    validate_password(req.password)

    user_exist = db.query(User).filter(User.email == email).first()
    if user_exist:
        if user_exist.is_verified:
            raise HTTPException(status_code=400, detail="Email sudah terdaftar & terverifikasi")
        else:
            db.delete(user_exist)
            db.commit()
            notif = "⚠️ Akun lama belum diverifikasi, data lama dihapus & OTP baru dikirim."
    else:
        notif = "✅ Akun baru berhasil dibuat & OTP dikirim."

    username_exist = db.query(User).filter(User.username == req.name).first()
    if username_exist:
        raise HTTPException(status_code=400, detail="Username sudah digunakan")

    otp = str(random.randint(100000, 999999))
    hashed_pw = hash_password(req.password)

    new_user = User(
        username=req.name,
        email=email,
        password=hashed_pw,
        otp_code=otp,
        is_verified=False
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # 🔹 Kirim OTP ke email
    send_email_otp(email, otp)

    return {"message": notif}  # tidak perlu kirim OTP ke frontend


@app.post("/login")
def login(req: LoginRequest, db: Session = Depends(get_db)):
    # Cari user berdasarkan email
    user = db.query(User).filter(User.email == req.email.strip().lower()).first()

    # Cek user & password
    if not user or not verify_password(req.password, user.password):
        raise HTTPException(status_code=401, detail="❌ Email atau password salah")

    # Cek status verifikasi
    if not user.is_verified:
        raise HTTPException(
            status_code=403,
            detail="⚠️ Akun belum diverifikasi. Silakan cek email untuk OTP."
        )

    # Kalau lolos semua → buat token
    access_token = create_access_token(
        data={"sub": user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES),
    )
    return {"access_token": access_token, "token_type": "bearer"}


@app.get("/users/me")
def read_users_me(current_user: str = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    return {"id": user.id, "name": user.username, "email": user.email}


@app.post("/verify-otp")
def verify_otp(req: schemas.VerifyOTP, db: Session = Depends(database.get_db)):
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User sudah terverifikasi")
    if user.otp_code != req.otp:
        raise HTTPException(status_code=400, detail="OTP salah")

    # OTP valid → aktifkan user
    user.is_verified = True
    user.otp_code = None  # hapus OTP
    db.commit()

    return {"message": "OTP valid, akun sudah aktif"}

@app.post("/resend-otp")
def resend_otp(req: ResendOTPRequest, db: Session = Depends(database.get_db)):
    user = db.query(User).filter(models.User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User sudah terverifikasi")

    new_otp = str(random.randint(100000, 999999))
    user.otp_code = new_otp
    db.commit()

    # 🔹 Kirim OTP baru ke email
    send_email_otp(user.email, new_otp)

    return {"message": "OTP baru telah dikirim ke email"}

# GET semua kandidat
# ✅ CREATE kandidat
@app.post("/candidates", response_model=CandidateResponse)
def add_candidate(req: CandidateCreate, db: Session = Depends(database.get_db)):
    candidate = models.Candidate(name=req.name, image=req.image, visi_misi=req.visi_misi)
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return candidate


# ✅ READ semua kandidat
@app.get("/candidates", response_model=List[CandidateResponse])
def get_candidates(db: Session = Depends(get_db)):
    candidates = db.query(models.Candidate).all()
    return candidates


# ✅ READ kandidat by id
@app.get("/candidates/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate tidak ditemukan")
    return candidate


# ✅ UPDATE kandidat
@app.put("/candidates/{candidate_id}", response_model=CandidateResponse)
def update_candidate(candidate_id: int, req: CandidateCreate, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate tidak ditemukan")

    candidate.name = req.name
    candidate.image = req.image
    candidate.visi_misi = req.visi_misi

    db.commit()
    db.refresh(candidate)
    return candidate


# ✅ DELETE kandidat
@app.delete("/candidates/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate tidak ditemukan")

    db.delete(candidate)
    db.commit()
    return {"message": "Candidate berhasil dihapus"}

@app.post("/vote", status_code=status.HTTP_201_CREATED)
def cast_vote(
    req: VoteRequest,
    current_user: str = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.email == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    candidate = db.query(Candidate).filter(Candidate.id == req.candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate tidak ditemukan")

    # Ambil periode voting terbaru
    period = db.query(models.VotingPeriod).order_by(models.VotingPeriod.id.desc()).first()
    if not period:
        raise HTTPException(status_code=400, detail="Periode voting belum ditentukan")

    # Pastikan semua datetime pakai UTC untuk perbandingan
    now = datetime.now(timezone.utc)

    start = period.start_date
    end = period.end_date

    if start.tzinfo is None:
        start = start.replace(tzinfo=timezone.utc)
    else:
        start = start.astimezone(timezone.utc)

    if end.tzinfo is None:
        end = end.replace(tzinfo=timezone.utc)
    else:
        end = end.astimezone(timezone.utc)
        
    # Cek status voting
    if now < start:
        raise HTTPException(
            status_code=403,
            detail="Voting belum dimulai. Silakan tunggu hingga periode dibuka."
        )
    if now > end:
        raise HTTPException(
            status_code=403,
            detail="Voting sudah selesai. Periode pemilihan telah berakhir."
        )

    # Cek user sudah vote atau belum
    existing_vote = db.query(Vote).filter(Vote.user_id == user.id).first()
    if existing_vote:
        raise HTTPException(status_code=400, detail="User sudah voting")

    # Simpan vote
    new_vote = Vote(user_id=user.id, candidate_id=req.candidate_id)
    db.add(new_vote)
    db.commit()
    db.refresh(new_vote)

    return {"message": "Vote berhasil", "candidate": candidate.name}

@app.get("/results")
def get_results(db: Session = Depends(get_db)):
    results = (
        db.query(
            Candidate.id,
            Candidate.name,
            func.count(Vote.id).label("total_votes")
        )
        .outerjoin(Vote, Candidate.id == Vote.candidate_id)
        .group_by(Candidate.id)
        .all()
    )
    return [
        {"id": r.id, "name": r.name, "total_votes": r.total_votes}
        for r in results
    ]
    
@app.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    # current_user masih berupa email
    user = db.query(User).filter(User.email == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    total_users = db.query(User).count()
    total_votes = db.query(Vote).count()
    has_voted = db.query(Vote).filter(Vote.user_id == user.id).first() is not None

    return {
        "total_users": total_users,
        "total_votes": total_votes,
        "has_voted": has_voted
    }

@app.post("/voting-period", response_model=VotingPeriodResponse)
def create_voting_period(period: VotingPeriodCreate, db: Session = Depends(get_db)):
    new_period = models.VotingPeriod(
        start_date=to_utc(period.start_date),
        end_date=to_utc(period.end_date)
    )
    db.add(new_period)
    db.commit()
    db.refresh(new_period)
    return new_period

@app.get("/voting-period", response_model=List[VotingPeriodResponse])
def get_voting_periods(db: Session = Depends(get_db)):
    return db.query(models.VotingPeriod).all()

@app.get("/voting-period/{period_id}", response_model=VotingPeriodResponse)
def get_voting_period(period_id: int, db: Session = Depends(get_db)):
    period = db.query(models.VotingPeriod).filter(models.VotingPeriod.id == period_id).first()
    if not period:
        raise HTTPException(status_code=404, detail="Voting period not found")
    return period

@app.put("/voting-period/{period_id}", response_model=VotingPeriodResponse)
def update_voting_period(period_id: int, period: VotingPeriodCreate, db: Session = Depends(get_db)):
    db_period = db.query(models.VotingPeriod).filter(models.VotingPeriod.id == period_id).first()
    if not db_period:
        raise HTTPException(status_code=404, detail="Voting period not found")
    db_period.start_date = period.start_date
    db_period.end_date = period.end_date
    db.commit()
    db.refresh(db_period)
    return db_period

@app.delete("/voting-period/{period_id}")
def delete_voting_period(period_id: int, db: Session = Depends(get_db)):
    db_period = db.query(models.VotingPeriod).filter(models.VotingPeriod.id == period_id).first()
    if not db_period:
        raise HTTPException(status_code=404, detail="Voting period not found")
    db.delete(db_period)
    db.commit()
    return {"detail": "Voting period deleted"}

@app.options("/{path:path}")
async def option_handler(path: str):
    return {"message" : "OK"}
