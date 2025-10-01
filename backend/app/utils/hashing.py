from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash plain password (max 72 chars for bcrypt)"""
    # Potong password maksimal 72 karakter
    return pwd_context.hash(password[:72])

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password dengan hashed password"""
    # Tidak perlu dipotong, passlib akan handle verifikasi
    return pwd_context.verify(plain_password, hashed_password)
