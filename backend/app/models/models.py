from sqlalchemy import (
    Column, Integer, String, Boolean, DateTime, ForeignKey,
    Text, Date, Time, Enum as SAEnum
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from app.database.session import Base


class RoleEnum(str, enum.Enum):
    admin = "admin"
    hod = "hod"
    faculty = "faculty"
    student = "student"


class TargetTypeEnum(str, enum.Enum):
    COLLEGE = "COLLEGE"
    DEPARTMENT = "DEPARTMENT"
    CLASS = "CLASS"


class PriorityEnum(str, enum.Enum):
    HIGH = "HIGH"       # Exams, critical deadlines — Red
    MEDIUM = "MEDIUM"   # Mid-priority — Yellow
    STANDARD = "STANDARD"  # Regular events — Blue


class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(SAEnum(RoleEnum), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    admin = relationship("Admin", back_populates="user", uselist=False)
    faculty = relationship("Faculty", back_populates="user", uselist=False)
    hod = relationship("HOD", back_populates="user", uselist=False)
    student = relationship("Student", back_populates="user", uselist=False)
    events_created = relationship("Event", back_populates="creator")
    notifications = relationship("Notification", back_populates="user")


class Department(Base):
    __tablename__ = "departments"
    id = Column(Integer, primary_key=True, index=True)
    department_name = Column(String(100), nullable=False)
    department_code = Column(String(20), unique=True, nullable=False, index=True)

    classes = relationship("Class", back_populates="department")
    faculty = relationship("Faculty", back_populates="department")
    hod = relationship("HOD", back_populates="department", uselist=False)


class Class(Base):
    __tablename__ = "classes"
    id = Column(Integer, primary_key=True, index=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    year = Column(Integer, nullable=False)
    section = Column(String(10), nullable=False)

    department = relationship("Department", back_populates="classes")
    students = relationship("Student", back_populates="class_")
    faculty_assigned = relationship("Faculty", back_populates="assigned_class")


class Admin(Base):
    __tablename__ = "admins"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    name = Column(String(100), nullable=False)

    user = relationship("User", back_populates="admin")


class HOD(Base):
    __tablename__ = "hods"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    employee_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=True)
    mobile_number = Column(String(15), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)

    user = relationship("User", back_populates="hod")
    department = relationship("Department", back_populates="hod")


class Faculty(Base):
    __tablename__ = "faculty"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    employee_id = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=True)
    mobile_number = Column(String(15), nullable=True)
    department_id = Column(Integer, ForeignKey("departments.id"), nullable=False)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    designation = Column(String(100), nullable=True)

    user = relationship("User", back_populates="faculty")
    department = relationship("Department", back_populates="faculty")
    assigned_class = relationship("Class", back_populates="faculty_assigned")


class Student(Base):
    __tablename__ = "students"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True)
    registration_number = Column(String(50), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), nullable=True)
    mobile_number = Column(String(15), nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=False)

    user = relationship("User", back_populates="student")
    class_ = relationship("Class", back_populates="students")


class Event(Base):
    __tablename__ = "events"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    event_date = Column(Date, nullable=False)
    end_date = Column(Date, nullable=True)
    start_time = Column(Time, nullable=True)
    end_time = Column(Time, nullable=True)
    venue = Column(String(255), nullable=True)
    priority = Column(SAEnum(PriorityEnum), default=PriorityEnum.STANDARD, nullable=False)
    attachment_url = Column(String(500), nullable=True)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    creator = relationship("User", back_populates="events_created")
    targets = relationship("EventTarget", back_populates="event", cascade="all, delete-orphan")


class EventTarget(Base):
    __tablename__ = "event_targets"
    id = Column(Integer, primary_key=True, index=True)
    event_id = Column(Integer, ForeignKey("events.id"), nullable=False)
    target_type = Column(SAEnum(TargetTypeEnum), nullable=False)
    target_id = Column(Integer, nullable=True)

    event = relationship("Event", back_populates="targets")


class Notification(Base):
    __tablename__ = "notifications"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="notifications")
