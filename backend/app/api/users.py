from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.session import get_db
from app.schemas.schemas import (
    AdminCreate, AdminOut, HODCreate, HODOut, HODUpdate,
    FacultyCreate, FacultyOut, FacultyUpdate,
    StudentCreate, StudentOut, StudentUpdate, BulkImportResult
)
from app.models.models import User, Admin, HOD, Faculty, Student, RoleEnum
from app.auth.dependencies import get_current_user, get_admin_user
from app.auth.security import get_password_hash
from app.services.student_import_service import parse_roster_file, bulk_insert_students

router = APIRouter(prefix="/users", tags=["Users"])


# ─── Admin ───────────────────────────────────────────────────────────────────

@router.get("/admins", response_model=List[AdminOut])
def list_admins(db: Session = Depends(get_db), _=Depends(get_admin_user)):
    return db.query(Admin).all()


@router.post("/admins", response_model=AdminOut)
def create_admin(data: AdminCreate, db: Session = Depends(get_db), _=Depends(get_admin_user)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Username already taken")
    user = User(username=data.username, password_hash=get_password_hash(data.password), role=RoleEnum.admin)
    db.add(user)
    db.flush()
    admin = Admin(user_id=user.id, name=data.name)
    db.add(admin)
    db.commit()
    db.refresh(admin)
    return admin


# ─── HOD ─────────────────────────────────────────────────────────────────────

@router.get("/hods", response_model=List[HODOut])
def list_hods(db: Session = Depends(get_db), _=Depends(get_admin_user)):
    return db.query(HOD).all()


@router.post("/hods", response_model=HODOut)
def create_hod(data: HODCreate, db: Session = Depends(get_db), _=Depends(get_admin_user)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Username already taken")
    if db.query(HOD).filter(HOD.employee_id == data.employee_id).first():
        raise HTTPException(400, "Employee ID already exists")
    user = User(username=data.username, password_hash=get_password_hash(data.password), role=RoleEnum.hod)
    db.add(user)
    db.flush()
    hod = HOD(
        user_id=user.id,
        employee_id=data.employee_id,
        name=data.name,
        email=data.email,
        mobile_number=data.mobile_number,
        department_id=data.department_id,
    )
    db.add(hod)
    db.commit()
    db.refresh(hod)
    return hod


@router.put("/hods/{hod_id}", response_model=HODOut)
def update_hod(hod_id: int, data: HODUpdate, db: Session = Depends(get_db), _=Depends(get_admin_user)):
    hod = db.query(HOD).filter(HOD.id == hod_id).first()
    if not hod:
        raise HTTPException(404, "HOD not found")
    if data.name is not None:
        hod.name = data.name
    if data.email is not None:
        hod.email = data.email
    if data.mobile_number is not None:
        hod.mobile_number = data.mobile_number
    if data.department_id is not None:
        hod.department_id = data.department_id
    if data.password:
        hod.user.password_hash = get_password_hash(data.password)
    if data.is_active is not None:
        hod.user.is_active = data.is_active
    db.commit()
    db.refresh(hod)
    return hod


@router.delete("/hods/{hod_id}")
def delete_hod(hod_id: int, db: Session = Depends(get_db), _=Depends(get_admin_user)):
    hod = db.query(HOD).filter(HOD.id == hod_id).first()
    if not hod:
        raise HTTPException(404, "HOD not found")
    db.delete(hod.user)
    db.commit()
    return {"message": "HOD deleted"}


# ─── Faculty ─────────────────────────────────────────────────────────────────

@router.get("/faculty", response_model=List[FacultyOut])
def list_faculty(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Faculty)
    if current_user.role == RoleEnum.hod and current_user.hod:
        query = query.filter(Faculty.department_id == current_user.hod.department_id)
    elif department_id:
        query = query.filter(Faculty.department_id == department_id)
    return query.all()


@router.post("/faculty", response_model=FacultyOut)
def create_faculty(data: FacultyCreate, db: Session = Depends(get_db), _=Depends(get_admin_user)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Username already taken")
    if db.query(Faculty).filter(Faculty.employee_id == data.employee_id).first():
        raise HTTPException(400, "Employee ID already exists")
    user = User(username=data.username, password_hash=get_password_hash(data.password), role=RoleEnum.faculty)
    db.add(user)
    db.flush()
    faculty = Faculty(
        user_id=user.id,
        employee_id=data.employee_id,
        name=data.name,
        email=data.email,
        mobile_number=data.mobile_number,
        department_id=data.department_id,
        class_id=data.class_id,
        designation=data.designation,
    )
    db.add(faculty)
    db.commit()
    db.refresh(faculty)
    return faculty


@router.put("/faculty/{faculty_id}", response_model=FacultyOut)
def update_faculty(faculty_id: int, data: FacultyUpdate, db: Session = Depends(get_db), _=Depends(get_admin_user)):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(404, "Faculty not found")
    for field in ["name", "email", "mobile_number", "department_id", "class_id", "designation"]:
        val = getattr(data, field)
        if val is not None:
            setattr(faculty, field, val)
    if data.password:
        faculty.user.password_hash = get_password_hash(data.password)
    if data.is_active is not None:
        faculty.user.is_active = data.is_active
    db.commit()
    db.refresh(faculty)
    return faculty


@router.delete("/faculty/{faculty_id}")
def delete_faculty(faculty_id: int, db: Session = Depends(get_db), _=Depends(get_admin_user)):
    faculty = db.query(Faculty).filter(Faculty.id == faculty_id).first()
    if not faculty:
        raise HTTPException(404, "Faculty not found")
    db.delete(faculty.user)
    db.commit()
    return {"message": "Faculty deleted"}


# ─── Students ─────────────────────────────────────────────────────────────────

@router.get("/students", response_model=List[StudentOut])
def list_students(
    class_id: Optional[int] = None,
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    from app.models.models import Class
    query = db.query(Student)
    if current_user.role == RoleEnum.faculty and current_user.faculty:
        query = query.filter(Student.class_id == current_user.faculty.class_id)
    elif current_user.role == RoleEnum.hod and current_user.hod:
        query = query.join(Class).filter(Class.department_id == current_user.hod.department_id)
    elif class_id:
        query = query.filter(Student.class_id == class_id)
    elif department_id:
        query = query.join(Class).filter(Class.department_id == department_id)
    return query.all()


@router.post("/students", response_model=StudentOut)
def create_student(data: StudentCreate, db: Session = Depends(get_db), _=Depends(get_admin_user)):
    if db.query(User).filter(User.username == data.username).first():
        raise HTTPException(400, "Username already taken")
    if db.query(Student).filter(Student.registration_number == data.registration_number).first():
        raise HTTPException(400, "Registration number already exists")
    user = User(username=data.username, password_hash=get_password_hash(data.password), role=RoleEnum.student)
    db.add(user)
    db.flush()
    student = Student(
        user_id=user.id,
        registration_number=data.registration_number,
        name=data.name,
        email=data.email,
        mobile_number=data.mobile_number,
        class_id=data.class_id,
    )
    db.add(student)
    db.commit()
    db.refresh(student)
    return student


@router.put("/students/{student_id}", response_model=StudentOut)
def update_student(student_id: int, data: StudentUpdate, db: Session = Depends(get_db), _=Depends(get_admin_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    for field in ["name", "email", "mobile_number", "class_id"]:
        val = getattr(data, field)
        if val is not None:
            setattr(student, field, val)
    if data.password:
        student.user.password_hash = get_password_hash(data.password)
    if data.is_active is not None:
        student.user.is_active = data.is_active
    db.commit()
    db.refresh(student)
    return student


@router.delete("/students/{student_id}")
def delete_student(student_id: int, db: Session = Depends(get_db), _=Depends(get_admin_user)):
    student = db.query(Student).filter(Student.id == student_id).first()
    if not student:
        raise HTTPException(404, "Student not found")
    db.delete(student.user)
    db.commit()
    return {"message": "Student deleted"}


@router.post("/students/bulk-import", response_model=BulkImportResult)
async def bulk_import_students(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _=Depends(get_admin_user),
):
    """Parse Excel/CSV roster and batch-insert students (standard Python, no LLM)."""
    if not file.filename:
        raise HTTPException(400, "No file provided")
    ext = file.filename.rsplit(".", 1)[-1].lower()
    if ext not in ("xlsx", "xls", "csv"):
        raise HTTPException(400, "Only .xlsx and .csv files are supported")

    content = await file.read()
    try:
        records = parse_roster_file(content, file.filename)
        imported, failed, errors = bulk_insert_students(db, records)
        return {"imported": imported, "failed": failed, "errors": errors[:50]}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Import failed: {e}")
