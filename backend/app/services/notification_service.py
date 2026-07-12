from sqlalchemy.orm import Session
from app.models.models import Notification, User, Student, Faculty, HOD, EventTarget, TargetTypeEnum, Class
from typing import List


def create_notification(db: Session, user_id: int, message: str):
    notif = Notification(user_id=user_id, message=message)
    db.add(notif)
    db.commit()


def get_target_user_ids(db: Session, targets: List[EventTarget]) -> List[int]:
    user_ids = set()
    for target in targets:
        if target.target_type == TargetTypeEnum.COLLEGE:
            users = db.query(User).filter(User.is_active == True).all()
            user_ids.update(u.id for u in users)
        elif target.target_type == TargetTypeEnum.DEPARTMENT:
            dept_id = target.target_id
            students = db.query(Student).join(Class).filter(
                Class.department_id == dept_id
            ).all()
            user_ids.update(s.user_id for s in students)
            faculty = db.query(Faculty).filter(Faculty.department_id == dept_id).all()
            user_ids.update(f.user_id for f in faculty)
            hod = db.query(HOD).filter(HOD.department_id == dept_id).first()
            if hod:
                user_ids.add(hod.user_id)
        elif target.target_type == TargetTypeEnum.CLASS:
            class_id = target.target_id
            students = db.query(Student).filter(Student.class_id == class_id).all()
            user_ids.update(s.user_id for s in students)
            faculty = db.query(Faculty).filter(Faculty.class_id == class_id).all()
            user_ids.update(f.user_id for f in faculty)
    return list(user_ids)


def notify_event_created(db: Session, event, creator_name: str):
    user_ids = get_target_user_ids(db, event.targets)
    msg = f"New event: '{event.title}' on {event.event_date} created by {creator_name}"
    for uid in user_ids:
        create_notification(db, uid, msg)


def notify_event_updated(db: Session, event, creator_name: str):
    user_ids = get_target_user_ids(db, event.targets)
    msg = f"Event updated: '{event.title}' on {event.event_date}"
    for uid in user_ids:
        create_notification(db, uid, msg)


def notify_event_deleted(db: Session, event_title: str, targets: List[EventTarget]):
    user_ids = get_target_user_ids(db, targets)
    msg = f"Event cancelled: '{event_title}'"
    for uid in user_ids:
        create_notification(db, uid, msg)


def send_reminder_notifications(db: Session):
    from datetime import date, timedelta
    from app.models.models import Event
    tomorrow = date.today() + timedelta(days=1)
    events = db.query(Event).filter(Event.event_date == tomorrow).all()
    for event in events:
        user_ids = get_target_user_ids(db, event.targets)
        msg = f"Reminder: '{event.title}' is tomorrow at {event.venue or 'TBA'}"
        for uid in user_ids:
            existing = db.query(Notification).filter(
                Notification.user_id == uid,
                Notification.message == msg
            ).first()
            if not existing:
                create_notification(db, uid, msg)
