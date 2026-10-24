from collections.abc import Callable, Iterator
from dataclasses import dataclass
from datetime import timedelta

import pytest
from fastapi import Depends, FastAPI, Response
from fastapi.testclient import TestClient
from pydantic import ValidationError
from sqlalchemy import BigInteger, create_engine, event, select
from sqlalchemy.engine import Engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.api.dependencies import require_admin
from app.api.auth import set_session_cookie
from app.core.config import Settings, settings
from app.core.database import Base, get_db
from app.core.security import (
    SESSION_COOKIE_NAME,
    hash_session_token,
    login_attempt_limiter,
)
from app.main import app
from app.models.cart import Cart
from app.models.user import User, UserSession
from app.services.auth import ban_user, set_user_active, utc_now


ORIGIN = {"Origin": "https://irstore24.ir"}
PASSWORD = "correct horse battery staple"
NEW_PASSWORD = "another safe passphrase 123"


@compiles(BigInteger, "sqlite")
def compile_bigint_as_sqlite_integer(type_, compiler, **kwargs) -> str:
    return "INTEGER"


@dataclass
class AuthHarness:
    client: TestClient
    engine: Engine
    override_db: Callable


@pytest.fixture
def auth_harness() -> Iterator[AuthHarness]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _) -> None:
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)

    def override_db() -> Iterator[Session]:
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    login_attempt_limiter.reset()
    with TestClient(app, base_url="https://irstore24.ir") as client:
        yield AuthHarness(client, engine, override_db)
    app.dependency_overrides.clear()
    login_attempt_limiter.reset()
    engine.dispose()


def register(client: TestClient, email: str = "user@example.com"):
    return client.post(
        "/api/auth/register",
        json={"email": email, "password": PASSWORD},
        headers=ORIGIN,
    )


def login(
    client: TestClient,
    email: str = "user@example.com",
    password: str = PASSWORD,
):
    return client.post(
        "/api/auth/login",
        json={"email": email, "password": password},
        headers=ORIGIN,
    )


def test_registration_hashes_password_and_normalizes_email(
    auth_harness: AuthHarness,
) -> None:
    response = register(auth_harness.client, "USER@EXAMPLE.COM")
    assert response.status_code == 201
    assert response.json()["email"] == "user@example.com"
    assert response.json()["role"] == "user"
    assert "password_hash" not in response.text
    assert SESSION_COOKIE_NAME not in response.cookies
    with Session(auth_harness.engine) as db:
        user = db.scalar(select(User))
        assert user.password_hash.startswith("$argon2id$")
        assert user.password_hash != PASSWORD
        assert db.scalar(select(Cart)).user_id == user.id


def test_duplicate_email_is_rejected_without_creating_a_second_user(
    auth_harness: AuthHarness,
) -> None:
    assert register(auth_harness.client).status_code == 201
    response = register(auth_harness.client, "USER@example.com")
    assert response.status_code == 409
    assert response.json()["detail"] == "Registration unavailable for this email"
    with Session(auth_harness.engine) as db:
        assert len(db.scalars(select(User)).all()) == 1


def test_login_stores_only_token_hash_and_sets_secure_cookie(
    auth_harness: AuthHarness,
) -> None:
    register(auth_harness.client)
    response = login(auth_harness.client)
    assert response.status_code == 200
    token = response.cookies[SESSION_COOKIE_NAME]
    header = response.headers["set-cookie"].lower()
    assert "httponly" in header
    assert "secure" in header
    assert "samesite=lax" in header
    assert "path=/" in header
    assert "max-age=604800" in header
    with Session(auth_harness.engine) as db:
        session = db.scalar(select(UserSession))
        assert session.session_token_hash == hash_session_token(token)
        assert token not in session.session_token_hash
        assert session.expires_at > session.created_at


