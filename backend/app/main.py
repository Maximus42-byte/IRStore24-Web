from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api.account import router as account_router
from app.api.admin import router as admin_router
from app.api.auth import router as auth_router
from app.api.cart import router as cart_router
from app.api.health import router as health_router
from app.api.media import media_router, upload_router
from app.api.orders import (
    account_router as account_orders_router,
    admin_router as admin_orders_router,
    purchase_router,
)
from app.api.store import router as store_router
from app.core.config import settings


app = FastAPI(
    title="IRStore24 API",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.auth_allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PATCH", "DELETE"],
    allow_headers=["Content-Type"],
)


@app.exception_handler(RequestValidationError)
async def sanitized_validation_error(request: Request, error: RequestValidationError):
    details = []
    for item in error.errors():
        detail = dict(item)
        detail.pop("input", None)
        detail.pop("ctx", None)
        details.append(detail)
    return JSONResponse(status_code=422, content={"detail": details})


@app.middleware("http")
async def require_trusted_origin(request: Request, call_next):
    if (
        request.url.path.startswith("/api/")
        and request.method not in ("GET", "HEAD", "OPTIONS")
        and request.headers.get("origin") not in settings.auth_allowed_origins
    ):
        return JSONResponse(status_code=403, content={"detail": "Forbidden"})
    return await call_next(request)


app.include_router(health_router)
app.include_router(auth_router)
app.include_router(account_router)
app.include_router(store_router)
app.include_router(admin_router)
app.include_router(upload_router)
app.include_router(media_router)
app.include_router(cart_router)
app.include_router(purchase_router)
app.include_router(account_orders_router)
app.include_router(admin_orders_router)
