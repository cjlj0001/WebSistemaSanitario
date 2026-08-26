from __future__ import annotations

import os
import smtplib
from email.message import EmailMessage
from datetime import datetime
from dotenv import load_dotenv

load_dotenv()


def send_password_reset_code(email: str, code: str, expires_at: datetime) -> None:
    smtp_host = os.getenv("SMTP_HOST", "").strip()
    smtp_port_raw = os.getenv("SMTP_PORT", "587").strip()
    smtp_user = os.getenv("SMTP_USER", "").strip()
    smtp_password = os.getenv("SMTP_PASSWORD", "").strip()
    smtp_from = os.getenv("SMTP_FROM_EMAIL", smtp_user or "no-reply@websistemasanitario.local").strip()
    smtp_name = os.getenv("SMTP_FROM_NAME", "Web Sistema Sanitario").strip() or "Web Sistema Sanitario"
    smtp_use_ssl = os.getenv("SMTP_USE_SSL", "false").strip().lower() in {"1", "true", "yes", "y"}
    smtp_use_tls = os.getenv("SMTP_USE_TLS", "true").strip().lower() in {"1", "true", "yes", "y"}

    try:
        smtp_port = int(smtp_port_raw)
    except ValueError:
        smtp_port = 587

    subject = "Código de recuperación de contraseña"
    body = (
        f"Hola,\n\n"
        f"Tu código de recuperación es: {code}\n\n"
        f"Caduca a las {expires_at.strftime('%Y-%m-%d %H:%M:%S UTC')}.\n\n"
        f"Si no solicitaste este cambio, ignora este mensaje.\n"
    )

    if not smtp_host:
        print(f"[password-reset] SMTP no configurado. Código para {email}: {code}")
        return

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = f"{smtp_name} <{smtp_from}>"
    message["To"] = email
    message.set_content(body)

    if smtp_use_ssl:
        with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=20) as server:
            if smtp_user:
                server.login(smtp_user, smtp_password)
            server.send_message(message)
    else:
        with smtplib.SMTP(smtp_host, smtp_port, timeout=20) as server:
            if smtp_use_tls:
                server.starttls()
            if smtp_user:
                server.login(smtp_user, smtp_password)
            server.send_message(message)