def test_invalid_login_replies_identically_for_wrong_and_unknown_email(
    auth_harness: AuthHarness,
) -> None:
    register(auth_harness.client)
    wrong = login(auth_harness.client, password="wrong password")
    unknown = login(auth_harness.client, email="missing@example.com")
    assert wrong.status_code == unknown.status_code == 401
    assert wrong.json() == unknown.json()
    with Session(auth_harness.engine) as db:
        assert db.scalars(select(UserSession)).all() == []


def test_logout_revokes_session_and_clears_cookie(
    auth_harness: AuthHarness,
) -> None:
    register(auth_harness.client)
    assert login(auth_harness.client).status_code == 200
    response = auth_harness.client.post("/api/auth/logout", headers=ORIGIN)
    assert response.status_code == 204
    assert auth_harness.client.get("/api/auth/me").status_code == 401
    with Session(auth_harness.engine) as db:
        assert db.scalar(select(UserSession)).revoked_at is not None


def test_missing_invalid_and_expired_sessions(
    auth_harness: AuthHarness,
) -> None:
    client = auth_harness.client
    assert client.get("/api/auth/me").status_code == 401
    client.cookies.set(SESSION_COOKIE_NAME, "invalid-token")
    assert client.get("/api/auth/me").status_code == 401
    register(client)
    login(client)
    with Session(auth_harness.engine) as db:
        session = db.scalar(select(UserSession))
        session.expires_at = utc_now() - timedelta(seconds=1)
        db.commit()
    assert client.get("/api/auth/me").status_code == 401


def test_current_user_and_account_return_only_safe_data(
    auth_harness: AuthHarness,
) -> None:
    register(auth_harness.client)
    login(auth_harness.client)
    me = auth_harness.client.get("/api/auth/me")
    account = auth_harness.client.get("/api/account")
    assert me.status_code == account.status_code == 200
    assert me.json() == account.json()
    assert set(me.json()) == {"id", "email", "role", "is_active", "created_at"}
    with Session(auth_harness.engine) as db:
        assert db.scalar(select(UserSession)).last_used_at is not None


def test_account_requires_authentication(auth_harness: AuthHarness) -> None:
    assert auth_harness.client.get("/api/account").status_code == 401
    assert (
        auth_harness.client.post(
            "/api/account/change-password",
            json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
            headers=ORIGIN,
        ).status_code
        == 401
    )


def test_admin_dependency_enforces_role(auth_harness: AuthHarness) -> None:
    register(auth_harness.client)
    login(auth_harness.client)
    token = auth_harness.client.cookies[SESSION_COOKIE_NAME]
    test_app = FastAPI()

    @test_app.get("/admin")
    def admin_only(_: User = Depends(require_admin)) -> dict[str, bool]:
        return {"ok": True}

    test_app.dependency_overrides[get_db] = auth_harness.override_db
    with TestClient(test_app, base_url="https://irstore24.ir") as client:
        client.cookies.set(SESSION_COOKIE_NAME, token)
        assert client.get("/admin").status_code == 403
        with Session(auth_harness.engine) as db:
            user = db.scalar(select(User))
            user.role = "admin"
            db.commit()
        assert client.get("/admin").json() == {"ok": True}


def test_inactive_user_is_denied_and_sessions_are_revoked(
    auth_harness: AuthHarness,
) -> None:
    register(auth_harness.client)
    login(auth_harness.client)
    with Session(auth_harness.engine) as db:
        user = db.scalar(select(User))
        user.is_active = False
        db.commit()
    assert auth_harness.client.get("/api/auth/me").status_code == 403
    with Session(auth_harness.engine) as db:
        assert db.scalar(select(UserSession)).revoked_at is not None
    assert login(auth_harness.client).status_code == 401


def test_temporary_ban_expires(auth_harness: AuthHarness) -> None:
    register(auth_harness.client)
    with Session(auth_harness.engine) as db:
        user = db.scalar(select(User))
        user.is_banned = True
        user.ban_type = "temporary"
        user.banned_until = utc_now() + timedelta(hours=2)
        db.commit()
    assert login(auth_harness.client).status_code == 401
    with Session(auth_harness.engine) as db:
        user = db.scalar(select(User))
        user.banned_until = utc_now() - timedelta(seconds=1)
        db.commit()
    assert login(auth_harness.client).status_code == 200


