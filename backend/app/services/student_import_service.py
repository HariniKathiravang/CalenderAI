import io
import csv
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.models import User, Student, RoleEnum
from app.auth.security import get_password_hash
import openpyxl

REQUIRED_COLUMNS = {"username", "password", "registration_number", "name", "class_id"}
OPTIONAL_COLUMNS = {"email", "mobile_number"}


def _normalize_name(name: str) -> str:
    return str(name).strip().lower().replace(" ", "_")


def parse_roster_file(content: bytes, filename: str) -> List[dict]:
    """Parse Excel or CSV roster without pandas (to keep deployment footprint small)."""
    ext = filename.rsplit(".", 1)[-1].lower()
    records = []

    if ext == "csv":
        # Read CSV
        text_stream = io.StringIO(content.decode("utf-8", errors="ignore"))
        reader = csv.reader(text_stream)
        headers = []
        for i, row in enumerate(reader):
            if i == 0:
                headers = [_normalize_name(h) for h in row]
                continue
            if not any(row):  # skip empty rows
                continue
            record = {}
            for col_idx, val in enumerate(row):
                if col_idx < len(headers):
                    record[headers[col_idx]] = val
            records.append(record)

    elif ext in ("xlsx", "xls"):
        # Read Excel using openpyxl directly
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        sheet = wb.active
        headers = []
        for i, row in enumerate(sheet.iter_rows(values_only=True)):
            if i == 0:
                headers = [_normalize_name(h) for h in row if h is not None]
                continue
            if not any(val is not None for val in row):  # skip empty rows
                continue
            record = {}
            for col_idx, val in enumerate(row):
                if col_idx < len(headers):
                    record[headers[col_idx]] = "" if val is None else val
            records.append(record)
    else:
        raise ValueError("Unsupported file format. Use .xlsx or .csv")

    return records


def bulk_insert_students(db: Session, records: List[dict]) -> Tuple[int, int, List[str]]:
    """Batch-insert students in a single transaction."""
    if not records:
        return 0, 0, []

    first_record = records[0]
    missing = REQUIRED_COLUMNS - set(first_record.keys())
    if missing:
        raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")

    imported = 0
    failed = 0
    errors: List[str] = []

    try:
        for idx, row in enumerate(records):
            row_num = idx + 2  # account for header row
            try:
                username = str(row.get("username", "")).strip()
                password = str(row.get("password", "")).strip()
                reg_no = str(row.get("registration_number", "")).strip()
                name = str(row.get("name", "")).strip()
                class_id_val = row.get("class_id")

                if class_id_val is None or str(class_id_val).strip() == "":
                    raise ValueError("class_id is required")
                class_id = int(float(str(class_id_val)))

                if not username or not password or not reg_no or not name:
                    raise ValueError("username, password, registration_number, and name are required")

                if db.query(User).filter(User.username == username).first():
                    raise ValueError(f"Username '{username}' already exists")
                if db.query(Student).filter(Student.registration_number == reg_no).first():
                    raise ValueError(f"Registration number '{reg_no}' already exists")

                email = str(row.get("email", "")).strip() or None
                mobile = str(row.get("mobile_number", "")).strip() or None
                if email in ("nan", "None", ""):
                    email = None
                if mobile in ("nan", "None", ""):
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
