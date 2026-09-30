from fastapi import FastAPI, HTTPException, Depends, status, UploadFile, File, Form, Request, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import timedelta
from typing import List
import random
import re
import openpyxl
from io import BytesIO

from pydantic import BaseModel

from .database import get_db, Base, engine
from .models import User, Candidate, Vote
from . import models, schemas, database
from datetime import datetime, timezone
from pytz import timezone as tz

import requests  # 🔹 dipakai buat manggil Brevo lewat HTTPS API (bukan smtplib/SMTP lagi —
                  #    Railway blokir semua koneksi SMTP keluar di paket Free/Hobby, cuma HTTPS yang kebuka)

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

def get_admin_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        role = payload.get("role")
        if role != "admin":
            raise HTTPException(status_code=403, detail="Bukan admin")
        return payload
    except JWTError:
        raise HTTPException(status_code=401, detail="Token tidak valid")

def log_action(db: Session, action: str, detail: str = None):
    """Catat aktivitas admin buat keperluan audit."""
    entry = models.AdminLog(action=action, detail=detail)
    db.add(entry)
    db.commit()

def get_client_ip(request: Request) -> str:
    """
    Ambil IP asli si pengunjung. Kalau app di-deploy di belakang proxy/load balancer
    (Railway, Vercel, dsb — kayak project ini), request.client.host bisa keliatan IP
    proxy-nya doang, bukan IP asli user. Makanya dicek dulu header X-Forwarded-For.
    """
    xff = request.headers.get("x-forwarded-for")
    if xff:
        # Header ini bisa berisi rantai "client, proxy1, proxy2" — ambil yang paling kiri (asli)
        return xff.split(",")[0].strip()
    real_ip = request.headers.get("x-real-ip")
    if real_ip:
        return real_ip.strip()
    return request.client.host if request.client else "unknown"

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
            # SQLite buang tzinfo pas round-trip, padahal nilainya selalu UTC (lihat to_utc()).
            # Tempelin lagi tzinfo=UTC sebelum di-serialize, biar string ISO-nya ada "+00:00"/"Z"
            # dan browser (JS) nggak salah nganggep ini jam lokal device.
            datetime: lambda v: (v if v.tzinfo else v.replace(tzinfo=timezone.utc)).isoformat()
        }
        
HIMPUNAN_LIST = ["HIMAIF", "HIMASIF", "HIMAKA"]

def validate_himpunan(himpunan: str):
    if himpunan not in HIMPUNAN_LIST:
        raise HTTPException(
            status_code=400,
            detail=f"Himpunan tidak valid. Pilih salah satu: {', '.join(HIMPUNAN_LIST)}"
        )

class CandidateCreate(BaseModel):
    name: str
    image: str | None = None
    visi: str | None = None
    misi: str | None = None
    himpunan: str

class CandidateResponse(BaseModel):
    id: int
    name: str
    image: str | None
    visi: str | None = None
    misi: str | None = None
    himpunan: str

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

allowed_origins = [
    "http://localhost:5000",
    "https://project-evotin.vercel.app",
]

def is_allowed_origin(origin: str) -> bool:
    if origin in allowed_origins:
        return True
    if re.match(r"https://project-evotin.*\.vercel\.app", origin):
        return True
    return False

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=r"https://project-evotin.*\.vercel\.app",
    allow_origins=allowed_origins,
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
    nim: str  


class LoginRequest(BaseModel):
    email: str
    password: str

class ResendOTPRequest(BaseModel):
    email: str
    
