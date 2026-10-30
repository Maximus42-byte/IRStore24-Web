"""Shared readiness checks for manual payment instructions."""
from app.models.store_settings import StoreSettings


def payment_instructions_configured(settings: StoreSettings | None) -> bool:
    return bool(
        settings is not None
        and settings.card_number
        and settings.card_holder_name
        and (settings.telegram_username or settings.telegram_url)
    )
