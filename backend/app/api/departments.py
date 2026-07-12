from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database.session import get_db
from app.schemas.schemas import DepartmentCreate, DepartmentOut
from app.models.models import Department
from app.auth.dependencies import get_current_user, get_admin_user

router = APIRouter(prefix="/departments", tags=["Departments"])


@router.get("/", response_model=List[DepartmentOut])
def get_departments(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    return db.query(Department).all()


@router.post("/", response_model=DepartmentOut)
def create_department(data: DepartmentCreate, db: Session = Depends(get_db), current_user=Depends(get_admin_user)):
    existing = db.query(Department).filter(Department.department_code == data.department_code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Department code already exists")
    dept = Department(**data.model_dump())
    db.add(dept)
    db.commit()
    db.refresh(dept)
    return dept


@router.put("/{dept_id}", response_model=DepartmentOut)
def update_department(dept_id: int, data: DepartmentCreate, db: Session = Depends(get_db), current_user=Depends(get_admin_user)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    dept.department_name = data.department_name
    dept.department_code = data.department_code
    db.commit()
    db.refresh(dept)
    return dept


@router.delete("/{dept_id}")
def delete_department(dept_id: int, db: Session = Depends(get_db), current_user=Depends(get_admin_user)):
    dept = db.query(Department).filter(Department.id == dept_id).first()
    if not dept:
        raise HTTPException(status_code=404, detail="Department not found")
    db.delete(dept)
    db.commit()
    return {"message": "Department deleted"}