# Fungsi kirim email
# Fungsi kirim email
# Fungsi kirim email via Gmail SMTP
def send_email_otp(to_email: str, otp: str):
    html_body = f"""
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 480px; margin: 0 auto; background: #0f0f10; color: #f0f0f2; border-radius: 12px; overflow: hidden;">
      <div style="background: #16161a; padding: 28px 32px; border-bottom: 1px solid #242428;">
        <span style="font-family: monospace; font-size: 14px; font-weight: 600; letter-spacing: 0.08em; color: #f0f0f2;">● NEOVOTE</span>
      </div>
      <div style="padding: 32px;">
        <h2 style="font-size: 18px; font-weight: 600; color: #f0f0f2; margin: 0 0 8px;">Verifikasi Akun Kamu</h2>
        <p style="font-size: 14px; color: #9898a8; line-height: 1.6; margin: 0 0 28px;">
          Gunakan kode OTP berikut untuk mengaktifkan akun NEOVOTE kamu. Kode ini hanya berlaku untuk satu kali penggunaan.
        </p>
        <div style="background: #16161a; border: 1px solid #2e2e35; border-radius: 10px; padding: 24px; text-align: center; margin-bottom: 28px;">
          <p style="font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.1em; color: #5c5c6e; margin: 0 0 12px;">Kode Verifikasi</p>
          <div style="font-family: monospace; font-size: 36px; font-weight: 700; letter-spacing: 0.2em; color: #f59e0b; margin: 0;">{otp}</div>
        </div>
        <p style="font-size: 13px; color: #5c5c6e; line-height: 1.6; margin: 0;">
          Jangan bagikan kode ini kepada siapapun, termasuk panitia.<br>
          Kalau kamu tidak merasa mendaftar, abaikan email ini.
        </p>
      </div>
      <div style="background: #16161a; padding: 20px 32px; border-top: 1px solid #242428;">
        <p style="font-size: 12px; color: #5c5c6e; margin: 0; text-align: center;">© 2025 NEOVOTE · Sistem Voting Himpunan</p>
      </div>
    </div>
    """

    # 🔹 Pindah dari SMTP ke Brevo REST API (HTTPS, port 443) — bukan smtplib/SMTP lagi.
    #    Railway blokir semua koneksi SMTP keluar (port 25/465/587) di paket Free/Hobby,
    #    cuma dibuka kalau upgrade ke Pro. HTTPS biasa gak kena blokir itu sama sekali.
    brevo_api_key = os.getenv("BREVO_API_KEY")  # ⚠️ beda sama BREVO_SMTP_KEY — ambil dari tab "API Keys"
    sender_email = os.getenv("BREVO_SENDER_EMAIL")  # harus persis sama kayak email yang diverifikasi di Brevo

    try:
        # timeout=10 → biar kalau Brevo-nya lemot/nyangkut, gagal cepet (10 detik) daripada
        # nge-hang lama dan nge-block request /register yang lagi nunggu fungsi ini selesai
        resp = requests.post(
            "https://api.brevo.com/v3/smtp/email",
            headers={
                "accept": "application/json",
                "api-key": brevo_api_key,
                "content-type": "application/json",
            },
            json={
                "sender": {"name": "NEOVOTE", "email": sender_email},
                "to": [{"email": to_email}],
                "subject": "Kode Verifikasi NEOVOTE",
                "htmlContent": html_body,
            },
            timeout=10,
        )
        if resp.status_code >= 300:
            print(f"⚠️ Gagal kirim email ke {to_email} lewat Brevo: {resp.status_code} {resp.text}")
        else:
            print(f"✅ OTP dikirim ke {to_email} lewat Brevo")
    except Exception as e:
        print(f"⚠️ Gagal kirim email ke {to_email} lewat Brevo: {e}")
        