def test_permanent_ban_is_enforced(auth_harness: AuthHarness) -> None:
    register(auth_harness.client)
    with Session(auth_harness.engine) as db:
        user = db.scalar(select(User))
        user.is_banned = True
        user.ban_type = "permanent"
        db.commit()
    assert login(auth_harness.client).status_code == 401


def test_password_change_requires_current_and_revokes_every_session(
    auth_harness: AuthHarness,
) -> None:
    register(auth_harness.client)
    first = login(auth_harness.client).cookies[SESSION_COOKIE_NAME]
    second = login(auth_harness.client).cookies[SESSION_COOKIE_NAME]
    assert first != second
    wrong = auth_harness.client.post(
        "/api/account/change-password",
        json={"current_password": "wrong", "new_password": NEW_PASSWORD},
        headers=ORIGIN,
    )
    assert wrong.status_code == 400
    changed = auth_harness.client.post(
        "/api/account/change-password",
        json={"current_password": PASSWORD, "new_password": NEW_PASSWORD},
        headers=ORIGIN,
    )
    assert changed.status_code == 204
    with Session(auth_harness.engine) as db:
        assert all(
            session.revoked_at is not None
            for session in db.scalars(select(UserSession))
        )
    auth_harness.client.cookies.set(SESSION_COOKIE_NAME, first)
    assert auth_harness.client.get("/api/auth/me").status_code == 401
    assert login(auth_harness.client).status_code == 401
    assert login(auth_harness.client, password=NEW_PASSWORD).status_code == 200


def test_csrf_requires_an_exact_trusted_origin(
    auth_harness: AuthHarness,
) -> None:
    payload = {"email": "user@example.com", "password": PASSWORD}
    assert (
        auth_harness.client.post("/api/auth/register", json=payload).status_code
        == 403
    )
    assert (
        auth_harness.client.post(
            "/api/auth/register",
            json=payload,
            headers={"Origin": "https://attacker.example"},
        ).status_code
        == 403
    )
    assert register(auth_harness.client).status_code == 201
    login(auth_harness.client)
    assert auth_harness.client.post("/api/auth/logout").status_code == 403


