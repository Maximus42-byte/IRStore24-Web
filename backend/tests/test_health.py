from unittest.mock import MagicMock, patch

from fastapi.testclient import TestClient

from app.main import app


client = TestClient(app)


def test_health_check() -> None:
    response = client.get("/api/health")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "service": "irstore24-api",
    }


def test_database_health_check() -> None:
    mock_connection = MagicMock()
    mock_context_manager = MagicMock()

    mock_context_manager.__enter__.return_value = mock_connection
    mock_context_manager.__exit__.return_value = False

    with patch(
        "app.api.health.engine.connect",
        return_value=mock_context_manager,
    ):
        response = client.get("/api/health/database")

    assert response.status_code == 200
    assert response.json() == {
        "status": "ok",
        "database": "connected",
    }

    mock_connection.execute.assert_called_once()

