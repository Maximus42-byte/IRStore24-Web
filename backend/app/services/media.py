"""Validate and store administrator-uploaded product images."""
from io import BytesIO
import os
from pathlib import Path
import secrets
import warnings

from fastapi import HTTPException
from PIL import Image, ImageOps, UnidentifiedImageError

from app.core.config import settings

MAX_UPLOAD_BYTES = 768 * 1024
MAX_DIMENSION = 4096
MAX_PIXELS = 16_000_000
MAX_STORED_BYTES = 5 * 1024 * 1024
IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}


def process_image(data: bytes) -> bytes:
    if not data or len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(413, "Image must be 768 KiB or smaller")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(BytesIO(data)) as image:
                if image.format not in IMAGE_FORMATS:
                    raise HTTPException(415, "Only JPEG, PNG and WebP images are allowed")
                width, height = image.size
                if (width < 1 or height < 1 or width > MAX_DIMENSION
                        or height > MAX_DIMENSION or width * height > MAX_PIXELS):
                    raise HTTPException(422, "Image dimensions exceed the limit")
                if getattr(image, "n_frames", 1) != 1:
                    raise HTTPException(422, "Animated images are not supported")
                image.verify()
            with Image.open(BytesIO(data)) as image:
                image.load()
                oriented = ImageOps.exif_transpose(image)
                # A new pixel buffer discards EXIF, GPS, ICC and other source metadata.
                clean = Image.new("RGBA", oriented.size)
                clean.paste(oriented.convert("RGBA"))
                output = BytesIO()
                clean.save(output, format="WEBP", quality=85, method=4)
    except (UnidentifiedImageError, OSError, ValueError, SyntaxError,
            Image.DecompressionBombError, Image.DecompressionBombWarning) as error:
        raise HTTPException(422, "Invalid image content") from error
    result = output.getvalue()
    if len(result) > MAX_STORED_BYTES:
        raise HTTPException(413, "Processed image exceeds storage size limit")
    return result


def save_image(kind: str, data: bytes) -> str:
    if kind not in ("cs2", "tf2"):
        raise HTTPException(404, "Unknown product type")
    processed = process_image(data)
    root = Path(settings.media_root)
    directory = root / kind
    try:
        if root.is_symlink() or directory.is_symlink():
            raise OSError("Media directory cannot be a symlink")
        directory.mkdir(parents=True, mode=0o755, exist_ok=True)
        if root.is_symlink() or directory.is_symlink():
            raise OSError("Media directory cannot be a symlink")
        dir_fd = os.open(directory, os.O_RDONLY | os.O_DIRECTORY | os.O_NOFOLLOW)
        try:
            for _ in range(3):
                name = secrets.token_hex(16) + ".webp"
                temporary = "." + name + ".tmp"
                try:
                    fd = os.open(
                        temporary,
                        os.O_WRONLY | os.O_CREAT | os.O_EXCL | os.O_NOFOLLOW,
                        0o600,
                        dir_fd=dir_fd,
                    )
                except FileExistsError:
                    continue
                try:
                    with os.fdopen(fd, "wb") as file:
                        file.write(processed)
                        file.flush()
                        os.fchmod(file.fileno(), 0o644)
                        os.fsync(file.fileno())
                    # link fails if the final name exists; no image is replaced.
                    os.link(temporary, name, src_dir_fd=dir_fd,
                            dst_dir_fd=dir_fd, follow_symlinks=False)
                    return f"/media/{kind}/{name}"
                except FileExistsError:
                    continue
                finally:
                    # Temporary names cannot be served by the /media/ URL rule.
                    os.unlink(temporary, dir_fd=dir_fd)
        finally:
            os.close(dir_fd)
    except OSError as error:
        raise HTTPException(503, "Media storage unavailable") from error
    raise HTTPException(503, "Media filename allocation failed")
