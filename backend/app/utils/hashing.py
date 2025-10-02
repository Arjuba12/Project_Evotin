import bcrypt

def hash_password(password: str) -> str:
    """Hash password max 72 bytes (bcrypt)"""
    max_bytes = 72
    password_bytes = password.encode("utf-8")[:max_bytes]
    
    # Generate salt dan hash
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify plain password dengan hashed password"""
    password_bytes = plain_password.encode("utf-8")[:72]
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(password_bytes, hashed_bytes)
