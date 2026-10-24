import hashlib
import secrets
import threading
import time
from collections import deque

from argon2 import PasswordHasher, Type
from argon2.exceptions import InvalidHashError, VerificationError, VerifyMismatchError

from app.core.config import settings


SESSION_COOKIE_NAME = "irstore24_session"
PASSWORD_HASHER = PasswordHasher(
    time_cost=3,
    memory_cost=65536,
    parallelism=2,
    hash_len=32,
    salt_len=16,
    type=Type.ID,
)
DUMMY_PASSWORD_HASH = PASSWORD_HASHER.hash(secrets.token_urlsafe(32))


def hash_password(password: str) -> str:
    return PASSWORD_HASHER.hash(password)


def verify_password(password_hash: str, password: str) -> bool:
    try:
        return PASSWORD_HASHER.verify(password_hash, password)
    except (InvalidHashError, VerificationError, VerifyMismatchError):
        return False


def generate_session_token() -> str:
    return secrets.token_urlsafe(32)


def hash_session_token(token: str) -> str:
    return hashlib.sha256(token.encode("ascii")).hexdigest()


def normalize_email(email: str) -> str:
    return email.strip().casefold()


class LoginAttemptLimiter:
    def __init__(self) -> None:
        self._lock = threading.Lock()
        self._attempts: dict[tuple[str, str], deque[float]] = {}
        self._ip_attempts: dict[str, deque[float]] = {}

    def allow(self, client_ip: str, email: str) -> bool:
        key = (client_ip, email)
        now = time.monotonic()
        with self._lock:
            attempts = self._attempts.setdefault(key, deque())
            ip_attempts = self._ip_attempts.setdefault(client_ip, deque())
            cutoff = now - settings.auth_login_window_seconds
            while attempts and attempts[0] <= cutoff:
                attempts.popleft()
            while ip_attempts and ip_attempts[0] <= cutoff:
                ip_attempts.popleft()
            if (
                len(attempts) >= settings.auth_login_max_attempts
                or len(ip_attempts) >= settings.auth_login_max_ip_attempts
            ):
                return False
            attempts.append(now)
            ip_attempts.append(now)
            if len(self._attempts) > 10000:
                oldest_key = next(iter(self._attempts))
                if oldest_key != key:
                    self._attempts.pop(oldest_key)
            if len(self._ip_attempts) > 10000:
                oldest_ip = next(iter(self._ip_attempts))
                if oldest_ip != client_ip:
                    self._ip_attempts.pop(oldest_ip)
            return True

    def clear(self, client_ip: str, email: str) -> None:
        with self._lock:
            self._attempts.pop((client_ip, email), None)

    def reset(self) -> None:
        with self._lock:
            self._attempts.clear()
            self._ip_attempts.clear()


login_attempt_limiter = LoginAttemptLimiter()
