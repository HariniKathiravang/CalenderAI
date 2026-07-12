from pydantic_settings import BaseSettings
from typing import List
import json


import os

class Settings(BaseSettings):
    # Supabase PostgreSQL connection (Session pooler recommended for serverless)
    DATABASE_URL: str = "postgresql://postgres:password@localhost:5432/student_calendar_management_system"
    SUPABASE_URL: str = ""
    SUPABASE_KEY: str = ""
    SUPABASE_SERVICE_ROLE_KEY: str = ""
    SUPABASE_STORAGE_BUCKET: str = "uploads"

    SECRET_KEY: str = "change-this-secret-key-in-production-use-32chars"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    UPLOAD_DIR: str = "/tmp/uploads" if (os.environ.get("VERCEL") or os.environ.get("NOW_BUILDER")) else "app/uploads"
    CORS_ORIGINS: str = '["http://localhost:5173","http://localhost:3000"]'

    @property
    def cors_origins_list(self) -> List[str]:
        try:
            return json.loads(self.CORS_ORIGINS)
        except Exception:
            return ["http://localhost:5173"]

    @property
    def use_supabase_storage(self) -> bool:
        return bool(self.SUPABASE_URL and (self.SUPABASE_SERVICE_ROLE_KEY or self.SUPABASE_KEY))

    class Config:
        env_file = ".env"


settings = Settings()
