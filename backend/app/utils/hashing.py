from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str):
    # truncate maksimal 72 karakter
    password_truncated = password[:72]
    return pwd_context.hash(password_truncated)

def verify_password(plain_password, hashed_password):
    plain_truncated = plain_password[:72]
    return pwd_context.verify(plain_truncated, hashed_password)
