import os
import uuid
from fastapi import UploadFile
from app.core.config import settings
from app.database.supabase import get_supabase_client

ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".gif", ".webp", ".doc", ".docx", ".xlsx", ".csv"}


def _get_extension(filename: str) -> str:
    return os.path.splitext(filename)[1].lower()


async def save_upload(file: UploadFile) -> dict:
    """Save uploaded file to Supabase Storage or local disk."""
    ext = _get_extension(file.filename or "")
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(f"File type '{ext}' not allowed")

    content = await file.read()
    unique_name = f"{uuid.uuid4().hex}{ext}"

    # TODO: Connect LLM parser here
    # parsed_metadata = await parse_event_from_file(content, file.filename)
    # Return parsed title, description, dates when LLM is connected.

    if settings.use_supabase_storage:
        client = get_supabase_client()
        if client:
            bucket = settings.SUPABASE_STORAGE_BUCKET
            client.storage.from_(bucket).upload(
                unique_name,
                content,
                {"content-type": file.content_type or "application/octet-stream"},
            )
            public_url = client.storage.from_(bucket).get_public_url(unique_name)
            return {"file_url": public_url, "filename": unique_name}

    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    filepath = os.path.join(settings.UPLOAD_DIR, unique_name)
    with open(filepath, "wb") as f:
        f.write(content)
    return {"file_url": f"/uploads/{unique_name}", "filename": unique_name}
