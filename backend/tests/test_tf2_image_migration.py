"""Exercise the additive TF2 image migration against a populated disposable database."""
from pathlib import Path
from uuid import uuid4

from alembic import command
from alembic.config import Config
import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import OperationalError, ProgrammingError

from app.core import database
from app.core.config import settings


def test_tf2_image_migration_preserves_existing_rows(monkeypatch: pytest.MonkeyPatch) -> None:
    name = f"irstore24_image_test_{uuid4().hex[:12]}"
    assert name != settings.postgres_db and settings.db_host in ("127.0.0.1", "localhost")
    maintenance = create_engine(
        settings.database_url.set(database="postgres"), isolation_level="AUTOCOMMIT",
    )
    engine = None
    try:
        with maintenance.connect() as connection:
            connection.execute(text(f'CREATE DATABASE "{name}"'))
    except (OperationalError, ProgrammingError) as error:
        maintenance.dispose()
        pytest.skip(f"Disposable PostgreSQL database unavailable: {type(error).__name__}")
    try:
        engine = create_engine(settings.database_url.set(database=name))
        monkeypatch.setattr(database, "engine", engine)
        config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
        command.upgrade(config, "f691486b68bb")
        with engine.begin() as connection:
            product_id = connection.scalar(text(
                "INSERT INTO tf2_keys (stock_quantity, sell_price_amount, "
                "sell_price_currency, buy_price_amount, buy_price_currency) "
                "VALUES (3, 2.50000000, 'USDT', 1.50000000, 'USDT') RETURNING id"
            ))
        assert "image_path" not in {
            column["name"] for column in inspect(engine).get_columns("tf2_keys")
        }
        command.upgrade(config, "6c97dfd75e2b")
        columns = {column["name"]: column for column in inspect(engine).get_columns("tf2_keys")}
        assert columns["image_path"]["nullable"] is True
        assert str(columns["image_path"]["type"]) == "VARCHAR(1024)"
        with engine.connect() as connection:
            row = connection.execute(text(
                "SELECT stock_quantity, sell_price_amount, image_path "
                "FROM tf2_keys WHERE id = :id"
            ), {"id": product_id}).one()
            assert row.stock_quantity == 3
            assert row.sell_price_amount == 2.5
            assert row.image_path is None
        command.check(config)
    finally:
        if engine is not None:
            engine.dispose()
        with maintenance.connect() as connection:
            connection.execute(text(f'DROP DATABASE "{name}"'))
        maintenance.dispose()
