"""Supabase client for storage and direct queries."""
from functools import lru_cache
from app.core.config import settings

try:
    from supabase import create_client, Client
except ImportError:
    create_client = None
    Client = None


@lru_cache()
def get_supabase_client() -> "Client | None":
    if not settings.SUPABASE_URL or not create_client:
        return None
    key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY
    if not key:
        return None
    return create_client(settings.SUPABASE_URL, key)
