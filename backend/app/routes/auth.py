from __future__ import annotations

import uuid
from datetime import datetime, timedelta, UTC
from functools import wraps

import jwt
from flask import Blueprint, current_app, jsonify, request
from itsdangerous import URLSafeTimedSerializer, BadSignature, SignatureExpired
from werkzeug.security import check_password_hash, generate_password_hash

from app.models.db import db
from app.models.schema import UserDb
from app.services.mailer import MailerError, send_email


auth_bp = Blueprint("auth", __name__)


def _jwt_secret() -> str:
    return str(current_app.config.get("JWT_SECRET") or "dev-jwt-secret-change-me")


def _approval_serializer() -> URLSafeTimedSerializer:
    return URLSafeTimedSerializer(_jwt_secret(), salt="account-approval")


def _issue_access_token(user: UserDb) -> str:
    exp_hours = int(current_app.config.get("JWT_EXP_HOURS", 24))
    now = datetime.now(UTC)
    payload = {
        "sub": user.id,
        "email": user.email,
        "name": user.name,
        "iat": now,
        "exp": now + timedelta(hours=exp_hours),
    }
    return jwt.encode(payload, _jwt_secret(), algorithm="HS256")


def _extract_bearer_token() -> str | None:
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None
    return auth_header.removeprefix("Bearer ").strip() or None


def _decode_access_token(token: str) -> dict:
    return jwt.decode(token, _jwt_secret(), algorithms=["HS256"])


def require_auth(fn):
    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _extract_bearer_token()
        if not token:
            return jsonify(error="Missing bearer token"), 401
        try:
            claims = _decode_access_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify(error="Token expired"), 401
        except Exception:
            return jsonify(error="Invalid token"), 401

        user_id = str(claims.get("sub", "")).strip()
        if not user_id:
            return jsonify(error="Invalid token payload"), 401

        user = db.session.get(UserDb, user_id)
        if not user or not user.is_approved:
            return jsonify(error="User is not authorized"), 401

        request.current_user = user
        return fn(*args, **kwargs)

    return wrapper


def _approval_link_for_user(user: UserDb) -> str:
    token = _approval_serializer().dumps({"user_id": user.id, "email": user.email})
    backend_base = str(current_app.config.get("BACKEND_PUBLIC_URL", "http://localhost:5000"))
    return f"{backend_base}/api/auth/approve?token={token}"


def _login_link() -> str:
    return str(current_app.config.get("FRONTEND_LOGIN_URL", "http://localhost:3000/login"))


def _send_registration_emails(user: UserDb) -> None:
    super_admin_email = str(current_app.config.get("SUPER_ADMIN_EMAIL", "serdar.karaman@outlook.be"))
    approve_url = _approval_link_for_user(user)

    send_email(
        to_email=super_admin_email,
        subject="Approval Required: New platform registration",
        plain_text=(
            f"A new user registered on LLM Policy Validator.\n\n"
            f"Name: {user.name}\n"
            f"Email: {user.email}\n\n"
            f"Approve this account by opening:\n{approve_url}\n"
        ),
        html=(
            f"<p>A new user registered on <strong>LLM Policy Validator</strong>.</p>"
            f"<p><strong>Name:</strong> {user.name}<br/>"
            f"<strong>Email:</strong> {user.email}</p>"
            f"<p><a href=\"{approve_url}\">Approve Account</a></p>"
        ),
    )

    send_email(
        to_email=user.email,
        subject="Registration received - pending admin approval",
        plain_text=(
            "Your registration request was received.\n\n"
            "Your account will be activated once the super admin approves your request."
        ),
        html=(
            "<p>Your registration request was received.</p>"
            "<p>Your account will be activated once the super admin approves your request.</p>"
        ),
    )


