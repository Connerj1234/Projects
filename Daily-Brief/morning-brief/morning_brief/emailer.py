from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage


def send_email(subject: str, body: str) -> None:
    host = required_env("SMTP_HOST")
    port = int(os.environ.get("SMTP_PORT", "587"))
    username = required_env("SMTP_USERNAME")
    password = required_env("SMTP_PASSWORD")
    sender = required_env("EMAIL_FROM")
    recipients = [item.strip() for item in required_env("EMAIL_TO").split(",") if item.strip()]

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = sender
    message["To"] = ", ".join(recipients)
    message.set_content(body)

    with smtplib.SMTP(host, port, timeout=60) as smtp:
        smtp.starttls()
        smtp.login(username, password)
        smtp.send_message(message)


def required_env(name: str) -> str:
    value = os.environ.get(name, "").strip()
    if not value:
        raise RuntimeError(f"Missing required environment variable: {name}")
    return value

