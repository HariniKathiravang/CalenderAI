from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from datetime import date
from app.database.session import get_db
from app.models.models import (
    Department, Faculty, Student, Event, HOD, Class, User,
    EventTarget, TargetTypeEnum, RoleEnum
)
from app.auth.dependencies import get_current_user, get_admin_user, get_hod_user, require_role

router = APIRouter(prefix="/stats", tags=["Stats"])


@router.get("/admin")
def admin_stats(db: Session = Depends(get_db), current_user=Depends(get_admin_user)):
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
def hod_stats(db: Session = Depends(get_db), current_user=Depends(get_hod_user)):
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
def faculty_stats(db: Session = Depends(get_db), current_user=Depends(require_role(RoleEnum.faculty, RoleEnum.admin, RoleEnum.hod))):
    today = date.today()
    faculty = current_user.faculty
    if not faculty:
        return {}

    # 1. Fetch college-wide and department event targets in batch
    college_ids = [t.event_id for t in db.query(EventTarget).filter(
        EventTarget.target_type == TargetTypeEnum.COLLEGE
    ).all()]
    dept_ids = [t.event_id for t in db.query(EventTarget).filter(
        EventTarget.target_type == TargetTypeEnum.DEPARTMENT,
        EventTarget.target_id == faculty.department_id
    ).all()]

    class_event_ids = []
    if faculty.class_id:
        class_event_ids = [t.event_id for t in db.query(EventTarget).filter(
            EventTarget.target_type == TargetTypeEnum.CLASS,
            EventTarget.target_id == faculty.class_id
        ).all()]

    all_ids = list(set(class_event_ids + college_ids + dept_ids))
    
    # 2. Load all upcoming event IDs in a single query
    upcoming_events = db.query(Event.id).filter(Event.event_date >= today).all()
    upcoming_event_ids = {e[0] for e in upcoming_events}
    
    upcoming = sum(1 for eid in all_ids if eid in upcoming_event_ids)

    # 3. Get all classes in department
    classes = db.query(Class).filter(Class.department_id == faculty.department_id).all()
    class_ids = [c.id for c in classes]

    # 4. Batch query student counts per class using group_by
    from sqlalchemy import func
    student_counts = {}
    if class_ids:
        sc_results = db.query(Student.class_id, func.count(Student.id))\
            .filter(Student.class_id.in_(class_ids))\
            .group_by(Student.class_id).all()
        student_counts = {class_id: count for class_id, count in sc_results}

    student_count = student_counts.get(faculty.class_id, 0) if faculty.class_id else 0

    # 5. Batch query ALL class event targets in department in one query
    class_event_map = {}
    if class_ids:
        class_targets = db.query(EventTarget).filter(
            EventTarget.target_type == TargetTypeEnum.CLASS,
            EventTarget.target_id.in_(class_ids)
        ).all()
        for t in class_targets:
            class_event_map.setdefault(t.target_id, []).append(t.event_id)

    # 6. Build response using in-memory calculations
    assigned_classes = []
    for c in classes:
        sc = student_counts.get(c.id, 0)
        c_event_ids = class_event_map.get(c.id, [])
        c_all_ids = list(set(c_event_ids + college_ids + dept_ids))
        c_upcoming = sum(1 for eid in c_all_ids if eid in upcoming_event_ids)

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

