from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
import os
from dotenv import load_dotenv

load_dotenv()  # Biar bisa baca .env (Railway otomatis inject ENV vars)

# Railway otomatis kasih DATABASE_URL
# Contoh: postgresql://username:password@host:port/dbname
DATABASE_URL = os.getenv("DATABASE_URL") 

# Kalau masih kosong (misalnya running lokal), fallback ke SQLite
if not DATABASE_URL:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
    DATABASE_URL = f"sqlite:///{os.path.join(BASE_DIR, 'evoting.db')}"

# Engine PostgreSQL → connect_args khusus SQLite nggak perlu
engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

print(f"Using database: {DATABASE_URL}")
