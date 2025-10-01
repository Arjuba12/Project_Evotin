from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash password max 72 bytes (bcrypt)"""
    # potong sesuai bytes
    max_bytes = 72
    password_bytes = password.encode("utf-8")[:max_bytes]
    password_truncated = password_bytes.decode("utf-8", "ignore")
    return pwd_context.hash(password_truncated)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password dengan hashed password"""
    # Tidak perlu dipotong, passlib akan handle verifikasi
    return pwd_context.verify(plain_password, hashed_password)
