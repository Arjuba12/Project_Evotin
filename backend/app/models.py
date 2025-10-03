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
    is_verified = Column(Boolean, default=False)
    otp_code = Column(String, nullable=True)

class Candidate(Base):
    __tablename__ = "candidates"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    image = Column(String, nullable=True)      # URL gambar
    visi = Column(String, nullable=True)       # 🔹 1 teks panjang
    misi = Column(String, nullable=True)       # 🔹 Simpan JSON/dipisah dengan delimiter (misalnya ';')
    votes = relationship("Vote", back_populates="candidate")


class Vote(Base):
    __tablename__ = "votes"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    candidate_id = Column(Integer, ForeignKey("candidates.id"))

    candidate = relationship("Candidate", back_populates="votes")

    __table_args__ = (
        UniqueConstraint("user_id", name="unique_user_vote"),  # ⛔ user hanya bisa 1x vote
    )
    
class VotingPeriod(Base):
    __tablename__ = "voting_periods"
    id = Column(Integer, primary_key=True, index=True)
    start_date = Column(DateTime(timezone=True), nullable=False, default=datetime.datetime.utcnow)
    end_date = Column(DateTime(timezone=True), nullable=False)

class Mahasiswa(Base):
    __tablename__ = "mahasiswa"

    nim = Column(String, primary_key=True, index=True)
    nama = Column(String)
    sudah_mendaftar = Column(Boolean, default=False)