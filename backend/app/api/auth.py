from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database.session import get_db
from app.schemas.schemas import LoginRequest, Token
from app.models.models import User, Admin, HOD, Faculty, Student, RoleEnum
from app.auth.security import verify_password, create_access_token
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])





@router.post("/login", response_model=Token)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    user = None
    name = ""

    if data.role == RoleEnum.admin:
        user = db.query(User).filter(
            User.username == data.identifier,
            User.role == RoleEnum.admin
        ).first()
        if user and user.admin:
            name = user.admin.name

    elif data.role == RoleEnum.hod:
        hod = db.query(HOD).filter(HOD.employee_id == data.identifier).first()
        if hod:
            user = hod.user
            name = hod.name

    elif data.role == RoleEnum.faculty:
        faculty = db.query(Faculty).filter(Faculty.employee_id == data.identifier).first()
        if faculty:
            user = faculty.user
            name = faculty.name

    elif data.role == RoleEnum.student:
        student = db.query(Student).filter(Student.registration_number == data.identifier).first()
        if student:
            user = student.user
            name = student.name

    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is disabled")

    token = create_access_token({"sub": str(user.id), "role": user.role.value})
    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role.value,
        user_id=user.id,
        name=name,
    )


@router.get("/me")
def get_me(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    profile = {
        "user_id": current_user.id,
        "username": current_user.username,
        "role": current_user.role.value,
        "is_active": current_user.is_active,
        "name": ""
    }
    if current_user.role == RoleEnum.admin and current_user.admin:
        profile["name"] = current_user.admin.name
    elif current_user.role == RoleEnum.hod and current_user.hod:
        profile["name"] = current_user.hod.name
        profile["department_id"] = current_user.hod.department_id
    elif current_user.role == RoleEnum.faculty and current_user.faculty:
        profile["name"] = current_user.faculty.name
        profile["department_id"] = current_user.faculty.department_id
        profile["class_id"] = current_user.faculty.class_id
    elif current_user.role == RoleEnum.student and current_user.student:
        profile["name"] = current_user.student.name
        profile["class_id"] = current_user.student.class_id
        
    return profile
