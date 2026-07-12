import io
from typing import List, Tuple
import pandas as pd
from sqlalchemy.orm import Session
from app.models.models import User, Student, RoleEnum
from app.auth.security import get_password_hash

REQUIRED_COLUMNS = {"username", "password", "registration_number", "name", "class_id"}
OPTIONAL_COLUMNS = {"email", "mobile_number"}


def _normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    df.columns = [str(c).strip().lower().replace(" ", "_") for c in df.columns]
    return df


def parse_roster_file(content: bytes, filename: str) -> pd.DataFrame:
    """Parse Excel or CSV roster using pandas (no LLM)."""
    ext = filename.rsplit(".", 1)[-1].lower()
    if ext == "csv":
        df = pd.read_csv(io.BytesIO(content))
    elif ext in ("xlsx", "xls"):
        df = pd.read_excel(io.BytesIO(content), engine="openpyxl")
    else:
        raise ValueError("Unsupported file format. Use .xlsx or .csv")
    return _normalize_columns(df)


def bulk_insert_students(db: Session, df: pd.DataFrame) -> Tuple[int, int, List[str]]:
    """Batch-insert students in a single transaction."""
    missing = REQUIRED_COLUMNS - set(df.columns)
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")

    imported = 0
    failed = 0
    errors: List[str] = []

    try:
        for idx, row in df.iterrows():
            row_num = int(idx) + 2  # account for header row
            try:
                username = str(row["username"]).strip()
                password = str(row["password"]).strip()
                reg_no = str(row["registration_number"]).strip()
                name = str(row["name"]).strip()
                class_id = int(row["class_id"])

                if not username or not password or not reg_no or not name:
                    raise ValueError("username, password, registration_number, and name are required")

                if db.query(User).filter(User.username == username).first():
                    raise ValueError(f"Username '{username}' already exists")
                if db.query(Student).filter(Student.registration_number == reg_no).first():
                    raise ValueError(f"Registration number '{reg_no}' already exists")

                email = str(row.get("email", "")).strip() or None
                mobile = str(row.get("mobile_number", "")).strip() or None
                if email == "nan":
                    email = None
                if mobile == "nan":
                    mobile = None

                user = User(
                    username=username,
                    password_hash=get_password_hash(password),
                    role=RoleEnum.student,
                )
                db.add(user)
                db.flush()

                student = Student(
                    user_id=user.id,
                    registration_number=reg_no,
                    name=name,
                    email=email,
                    mobile_number=mobile,
                    class_id=class_id,
                )
                db.add(student)
                imported += 1
            except Exception as e:
                failed += 1
                errors.append(f"Row {row_num}: {e}")

        if imported > 0:
            db.commit()
        else:
            db.rollback()
    except Exception:
        db.rollback()
        raise

    return imported, failed, errors
