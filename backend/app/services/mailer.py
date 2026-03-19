from __future__ import annotations

import smtplib
from email.message import EmailMessage

from flask import current_app


class MailerError(RuntimeError):
    pass


def send_email(to_email: str, subject: str, plain_text: str, html: str | None = None) -> None:
    host = current_app.config.get("SMTP_HOST")
    username = current_app.config.get("SMTP_USERNAME")
    password = current_app.config.get("SMTP_PASSWORD")
    from_email = current_app.config.get("SMTP_FROM_EMAIL")
    port = int(current_app.config.get("SMTP_PORT", 587))
    use_tls = bool(current_app.config.get("SMTP_USE_TLS", True))

    if not host or not from_email:
        raise MailerError("SMTP is not configured (SMTP_HOST/SMTP_FROM_EMAIL missing).")

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = from_email
    msg["To"] = to_email
    msg.set_content(plain_text)

    if html:
        msg.add_alternative(html, subtype="html")

    try:
        with smtplib.SMTP(host, port, timeout=20) as smtp:
            if use_tls:
                smtp.starttls()
            if username and password:
                smtp.login(username, password)
            smtp.send_message(msg)
    except Exception as exc:
        raise MailerError(f"Failed to send email to {to_email}: {exc}") from exc
