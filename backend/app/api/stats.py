from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from app.database.session import get_db
from app.models.models import (
    Department, Faculty, Student, Event, HOD, Class, User,
    EventTarget, TargetTypeEnum, RoleEnum
)
from app.auth.dependencies import get_current_user

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/admin")
def admin_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    today = date.today()
    return {
        "total_departments": db.query(Department).count(),
        "total_hods": db.query(HOD).count(),
        "total_faculty": db.query(Faculty).count(),
        "total_students": db.query(Student).count(),
        "total_events": db.query(Event).count(),
        "upcoming_events": db.query(Event).filter(Event.event_date >= today).count(),
        "total_classes": db.query(Class).count(),
    }


@router.get("/hod")
def hod_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    today = date.today()
    hod = current_user.hod
    if not hod:
        return {}
    dept_id = hod.department_id
    dept = db.query(Department).filter(Department.id == dept_id).first()
    class_ids = [c.id for c in db.query(Class).filter(Class.department_id == dept_id).all()]

    # Upcoming events for department
    dept_event_ids = [t.event_id for t in db.query(EventTarget).filter(
        EventTarget.target_type == TargetTypeEnum.DEPARTMENT,
        EventTarget.target_id == dept_id
    ).all()]
    college_event_ids = [t.event_id for t in db.query(EventTarget).filter(
        EventTarget.target_type == TargetTypeEnum.COLLEGE
    ).all()]
    all_event_ids = list(set(dept_event_ids + college_event_ids))
    upcoming = db.query(Event).filter(
        Event.id.in_(all_event_ids),
        Event.event_date >= today
    ).count()

    return {
        "department_name": dept.department_name if dept else "",
        "total_classes": len(class_ids),
        "total_faculty": db.query(Faculty).filter(Faculty.department_id == dept_id).count(),
        "total_students": db.query(Student).filter(Student.class_id.in_(class_ids)).count() if class_ids else 0,
        "upcoming_events": upcoming,
    }


@router.get("/faculty")
def faculty_stats(db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    today = date.today()
    faculty = current_user.faculty
    if not faculty:
        return {}

    class_event_ids = []
    if faculty.class_id:
        class_event_ids = [t.event_id for t in db.query(EventTarget).filter(
            EventTarget.target_type == TargetTypeEnum.CLASS,
            EventTarget.target_id == faculty.class_id
        ).all()]

    college_ids = [t.event_id for t in db.query(EventTarget).filter(
        EventTarget.target_type == TargetTypeEnum.COLLEGE
    ).all()]
    dept_ids = [t.event_id for t in db.query(EventTarget).filter(
        EventTarget.target_type == TargetTypeEnum.DEPARTMENT,
        EventTarget.target_id == faculty.department_id
    ).all()]

    all_ids = list(set(class_event_ids + college_ids + dept_ids))
    upcoming = db.query(Event).filter(
        Event.id.in_(all_ids),
        Event.event_date >= today
    ).count() if all_ids else 0

    student_count = db.query(Student).filter(Student.class_id == faculty.class_id).count() if faculty.class_id else 0

    classes = db.query(Class).filter(Class.department_id == faculty.department_id).all()
    assigned_classes = []
    for c in classes:
        sc = db.query(Student).filter(Student.class_id == c.id).count()
        c_event_ids = [t.event_id for t in db.query(EventTarget).filter(
            EventTarget.target_type == TargetTypeEnum.CLASS,
            EventTarget.target_id == c.id
        ).all()]
        c_all_ids = list(set(c_event_ids + college_ids + dept_ids))
        c_upcoming = db.query(Event).filter(
            Event.id.in_(c_all_ids),
            Event.event_date >= today
        ).count() if c_all_ids else 0

        assigned_classes.append({
            "id": c.id,
            "year": c.year,
            "section": c.section,
            "department_code": c.department.department_code,
            "department_name": c.department.department_name,
            "student_count": sc,
            "upcoming_events": c_upcoming,
            "is_assigned": c.id == faculty.class_id
        })

    return {
        "class_id": faculty.class_id,
        "department_id": faculty.department_id,
        "student_count": student_count,
        "upcoming_events": upcoming,
        "assigned_classes": assigned_classes,
    }

