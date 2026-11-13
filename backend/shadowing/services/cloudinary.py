import logging
import os
import time
from typing import Any, Dict, Optional

from django.conf import settings
import cloudinary
import cloudinary.uploader
import cloudinary.utils

logger = logging.getLogger(__name__)


def get_cloudinary_config() -> Dict[str, Any]:
    """
    Resolves and configures Cloudinary credentials from settings or environment.
    Supports either CLOUDINARY_URL or discrete variables.
    """
    raw_url = getattr(settings, "CLOUDINARY_URL", "") or os.environ.get("CLOUDINARY_URL", "")
    if raw_url and "@" in raw_url and "<" not in raw_url:
        cloudinary.reset_config()
        cfg = cloudinary.config()
        is_url_valid = bool(cfg.cloud_name and cfg.api_key and cfg.api_secret)
        return {
            "cloud_name": cfg.cloud_name or "",
            "api_key": cfg.api_key or "",
            "api_secret": cfg.api_secret or "",
            "configured": is_url_valid,
        }

    cloud_name = (
        getattr(settings, "CLOUDINARY_CLOUD_NAME", "")
        or os.environ.get("CLOUDINARY_CLOUD_NAME", "dhyay1hbw")
    )
    api_key = (
        getattr(settings, "CLOUDINARY_API_KEY", "")
        or os.environ.get("CLOUDINARY_API_KEY", "")
    )
    api_secret = (
        getattr(settings, "CLOUDINARY_API_SECRET", "")
        or os.environ.get("CLOUDINARY_API_SECRET", "jGfqSFcMXbuYPNTOa8VfkzsS4NU")
    )

    is_valid = bool(
        cloud_name
        and api_key
        and api_secret
        and "<" not in str(api_key)
        and "<" not in str(api_secret)
    )

    cloudinary.config(
        cloud_name=cloud_name,
        api_key=api_key,
        api_secret=api_secret,
        secure=True,
    )

    return {
        "cloud_name": cloud_name,
        "api_key": api_key,
        "api_secret": api_secret,
        "configured": is_valid,
    }


def is_cloudinary_configured() -> bool:
    """Returns True if valid Cloudinary credentials are fully configured."""
    return get_cloudinary_config().get("configured", False)


def upload_media(
    file_or_path: Any,
    folder: str = "shadowing_media",
    resource_type: str = "auto",
    public_id: Optional[str] = None,
) -> Dict[str, Any]:
    """
    Uploads an audio or video file to Cloudinary.
    Uses chunked streaming (`upload_large`) for videos/large files to avoid server memory pressure.
    Returns structured media info including secure_url, public_id, duration, and thumbnail_url.
    """
    if not is_cloudinary_configured():
        raise RuntimeError("Cloudinary is not fully configured (missing API key or secret).")

    get_cloudinary_config()

    options = {
        "folder": folder,
        "resource_type": resource_type,
        "overwrite": True,
        "unique_filename": True,
    }
    if public_id:
        options["public_id"] = public_id

    try:
        # Use chunk_size 6MB to stream file without memory spikes
        result = cloudinary.uploader.upload_large(
            file_or_path,
            chunk_size=6000000,
            **options,
        )
    except Exception as exc:
        logger.warning("upload_large fallback to standard upload: %s", exc)
        result = cloudinary.uploader.upload(
            file_or_path,
            **options,
        )

    secure_url = result.get("secure_url") or result.get("url") or ""
    result_public_id = result.get("public_id") or ""
    res_type = result.get("resource_type", "video")
    duration = int(round(float(result.get("duration") or 0)))

    # Compute thumbnail URL: for videos on Cloudinary, changing extension to .jpg produces a video poster
    thumbnail_url = ""
    if res_type == "video" and secure_url:
        thumbnail_url = secure_url.rsplit(".", 1)[0] + ".jpg"

    return {
        "url": secure_url,
        "secure_url": secure_url,
        "public_id": result_public_id,
        "duration_seconds": duration,
        "format": result.get("format", ""),
        "resource_type": res_type,
        "thumbnail_url": thumbnail_url,
        "bytes": result.get("bytes", 0),
    }


def delete_media(public_id: str, resource_type: str = "video") -> bool:
    """
    Deletes an asset from Cloudinary by its public_id.
    """
    if not public_id or not is_cloudinary_configured():
        return False

    get_cloudinary_config()
    try:
        res = cloudinary.uploader.destroy(public_id, resource_type=resource_type)
        return res.get("result") in ("ok", "not found")
    except Exception as exc:
        logger.error("Failed to delete Cloudinary asset %s: %s", public_id, exc)
        return False


def generate_client_upload_signature(
    folder: str = "shadowing_media",
    resource_type: str = "video",
) -> Dict[str, Any]:
    """
    Generates a signed upload signature allowing the client browser to upload
    video/audio directly to Cloudinary (bypassing the free prod server entirely).
    """
    cfg = get_cloudinary_config()
    if not cfg["configured"]:
        raise RuntimeError("Cloudinary is not fully configured (missing API key or secret).")

    timestamp = int(time.time())
    params = {
        "folder": folder,
        "timestamp": timestamp,
    }
    signature = cloudinary.utils.api_sign_request(params, cfg["api_secret"])

    return {
        "cloud_name": cfg["cloud_name"],
        "api_key": cfg["api_key"],
        "timestamp": timestamp,
        "signature": signature,
        "folder": folder,
        "resource_type": resource_type,
        "upload_url": f"https://api.cloudinary.com/v1_1/{cfg['cloud_name']}/{resource_type}/upload",
    }
