from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional
from datetime import date
from app.database.session import get_db
from app.schemas.schemas import EventCreate, EventUpdate, EventOut, UploadResponse
from app.models.models import (
    Event, EventTarget, RoleEnum, HOD, Faculty, Student, Class,
    TargetTypeEnum, User
)
from app.auth.dependencies import get_current_user
from app.services.notification_service import (
    notify_event_created, notify_event_updated, notify_event_deleted
)
from app.services.upload_service import save_upload

router = APIRouter(prefix="/events", tags=["Events"])


def get_user_visible_event_ids(db: Session, user) -> List[int]:
    """Return event IDs visible to the current user."""
    ids = set()

    # College-wide events always visible
    college_targets = db.query(EventTarget).filter(
        EventTarget.target_type == TargetTypeEnum.COLLEGE
    ).all()
    ids.update(t.event_id for t in college_targets)

    if user.role == RoleEnum.admin:
        all_events = db.query(Event).all()
        return [e.id for e in all_events]

    elif user.role == RoleEnum.hod:
        hod = user.hod
        if hod:
            dept_targets = db.query(EventTarget).filter(
                EventTarget.target_type == TargetTypeEnum.DEPARTMENT,
                EventTarget.target_id == hod.department_id
            ).all()
            ids.update(t.event_id for t in dept_targets)
            class_ids = [c.id for c in db.query(Class).filter(Class.department_id == hod.department_id).all()]
            if class_ids:
                class_targets = db.query(EventTarget).filter(
                    EventTarget.target_type == TargetTypeEnum.CLASS,
                    EventTarget.target_id.in_(class_ids)
                ).all()
                ids.update(t.event_id for t in class_targets)

    elif user.role == RoleEnum.faculty:
        faculty = user.faculty
        if faculty:
            dept_targets = db.query(EventTarget).filter(
                EventTarget.target_type == TargetTypeEnum.DEPARTMENT,
                EventTarget.target_id == faculty.department_id
            ).all()
            ids.update(t.event_id for t in dept_targets)
            if faculty.class_id:
                class_targets = db.query(EventTarget).filter(
                    EventTarget.target_type == TargetTypeEnum.CLASS,
                    EventTarget.target_id == faculty.class_id
                ).all()
                ids.update(t.event_id for t in class_targets)

    elif user.role == RoleEnum.student:
        student = user.student
        if student:
            class_ = student.class_
            if class_:
                dept_targets = db.query(EventTarget).filter(
                    EventTarget.target_type == TargetTypeEnum.DEPARTMENT,
                    EventTarget.target_id == class_.department_id
                ).all()
                ids.update(t.event_id for t in dept_targets)
            class_targets = db.query(EventTarget).filter(
                EventTarget.target_type == TargetTypeEnum.CLASS,
                EventTarget.target_id == student.class_id
            ).all()
            ids.update(t.event_id for t in class_targets)

    return list(ids)


def enrich_event(event: Event, db: Session = None) -> dict:
    creator = event.creator
    if not creator and db is not None:
        creator = db.query(User).filter(User.id == event.created_by).first()
    creator_name = ""
    if creator:
        if creator.admin:
            creator_name = creator.admin.name
        elif creator.hod:
            creator_name = creator.hod.name
        elif creator.faculty:
            creator_name = creator.faculty.name

    return {
        "id": event.id,
        "title": event.title,
        "description": event.description,
        "event_date": event.event_date,
        "end_date": event.end_date,
        "start_time": event.start_time,
        "end_time": event.end_time,
        "venue": event.venue,
        "priority": event.priority,
        "attachment_url": event.attachment_url,
        "created_by": event.created_by,
        "created_at": event.created_at,
        "updated_at": event.updated_at,
        "targets": event.targets,
        "creator_name": creator_name,
    }


@router.post("/upload", response_model=UploadResponse)
async def upload_event_file(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
):
    if current_user.role == RoleEnum.student:
        raise HTTPException(403, "Students cannot upload event files")
    try:
        result = await save_upload(file)
        return result
    except ValueError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, f"Upload failed: {e}")


