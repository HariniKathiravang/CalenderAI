from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database.session import get_db
from app.schemas.schemas import ClassCreate, ClassOut
from app.models.models import Class, RoleEnum, HOD, Faculty
from app.auth.dependencies import get_current_user, get_admin_user

router = APIRouter(prefix="/classes", tags=["Classes"])


@router.get("/", response_model=List[ClassOut])
def get_classes(
    department_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    query = db.query(Class)
    if current_user.role == RoleEnum.hod:
        hod = current_user.hod
        if hod:
            query = query.filter(Class.department_id == hod.department_id)
    elif department_id:
        query = query.filter(Class.department_id == department_id)
    return query.all()


@router.post("/", response_model=ClassOut)
def create_class(data: ClassCreate, db: Session = Depends(get_db), current_user=Depends(get_admin_user)):
    class_ = Class(**data.model_dump())
    db.add(class_)
    db.commit()
    db.refresh(class_)
    return class_


@router.put("/{class_id}", response_model=ClassOut)
def update_class(class_id: int, data: ClassCreate, db: Session = Depends(get_db), current_user=Depends(get_admin_user)):
    class_ = db.query(Class).filter(Class.id == class_id).first()
    if not class_:
        raise HTTPException(status_code=404, detail="Class not found")
    class_.department_id = data.department_id
    class_.year = data.year
    class_.section = data.section
    db.commit()
    db.refresh(class_)
    return class_


@router.delete("/{class_id}")
def delete_class(class_id: int, db: Session = Depends(get_db), current_user=Depends(get_admin_user)):
    class_ = db.query(Class).filter(Class.id == class_id).first()
    if not class_:
        raise HTTPException(status_code=404, detail="Class not found")
    db.delete(class_)
    db.commit()
    return {"message": "Class deleted"}