@app.post("/register")
def register(req: RegisterRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    email = req.email.strip().lower()
    nim = req.nim.strip()
    ip = get_client_ip(request)

    def _log(action: str, reason: str):
        log_action(
            db, action,
            f"NIM {nim}, nama diketik '{req.name}', email {email}, IP {ip} — {reason}"
        )

    # 1. Validasi NIM ada di tabel mahasiswa
    mahasiswa = db.query(models.Mahasiswa).filter(models.Mahasiswa.nim == nim).first()
    if not mahasiswa:
        _log("REGISTER_FAILED", "NIM tidak ada di whitelist mahasiswa")
        raise HTTPException(status_code=400, detail="NIM tidak terdaftar di database mahasiswa")

    # 2. Cek apakah mahasiswa sudah dipakai buat akun
    if mahasiswa.sudah_mendaftar:
        _log("REGISTER_FAILED", "NIM sudah punya akun terverifikasi")
        raise HTTPException(status_code=400, detail="NIM sudah digunakan untuk akun lain")

    # 2b. 🔹 Cocokkan nama yang diketik dengan nama pemilik NIM di data whitelist.
    #     Tanpa ini, siapapun yang tau NIM orang lain (yang emang gak rahasia-rahasia amat)
    #     bisa register pakai nama sembarang & ngaku-ngaku jadi mahasiswa itu.
    def _normalize_nama(s: str) -> str:
        return re.sub(r"\s+", " ", (s or "")).strip().lower()

    if _normalize_nama(req.name) != _normalize_nama(mahasiswa.nama):
        _log("REGISTER_FAILED", f"nama tidak cocok (harusnya '{mahasiswa.nama}')")
        raise HTTPException(
            status_code=400,
            detail="Nama tidak sesuai dengan data mahasiswa yang terdaftar untuk NIM ini"
        )

    # 3. Validasi password
    try:
        validate_password(req.password)
    except HTTPException:
        _log("REGISTER_FAILED", "password gagal validasi")
        raise
    password_to_use = req.password[:72]

    # 4. Bersihkan akun lama yang belum diverifikasi (biar gak nyangkut kalau user
    #    sempat refresh/tutup tab sebelum verifikasi OTP). Dicek dari EMAIL maupun NIM,
    #    supaya tetap ke-cover walau mahasiswa coba daftar ulang pakai email berbeda.
    stale_user = db.query(User).filter(
        (User.email == email) | (User.nim == nim)
    ).first()

    if stale_user:
        if stale_user.is_verified:
            if stale_user.email == email:
                _log("REGISTER_FAILED", "email sudah terdaftar & terverifikasi")
                raise HTTPException(status_code=400, detail="Email sudah terdaftar & terverifikasi")
            else:
                _log("REGISTER_FAILED", "NIM sudah punya akun terverifikasi (email beda)")
                raise HTTPException(status_code=400, detail="NIM sudah digunakan untuk akun lain")
        else:
            db.delete(stale_user)
            db.commit()
            notif = "⚠️ Akun lama belum diverifikasi, data lama dihapus & OTP baru dikirim."
    else:
        notif = "✅ Akun baru berhasil dibuat & OTP dikirim."

    # 5. Cek username
    username_exist = db.query(User).filter(User.username == mahasiswa.nama).first()
    if username_exist:
        _log("REGISTER_FAILED", "username (nama) sudah dipakai akun lain")
        raise HTTPException(status_code=400, detail="Username sudah digunakan")

    # 6. Buat OTP & hash password
    otp = str(random.randint(100000, 999999))
    hashed_pw = hash_password(password_to_use)

    # 7. Buat user baru
    new_user = User(
        username=mahasiswa.nama,  # 🔹 pakai nama resmi dari data whitelist, bukan input bebas user
        email=email,
        password=hashed_pw,
        nim=nim,  # 🔹 simpan NIM
        himpunan=mahasiswa.himpunan,  # 🔹 otomatis ikut himpunan sesuai data mahasiswa
        otp_code=otp,
        otp_attempts=0,
        is_verified=False
    )
    db.add(new_user)

    # 8. CATATAN: mahasiswa.sudah_mendaftar SENGAJA belum di-set True di sini.
    #    Baru di-set True di /verify-otp, setelah OTP-nya benar-benar berhasil dikonfirmasi.
    #    Ini biar kalau mahasiswa refresh/tutup tab sebelum verifikasi, NIM-nya gak
    #    ke-lock dan dia masih bisa coba daftar ulang tanpa admin harus hapus data manual.

    db.commit()
    db.refresh(new_user)

    _log("REGISTER_SUCCESS", "OTP dikirim, menunggu verifikasi")

    # 9. Kirim OTP
    background_tasks.add_task(send_email_otp, email, otp)
    return {"message": notif}




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

    return {"id": user.id, "name": user.username, "email": user.email, "nim": user.nim, "himpunan": user.himpunan}


MAX_OTP_ATTEMPTS = 5  # 🔹 abis 5x salah, dikunci sampai minta OTP baru — nyegat brute-force kode 6 digit

@app.post("/verify-otp")
def verify_otp(req: schemas.VerifyOTP, request: Request, db: Session = Depends(database.get_db)):
    ip = get_client_ip(request)
    user = db.query(models.User).filter(models.User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User sudah terverifikasi")

    # 🔹 Sudah kena limit percobaan → tolak duluan sebelum sempat ngecek OTP-nya
    if user.otp_attempts >= MAX_OTP_ATTEMPTS:
        log_action(
            db, "OTP_LOCKED",
            f"NIM {user.nim}, email {req.email}, IP {ip} — percobaan OTP diblokir (udah {user.otp_attempts}x salah)"
        )
        raise HTTPException(
            status_code=429,
            detail="Terlalu banyak percobaan OTP salah. Klik 'Kirim ulang OTP' buat dapet kode baru."
        )

    if user.otp_code != req.otp:
        user.otp_attempts += 1
        db.commit()
        log_action(
            db, "OTP_FAILED",
            f"NIM {user.nim}, email {req.email}, IP {ip} — OTP salah (percobaan ke-{user.otp_attempts})"
        )
        raise HTTPException(status_code=400, detail="OTP salah")

    # OTP valid → aktifkan user
    user.is_verified = True
    user.otp_code = None  # hapus OTP
    user.otp_attempts = 0

    # 🔹 baru sekarang NIM ditandai "sudah mendaftar" — setelah beneran terverifikasi.
    #    Sebelumnya ini di-set pas /register, jadi kalau mahasiswa refresh/tutup tab
    #    sebelum verifikasi OTP, NIM-nya kadung ke-lock padahal akunnya belum jadi.
    mahasiswa = db.query(models.Mahasiswa).filter(models.Mahasiswa.nim == user.nim).first()
    if mahasiswa:
        mahasiswa.sudah_mendaftar = True

    db.commit()

    log_action(db, "OTP_SUCCESS", f"NIM {user.nim}, email {req.email}, IP {ip} — akun terverifikasi")

    return {"message": "OTP valid, akun sudah aktif"}

@app.post("/resend-otp")
def resend_otp(req: ResendOTPRequest, request: Request, background_tasks: BackgroundTasks, db: Session = Depends(database.get_db)):
    ip = get_client_ip(request)
    user = db.query(User).filter(models.User.email == req.email).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")
    if user.is_verified:
        raise HTTPException(status_code=400, detail="User sudah terverifikasi")

    new_otp = str(random.randint(100000, 999999))
    user.otp_code = new_otp
    user.otp_attempts = 0  # 🔹 kode baru → reset jatah percobaan
    db.commit()

    log_action(db, "OTP_RESEND", f"NIM {user.nim}, email {req.email}, IP {ip} — minta OTP baru")

    # 🔹 Kirim OTP baru ke email
    background_tasks.add_task(send_email_otp, user.email, new_otp)

    return {"message": "OTP baru telah dikirim ke email"}

# GET semua kandidat
# ✅ CREATE kandidat
@app.post("/candidates", response_model=CandidateResponse)
def add_candidate(req: CandidateCreate, db: Session = Depends(database.get_db), _: dict = Depends(get_admin_user)):
    validate_himpunan(req.himpunan)
    candidate = models.Candidate(name=req.name, image=req.image, visi=req.visi, misi=req.misi, himpunan=req.himpunan)
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    log_action(db, "CREATE_CANDIDATE", f"Tambah kandidat '{candidate.name}' ({candidate.himpunan})")
    return candidate


# ✅ READ semua kandidat (bisa difilter per himpunan lewat query param ?himpunan=HIMAIF)
@app.get("/candidates", response_model=List[CandidateResponse])
def get_candidates(himpunan: str | None = None, db: Session = Depends(get_db)):
    query = db.query(models.Candidate)
    if himpunan:
        query = query.filter(models.Candidate.himpunan == himpunan)
    return query.all()


# ✅ READ kandidat by id
@app.get("/candidates/{candidate_id}", response_model=CandidateResponse)
def get_candidate(candidate_id: int, db: Session = Depends(get_db)):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate tidak ditemukan")
    return candidate


# ✅ UPDATE kandidat
@app.put("/candidates/{candidate_id}", response_model=CandidateResponse)
def update_candidate(candidate_id: int, req: CandidateCreate, db: Session = Depends(get_db), _: dict = Depends(get_admin_user)):
    validate_himpunan(req.himpunan)
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate tidak ditemukan")

    candidate.name = req.name
    candidate.image = req.image
    candidate.visi= req.visi
    candidate.misi= req.misi
    candidate.himpunan = req.himpunan

    db.commit()
    db.refresh(candidate)
    log_action(db, "UPDATE_CANDIDATE", f"Edit kandidat '{candidate.name}' ({candidate.himpunan})")
    return candidate


# ✅ DELETE kandidat
@app.delete("/candidates/{candidate_id}")
def delete_candidate(candidate_id: int, db: Session = Depends(get_db), _: dict = Depends(get_admin_user)):
    candidate = db.query(models.Candidate).filter(models.Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(status_code=404, detail="Candidate tidak ditemukan")

    nama, himpunan = candidate.name, candidate.himpunan
    db.delete(candidate)
    db.commit()
    log_action(db, "DELETE_CANDIDATE", f"Hapus kandidat '{nama}' ({himpunan})")
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

    # 🔹 Pastikan kandidat yang dipilih dari himpunan yang sama dengan si voter
    if candidate.himpunan != user.himpunan:
        raise HTTPException(status_code=403, detail="Kamu cuma bisa memilih kandidat dari himpunanmu sendiri")

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
def get_results(himpunan: str | None = None, db: Session = Depends(get_db)):
    query = (
        db.query(
            Candidate.id,
            Candidate.name,
            Candidate.himpunan,
            func.count(Vote.id).label("total_votes")
        )
        .outerjoin(Vote, Candidate.id == Vote.candidate_id)
    )
    if himpunan:
        query = query.filter(Candidate.himpunan == himpunan)
    results = query.group_by(Candidate.id).all()
    return [
        {"id": r.id, "name": r.name, "himpunan": r.himpunan, "total_votes": r.total_votes}
        for r in results
    ]
    
@app.get("/stats")
def get_stats(db: Session = Depends(get_db), current_user: str = Depends(get_current_user)):
    # current_user masih berupa email
    user = db.query(User).filter(User.email == current_user).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    # 🔹 Hitung hanya di lingkup himpunan si user sendiri
    total_users = db.query(User).filter(User.himpunan == user.himpunan).count()
    total_votes = (
        db.query(Vote)
        .join(Candidate, Vote.candidate_id == Candidate.id)
        .filter(Candidate.himpunan == user.himpunan)
        .count()
    )
    has_voted = db.query(Vote).filter(Vote.user_id == user.id).first() is not None

    return {
        "total_users": total_users,
        "total_votes": total_votes,
        "has_voted": has_voted,
        "himpunan": user.himpunan
    }

@app.post("/voting-period", response_model=VotingPeriodResponse)
def create_voting_period(period: VotingPeriodCreate, db: Session = Depends(get_db), _: dict = Depends(get_admin_user)):
    new_period = models.VotingPeriod(
        start_date=to_utc(period.start_date),
        end_date=to_utc(period.end_date)
    )
    db.add(new_period)
    db.commit()
    db.refresh(new_period)
    log_action(db, "CREATE_PERIOD", f"Buat periode voting: {new_period.start_date} s/d {new_period.end_date}")
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
def update_voting_period(period_id: int, period: VotingPeriodCreate, db: Session = Depends(get_db), _: dict = Depends(get_admin_user)):
    db_period = db.query(models.VotingPeriod).filter(models.VotingPeriod.id == period_id).first()
    if not db_period:
        raise HTTPException(status_code=404, detail="Voting period not found")
    db_period.start_date = to_utc(period.start_date)
    db_period.end_date = to_utc(period.end_date)
    db.commit()
    db.refresh(db_period)
    log_action(db, "UPDATE_PERIOD", f"Edit periode voting #{period_id}: {db_period.start_date} s/d {db_period.end_date}")
    return db_period

@app.delete("/voting-period/{period_id}")
def delete_voting_period(period_id: int, db: Session = Depends(get_db), _: dict = Depends(get_admin_user)):
    db_period = db.query(models.VotingPeriod).filter(models.VotingPeriod.id == period_id).first()
    if not db_period:
        raise HTTPException(status_code=404, detail="Voting period not found")
    db.delete(db_period)
    db.commit()
    log_action(db, "DELETE_PERIOD", f"Hapus periode voting #{period_id}")
    return {"detail": "Voting period deleted"}

@app.options("/{path:path}")
async def option_handler(path: str):
    return {"message" : "OK"}

# ============================================================
# Tambahkan ini ke main.py (di bagian bawah, sebelum options handler)
# ============================================================

# ===== ADMIN =====

class AdminLoginRequest(BaseModel):
    password: str

@app.post("/admin/login")
def admin_login(req: AdminLoginRequest, db: Session = Depends(get_db)):
    admin_password = os.getenv("ADMIN_PASSWORD")
    if not admin_password or req.password != admin_password:
        raise HTTPException(status_code=401, detail="Password admin salah")
    token = create_access_token(
        data={"sub": "admin", "role": "admin"},
        expires_delta=timedelta(hours=12)
    )
    log_action(db, "LOGIN", "Admin login ke dashboard")
    return {"access_token": token, "token_type": "bearer"}

@app.get("/admin/stats")
def get_admin_stats(db: Session = Depends(get_db), _: dict = Depends(get_admin_user)):
    breakdown = []
    total_users_all = 0
    total_votes_all = 0
    for h in HIMPUNAN_LIST:
        tu = db.query(User).filter(User.himpunan == h).count()
        tv = (
            db.query(Vote)
            .join(Candidate, Vote.candidate_id == Candidate.id)
            .filter(Candidate.himpunan == h)
            .count()
        )
        breakdown.append({"himpunan": h, "total_users": tu, "total_votes": tv})
        total_users_all += tu
        total_votes_all += tv
    return {
        "total_users": total_users_all,
        "total_votes": total_votes_all,
        "breakdown": breakdown
    }

@app.get("/admin/logs")
def get_admin_logs(
    limit: int = 300,
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user)
):
    logs = (
        db.query(models.AdminLog)
        .order_by(models.AdminLog.id.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": l.id,
            "action": l.action,
            "detail": l.detail,
            "created_at": (l.created_at if l.created_at.tzinfo else l.created_at.replace(tzinfo=timezone.utc)).isoformat()
        }
        for l in logs
    ]

@app.get("/admin/users")
def get_all_users(
    himpunan: str | None = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user)
):
    query = db.query(User)
    if himpunan:
        query = query.filter(User.himpunan == himpunan)
    users = query.all()
    return [
        {
            "id": u.id,
            "username": u.username,
            "email": u.email,
            "nim": u.nim,
            "himpunan": u.himpunan,
            "is_verified": u.is_verified
        }
        for u in users
    ]

@app.delete("/admin/users/{user_id}")
def delete_user(
    user_id: int,
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user)
):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User tidak ditemukan")

    # hapus vote yang pernah dia kasih (kalau ada)
    db.query(Vote).filter(Vote.user_id == user.id).delete()

    # balikin status mahasiswa jadi "belum daftar" biar NIM-nya bisa dipake register ulang
    mahasiswa = db.query(models.Mahasiswa).filter(models.Mahasiswa.nim == user.nim).first()
    if mahasiswa:
        mahasiswa.sudah_mendaftar = False

    username, email, nim = user.username, user.email, user.nim
    db.delete(user)
    db.commit()
    log_action(db, "DELETE_USER", f"Hapus akun user '{username}' ({email}, NIM {nim})")
    return {"message": "User berhasil dihapus"}

