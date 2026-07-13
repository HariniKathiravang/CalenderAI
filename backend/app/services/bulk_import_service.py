import io
import csv
from typing import List, Tuple
from sqlalchemy.orm import Session
from app.models.models import User, Student, Faculty, Department, Class, RoleEnum
from app.auth.security import get_password_hash
import openpyxl

def _normalize_key(key: str) -> str:
    return str(key).strip().lower().replace(" ", "_").replace("-", "_")

def parse_bulk_file(content: bytes, filename: str) -> List[dict]:
    ext = filename.rsplit(".", 1)[-1].lower()
    records = []

    if ext == "csv":
        text_stream = io.StringIO(content.decode("utf-8", errors="ignore"))
        reader = csv.reader(text_stream)
        headers = []
        for i, row in enumerate(reader):
            if i == 0:
                headers = [_normalize_key(h) for h in row]
                continue
            if not any(row):
                continue
            record = {}
            for col_idx, val in enumerate(row):
                if col_idx < len(headers):
                    record[headers[col_idx]] = val
            records.append(record)

    elif ext in ("xlsx", "xls"):
        wb = openpyxl.load_workbook(io.BytesIO(content), data_only=True)
        sheet = wb.active
        headers = []
        for i, row in enumerate(sheet.iter_rows(values_only=True)):
            if i == 0:
                headers = [_normalize_key(h) for h in row if h is not None]
                continue
            if not any(val is not None for val in row):
                continue
            record = {}
            for col_idx, val in enumerate(row):
                if col_idx < len(headers):
                    record[headers[col_idx]] = "" if val is None else val
            records.append(record)
    else:
        raise ValueError("Unsupported file format. Use .xlsx or .csv")

    return records

def find_department(db: Session, dept_code: str = None, dept_id_val = None) -> Department:
    if dept_id_val is not None and str(dept_id_val).strip() != "":
        try:
            dept_id = int(float(str(dept_id_val)))
            dept = db.query(Department).filter(Department.id == dept_id).first()
            if dept:
                return dept
        except ValueError:
            pass
    if dept_code and str(dept_code).strip() != "":
        code = str(dept_code).strip().upper()
        return db.query(Department).filter(Department.department_code == code).first()
    return None

def find_class(db: Session, class_id_val = None, dept_code: str = None, year_val = None, section_val = None) -> Class:
    if class_id_val is not None and str(class_id_val).strip() != "":
        try:
            class_id = int(float(str(class_id_val)))
            cls = db.query(Class).filter(Class.id == class_id).first()
            if cls:
                return cls
        except ValueError:
            pass

    # Lookup class by department code, year, and section
    dept = find_department(db, dept_code=dept_code)
    if dept and year_val is not None and str(year_val).strip() != "" and section_val is not None and str(section_val).strip() != "":
        try:
            year = int(float(str(year_val)))
            sec = str(section_val).strip().upper()
            return db.query(Class).filter(
                Class.department_id == dept.id,
                Class.year == year,
                Class.section == sec
            ).first()
        except ValueError:
            pass
    return None

def bulk_import_users(db: Session, records: List[dict]) -> Tuple[int, int, List[str]]:
    if not records:
        return 0, 0, []

    imported = 0
    failed = 0
    errors: List[str] = []

    # Map possible alternative headers to canonical ones
    for record in records:
        # Check role, default to student if ambiguous
        role_raw = str(record.get("role", "")).strip().lower()
        if "student" in role_raw or role_raw == "s":
            role = RoleEnum.student
        elif "faculty" in role_raw or role_raw == "f" or "teacher" in role_raw:
            role = RoleEnum.faculty
        else:
            # infer from keys
            if "registration_number" in record or "reg_no" in record or "reg_number" in record:
                role = RoleEnum.student
            elif "employee_id" in record or "emp_id" in record:
                role = RoleEnum.faculty
            else:
                role = RoleEnum.student # fallback

        record["_role"] = role

    try:
        for idx, row in enumerate(records):
            row_num = idx + 2
            try:
                with db.begin_nested():
                    role = row["_role"]
                    username = str(row.get("username", row.get("user", ""))).strip()
                    password = str(row.get("password", row.get("pass", ""))).strip()
                    name = str(row.get("name", row.get("full_name", ""))).strip()
                    email = str(row.get("email", "")).strip() or None
                    mobile = str(row.get("mobile_number", row.get("mobile", row.get("phone", "")))).strip() or None

                    if email in ("nan", "None", ""):
                        email = None
                    if mobile in ("nan", "None", ""):
                        mobile = None

                    if not username or not password or not name:
                        raise ValueError("Username, password, and name are required")

                    if db.query(User).filter(User.username == username).first():
                        raise ValueError(f"Username '{username}' already exists")

                    if role == RoleEnum.student:
                        # Student columns
                        reg_no = str(row.get("registration_number", row.get("reg_no", row.get("reg_number", "")))).strip()
                        if not reg_no:
                            raise ValueError("registration_number is required for students")
                        if db.query(Student).filter(Student.registration_number == reg_no).first():
                            raise ValueError(f"Registration number '{reg_no}' already exists")

                        # class resolution
                        class_id_val = row.get("class_id")
                        dept_code = row.get("department_code", row.get("dept", ""))
                        year_val = row.get("year", row.get("class_year", ""))
                        section_val = row.get("section", row.get("class_section", ""))

                        cls = find_class(db, class_id_val=class_id_val, dept_code=dept_code, year_val=year_val, section_val=section_val)
                        if not cls:
                            raise ValueError("Class not found. Provide valid class_id, or department_code + year + section")

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
                            class_id=cls.id,
                        )
                        db.add(student)

                    elif role == RoleEnum.faculty:
                        # Faculty columns
                        emp_id = str(row.get("employee_id", row.get("emp_id", ""))).strip()
                        if not emp_id:
                            raise ValueError("employee_id is required for faculty")
                        if db.query(Faculty).filter(Faculty.employee_id == emp_id).first():
                            raise ValueError(f"Employee ID '{emp_id}' already exists")

                        # department resolution
                        dept_id_val = row.get("department_id", row.get("dept_id", ""))
                        dept_code = row.get("department_code", row.get("dept", ""))
                        dept = find_department(db, dept_code=dept_code, dept_id_val=dept_id_val)
                        if not dept:
                            raise ValueError("Department not found. Provide valid department_id or department_code")

                        # optional class resolution (faculty can be assigned to a class)
                        class_id_val = row.get("class_id")
                        year_val = row.get("year", row.get("class_year", ""))
                        section_val = row.get("section", row.get("class_section", ""))
                        cls = find_class(db, class_id_val=class_id_val, dept_code=dept_code, year_val=year_val, section_val=section_val)

                        designation = str(row.get("designation", "")).strip() or None

                        user = User(
                            username=username,
                            password_hash=get_password_hash(password),
                            role=RoleEnum.faculty,
                        )
                        db.add(user)
                        db.flush()

                        faculty = Faculty(
                            user_id=user.id,
                            employee_id=emp_id,
                            name=name,
                            email=email,
                            mobile_number=mobile,
                            department_id=dept.id,
                            class_id=cls.id if cls else None,
                            designation=designation,
                        )
                        db.add(faculty)
                
                imported += 1

            except Exception as e:
                failed += 1
                errors.append(f"Row {row_num}: {e}")

        if failed > 0:
            db.rollback()
            imported = 0
        elif imported > 0:
            db.commit()
    except Exception:
        db.rollback()
        raise

    return imported, failed, errors
