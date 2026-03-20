from __future__ import annotations

import json
import smtplib
from email.message import EmailMessage
from urllib import error as urlerror
from urllib import request as urlrequest

from flask import current_app


class MailerError(RuntimeError):
    pass


def _send_via_smtp(to_email: str, subject: str, plain_text: str, html: str | None = None) -> None:
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


def _send_via_resend(to_email: str, subject: str, plain_text: str, html: str | None = None) -> None:
    api_key = current_app.config.get("RESEND_API_KEY")
    from_email = current_app.config.get("RESEND_FROM_EMAIL") or current_app.config.get("SMTP_FROM_EMAIL")
    api_base = str(current_app.config.get("RESEND_API_BASE_URL", "https://api.resend.com")).rstrip("/")
    user_agent = str(current_app.config.get("RESEND_USER_AGENT", "llm-policy-validator-backend/1.0"))

    if not api_key:
        raise MailerError("Resend is not configured (RESEND_API_KEY missing).")
    if not from_email:
        raise MailerError("Resend is not configured (RESEND_FROM_EMAIL missing).")

    payload: dict[str, object] = {
        "from": from_email,
        "to": [to_email],
        "subject": subject,
        "text": plain_text,
    }
    if html:
        payload["html"] = html

    req = urlrequest.Request(
        url=f"{api_base}/emails",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "Accept": "application/json",
            "User-Agent": user_agent,
        },
        method="POST",
    )

    try:
        with urlrequest.urlopen(req, timeout=20):
            return
    except urlerror.HTTPError as exc:
        details = exc.read().decode("utf-8", errors="replace")
        raise MailerError(
            f"Failed to send email to {to_email} via Resend: HTTP {exc.code} {details}"
        ) from exc
    except Exception as exc:
        raise MailerError(f"Failed to send email to {to_email} via Resend: {exc}") from exc


def send_email(to_email: str, subject: str, plain_text: str, html: str | None = None) -> None:
    provider = str(current_app.config.get("MAIL_PROVIDER", "smtp")).strip().lower()

    if provider == "resend":
        _send_via_resend(to_email, subject, plain_text, html)
        return

    if provider == "smtp":
        _send_via_smtp(to_email, subject, plain_text, html)
        return

    raise MailerError("Unsupported MAIL_PROVIDER. Use 'smtp' or 'resend'.")
