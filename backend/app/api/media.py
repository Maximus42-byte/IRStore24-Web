"""Admin image upload and controlled local media delivery."""
from pathlib import Path
import re
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import FileResponse

from app.api.dependencies import require_admin
from app.core.config import settings
from app.services.media import MAX_UPLOAD_BYTES, save_image

upload_router = APIRouter(
    prefix="/api/admin/media", tags=["Administration"],
    dependencies=[Depends(require_admin)],
)
media_router = APIRouter(tags=["Media"])
SAFE_ASSET = re.compile(
    r"(?:[a-z0-9_-]+/)*[a-z0-9_-]+\.(?:png|jpe?g|webp|gif|avif)",
    re.IGNORECASE | re.ASCII,
)


@upload_router.post("/{kind}", status_code=201)
async def upload_image(kind: Literal["cs2", "tf2"], request: Request) -> dict[str, str]:
    declared = request.headers.get("content-length")
    if declared is not None and (not declared.isdecimal() or int(declared) > MAX_UPLOAD_BYTES):
        raise HTTPException(413, "Image must be 768 KiB or smaller")
    data = bytearray()
    async for chunk in request.stream():
        if len(data) + len(chunk) > MAX_UPLOAD_BYTES:
            raise HTTPException(413, "Image must be 768 KiB or smaller")
        data.extend(chunk)
    return {"path": save_image(kind, bytes(data))}


@media_router.get("/media/{asset_path:path}")
def get_media(asset_path: str):
    if SAFE_ASSET.fullmatch(asset_path) is None:
        raise HTTPException(404)
    root = Path(settings.media_root)
    path = root / asset_path
    if any(part.is_symlink() for part in (root, *path.parents, path)):
        raise HTTPException(404)
    try:
        if not path.is_file() or not path.resolve().is_relative_to(root.resolve()):
            raise HTTPException(404)
    except OSError:
        raise HTTPException(404) from None
    return FileResponse(path, headers={"X-Content-Type-Options": "nosniff"})
