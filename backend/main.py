from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
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


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    import traceback
    return JSONResponse(
        status_code=500,
        content={
            "detail": "Internal Server Error",
            "message": str(exc),
            "traceback": traceback.format_exc()
        }
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


@app.get("/api")
def root():
    return {"message": "EEC Calendar API is running", "version": "1.0.0"}


@app.get("/api/health")
def health():
    return {"status": "healthy"}


@app.get("/api/db-test")
def db_test():
    results = {}
    
    # 1. Test database connection
    try:
        from sqlalchemy import text
        db = SessionLocal()
        db.execute(text("SELECT 1"))
        db.close()
        results["database"] = "connected"
    except Exception as e:
        import traceback
        results["database"] = f"error: {e}\n{traceback.format_exc()}"
        
    # 2. Test password verification (bcrypt)
    try:
        from app.auth.security import verify_password, get_password_hash
        hashed = get_password_hash("testpassword")
        if verify_password("testpassword", hashed):
            results["bcrypt"] = "working"
        else:
            results["bcrypt"] = "failed to match"
    except Exception as e:
        import traceback
        results["bcrypt"] = f"error: {e}\n{traceback.format_exc()}"
        
    # 3. Test mock login simulation
    try:
        from app.models.models import User, RoleEnum
        from app.auth.security import verify_password, create_access_token
        db = SessionLocal()
        user = db.query(User).filter(User.username == "admin", User.role == RoleEnum.admin).first()
        if not user:
            results["login_sim"] = "user not found"
        else:
            verify_res = verify_password("Admin@123", user.password_hash)
            token = create_access_token({"sub": str(user.id), "role": user.role.value})
            results["login_sim"] = {
                "user": user.username,
                "verified": verify_res,
                "token_len": len(token)
            }
        db.close()
    except Exception as e:
        import traceback
        results["login_sim"] = f"error: {e}\n{traceback.format_exc()}"
        
    return results
