from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from .database import Base 
import datetime

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password = Column(String)
    nim = Column(String, unique=True, index=True)   # 🔹 Tambahkan NIM unik
    himpunan = Column(String, nullable=True, index=True)  # 🔹 HIMAIF / HIMASIF / HIMAKA, diisi otomatis dari data mahasiswa
    is_verified = Column(Boolean, default=False)
    otp_code = Column(String, nullable=True)
    otp_attempts = Column(Integer, nullable=False, default=0)  # 🔹 hitung percobaan OTP salah, buat cegah brute-force

    # 🔒 ANONIMITAS VOTE: flag ini yang jadi satu-satunya penanda "user ini udah milih".
    # SENGAJA tidak ada relasi/kolom apapun di sini yang nunjuk ke kandidat mana yang
    # dipilih — itu justru yang bikin vote beneran rahasia (lihat class Vote di bawah).
    has_voted = Column(Boolean, nullable=False, default=False)

class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    image = Column(String, nullable=True)      # URL gambar
    visi = Column(String, nullable=True)       # 🔹 1 teks panjang
    misi = Column(String, nullable=True)       # 🔹 Simpan JSON/dipisah dengan delimiter (misalnya ';')
    himpunan = Column(String, nullable=False, default="HIMAIF", index=True)  # 🔹 kandidat ini calon dari himpunan mana
    votes = relationship("Vote", back_populates="candidate")


class Vote(Base):
    """
    🔒 TABEL INI SENGAJA ANONIM.

    Cuma nyimpen kandidat mana yang dipilih — TIDAK ADA kolom user_id, NIM, email,
    atau apapun yang bisa dipakai buat nelusurin balik ke siapa pemilihnya. Ini beda
    dari desain lama, yang nyimpen user_id di tabel ini (jadi siapapun yang akses
    database bisa tau persis siapa milih siapa).

    Siapa yang udah/belum voting dicek lewat User.has_voted, BUKAN dari tabel ini.
    """
    __tablename__ = "votes"
    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(Integer, ForeignKey("candidates.id"))
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))

    candidate = relationship("Candidate", back_populates="votes")

    
class VotingPeriod(Base):
    __tablename__ = "voting_periods"
    id = Column(Integer, primary_key=True, index=True)
    start_date = Column(DateTime(timezone=True), nullable=False, default=datetime.datetime.utcnow)
    end_date = Column(DateTime(timezone=True), nullable=False)

class Mahasiswa(Base):
    __tablename__ = "mahasiswa"

    nim = Column(String, primary_key=True, index=True)
    nama = Column(String)
    himpunan = Column(String, nullable=False, default="HIMAIF", index=True)  # 🔹 HIMAIF / HIMASIF / HIMAKA
    sudah_mendaftar = Column(Boolean, default=False)

class AdminLog(Base):
    __tablename__ = "admin_logs"
    id = Column(Integer, primary_key=True, index=True)
    action = Column(String, nullable=False)        # contoh: "CREATE_CANDIDATE", "DELETE_USER"
    detail = Column(String, nullable=True)          # deskripsi manusiawi soal aksinya
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.datetime.now(datetime.timezone.utc))