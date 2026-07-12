from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from contextlib import asynccontextmanager
import os

from app.core.config import settings
from app.database.session import engine, Base
from app.models import models  # ensure models are registered
from app.api import auth, departments, classes, users, events, notifications, stats

# Scheduler for reminders
from apscheduler.schedulers.background import BackgroundScheduler
from app.database.session import SessionLocal
from app.services.notification_service import send_reminder_notifications

scheduler = BackgroundScheduler()


def run_reminders():
    db = SessionLocal()
    try:
        send_reminder_notifications(db)
    finally:
        db.close()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables locally, but bypass on Vercel to optimize cold starts and prevent startup blocks
    is_vercel = os.environ.get("VERCEL") or os.environ.get("NOW_BUILDER")
    if not is_vercel:
        Base.metadata.create_all(bind=engine)
    # Ensure upload dir exists
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
    # Start scheduler only if not on Vercel/serverless
    if not is_vercel:
        scheduler.add_job(run_reminders, "cron", hour=8, minute=0, id="daily_reminders", replace_existing=True)
        scheduler.start()
    yield
    if not is_vercel:
        try:
            scheduler.shutdown()
        except Exception:
            pass



app = FastAPI(
    title="EEC Calendar API",
    version="1.0.0",
    description="College Event Scheduling & Calendar Management System",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount uploads
if os.path.exists(settings.UPLOAD_DIR):
    app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")

# Include routers
app.include_router(auth.router, prefix="/api")
app.include_router(departments.router, prefix="/api")
app.include_router(classes.router, prefix="/api")
app.include_router(users.router, prefix="/api")
app.include_router(events.router, prefix="/api")
app.include_router(notifications.router, prefix="/api")
app.include_router(stats.router, prefix="/api")


@app.get("/")
def root():
    return {"message": "EEC Calendar API is running", "version": "1.0.0"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.get("/db-test")
def db_test():
    try:
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        return {"status": "connected"}
    except Exception as e:
        import traceback
        return {"status": "error", "message": str(e), "traceback": traceback.format_exc()}