@router.get("/", response_model=List[EventOut])
def get_events(
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    event_ids = get_user_visible_event_ids(db, current_user)
    query = db.query(Event).options(
        joinedload(Event.creator).joinedload(User.admin),
        joinedload(Event.creator).joinedload(User.hod),
        joinedload(Event.creator).joinedload(User.faculty),
        joinedload(Event.targets)
    ).filter(Event.id.in_(event_ids))

    if start_date:
        query = query.filter(Event.event_date >= start_date)
    if end_date:
        query = query.filter(Event.event_date <= end_date)
    if search:
        query = query.filter(Event.title.ilike(f"%{search}%"))

    events = query.order_by(Event.event_date).all()
    return [enrich_event(e, db) for e in events]


@router.get("/{event_id}", response_model=EventOut)
def get_event(event_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    visible_ids = get_user_visible_event_ids(db, current_user)
    if event_id not in visible_ids:
        raise HTTPException(status_code=404, detail="Event not found")
    event = db.query(Event).filter(Event.id == event_id).first()
    return enrich_event(event, db)


@router.post("/", response_model=EventOut)
def create_event(data: EventCreate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    if current_user.role == RoleEnum.student:
        raise HTTPException(403, "Students cannot create events")

    # Validate role-based target permissions
    for t in data.targets:
        if t.target_type == TargetTypeEnum.COLLEGE and current_user.role != RoleEnum.admin:
            raise HTTPException(403, "Only admin can create college-wide events")
        if t.target_type == TargetTypeEnum.DEPARTMENT:
            if current_user.role == RoleEnum.faculty:
                raise HTTPException(403, "Faculty cannot create department events")
            if current_user.role == RoleEnum.hod:
                if current_user.hod and t.target_id != current_user.hod.department_id:
                    raise HTTPException(403, "HOD can only create events for their department")
        if t.target_type == TargetTypeEnum.CLASS:
            if current_user.role == RoleEnum.faculty:
                if current_user.faculty and t.target_id != current_user.faculty.class_id:
                    raise HTTPException(403, "Faculty can only create events for their assigned class")

    event = Event(
        title=data.title,
        description=data.description,
        event_date=data.event_date,
        end_date=data.end_date or data.event_date,
        start_time=data.start_time,
        end_time=data.end_time,
        venue=data.venue,
        priority=data.priority,
        attachment_url=data.attachment_url,
        created_by=current_user.id,
    )
    db.add(event)
    db.flush()

    for t in data.targets:
        target = EventTarget(event_id=event.id, target_type=t.target_type, target_id=t.target_id)
        db.add(target)

    db.commit()
    db.refresh(event)

    # Get creator name
    creator_name = ""
    if current_user.admin:
        creator_name = current_user.admin.name
    elif current_user.hod:
        creator_name = current_user.hod.name
    elif current_user.faculty:
        creator_name = current_user.faculty.name

    notify_event_created(db, event, creator_name)
    return enrich_event(event, db)


@router.put("/{event_id}", response_model=EventOut)
def update_event(event_id: int, data: EventUpdate, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(404, "Event not found")

    # Only creator or admin can edit
    if event.created_by != current_user.id and current_user.role != RoleEnum.admin:
        # HOD can edit department events
        if current_user.role == RoleEnum.hod:
            dept_targets = [t for t in event.targets if t.target_type == TargetTypeEnum.DEPARTMENT]
            if not dept_targets or (current_user.hod and dept_targets[0].target_id != current_user.hod.department_id):
                raise HTTPException(403, "Not authorized to edit this event")
        else:
            raise HTTPException(403, "Not authorized to edit this event")

    if data.title is not None:
        event.title = data.title
    if data.description is not None:
        event.description = data.description
    if data.event_date is not None:
        event.event_date = data.event_date
    if data.end_date is not None:
        event.end_date = data.end_date
    if data.start_time is not None:
        event.start_time = data.start_time
    if data.end_time is not None:
        event.end_time = data.end_time
    if data.venue is not None:
        event.venue = data.venue
    if data.priority is not None:
        event.priority = data.priority
    if data.attachment_url is not None:
        event.attachment_url = data.attachment_url

    db.commit()
    db.refresh(event)

    creator_name = ""
    if current_user.admin:
        creator_name = current_user.admin.name
    elif current_user.hod:
        creator_name = current_user.hod.name
    elif current_user.faculty:
        creator_name = current_user.faculty.name

    notify_event_updated(db, event, creator_name)
    return enrich_event(event, db)


@router.delete("/{event_id}")
def delete_event(event_id: int, db: Session = Depends(get_db), current_user=Depends(get_current_user)):
    event = db.query(Event).filter(Event.id == event_id).first()
    if not event:
        raise HTTPException(404, "Event not found")

    if event.created_by != current_user.id and current_user.role != RoleEnum.admin:
        if current_user.role == RoleEnum.hod:
            dept_targets = [t for t in event.targets if t.target_type == TargetTypeEnum.DEPARTMENT]
            if not dept_targets or (current_user.hod and dept_targets[0].target_id != current_user.hod.department_id):
                raise HTTPException(403, "Not authorized to delete this event")
        else:
            raise HTTPException(403, "Not authorized to delete this event")

    title = event.title
    targets_copy = list(event.targets)
    notify_event_deleted(db, title, targets_copy, current_user.id)
    db.delete(event)
    db.commit()
    return {"message": "Event deleted"}