# ===== ADMIN: DATA MAHASISWA (whitelist NIM buat register) =====

class MahasiswaCreate(BaseModel):
    nim: str
    nama: str
    himpunan: str

@app.get("/admin/mahasiswa")
def get_all_mahasiswa(
    himpunan: str | None = None,
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user)
):
    query = db.query(models.Mahasiswa)
    if himpunan:
        query = query.filter(models.Mahasiswa.himpunan == himpunan)
    data = query.all()
    return [
        {
            "nim": m.nim,
            "nama": m.nama,
            "himpunan": m.himpunan,
            "sudah_mendaftar": m.sudah_mendaftar
        }
        for m in data
    ]

@app.post("/admin/mahasiswa")
def add_mahasiswa(
    req: MahasiswaCreate,
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user)
):
    nim = req.nim.strip()
    nama = req.nama.strip()
    validate_himpunan(req.himpunan)

    if not nim or not nama:
        raise HTTPException(status_code=400, detail="NIM dan nama wajib diisi")

    existing = db.query(models.Mahasiswa).filter(models.Mahasiswa.nim == nim).first()
    if existing:
        raise HTTPException(status_code=400, detail="NIM sudah ada di data mahasiswa")

    mahasiswa = models.Mahasiswa(nim=nim, nama=nama, himpunan=req.himpunan, sudah_mendaftar=False)
    db.add(mahasiswa)
    db.commit()
    db.refresh(mahasiswa)
    log_action(db, "CREATE_MAHASISWA", f"Tambah mahasiswa '{nama}' (NIM {nim}, {req.himpunan})")
    return {
        "nim": mahasiswa.nim,
        "nama": mahasiswa.nama,
        "sudah_mendaftar": mahasiswa.sudah_mendaftar
    }

