from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
from pydantic import BaseModel, EmailStr
import os
from dotenv import load_dotenv

load_dotenv()

conf = ConnectionConfig(
    MAIL_USERNAME = os.getenv("MAIL_USERNAME"),
    MAIL_PASSWORD = os.getenv("MAIL_PASSWORD"),
    MAIL_FROM = os.getenv("MAIL_FROM"),
    MAIL_PORT = int(os.getenv("MAIL_PORT")),
    MAIL_SERVER = os.getenv("MAIL_SERVER"),
    MAIL_TLS = os.getenv("MAIL_TLS") == "True",
    MAIL_SSL = os.getenv("MAIL_SSL") == "True",
    USE_CREDENTIALS = True,
)

async def send_otp_email(email_to: str, otp: str):
    message = MessageSchema(
        subject="Your OTP Code",
        recipients=[email_to],
        body=f"Kode OTP Anda: {otp}",
        subtype="plain"
    )

    fm = FastMail(conf)
    await fm.send_message(message)
