from collections.abc import Iterator
from dataclasses import dataclass
from decimal import Decimal

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import BigInteger, create_engine, event, select
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

import app.models  # noqa: F401
from app.core.database import Base, get_db
from app.core.security import SESSION_COOKIE_NAME, hash_password, login_attempt_limiter
from app.main import app
from app.models.cs2_item import CS2Item
from app.models.store_settings import StoreSettings
from app.models.tf2_key import TF2Key
from app.models.user import User, UserSession
from app.services.pricing import convert, price_view


ORIGIN = {"Origin": "https://irstore24.ir"}
PASSWORD = "admin test passphrase 123"


@compiles(BigInteger, "sqlite")
def sqlite_bigint(type_, compiler, **kwargs) -> str:
    return "INTEGER"


@dataclass
class Harness:
    client: TestClient
    engine: object
    admin_id: int


@pytest.fixture
def harness() -> Iterator[Harness]:
    engine = create_engine(
        "sqlite+pysqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    @event.listens_for(engine, "connect")
    def enable_foreign_keys(connection, _) -> None:
        connection.execute("PRAGMA foreign_keys=ON")

    Base.metadata.create_all(engine)
    with Session(engine) as db:
        admin = User(
            email="admin@example.com", password_hash=hash_password(PASSWORD),
            role="admin", is_active=True, is_banned=False,
        )
        db.add(admin)
        db.commit()
        admin_id = admin.id

    def override_db():
        with Session(engine) as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    login_attempt_limiter.reset()
    with TestClient(app, base_url="https://irstore24.ir") as client:
        response = client.post(
            "/api/auth/login", json={"email": "admin@example.com", "password": PASSWORD},
            headers=ORIGIN,
        )
        assert response.status_code == 200
        yield Harness(client, engine, admin_id)
    app.dependency_overrides.clear()
    login_attempt_limiter.reset()
    engine.dispose()


def cs2_payload(**changes):
    result = {
        "slug": "ak-redline", "name": "AK-47 Redline", "description": "A skin",
        "weapon": "AK-47", "exterior": "Field-Tested",
        "float_value": "0.23128412", "stock_quantity": 3,
        "sell_price_amount": "85.00000000", "sell_price_currency": "USDT",
        "buy_price_amount": "7500000.00000000", "buy_price_currency": "TOMAN",
        "image_path": "/media/cs2/redline.webp", "is_active": True,
    }
    result.update(changes)
    return result


def tf2_payload(**changes):
    result = {
        "stock_quantity": 4,
        "sell_price_amount": "2.50000000", "sell_price_currency": "USDT",
        "buy_price_amount": "200000.00000000", "buy_price_currency": "TOMAN",
        "is_active": True,
    }
    result.update(changes)
    return result


def create_cs2(harness: Harness, **changes):
    return harness.client.post(
        "/api/admin/cs2-items", json=cs2_payload(**changes), headers=ORIGIN
    )


def configure(harness: Harness, **changes):
    payload = {"usdt_toman_rate": "98500.00000000"}
    payload.update(changes)
    return harness.client.patch("/api/admin/settings", json=payload, headers=ORIGIN)


def test_missing_settings_keeps_exact_base_prices_and_public_settings_safe(
    harness: Harness,
) -> None:
    response = create_cs2(harness)
    assert response.status_code == 201, response.text
    product = harness.client.get("/api/cs2-items/ak-redline").json()
    assert product["sell_price"]["amount"] == "85.00000000"
    assert product["sell_price"]["usdt"] == "85.00000000"
    assert product["sell_price"]["toman"] is None
    assert product["buy_price"]["toman"] == "7500000.00000000"
    assert product["buy_price"]["usdt"] is None
    assert harness.client.get("/api/store/settings/public").json() == {
        "usdt_toman_rate": None, "telegram_username": None,
        "telegram_url": None, "instagram_url": None,
    }
    assert harness.client.get("/api/cs2-items?sort=price_asc").status_code == 503
    assert harness.client.get("/api/cs2-items?min_price=1").status_code == 503
    with Session(harness.engine) as db:
        assert db.get(StoreSettings, 1) is None


def test_conversion_uses_decimal_half_up_and_string_json(harness: Harness) -> None:
    assert configure(harness, card_number="1234 5678 9012 3456").status_code == 200
    assert create_cs2(harness).status_code == 201
    product = harness.client.get("/api/cs2-items/ak-redline").json()
    assert product["sell_price"]["toman"] == "8372500"
    assert product["buy_price"]["usdt"] == "76.14"
    public = harness.client.get("/api/store/settings/public").json()
    assert public["usdt_toman_rate"] == "98500.00000000"
    assert "card_number" not in public
    assert "card_holder_name" not in public
    assert convert(Decimal("1"), "USDT", "TOMAN", Decimal("1.5")) == Decimal("1.5")
    assert price_view(Decimal("1"), "USDT", Decimal("1.5")).toman == Decimal("2")
    assert price_view(Decimal("1"), "TOMAN", Decimal("8")).usdt == Decimal("0.13")
    maximum = Decimal("999999999999.99999999")
    assert convert(maximum, "USDT", "TOMAN", maximum) == Decimal(
        "999999999999999999980000.0000000000000001"
    )


def test_public_visibility_detail_and_derived_availability(harness: Harness) -> None:
    assert create_cs2(harness).status_code == 201
    assert create_cs2(harness, slug="sold-out", stock_quantity=0).status_code == 201
    assert create_cs2(harness, slug="hidden", is_active=False).status_code == 201
    assert create_cs2(harness, slug="deleted").status_code == 201
    deleted_id = harness.client.get("/api/admin/cs2-items").json()["items"][0]["id"]
    assert harness.client.delete(f"/api/admin/cs2-items/{deleted_id}", headers=ORIGIN).status_code == 200
    items = harness.client.get("/api/cs2-items").json()["items"]
    assert {item["slug"] for item in items} == {"ak-redline", "sold-out"}
    assert {item["slug"]: item["available"] for item in items} == {
        "ak-redline": True, "sold-out": False,
    }
    assert harness.client.get("/api/cs2-items/hidden").status_code == 404
    assert harness.client.get("/api/cs2-items/deleted").status_code == 404
    assert harness.client.get("/api/cs2-items/missing").status_code == 404
    assert harness.client.get("/api/cs2-items?available=false").json()["total"] == 1


def test_search_filters_sort_and_pagination(harness: Harness) -> None:
    configure(harness)
    create_cs2(harness)
    create_cs2(
        harness, slug="awp-asiimov", name="AWP Asiimov", weapon="AWP",
        exterior="Factory New", float_value="0.01000000",
        sell_price_amount="70.00000000",
    )
    create_cs2(
        harness, slug="awp-cheap", name="AWP Cheap", weapon="AWP",
        exterior="Minimal Wear", float_value="0.07000000",
        sell_price_amount="6000000.00000000", sell_price_currency="TOMAN",
    )
    client = harness.client
    assert client.get("/api/cs2-items?search=awp").json()["total"] == 2
    assert client.get("/api/cs2-items?weapon=AWP&exterior=Factory%20New").json()["total"] == 1
    assert client.get("/api/cs2-items?min_float=0.05&max_float=0.24").json()["total"] == 2
    assert client.get("/api/cs2-items?search=%25").json()["total"] == 0
    result = client.get(
        "/api/cs2-items?sort=price_asc&price_currency=TOMAN&page_size=2&page=1"
    ).json()
    assert result["total"] == 3
    assert [item["slug"] for item in result["items"]] == ["awp-cheap", "awp-asiimov"]
    assert client.get("/api/cs2-items?sort=price_desc&page_size=1&page=2").json()["items"][0]["slug"] == "awp-asiimov"
    assert client.get("/api/cs2-items?min_price=6900000&max_price=8400000").json()["total"] == 1


@pytest.mark.parametrize("query", [
    "page=0", "page_size=101", "sort=drop_table", "exterior=Unknown",
    "price_currency=BTC", "min_float=-0.1", "max_float=1.1",
    "min_float=0.8&max_float=0.2", "min_price=10&max_price=1",
])
def test_invalid_catalog_queries_are_rejected(harness: Harness, query: str) -> None:
    assert harness.client.get(f"/api/cs2-items?{query}").status_code == 422


def test_cs2_create_edit_duplicate_slug_and_soft_delete_restore(harness: Harness) -> None:
    created = create_cs2(harness)
    assert created.status_code == 201, created.text
    item_id = created.json()["id"]
    assert create_cs2(harness).status_code == 409
    updated = harness.client.patch(
        f"/api/admin/cs2-items/{item_id}",
        json={"name": "New name", "stock_quantity": 0}, headers=ORIGIN,
    )
    assert updated.status_code == 200
    assert updated.json()["available"] is False
    removed = harness.client.delete(f"/api/admin/cs2-items/{item_id}", headers=ORIGIN)
    assert removed.status_code == 200
    assert removed.json()["deleted_at"] is not None
    assert harness.client.get("/api/cs2-items/ak-redline").status_code == 404
    assert harness.client.get(f"/api/admin/cs2-items/{item_id}").status_code == 200
    assert harness.client.get("/api/admin/cs2-items?deleted=true").json()["total"] == 1
    restored = harness.client.post(
        f"/api/admin/cs2-items/{item_id}/restore", headers=ORIGIN
    )
    assert restored.status_code == 200
    assert restored.json()["deleted_at"] is None
    assert harness.client.get("/api/cs2-items/ak-redline").status_code == 200
    with Session(harness.engine) as db:
        assert db.get(CS2Item, item_id) is not None


@pytest.mark.parametrize("change", [
    {"stock_quantity": -1}, {"sell_price_amount": "0"},
    {"buy_price_amount": "-2"}, {"sell_price_currency": "BTC"},
    {"buy_price_currency": "EUR"}, {"float_value": "1.00000001"},
    {"float_value": "-0.01"}, {"exterior": "Pristine"},
    {"image_path": "https://evil.example/skin.png"},
    {"image_path": "/media/../secret"}, {"slug": "../evil"},
    {"sell_price_amount": 1.2345678901234567},
])
def test_invalid_cs2_product_data_is_rejected(harness: Harness, change: dict) -> None:
    assert create_cs2(harness, **change).status_code == 422
    with Session(harness.engine) as db:
        assert db.scalars(select(CS2Item)).all() == []


def test_invalid_cs2_patch_and_slug_conflict(harness: Harness) -> None:
    first = create_cs2(harness).json()["id"]
    second = create_cs2(harness, slug="other").json()["id"]
    client = harness.client
    assert client.patch(f"/api/admin/cs2-items/{first}", json={"stock_quantity": -1}, headers=ORIGIN).status_code == 422
    assert client.patch(f"/api/admin/cs2-items/{first}", json={"name": None}, headers=ORIGIN).status_code == 422
    assert client.patch(f"/api/admin/cs2-items/{first}", json={"role": "admin"}, headers=ORIGIN).status_code == 422
    assert client.patch(f"/api/admin/cs2-items/{second}", json={"slug": "ak-redline"}, headers=ORIGIN).status_code == 409
    assert client.get("/api/cs2-items/other").status_code == 200


def test_tf2_public_and_admin_management(harness: Harness) -> None:
    first = harness.client.post("/api/admin/tf2-keys", json=tf2_payload(), headers=ORIGIN)
    assert first.status_code == 201, first.text
    second = harness.client.post(
        "/api/admin/tf2-keys", json=tf2_payload(stock_quantity=0), headers=ORIGIN
    )
    assert second.status_code == 201
    assert harness.client.get("/api/tf2-keys").json()["total"] == 2
    assert harness.client.get("/api/tf2-keys").json()["items"][1]["available"] is False
    assert harness.client.get("/api/tf2-keys").json()["items"][0]["sell_price"]["toman"] is None
    item_id = first.json()["id"]
    updated = harness.client.patch(
        f"/api/admin/tf2-keys/{item_id}",
        json={"stock_quantity": 0, "is_active": False}, headers=ORIGIN,
    )
    assert updated.status_code == 200
    assert harness.client.get("/api/tf2-keys").json()["total"] == 1
    assert harness.client.get("/api/admin/tf2-keys").json()["total"] == 2
    assert harness.client.get(f"/api/admin/tf2-keys/{item_id}").status_code == 200
    with Session(harness.engine) as db:
        assert db.get(TF2Key, item_id) is not None


def test_tf2_invalid_data_and_patch(harness: Harness) -> None:
    client = harness.client
    for change in ({"stock_quantity": -1}, {"sell_price_amount": "0"},
                   {"buy_price_currency": "BTC"}, {"float_value": "0.1"}):
        assert client.post("/api/admin/tf2-keys", json=tf2_payload(**change), headers=ORIGIN).status_code == 422
    item_id = client.post("/api/admin/tf2-keys", json=tf2_payload(), headers=ORIGIN).json()["id"]
    assert client.patch(f"/api/admin/tf2-keys/{item_id}", json={"buy_price_amount": "-1"}, headers=ORIGIN).status_code == 422
    assert client.patch(f"/api/admin/tf2-keys/{item_id}", json={"is_active": None}, headers=ORIGIN).status_code == 422


def test_settings_initialization_partial_update_and_privacy(harness: Harness) -> None:
    client = harness.client
    assert client.get("/api/admin/settings").status_code == 404
    assert client.patch("/api/admin/settings", json={"telegram_username": "shop"}, headers=ORIGIN).status_code == 422
    created = configure(
        harness, card_number="1234 5678 9012 3456",
        card_holder_name="Store", order_reservation_minutes=120,
    )
    assert created.status_code == 200, created.text
    assert created.json()["id"] == 1
    assert created.json()["updated_by"] == harness.admin_id
    assert created.json()["card_number"] == "1234 5678 9012 3456"
    updated_at = created.json()["updated_at"]
    updated = client.patch(
        "/api/admin/settings", json={"telegram_username": "irstore"},
        headers=ORIGIN,
    )
    assert updated.status_code == 200
    assert updated.json()["usdt_toman_rate"] == "98500.00000000"
    assert updated.json()["card_number"] == "1234 5678 9012 3456"
    assert updated.json()["updated_at"] >= updated_at
    public = client.get("/api/store/settings/public").json()
    assert public["telegram_username"] == "irstore"
    assert "card_number" not in public
    with Session(harness.engine) as db:
        assert len(db.scalars(select(StoreSettings)).all()) == 1


def test_settings_reject_invalid_rate_duration_and_role(harness: Harness) -> None:
    client = harness.client
    for payload in (
        {"usdt_toman_rate": "0"}, {"usdt_toman_rate": "-1"},
        {"usdt_toman_rate": 123.123456789},
        {"usdt_toman_rate": "98500", "order_reservation_minutes": 0},
        {"usdt_toman_rate": "98500", "role": "admin"},
    ):
        assert client.patch("/api/admin/settings", json=payload, headers=ORIGIN).status_code == 422
    with Session(harness.engine) as db:
        assert db.get(StoreSettings, 1) is None


def test_admin_authorization_and_csrf(harness: Harness) -> None:
    client = harness.client
    assert client.post("/api/admin/cs2-items", json=cs2_payload()).status_code == 403
    assert client.patch("/api/admin/settings", json={"usdt_toman_rate": "1"}).status_code == 403
    assert client.post(
        "/api/admin/cs2-items", json=cs2_payload(),
        headers={"Origin": "https://evil.example"},
    ).status_code == 403
    token = client.cookies.pop(SESSION_COOKIE_NAME)
    assert client.get("/api/admin/users").status_code == 401
    assert client.post("/api/admin/tf2-keys", json=tf2_payload(), headers=ORIGIN).status_code == 401
    client.cookies.set(SESSION_COOKIE_NAME, token)
    with Session(harness.engine) as db:
        admin = db.get(User, harness.admin_id)
        admin.role = "user"
        db.commit()
    assert client.get("/api/admin/users").status_code == 403


def test_user_management_filters_bans_revocation_and_self_protection(
    harness: Harness,
) -> None:
    client = harness.client
    registration = client.post(
        "/api/auth/register",
        json={"email": "USER@example.com", "password": PASSWORD}, headers=ORIGIN,
    )
    assert registration.status_code == 201
    user_id = registration.json()["id"]
    admin_token = client.cookies[SESSION_COOKIE_NAME]
    user_token = client.post(
        "/api/auth/login",
        json={"email": "user@example.com", "password": PASSWORD}, headers=ORIGIN,
    ).cookies[SESSION_COOKIE_NAME]
    client.cookies.clear()
    client.cookies.set(SESSION_COOKIE_NAME, admin_token)
    assert client.get("/api/admin/users?search=user&role=user&status=active&ban_status=not_banned").json()["total"] == 1
    detail = client.get(f"/api/admin/users/{user_id}").json()
    assert "password_hash" not in detail
    assert "session_token_hash" not in detail
    assert client.patch(f"/api/admin/users/{user_id}/status", json={"role": "admin"}, headers=ORIGIN).status_code == 422
    assert client.post(f"/api/admin/users/{harness.admin_id}/ban", json={"type": "permanent"}, headers=ORIGIN).status_code == 422
    assert client.patch(f"/api/admin/users/{harness.admin_id}/status", json={"is_active": False}, headers=ORIGIN).status_code == 422
    assert client.post(f"/api/admin/users/{user_id}/ban", json={"type": "temporary"}, headers=ORIGIN).status_code == 422
    banned = client.post(
        f"/api/admin/users/{user_id}/ban",
        json={"type": "temporary", "duration_minutes": 60, "reason": "Spam"},
        headers=ORIGIN,
    )
    assert banned.status_code == 200, banned.text
    assert banned.json()["ban_status"] == "temporary"
    assert client.get("/api/admin/users?ban_status=temporary").json()["total"] == 1
    with Session(harness.engine) as db:
        session = db.scalar(select(UserSession).where(UserSession.user_id == user_id))
        assert session.revoked_at is not None
    client.cookies.clear()
    client.cookies.set(SESSION_COOKIE_NAME, user_token)
    assert client.get("/api/account").status_code == 401
    client.cookies.clear()
    client.cookies.set(SESSION_COOKIE_NAME, admin_token)
    permanent = client.post(
        f"/api/admin/users/{user_id}/ban",
        json={"type": "permanent", "reason": "Fraud"}, headers=ORIGIN,
    )
    assert permanent.status_code == 200
    assert permanent.json()["ban_status"] == "permanent"
    assert permanent.json()["banned_until"] is None
    assert client.post(f"/api/admin/users/{user_id}/unban", headers=ORIGIN).json()["ban_status"] == "not_banned"
    deactivated = client.patch(
        f"/api/admin/users/{user_id}/status",
        json={"is_active": False}, headers=ORIGIN,
    )
    assert deactivated.status_code == 200
    assert client.get("/api/admin/users?status=inactive").json()["total"] == 1
    assert client.patch(
        f"/api/admin/users/{user_id}/status",
        json={"is_active": True}, headers=ORIGIN,
    ).status_code == 200


def test_admin_change_missing_resources_and_invalid_ban_shape(harness: Harness) -> None:
    client = harness.client
    assert client.get("/api/admin/cs2-items/999").status_code == 404
    assert client.get("/api/admin/tf2-keys/999").status_code == 404
    assert client.get("/api/admin/users/999").status_code == 404
    assert client.post("/api/admin/users/999/unban", headers=ORIGIN).status_code == 404
    assert client.post(
        "/api/admin/users/999/ban",
        json={"type": "permanent", "duration_minutes": 1}, headers=ORIGIN,
    ).status_code == 422
