from collections.abc import Iterator
from uuid import uuid4

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.exc import OperationalError, ProgrammingError
from sqlalchemy.orm import Session

import app.models  # noqa: F401
from app.core.config import settings
from app.core.database import Base, get_db
from app.core.security import hash_password
from app.main import app
from app.models.cs2_item import CS2Item
from app.models.store_settings import StoreSettings
from app.models.user import User


ORIGIN = {"Origin": "https://irstore24.ir"}
PASSWORD = "postgres test passphrase 123"


@pytest.fixture
def isolated_postgres() -> Iterator:
    # The test database is disposable and has a generated name. Never run
    # create_all or destructive cleanup against the development database.
    test_name = f"irstore24_api_test_{uuid4().hex[:12]}"
    assert test_name != settings.postgres_db
    maintenance = create_engine(
        settings.database_url.set(database="postgres"),
        isolation_level="AUTOCOMMIT",
    )
    engine = None
    try:
        with maintenance.connect() as connection:
            connection.execute(text(f'CREATE DATABASE "{test_name}"'))
    except (OperationalError, ProgrammingError) as error:
        maintenance.dispose()
        pytest.skip(f"Isolated PostgreSQL test database unavailable: {type(error).__name__}")
    try:
        engine = create_engine(settings.database_url.set(database=test_name))
        Base.metadata.create_all(engine)
        yield engine
    finally:
        if engine is not None:
            engine.dispose()
        with maintenance.connect() as connection:
            connection.execute(text(f'DROP DATABASE "{test_name}"'))
        maintenance.dispose()


def test_postgres_constraints_and_singleton(isolated_postgres) -> None:
    engine = isolated_postgres
    with Session(engine) as db:
        db.add(StoreSettings(id=1, usdt_toman_rate="98500", order_reservation_minutes=120))
        db.commit()
    with Session(engine) as db:
        db.add(StoreSettings(id=1, usdt_toman_rate="1"))
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
        db.add(StoreSettings(id=2, usdt_toman_rate="1"))
        with pytest.raises(IntegrityError):
            db.commit()
        db.rollback()
        assert db.scalar(select(StoreSettings.usdt_toman_rate)) == 98500
    with Session(engine) as db:
        db.add(CS2Item(
            slug="pg-item", name="Postgres item", weapon="AWP",
            exterior="Field-Tested", float_value="0.25000000",
            stock_quantity=-1, sell_price_amount="5",
            sell_price_currency="USDT", buy_price_amount="4",
            buy_price_currency="USDT",
        ))
        with pytest.raises(IntegrityError):
            db.commit()


def test_postgres_api_slug_conflict_settings_and_soft_delete(isolated_postgres) -> None:
    engine = isolated_postgres
    with Session(engine) as db:
        db.add(User(
            email="admin@example.com", password_hash=hash_password(PASSWORD),
            role="admin", is_active=True, is_banned=False,
        ))
        db.commit()

    def override_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app, base_url="https://irstore24.ir") as client:
            login = client.post(
                "/api/auth/login",
                json={"email": "admin@example.com", "password": PASSWORD},
                headers=ORIGIN,
            )
            assert login.status_code == 200
            settings_response = client.patch(
                "/api/admin/settings",
                json={"usdt_toman_rate": "98500.00000000"},
                headers=ORIGIN,
            )
            assert settings_response.status_code == 200
            assert settings_response.json()["order_reservation_minutes"] == 120
            payload = {
                "slug": "pg-item", "name": "Postgres item", "weapon": "AWP",
                "exterior": "Field-Tested", "float_value": "0.25000000",
                "stock_quantity": 1, "sell_price_amount": "5.00000000",
                "sell_price_currency": "USDT",
                "buy_price_amount": "4.00000000",
                "buy_price_currency": "USDT",
            }
            first = client.post("/api/admin/cs2-items", json=payload, headers=ORIGIN)
            assert first.status_code == 201, first.text
            second = client.post("/api/admin/cs2-items", json=payload, headers=ORIGIN)
            assert second.status_code == 409, second.text
            assert client.delete(
                f"/api/admin/cs2-items/{first.json()['id']}", headers=ORIGIN
            ).status_code == 200
            assert client.get("/api/cs2-items/pg-item").status_code == 404
            with Session(engine) as db:
                assert db.scalar(select(CS2Item).where(CS2Item.slug == "pg-item")) is not None
    finally:
        app.dependency_overrides.clear()


def test_postgres_competing_settings_inserts_are_rejected(isolated_postgres) -> None:
    engine = isolated_postgres
    with Session(engine) as first, Session(engine) as second:
        assert first.get(StoreSettings, 1) is None
        assert second.get(StoreSettings, 1) is None
        first.add(StoreSettings(id=1, usdt_toman_rate="98500"))
        first.commit()
        second.add(StoreSettings(id=1, usdt_toman_rate="99000"))
        with pytest.raises(IntegrityError):
            second.commit()
        second.rollback()
    with Session(engine) as db:
        rows = list(db.scalars(select(StoreSettings)))
        assert len(rows) == 1
        assert rows[0].usdt_toman_rate == 98500
