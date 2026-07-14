from pydantic import BaseModel
from typing import Optional, List
from datetime import date, time, datetime
from app.models.models import RoleEnum, TargetTypeEnum, PriorityEnum


# Auth schemas
class LoginRequest(BaseModel):
    identifier: str
    password: str
    role: RoleEnum


class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: int
    name: str


# User schemas
class UserBase(BaseModel):
    username: str
    role: RoleEnum


class UserCreate(UserBase):
    password: str


class UserOut(UserBase):
    id: int
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Department schemas
class DepartmentCreate(BaseModel):
    department_name: str
    department_code: str


class DepartmentOut(DepartmentCreate):
    id: int

    class Config:
        from_attributes = True


# Class schemas
class ClassCreate(BaseModel):
    department_id: int
    year: int
    section: str


class ClassOut(ClassCreate):
    id: int
    department: Optional[DepartmentOut] = None

    class Config:
        from_attributes = True


# Admin schemas
class AdminCreate(BaseModel):
    username: str
    password: str
    name: str


class AdminOut(BaseModel):
    id: int
    name: str
    user: UserOut

    class Config:
        from_attributes = True


# HOD schemas
class HODCreate(BaseModel):
    username: str
    password: str
    employee_id: str
    name: str
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    department_id: int


class HODOut(BaseModel):
    id: int
    employee_id: str
    name: str
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    department_id: int
    department: Optional[DepartmentOut] = None
    user: UserOut

    class Config:
        from_attributes = True


class HODUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    department_id: Optional[int] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


# Faculty schemas
class FacultyCreate(BaseModel):
    username: str
    password: str
    employee_id: str
    name: str
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    department_id: Optional[int] = None
    class_id: Optional[int] = None
    designation: Optional[str] = None


class FacultyOut(BaseModel):
    id: int
    employee_id: str
    name: str
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    department_id: int
    class_id: Optional[int] = None
    designation: Optional[str] = None
    department: Optional[DepartmentOut] = None
    assigned_class: Optional[ClassOut] = None
    user: UserOut

    class Config:
        from_attributes = True


class FacultyUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    department_id: Optional[int] = None
    class_id: Optional[int] = None
    designation: Optional[str] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


# Student schemas
class StudentCreate(BaseModel):
    username: str
    password: str
    registration_number: str
    name: str
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    class_id: Optional[int] = None


class StudentOut(BaseModel):
    id: int
    registration_number: str
    name: str
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    class_id: int
    class_: Optional[ClassOut] = None
    user: UserOut

    class Config:
        from_attributes = True


class StudentUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    mobile_number: Optional[str] = None
    class_id: Optional[int] = None
    password: Optional[str] = None
    is_active: Optional[bool] = None


# Event schemas
class EventTargetCreate(BaseModel):
    target_type: TargetTypeEnum
    target_id: Optional[int] = None


class EventCreate(BaseModel):
    title: str
    description: Optional[str] = None
    event_date: date
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    venue: Optional[str] = None
    priority: PriorityEnum = PriorityEnum.STANDARD
    attachment_url: Optional[str] = None
    targets: List[EventTargetCreate]


class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    event_date: Optional[date] = None
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    venue: Optional[str] = None
    priority: Optional[PriorityEnum] = None
    attachment_url: Optional[str] = None


class EventTargetOut(BaseModel):
    id: int
    target_type: TargetTypeEnum
    target_id: Optional[int] = None

    class Config:
        from_attributes = True


class EventOut(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    event_date: date
    end_date: Optional[date] = None
    start_time: Optional[time] = None
    end_time: Optional[time] = None
    venue: Optional[str] = None
    priority: PriorityEnum = PriorityEnum.STANDARD
    attachment_url: Optional[str] = None
    created_by: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    targets: List[EventTargetOut] = []
    creator_name: Optional[str] = None

    class Config:
        from_attributes = True


# Notification schemas
class NotificationOut(BaseModel):
    id: int
    user_id: int
    message: str
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True


# Stats schemas
class AdminStats(BaseModel):
    total_departments: int
    total_faculty: int
    total_students: int
    total_events: int
    total_hods: int


class HODStats(BaseModel):
    department_name: str
    total_classes: int
    total_faculty: int
    total_students: int
    upcoming_events: int


class ClassSummary(BaseModel):
    id: int
    year: int
    section: str
    department_code: str
    department_name: str
    student_count: int
    upcoming_events: int
    is_assigned: bool


class FacultyStats(BaseModel):
    class_id: Optional[int] = None
    department_id: Optional[int] = None
    student_count: int = 0
    upcoming_events: int = 0
    assigned_classes: List[ClassSummary] = []


class BulkImportResult(BaseModel):
    imported: int
    failed: int
    errors: List[str] = []


class UploadResponse(BaseModel):
    file_url: str
    filename: str
    parsed_metadata: Optional[dict] = None