def test_cross_origin_preflight_is_not_allowed(
    auth_harness: AuthHarness,
) -> None:
    response = auth_harness.client.options(
        "/api/auth/login",
        headers={
            "Origin": "https://attacker.example",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert response.status_code == 400
    assert "access-control-allow-origin" not in response.headers
    trusted = auth_harness.client.options(
        "/api/auth/login",
        headers={
            "Origin": "https://irstore24.ir",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert trusted.status_code == 200
    assert trusted.headers["access-control-allow-origin"] == "https://irstore24.ir"


def test_registration_rejects_role_elevation_and_redacts_password(
    auth_harness: AuthHarness,
) -> None:
    elevated = auth_harness.client.post(
        "/api/auth/register",
        json={"email": "user@example.com", "password": PASSWORD, "role": "admin"},
        headers=ORIGIN,
    )
    assert elevated.status_code == 422
    assert PASSWORD not in elevated.text
    short = auth_harness.client.post(
        "/api/auth/register",
        json={"email": "user@example.com", "password": "too-short"},
        headers=ORIGIN,
    )
    assert short.status_code == 422
    assert "too-short" not in short.text
    invalid_email = auth_harness.client.post(
        "/api/auth/register",
        json={"email": "invalid-email", "password": PASSWORD},
        headers=ORIGIN,
    )
    assert invalid_email.status_code == 422
    assert PASSWORD not in invalid_email.text
    with Session(auth_harness.engine) as db:
        assert db.scalars(select(User)).all() == []


def test_login_abuse_limit(auth_harness: AuthHarness) -> None:
    register(auth_harness.client)
    for _ in range(settings.auth_login_max_attempts):
        assert login(auth_harness.client, password="wrong").status_code == 401
    assert login(auth_harness.client, password=PASSWORD).status_code == 429


def test_login_abuse_limit_across_emails(
    auth_harness: AuthHarness, monkeypatch
) -> None:
    monkeypatch.setattr(settings, "auth_login_max_ip_attempts", 3)
    for index in range(3):
        assert (
            login(auth_harness.client, email=f"missing{index}@example.com").status_code
            == 401
        )
    assert (
        login(auth_harness.client, email="another@example.com").status_code
        == 429
    )


def test_admin_ban_and_deactivation_services_revoke_sessions(
    auth_harness: AuthHarness,
) -> None:
    register(auth_harness.client, "admin@example.com")
    register(auth_harness.client)
    with Session(auth_harness.engine) as db:
        admin = db.scalar(select(User).where(User.email == "admin@example.com"))
        admin.role = "admin"
        db.commit()
    login(auth_harness.client)
    with Session(auth_harness.engine) as db:
        admin = db.scalar(select(User).where(User.email == "admin@example.com"))
        user = db.scalar(select(User).where(User.email == "user@example.com"))
        with pytest.raises(ValueError):
            ban_user(
                db,
                admin,
                admin.id,
                ban_type="permanent",
                banned_until=None,
            )
        with pytest.raises(ValueError):
            set_user_active(db, admin, admin.id, False)
        ban_user(
            db,
            admin,
            user.id,
            ban_type="temporary",
            banned_until=utc_now() + timedelta(hours=1),
        )
        db.commit()
    assert auth_harness.client.get("/api/auth/me").status_code == 401
    with Session(auth_harness.engine) as db:
        user = db.scalar(select(User).where(User.email == "user@example.com"))
        assert user.is_banned
        assert db.scalar(select(UserSession)).revoked_at is not None
        user.is_banned = False
        user.ban_type = None
        user.banned_until = None
        db.commit()
    assert login(auth_harness.client).status_code == 200
    with Session(auth_harness.engine) as db:
        user = db.scalar(select(User).where(User.email == "user@example.com"))
        admin = db.scalar(select(User).where(User.email == "admin@example.com"))
        set_user_active(db, admin, user.id, False)
        db.commit()
        assert not user.is_active
        assert all(
            session.revoked_at is not None
            for session in db.scalars(select(UserSession))
        )


def test_cookie_configuration_rejects_insecure_production() -> None:
    with pytest.raises(ValidationError):
        Settings(
            postgres_db="test",
            postgres_user="test",
            postgres_password="test",
            app_env="production",
            auth_cookie_secure=False,
            _env_file=None,
        )
    with pytest.raises(ValidationError):
        Settings(
            postgres_db="test",
            postgres_user="test",
            postgres_password="test",
            auth_allowed_origins=["http://irstore24.ir"],
            _env_file=None,
        )
    with pytest.raises(ValidationError):
        Settings(
            postgres_db="test",
            postgres_user="test",
            postgres_password="test",
            app_env="development",
            auth_cookie_secure=False,
            auth_allowed_origins=["http://remote.example"],
            _env_file=None,
        )
    local = Settings(
        postgres_db="test",
        postgres_user="test",
        postgres_password="test",
        app_env="development",
        auth_cookie_secure=False,
        auth_allowed_origins=["http://localhost:3000"],
        _env_file=None,
    )
    assert local.auth_cookie_secure is False


def test_local_cookie_mode_requires_explicit_opt_in(monkeypatch) -> None:
    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "auth_cookie_secure", False)
    response = Response()
    set_session_cookie(response, "opaque-test-token")
    header = response.headers["set-cookie"].lower()
    assert "httponly" in header
    assert "samesite=lax" in header
    assert "secure" not in header
