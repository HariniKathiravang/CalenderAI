"""Seed script - creates initial admin, HOD, faculty, student users, class structures, and sample events."""
from app.database.session import SessionLocal, engine
from app.models.models import Base, User, Admin, HOD, Faculty, Student, Class, Department, Event, EventTarget, RoleEnum, TargetTypeEnum
from app.auth.security import get_password_hash
from datetime import date, time

DEPARTMENTS = [
    ("Computer Science and Engineering", "CSE"),
    ("Computer Science and Design", "CSD"),
    ("Cyber Security", "CYBER"),
    ("Artificial Intelligence & Data Science", "AI&DS"),
    ("Artificial Intelligence & Machine Learning", "AI&ML"),
    ("Information Technology", "IT"),
    ("Electronics and Communication Engineering", "ECE"),
    ("Electrical and Electronics Engineering", "EEE"),
    ("Electronics and Instrumentation Engineering", "EIE"),
    ("Mechanical Engineering", "MECH"),
    ("Civil Engineering", "CIVIL"),
    ("Automobile Engineering", "AUTO"),
    ("Biomedical Engineering", "BME"),
    ("Robotics and Automation", "R&A"),
    ("Master of Business Administration", "MBA"),
    ("Master of Computer Applications", "MCA"),
]

def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # 1. Create departments
        dept_map = {}
        for name, code in DEPARTMENTS:
            dept = db.query(Department).filter(Department.department_code == code).first()
            if not dept:
                dept = Department(department_name=name, department_code=code)
                db.add(dept)
                db.flush()
                print(f"Created department: {code}")
            dept_map[code] = dept
        db.commit()

        # 2. Create default admin
        admin_user = db.query(User).filter(User.username == "admin").first()
        if not admin_user:
            admin_user = User(
                username="admin",
                password_hash=get_password_hash("Admin@123"),
                role=RoleEnum.admin,
            )
            db.add(admin_user)
            db.flush()
            admin = Admin(user_id=admin_user.id, name="System Administrator")
            db.add(admin)
            db.commit()
            print("Created admin user: admin / Admin@123")
        else:
            print("Admin user already exists")

        # 3. Create Class: CSE III Year Sec A
        cse_dept = dept_map.get("CSE")
        cse_class = db.query(Class).filter(
            Class.department_id == cse_dept.id,
            Class.year == 3,
            Class.section == "A"
        ).first()
        if not cse_class:
            cse_class = Class(department_id=cse_dept.id, year=3, section="A")
            db.add(cse_class)
            db.flush()
            db.commit()
            print("Created class: CSE III Year - Sec A")
        else:
            print("Class already exists")

        # 4. Create default HOD
        hod_user = db.query(User).filter(User.username == "hod_cse").first()
        if not hod_user:
            hod_user = User(
                username="hod_cse",
                password_hash=get_password_hash("HOD@123"),
                role=RoleEnum.hod,
            )
            db.add(hod_user)
            db.flush()
            hod = HOD(
                user_id=hod_user.id,
                employee_id="hod",
                name="Dr. Sarah D'Souza",
                email="hod.cse@eec.edu",
                mobile_number="+91 94440 98765",
                department_id=cse_dept.id
            )
            db.add(hod)
            db.commit()
            print("Created HOD user: hod / HOD@123")
        else:
            print("HOD user already exists")

        # 5. Create default Faculty
        fac_user = db.query(User).filter(User.username == "faculty_cse").first()
        if not fac_user:
            fac_user = User(
                username="faculty_cse",
                password_hash=get_password_hash("Faculty@123"),
                role=RoleEnum.faculty,
            )
            db.add(fac_user)
            db.flush()
            faculty = Faculty(
                user_id=fac_user.id,
                employee_id="faculty",
                name="Prof. Rajesh Pillai",
                email="rajesh.pillai@eec.edu",
                mobile_number="+91 98840 55443",
                department_id=cse_dept.id,
                class_id=cse_class.id,
                designation="Assistant Professor"
            )
            db.add(faculty)
            db.commit()
            print("Created Faculty user: faculty / Faculty@123")
        else:
            print("Faculty user already exists")

        # 6. Create default Student
        stud_user = db.query(User).filter(User.username == "student_cse").first()
        if not stud_user:
            stud_user = User(
                username="student_cse",
                password_hash=get_password_hash("Student@123"),
                role=RoleEnum.student,
            )
            db.add(stud_user)
            db.flush()
            student = Student(
                user_id=stud_user.id,
                registration_number="student",
                name="Amit Sharma",
                email="amit.sharma23@student.eec.edu",
                mobile_number="+91 81220 99887",
                class_id=cse_class.id
            )
            db.add(student)
            db.commit()
            print("Created Student user: student / Student@123")
        else:
            print("Student user already exists")

        # 7. Seed sample events
        existing_events = db.query(Event).all()
        if len(existing_events) == 0:
            # 7a. College Event (Visible to all)
            evt1 = Event(
                title="Placement Drive: Cognizant",
                description="Campus recruitment drive by Cognizant for all final year B.E/B.Tech, MCA, and MBA students.",
                event_date=date(2026, 7, 10),
                start_time=time(9, 0),
                end_time=time(17, 0),
                venue="Main Auditorium",
                created_by=admin_user.id
            )
            db.add(evt1)
            db.flush()
            db.add(EventTarget(event_id=evt1.id, target_type=TargetTypeEnum.COLLEGE))

            # 7b. Department Event (CSE Department)
            evt2 = Event(
                title="AI Workshop: Hands-on Deep Learning",
                description="A 2-day practical workshop on building deep learning models using PyTorch. Organized by the Department of CSE.",
                event_date=date(2026, 7, 11),
                start_time=time(9, 30),
                end_time=time(16, 30),
                venue="CSE Lab 4",
                created_by=hod_user.id
            )
            db.add(evt2)
            db.flush()
            db.add(EventTarget(event_id=evt2.id, target_type=TargetTypeEnum.DEPARTMENT, target_id=cse_dept.id))

            # 7c. Class Event (CSE III Year - Sec A)
            evt3 = Event(
                title="Internal Assessment I - Data Structures",
                description="Unit 1 & Unit 2 portions. Duration: 1.5 Hours. Classroom seating plan will be posted on the notice board.",
                event_date=date(2026, 7, 13),
                start_time=time(10, 0),
                end_time=time(11, 30),
                venue="Classrooms 301 - 304",
                created_by=fac_user.id
            )
            db.add(evt3)
            db.flush()
            db.add(EventTarget(event_id=evt3.id, target_type=TargetTypeEnum.CLASS, target_id=cse_class.id))

            db.commit()
            print("Created 3 initial events (College, Department, Class)")
        else:
            print("Events already seeded")

    finally:
        db.close()

if __name__ == "__main__":
    seed()