def _send_approved_email(user: UserDb) -> None:
    login_url = _login_link()
    send_email(
        to_email=user.email,
        subject="Your account has been approved",
        plain_text=(
            "Your account is approved. You can now log in using this link:\n"
            f"{login_url}"
        ),
        html=(
            "<p>Your account has been approved.</p>"
            f"<p><a href=\"{login_url}\">Log in now</a></p>"
        ),
    )


@auth_bp.route("/register", methods=["POST"])
def register_user():
    if not request.is_json:
        return jsonify(error="Expected JSON payload"), 415

    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", "")).strip()

    if not all([name, email, password]):
        return jsonify(error="Missing required fields: name, email, password"), 400

    if len(password) < 8:
        return jsonify(error="Password must be at least 8 characters"), 400

    existing = UserDb.query.filter_by(email=email).first()
    if existing and existing.is_approved:
        return jsonify(error="This email already has an approved account"), 409

    if existing and not existing.is_approved:
        existing.name = name
        existing.password_hash = generate_password_hash(password)
        existing.updated_at = datetime.now(UTC)
        user = existing
    else:
        user = UserDb(
            id=str(uuid.uuid4()),
            name=name,
            email=email,
            password_hash=generate_password_hash(password),
            is_approved=False,
        )
        db.session.add(user)

    db.session.commit()

    mail_warning = None
    try:
        _send_registration_emails(user)
    except MailerError as exc:
        current_app.logger.error("Registration email flow failed for %s: %s", email, exc)
        mail_warning = "Account created, but email delivery failed. Configure SMTP to enable approval emails."

    return jsonify(
        message="Registration submitted. Approval request email sent to super admin.",
        pending_approval=True,
        email=email,
        mail_warning=mail_warning,
    ), 201


@auth_bp.route("/approve", methods=["GET"])
def approve_user():
    token = request.args.get("token", "")
    if not token:
        return "Missing approval token", 400

    max_age = int(current_app.config.get("APPROVAL_TOKEN_MAX_AGE_SECONDS", 7 * 24 * 3600))
    try:
        payload = _approval_serializer().loads(token, max_age=max_age)
    except SignatureExpired:
        return "Approval link expired", 400
    except BadSignature:
        return "Invalid approval link", 400

    user_id = str(payload.get("user_id", "")).strip()
    email = str(payload.get("email", "")).strip().lower()
    user = db.session.get(UserDb, user_id)
    if not user or user.email.lower() != email:
        return "User not found for this approval link", 404

    if not user.is_approved:
        user.is_approved = True
        user.approved_at = datetime.now(UTC)
        user.approved_by = str(current_app.config.get("SUPER_ADMIN_EMAIL", "serdar.karaman@outlook.be"))
        db.session.commit()

    try:
        _send_approved_email(user)
    except MailerError as exc:
        current_app.logger.error("Approved email delivery failed for %s: %s", user.email, exc)

    login_url = _login_link()
    return (
        f"<h2>Account approved</h2><p>{user.email} is now approved.</p>"
        f"<p>User can now log in here: <a href=\"{login_url}\">{login_url}</a></p>",
        200,
        {"Content-Type": "text/html; charset=utf-8"},
    )


@auth_bp.route("/login", methods=["POST"])
def login_user():
    if not request.is_json:
        return jsonify(error="Expected JSON payload"), 415

    data = request.get_json(silent=True) or {}
    email = str(data.get("email", "")).strip().lower()
    password = str(data.get("password", "")).strip()

    if not email or not password:
        return jsonify(error="Missing email or password"), 400

    user = UserDb.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return jsonify(error="Invalid credentials"), 401

    if not user.is_approved:
        return jsonify(error="Account pending approval by super admin"), 403

    token = _issue_access_token(user)
    return jsonify(
        token=token,
        token_type="Bearer",
        user={
            "id": user.id,
            "name": user.name,
            "email": user.email,
        },
    ), 200


@auth_bp.route("/me", methods=["GET"])
@require_auth
def me():
    user: UserDb = request.current_user
    return jsonify(user={"id": user.id, "name": user.name, "email": user.email}), 200