@app.post("/admin/mahasiswa/import")
async def import_mahasiswa(
    himpunan: str = Form(...),
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user)
):
    validate_himpunan(himpunan)

    if not file.filename.lower().endswith((".xlsx", ".xlsm")):
        raise HTTPException(status_code=400, detail="File harus format Excel (.xlsx)")

    content = await file.read()
    try:
        wb = openpyxl.load_workbook(BytesIO(content), data_only=True)
        sheet = wb.active
    except Exception:
        raise HTTPException(status_code=400, detail="File Excel tidak bisa dibaca. Pastikan formatnya valid.")

    imported, skipped_duplicate, skipped_invalid = [], [], []

    for idx, row in enumerate(sheet.iter_rows(min_row=1, values_only=True), start=1):
        if not row or len(row) < 2:
            continue

        raw_nim, raw_nama = row[0], row[1]

        # Lewatin baris header (misal isinya "NIM"/"Nama" bukan data beneran)
        if idx == 1 and isinstance(raw_nim, str) and raw_nim.strip().lower() in ("nim", "no", "no.", ""):
            continue

        if raw_nim is None or raw_nama is None:
            continue

        # NIM dari Excel kadang kebaca sebagai angka (int/float), rapihin jadi string bersih
        if isinstance(raw_nim, (int, float)):
            nim = str(int(raw_nim))
        else:
            nim = str(raw_nim).strip()
        nama = str(raw_nama).strip()

        if not nim or not nama:
            skipped_invalid.append(f"baris {idx}")
            continue

        existing = db.query(models.Mahasiswa).filter(models.Mahasiswa.nim == nim).first()
        if existing:
            skipped_duplicate.append(nim)
            continue

        db.add(models.Mahasiswa(nim=nim, nama=nama, himpunan=himpunan, sudah_mendaftar=False))
        imported.append(nim)

    db.commit()
    log_action(
        db, "IMPORT_MAHASISWA",
        f"Import Excel '{file.filename}' untuk {himpunan}: {len(imported)} berhasil, "
        f"{len(skipped_duplicate)} duplikat, {len(skipped_invalid)} baris invalid"
    )

    return {
        "imported_count": len(imported),
        "skipped_duplicate": skipped_duplicate,
        "skipped_invalid": skipped_invalid,
    }

@app.delete("/admin/mahasiswa/{nim}")
def delete_mahasiswa(
    nim: str,
    db: Session = Depends(get_db),
    _: dict = Depends(get_admin_user)
):
    mahasiswa = db.query(models.Mahasiswa).filter(models.Mahasiswa.nim == nim).first()
    if not mahasiswa:
        raise HTTPException(status_code=404, detail="Mahasiswa tidak ditemukan")

    nama = mahasiswa.nama
    db.delete(mahasiswa)
    db.commit()
    log_action(db, "DELETE_MAHASISWA", f"Hapus data mahasiswa '{nama}' (NIM {nim})")
    return {"message": "Data mahasiswa berhasil dihapus"}