from anyio import current_time
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from face_utils import (
    recognize_attendance_session,
    capture_student_faces,
    train_face_model
)
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from models import db, User, Student, TeacherAssignment, Attendance
from datetime import timedelta
import csv
from io import StringIO
from flask import Response
from sqlalchemy import text


app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = "faceattend_pro_secret_key"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

CORS(app, supports_credentials=True, resources={
    r"/*": {
        "origins": [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5174",
            "http://127.0.0.1:5174"
        ]
    }
})

db.init_app(app)
jwt = JWTManager(app)


def create_default_admin():
    admin = User.query.filter_by(username="admin", role="admin").first()

    if not admin:
        admin = User(
            role="admin",
            name="Administrator",
            email="admin@faceattend.com",
            username="admin",
            department="Administration"
        )
        admin.set_password("admin123")

        db.session.add(admin)
        db.session.commit()

        print("Default admin created: admin / admin123")


@app.route("/")
def home():
    return jsonify({
        "message": "FaceAttend-Pro Backend API is running"
    })


@app.route("/api/setup", methods=["GET"])
def setup_database():
    db.create_all()
    create_default_admin()

    return jsonify({
        "success": True,
        "message": "Database setup completed successfully."
    })

@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json()

    if not data:
        return jsonify({
            "success": False,
            "message": "Invalid request."
        }), 400

    role = data.get("role", "").strip().lower()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()

    if not role or not username or not password:
        return jsonify({
            "success": False,
            "message": "Role, username, and password are required."
        }), 400

    # STUDENT LOGIN
    if role == "student":
        student = Student.query.filter_by(student_id=username).first()

        if not student:
            return jsonify({
                "success": False,
                "message": "Student ID not found."
            }), 401

        if not student.password_hash:
            return jsonify({
                "success": False,
                "message": "Student password is not set. Please reset student passwords."
            }), 401

        if not student.check_password(password):
            return jsonify({
                "success": False,
                "message": "Invalid student password."
            }), 401

        access_token = create_access_token(
            identity=str(student.id),
            additional_claims={
                "role": "student",
                "student_id": student.student_id,
                "name": student.name
            }
        )

        return jsonify({
            "success": True,
            "message": "Student login successful.",
            "token": access_token,
            "user": {
                "id": student.id,
                "role": "student",
                "name": student.name,
                "username": student.student_id,
                "student_id": student.student_id,
                "branch": student.branch,
                "section": student.section,
                "email": student.email,
                "phone": student.phone
            }
        }), 200

    # ADMIN / TEACHER LOGIN
    user = User.query.filter_by(username=username, role=role).first()

    if not user or not user.check_password(password):
        return jsonify({
            "success": False,
            "message": "Invalid username or password."
        }), 401

    access_token = create_access_token(
        identity=str(user.id),
        additional_claims={
            "role": user.role,
            "username": user.username,
            "name": user.name
        }
    )

    return jsonify({
        "success": True,
        "message": "Login successful.",
        "token": access_token,
        "user": {
            "id": user.id,
            "role": user.role,
            "name": user.name,
            "username": user.username,
            "email": user.email,
            "department": user.department
        }
    }), 200

@app.route("/api/me", methods=["GET"])
@jwt_required()
def me():
    user_id = get_jwt_identity()
    claims = get_jwt()

    user = User.query.get(user_id)

    if not user:
        return jsonify({
            "success": False,
            "message": "User not found."
        }), 404

    return jsonify({
        "success": True,
        "user": {
            "id": user.id,
            "role": claims.get("role"),
            "name": user.name,
            "username": user.username,
            "email": user.email,
            "department": user.department
        }
    }), 200

@app.route("/api/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")

    if role == "admin":
        total_students = Student.query.count()
        total_teachers = User.query.filter_by(role="teacher").count()
        total_assignments = TeacherAssignment.query.count()
        total_attendance = Attendance.query.count()

        present_today = Attendance.query.filter_by(
            date=today,
            status="Present"
        ).count()

        absent_today = Attendance.query.filter_by(
            date=today,
            status="Absent"
        ).count()

        recent_records = Attendance.query.order_by(
            Attendance.id.desc()
        ).limit(8).all()

        recent_attendance = []

        for record in recent_records:
            student = Student.query.filter_by(
                student_id=record.student_id
            ).first()

            teacher = User.query.get(record.teacher_id)

            recent_attendance.append({
                "id": record.id,
                "student_name": student.name if student else "Unknown",
                "student_id": record.student_id,
                "subject": record.subject,
                "lecture_no": record.lecture_no,
                "date": record.date,
                "time": record.time,
                "status": record.status,
                "teacher_name": teacher.name if teacher else "-"
            })

        return jsonify({
            "success": True,
            "role": "admin",
            "cards": {
                "total_students": total_students,
                "total_teachers": total_teachers,
                "total_assignments": total_assignments,
                "total_attendance": total_attendance,
                "present_today": present_today,
                "absent_today": absent_today,
                "recent_count": len(recent_attendance)
            },
            "recent_attendance": recent_attendance
        }), 200

    elif role == "teacher":
        assigned_classes = TeacherAssignment.query.filter_by(
            teacher_id=user_id
        ).count()

        assignments = TeacherAssignment.query.filter_by(
            teacher_id=user_id
        ).all()

        assigned_students_set = set()

        for assignment in assignments:
            students = Student.query.filter_by(
                branch=assignment.branch,
                section=assignment.section
            ).all()

            for student in students:
                assigned_students_set.add(student.student_id)

        total_attendance = Attendance.query.filter_by(
            teacher_id=user_id
        ).count()

        present_today = Attendance.query.filter_by(
            teacher_id=user_id,
            date=today,
            status="Present"
        ).count()

        absent_today = Attendance.query.filter_by(
            teacher_id=user_id,
            date=today,
            status="Absent"
        ).count()

        recent_records = Attendance.query.filter_by(
            teacher_id=user_id
        ).order_by(Attendance.id.desc()).limit(8).all()

        recent_attendance = []

        for record in recent_records:
            student = Student.query.filter_by(
                student_id=record.student_id
            ).first()

            recent_attendance.append({
                "id": record.id,
                "student_name": student.name if student else "Unknown",
                "student_id": record.student_id,
                "subject": record.subject,
                "lecture_no": record.lecture_no,
                "date": record.date,
                "time": record.time,
                "status": record.status
            })

        return jsonify({
            "success": True,
            "role": "teacher",
            "cards": {
                "assigned_classes": assigned_classes,
                "assigned_students": len(assigned_students_set),
                "total_attendance": total_attendance,
                "present_today": present_today,
                "absent_today": absent_today,
                "recent_count": len(recent_attendance)
            },
            "recent_attendance": recent_attendance
        }), 200

    return jsonify({
        "success": False,
        "message": "Invalid role."
    }), 403


@app.route("/api/teachers", methods=["POST"])
@jwt_required()
def add_teacher():
    if not require_admin():
        return jsonify({
            "success": False,
            "message": "Admin access required."
        }), 403

    data = request.get_json()

    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    username = data.get("username", "").strip()
    password = data.get("password", "").strip()
    department = data.get("department", "").strip()

    if not name or not email or not username or not password:
        return jsonify({
            "success": False,
            "message": "Name, email, username, and password are required."
        }), 400

    existing_user = User.query.filter(
        (User.email == email) | (User.username == username)
    ).first()

    if existing_user:
        return jsonify({
            "success": False,
            "message": "Email or username already exists."
        }), 409

    teacher = User(
        role="teacher",
        name=name,
        email=email,
        username=username,
        department=department
    )

    teacher.set_password(password)

    db.session.add(teacher)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Teacher added successfully.",
        "teacher": {
            "id": teacher.id,
            "name": teacher.name,
            "email": teacher.email,
            "username": teacher.username,
            "department": teacher.department
        }
    }), 201


@app.route("/api/teachers/<int:teacher_id>", methods=["DELETE"])
@jwt_required()
def delete_teacher(teacher_id):
    if not require_admin():
        return jsonify({
            "success": False,
            "message": "Admin access required."
        }), 403

    teacher = User.query.filter_by(id=teacher_id, role="teacher").first()

    if not teacher:
        return jsonify({
            "success": False,
            "message": "Teacher not found."
        }), 404

    TeacherAssignment.query.filter_by(teacher_id=teacher.id).delete()

    db.session.delete(teacher)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Teacher deleted successfully."
    }), 200

@app.route("/api/assignments", methods=["GET"])
@jwt_required()
def get_assignments():
    if not require_admin():
        return jsonify({
            "success": False,
            "message": "Admin access required."
        }), 403

    assignments = TeacherAssignment.query.order_by(TeacherAssignment.id.desc()).all()

    assignment_list = []

    for assignment in assignments:
        teacher = User.query.get(assignment.teacher_id)

        assignment_list.append({
            "id": assignment.id,
            "teacher_id": assignment.teacher_id,
            "teacher_name": teacher.name if teacher else "Unknown",
            "teacher_username": teacher.username if teacher else "-",
            "subject": assignment.subject,
            "branch": assignment.branch,
            "section": assignment.section
        })

    return jsonify({
        "success": True,
        "assignments": assignment_list
    }), 200


@app.route("/api/assignments", methods=["POST"])
@jwt_required()
def add_assignment():
    if not require_admin():
        return jsonify({
            "success": False,
            "message": "Admin access required."
        }), 403

    data = request.get_json()

    teacher_id = data.get("teacher_id")
    subject = data.get("subject", "").strip()
    branch = data.get("branch", "").strip()
    section = data.get("section", "").strip()

    if not teacher_id or not subject or not branch or not section:
        return jsonify({
            "success": False,
            "message": "Teacher, subject, branch, and section are required."
        }), 400

    teacher = User.query.filter_by(id=teacher_id, role="teacher").first()

    if not teacher:
        return jsonify({
            "success": False,
            "message": "Teacher not found."
        }), 404

    existing_assignment = TeacherAssignment.query.filter_by(
        teacher_id=teacher_id,
        subject=subject,
        branch=branch,
        section=section
    ).first()

    if existing_assignment:
        return jsonify({
            "success": False,
            "message": "This class is already assigned to this teacher."
        }), 409

    assignment = TeacherAssignment(
        teacher_id=teacher_id,
        subject=subject,
        branch=branch,
        section=section
    )

    db.session.add(assignment)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Class assigned successfully.",
        "assignment": {
            "id": assignment.id,
            "teacher_id": assignment.teacher_id,
            "subject": assignment.subject,
            "branch": assignment.branch,
            "section": assignment.section
        }
    }), 201


@app.route("/api/assignments/<int:assignment_id>", methods=["DELETE"])
@jwt_required()
def delete_assignment(assignment_id):
    if not require_admin():
        return jsonify({
            "success": False,
            "message": "Admin access required."
        }), 403

    assignment = TeacherAssignment.query.get(assignment_id)

    if not assignment:
        return jsonify({
            "success": False,
            "message": "Assignment not found."
        }), 404

    db.session.delete(assignment)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Assignment deleted successfully."
    }), 200

@app.route("/api/students", methods=["GET"])
@jwt_required()
def get_students():
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    if role == "admin":
        students = Student.query.order_by(Student.id.desc()).all()

    elif role == "teacher":
        assignments = TeacherAssignment.query.filter_by(teacher_id=user_id).all()

        allowed_classes = set()

        for assignment in assignments:
            allowed_classes.add((
                assignment.branch.strip().lower(),
                assignment.section.strip().lower()
            ))

        all_students = Student.query.order_by(Student.id.desc()).all()

        students = []

        for student in all_students:
            student_class = (
                student.branch.strip().lower(),
                student.section.strip().lower()
            )

            if student_class in allowed_classes:
                students.append(student)

    else:
        return jsonify({
            "success": False,
            "message": "Invalid role."
        }), 403

    student_list = []

    for student in students:
        regular_total = Attendance.query.filter_by(
            student_id=student.student_id,
            is_extra_class=False
        ).count()

        regular_present = Attendance.query.filter_by(
            student_id=student.student_id,
            status="Present",
            is_extra_class=False
        ).count()

        extra_present = Attendance.query.filter_by(
            student_id=student.student_id,
            status="Present",
            is_extra_class=True
        ).count()

        present_count = regular_present + extra_present
        total_count = regular_total
        absent_count = regular_total - regular_present

        attendance_percentage = (
            round((present_count / total_count) * 100, 2)
            if total_count > 0
            else 0
        )

        if attendance_percentage > 100:
            attendance_percentage = 100

        student_list.append({
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "branch": student.branch,
            "section": student.section,
            "email": student.email,
            "phone": student.phone,
            "present_count": present_count,
            "absent_count": absent_count,
            "total_count": total_count,
            "attendance_percentage": attendance_percentage
        })

    return jsonify({
        "success": True,
        "students": student_list
    }), 200


@app.route("/api/students", methods=["POST"])
@jwt_required()
def add_student():
    if not require_admin():
        return jsonify({
            "success": False,
            "message": "Admin access required."
        }), 403

    data = request.get_json()

    student_id = data.get("student_id", "").strip()
    name = data.get("name", "").strip()
    branch = data.get("branch", "").strip()
    section = data.get("section", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()

    if not student_id or not name or not branch or not section:
        return jsonify({
            "success": False,
            "message": "Student ID, name, branch, and section are required."
        }), 400

    existing_student = Student.query.filter_by(student_id=student_id).first()

    if existing_student:
        return jsonify({
            "success": False,
            "message": "Student ID already exists."
        }), 409

    student = Student(
        student_id=student_id,
        name=name,
        branch=branch,
        section=section,
        email=email,
        phone=phone
    )

    student.set_password(student_id)

    db.session.add(student)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Student added successfully.",
        "student": {
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "branch": student.branch,
            "section": student.section,
            "email": student.email,
            "phone": student.phone
        }
    }), 201


@app.route("/api/students/<int:id>", methods=["DELETE"])
@jwt_required()
def delete_student(id):
    if not require_admin():
        return jsonify({
            "success": False,
            "message": "Admin access required."
        }), 403

    student = Student.query.get(id)

    if not student:
        return jsonify({
            "success": False,
            "message": "Student not found."
        }), 404

    Attendance.query.filter_by(student_id=student.student_id).delete()

    db.session.delete(student)
    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Student deleted successfully."
    }), 200

@app.route("/api/my-assignments", methods=["GET"])
@jwt_required()
def get_my_assignments():
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    if role != "teacher":
        return jsonify({
            "success": False,
            "message": "Teacher access required."
        }), 403

    assignments = TeacherAssignment.query.filter_by(
        teacher_id=user_id
    ).order_by(TeacherAssignment.id.desc()).all()

    assignment_list = []

    for assignment in assignments:
        student_count = Student.query.filter_by(
            branch=assignment.branch,
            section=assignment.section
        ).count()

        assignment_list.append({
            "id": assignment.id,
            "subject": assignment.subject,
            "branch": assignment.branch,
            "section": assignment.section,
            "student_count": student_count
        })

    return jsonify({
        "success": True,
        "assignments": assignment_list
    }), 200

@app.route("/api/take-attendance/classes", methods=["GET"])
@jwt_required()
def get_take_attendance_classes():
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    if role == "teacher":
        assignments = TeacherAssignment.query.filter_by(
            teacher_id=user_id
        ).order_by(TeacherAssignment.id.desc()).all()

    elif role == "admin":
        assignments = TeacherAssignment.query.order_by(
            TeacherAssignment.id.desc()
        ).all()

    else:
        return jsonify({
            "success": False,
            "message": "Invalid role."
        }), 403

    class_list = []

    for assignment in assignments:
        teacher = User.query.get(assignment.teacher_id)

        student_count = Student.query.filter_by(
            branch=assignment.branch,
            section=assignment.section
        ).count()

        class_list.append({
            "assignment_id": assignment.id,
            "teacher_id": assignment.teacher_id,
            "teacher_name": teacher.name if teacher else "Unknown",
            "subject": assignment.subject,
            "branch": assignment.branch,
            "section": assignment.section,
            "student_count": student_count
        })

    return jsonify({
        "success": True,
        "classes": class_list
    }), 200

@app.route("/api/start-attendance", methods=["POST"])
@jwt_required()
def start_attendance():
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    data = request.get_json()

    assignment_id = data.get("assignment_id")
    lecture_no = data.get("lecture_no", "").strip()
    lecture_start_time = data.get("lecture_start_time", "").strip()
    lecture_end_time = data.get("lecture_end_time", "").strip()
    is_extra_class = data.get("is_extra_class", False)

    if not assignment_id or not lecture_no:
      return jsonify({
        "success": False,
        "message": "Class and lecture are required."
    }), 400

    assignment = TeacherAssignment.query.get(assignment_id)

    if not assignment:
        return jsonify({
            "success": False,
            "message": "Selected class assignment not found."
        }), 404

    if role == "teacher" and assignment.teacher_id != user_id:
        return jsonify({
            "success": False,
            "message": "Access denied. You are not assigned to this class."
        }), 403

    students = Student.query.filter_by(
        branch=assignment.branch,
        section=assignment.section
    ).all()

    if len(students) == 0:
        return jsonify({
            "success": False,
            "message": "No students found in this branch and section."
        }), 400

    return jsonify({
        "success": True,
        "message": "Attendance session ready.",
        "session": {
            "assignment_id": assignment.id,
            "subject": assignment.subject,
            "branch": assignment.branch,
            "section": assignment.section,
            "lecture_no": lecture_no,
            "lecture_start_time": lecture_start_time,
            "lecture_end_time": lecture_end_time,
            "is_extra_class": is_extra_class,
            "student_count": len(students)
        }
    }), 200

@app.route("/api/start-camera-attendance", methods=["POST"])
@jwt_required()
def start_camera_attendance():
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    data = request.get_json()

    assignment_id = data.get("assignment_id")
    lecture_no = data.get("lecture_no", "").strip()
    lecture_start_time = data.get("lecture_start_time", "").strip()
    lecture_end_time = data.get("lecture_end_time", "").strip()
    is_extra_class = data.get("is_extra_class", False)

    if not assignment_id or not lecture_no or not lecture_start_time or not lecture_end_time:
        return jsonify({
            "success": False,
            "message": "Class and lecture are required."
        }), 400

    assignment = TeacherAssignment.query.get(assignment_id)

    if not assignment:
        return jsonify({
            "success": False,
            "message": "Selected class assignment not found."
        }), 404

    if role == "teacher" and assignment.teacher_id != user_id:
        return jsonify({
            "success": False,
            "message": "Access denied. You are not assigned to this class."
        }), 403

    teacher_id = assignment.teacher_id if role == "admin" else user_id

    result = recognize_attendance_session(
        assignment=assignment,
        lecture_no=lecture_no,
        teacher_id=teacher_id,
        lecture_start_time=lecture_start_time,
        lecture_end_time=lecture_end_time,
        is_extra_class=is_extra_class
    )

    status_code = 200 if result["success"] else 400

    return jsonify(result), status_code

@app.route("/api/capture-face/<student_id>", methods=["POST"])
@jwt_required()
def capture_face(student_id):
    if not require_admin():
        return jsonify({
            "success": False,
            "message": "Admin access required."
        }), 403

    result = capture_student_faces(student_id)

    status_code = 200 if result["success"] else 400

    return jsonify(result), status_code


@app.route("/api/train-model", methods=["POST"])
@jwt_required()
def train_model():
    if not require_admin():
        return jsonify({
            "success": False,
            "message": "Admin access required."
        }), 403

    result = train_face_model()

    status_code = 200 if result["success"] else 400

    return jsonify(result), status_code

@app.route("/api/attendance", methods=["GET"])
@jwt_required()
def get_attendance_records():
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    if role == "admin":
        records = Attendance.query.order_by(Attendance.id.desc()).all()

    elif role == "teacher":
        records = Attendance.query.filter_by(
            teacher_id=user_id
        ).order_by(Attendance.id.desc()).all()

    else:
        return jsonify({
            "success": False,
            "message": "Invalid role."
        }), 403

    attendance_list = []

    for record in records:
        student = Student.query.filter_by(
            student_id=record.student_id
        ).first()

        teacher = User.query.get(record.teacher_id)

    attendance_list.append({
        "id": record.id,
        "student_id": record.student_id,
        "student_name": student.name if student else "Unknown",
        "branch": student.branch if student else "-",
        "section": student.section if student else "-",
        "subject": record.subject,
        "lecture_no": record.lecture_no,
        "lecture_start_time": record.lecture_start_time,
        "lecture_end_time": record.lecture_end_time,
        "is_extra_class": record.is_extra_class,
        "date": record.date,
        "time": record.time,
        "status": record.status,
        "teacher_name": teacher.name if teacher else "-"
    })

    return jsonify({
        "success": True,
        "attendance": attendance_list
    }), 200

@app.route("/api/students/<student_id>/attendance", methods=["GET"])
@jwt_required()
def get_student_attendance_details(student_id):
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    student = Student.query.filter_by(student_id=student_id).first()

    if not student:
        return jsonify({
            "success": False,
            "message": "Student not found."
        }), 404

    if role == "teacher":
        assignments = TeacherAssignment.query.filter_by(teacher_id=user_id).all()

        allowed = False

        for assignment in assignments:
            if (
                assignment.branch.strip().lower() == student.branch.strip().lower()
                and assignment.section.strip().lower() == student.section.strip().lower()
            ):
                allowed = True
                break

        if not allowed:
            return jsonify({
                "success": False,
                "message": "Access denied. This student is not in your assigned class."
            }), 403

    elif role != "admin":
        return jsonify({
            "success": False,
            "message": "Invalid role."
        }), 403

    records = Attendance.query.filter_by(
        student_id=student_id
    ).order_by(Attendance.id.desc()).all()

    attendance_list = []

    for record in records:
        teacher = User.query.get(record.teacher_id)

        attendance_list.append({
            "id": record.id,
            "subject": record.subject,
            "lecture_no": record.lecture_no,
            "lecture_start_time": record.lecture_start_time,
            "lecture_end_time": record.lecture_end_time,
            "is_extra_class": record.is_extra_class,
            "date": record.date,
            "time": record.time,
            "status": record.status,
            "teacher_name": teacher.name if teacher else "-"
        })

    return jsonify({
        "success": True,
        "student": {
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "branch": student.branch,
            "section": student.section,
            "email": student.email,
            "phone": student.phone
        },
        "attendance": attendance_list
    }), 200

@app.route("/api/manual-attendance/students", methods=["POST"])
@jwt_required()
def get_manual_attendance_students():
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    data = request.get_json()

    assignment_id = data.get("assignment_id")
    lecture_no = data.get("lecture_no", "").strip()
    lecture_start_time = data.get("lecture_start_time", "").strip()
    lecture_end_time = data.get("lecture_end_time", "").strip()
    is_extra_class = data.get("is_extra_class", False)

    if not assignment_id or not lecture_no or not lecture_start_time or not lecture_end_time:
        return jsonify({
            "success": False,
            "message": "Class, lecture, start time, and end time are required."
        }), 400

    assignment = TeacherAssignment.query.get(assignment_id)

    if not assignment:
        return jsonify({
            "success": False,
            "message": "Assignment not found."
        }), 404

    if role == "teacher" and assignment.teacher_id != user_id:
        return jsonify({
            "success": False,
            "message": "Access denied. You are not assigned to this class."
        }), 403

    students = Student.query.filter_by(
        branch=assignment.branch,
        section=assignment.section
    ).order_by(Student.name.asc()).all()

    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")

    student_list = []

    for student in students:
        existing_record = Attendance.query.filter_by(
            student_id=student.student_id,
            subject=assignment.subject,
            lecture_no=lecture_no,
            lecture_start_time=lecture_start_time,
            lecture_end_time=lecture_end_time,
            date=today
        ).first()

        student_list.append({
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "branch": student.branch,
            "section": student.section,
            "email": student.email,
            "phone": student.phone,
            "status": existing_record.status if existing_record else "Absent"
        })

    return jsonify({
        "success": True,
        "assignment": {
            "id": assignment.id,
            "subject": assignment.subject,
            "branch": assignment.branch,
            "section": assignment.section,
            "lecture_no": lecture_no,
            "lecture_start_time": lecture_start_time,
            "lecture_end_time": lecture_end_time,
            "is_extra_class": is_extra_class
        },
        "students": student_list
    }), 200

@app.route("/api/manual-attendance/save", methods=["POST"])
@jwt_required()
def save_manual_attendance():
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    data = request.get_json()

    assignment_id = data.get("assignment_id")
    lecture_no = data.get("lecture_no", "").strip()
    lecture_start_time = data.get("lecture_start_time", "").strip()
    lecture_end_time = data.get("lecture_end_time", "").strip()
    is_extra_class = data.get("is_extra_class", False)
    attendance_data = data.get("attendance", [])

    if not assignment_id or not lecture_no or not lecture_start_time or not lecture_end_time or not attendance_data:
        return jsonify({
            "success": False,
            "message": "Class, lecture, start time, end time, and attendance data are required."
        }), 400

    assignment = TeacherAssignment.query.get(assignment_id)

    if not assignment:
        return jsonify({
            "success": False,
            "message": "Assignment not found."
        }), 404

    if role == "teacher" and assignment.teacher_id != user_id:
        return jsonify({
            "success": False,
            "message": "Access denied. You are not assigned to this class."
        }), 403

    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")
    current_time = datetime.now().strftime("%H:%M:%S")

    teacher_id = assignment.teacher_id if role == "admin" else user_id

    saved_count = 0

    for item in attendance_data:
        student_id = str(item.get("student_id"))
        status = item.get("status", "Absent")

        if status not in ["Present", "Absent"]:
            status = "Absent"

        student = Student.query.filter_by(student_id=student_id).first()

        if not student:
            continue

        if (
            student.branch.strip().lower() != assignment.branch.strip().lower()
            or student.section.strip().lower() != assignment.section.strip().lower()
        ):
            continue

        existing_record = Attendance.query.filter_by(
            student_id=student_id,
            subject=assignment.subject,
            lecture_no=lecture_no,
            lecture_start_time=lecture_start_time,
            lecture_end_time=lecture_end_time,
            date=today
        ).first()

        if existing_record:
            existing_record.status = status
            existing_record.time = current_time
            existing_record.teacher_id = teacher_id
            existing_record.lecture_start_time = lecture_start_time
            existing_record.lecture_end_time = lecture_end_time
            existing_record.is_extra_class = is_extra_class
        else:
            record = Attendance(
                student_id=student_id,
                teacher_id=teacher_id,
                subject=assignment.subject,
                lecture_no=lecture_no,
                lecture_start_time=lecture_start_time,
                lecture_end_time=lecture_end_time,
                is_extra_class=is_extra_class,
                date=today,
                time=current_time,
                status=status
            )

            db.session.add(record)

        saved_count += 1

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Manual attendance saved successfully.",
        "saved_count": saved_count
    }), 200

@app.route("/api/export-attendance-csv", methods=["GET"])
@jwt_required()
def export_attendance_csv():
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    if role == "admin":
        records = Attendance.query.order_by(Attendance.id.desc()).all()
    elif role == "teacher":
        records = Attendance.query.filter_by(
            teacher_id=user_id
        ).order_by(Attendance.id.desc()).all()
    else:
        return jsonify({
            "success": False,
            "message": "Invalid role."
        }), 403

    output = StringIO()
    writer = csv.writer(output)

    writer.writerow([
        "Student ID",
        "Student Name",
        "Branch",
        "Section",
        "Subject",
        "Lecture",
        "Date",
        "Time",
        "Status",
        "Teacher"
    ])

    for record in records:
        student = Student.query.filter_by(
            student_id=record.student_id
        ).first()

        teacher = User.query.get(record.teacher_id)

        writer.writerow([
            record.student_id,
            student.name if student else "Unknown",
            student.branch if student else "-",
            student.section if student else "-",
            record.subject,
            record.lecture_no,
            record.date,
            record.time,
            record.status,
            teacher.name if teacher else "-"
        ])

    response = Response(
        output.getvalue(),
        mimetype="text/csv"
    )

    response.headers["Content-Disposition"] = "attachment; filename=attendance_report.csv"

    return response  

@app.route("/api/students/<int:id>", methods=["PUT"])
@jwt_required()
def update_student(id):
    if not require_admin():
        return jsonify({
            "success": False,
            "message": "Admin access required."
        }), 403

    student = Student.query.get(id)

    if not student:
        return jsonify({
            "success": False,
            "message": "Student not found."
        }), 404

    data = request.get_json()

    student_id = data.get("student_id", "").strip()
    name = data.get("name", "").strip()
    branch = data.get("branch", "").strip()
    section = data.get("section", "").strip()
    email = data.get("email", "").strip()
    phone = data.get("phone", "").strip()

    if not student_id or not name or not branch or not section:
        return jsonify({
            "success": False,
            "message": "Student ID, name, branch, and section are required."
        }), 400

    existing_student = Student.query.filter(
        Student.student_id == student_id,
        Student.id != id
    ).first()

    if existing_student:
        return jsonify({
            "success": False,
            "message": "Student ID already exists."
        }), 409

    old_student_id = student.student_id

    student.student_id = student_id
    student.name = name
    student.branch = branch
    student.section = section
    student.email = email
    student.phone = phone

    if old_student_id != student_id:
        attendance_records = Attendance.query.filter_by(
            student_id=old_student_id
        ).all()

        for record in attendance_records:
            record.student_id = student_id

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Student updated successfully.",
        "student": {
            "id": student.id,
            "student_id": student.student_id,
            "name": student.name,
            "branch": student.branch,
            "section": student.section,
            "email": student.email,
            "phone": student.phone
        }
    }), 200

@app.route("/api/teachers/<int:teacher_id>", methods=["PUT"])
@jwt_required()
def update_teacher(teacher_id):
    if not require_admin():
        return jsonify({
            "success": False,
            "message": "Admin access required."
        }), 403

    teacher = User.query.filter_by(id=teacher_id, role="teacher").first()

    if not teacher:
        return jsonify({
            "success": False,
            "message": "Teacher not found."
        }), 404

    data = request.get_json()

    name = data.get("name", "").strip()
    email = data.get("email", "").strip()
    username = data.get("username", "").strip()
    department = data.get("department", "").strip()
    password = data.get("password", "").strip()

    if not name or not email or not username:
        return jsonify({
            "success": False,
            "message": "Name, email, and username are required."
        }), 400

    existing_user = User.query.filter(
        ((User.email == email) | (User.username == username)),
        User.id != teacher_id
    ).first()

    if existing_user:
        return jsonify({
            "success": False,
            "message": "Email or username already exists."
        }), 409

    teacher.name = name
    teacher.email = email
    teacher.username = username
    teacher.department = department

    if password:
        teacher.set_password(password)

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Teacher updated successfully.",
        "teacher": {
            "id": teacher.id,
            "name": teacher.name,
            "email": teacher.email,
            "username": teacher.username,
            "department": teacher.department
        }
    }), 200

@app.route("/api/change-password", methods=["PUT"])
@jwt_required()
def change_password():
    identity_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    data = request.get_json()

    old_password = data.get("old_password", "").strip()
    new_password = data.get("new_password", "").strip()
    confirm_password = data.get("confirm_password", "").strip()

    if not old_password or not new_password or not confirm_password:
        return jsonify({
            "success": False,
            "message": "Old password, new password, and confirm password are required."
        }), 400

    if new_password != confirm_password:
        return jsonify({
            "success": False,
            "message": "New password and confirm password do not match."
        }), 400

    if len(new_password) < 6:
        return jsonify({
            "success": False,
            "message": "New password must be at least 6 characters long."
        }), 400

    if role == "student":
        student_id = claims.get("student_id")
        student = Student.query.filter_by(student_id=student_id).first()

        if not student:
            return jsonify({
                "success": False,
                "message": "Student not found."
            }), 404

        if not student.check_password(old_password):
            return jsonify({
                "success": False,
                "message": "Old password is incorrect."
            }), 401

        student.set_password(new_password)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Password changed successfully. Please login again."
        }), 200

    if role in ["admin", "teacher"]:
        user = User.query.get(identity_id)

        if not user:
            return jsonify({
                "success": False,
                "message": "User not found."
            }), 404

        if not user.check_password(old_password):
            return jsonify({
                "success": False,
                "message": "Old password is incorrect."
            }), 401

        user.set_password(new_password)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Password changed successfully. Please login again."
        }), 200

    return jsonify({
        "success": False,
        "message": "Invalid role."
    }), 403

@app.route("/api/attendance/<int:attendance_id>/status", methods=["PUT"])
@jwt_required()
def update_attendance_status(attendance_id):
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    data = request.get_json()
    new_status = data.get("status", "").strip()

    if new_status not in ["Present", "Absent"]:
        return jsonify({
            "success": False,
            "message": "Invalid status. Status must be Present or Absent."
        }), 400

    record = Attendance.query.get(attendance_id)

    if not record:
        return jsonify({
            "success": False,
            "message": "Attendance record not found."
        }), 404

    if role == "teacher" and record.teacher_id != user_id:
        return jsonify({
            "success": False,
            "message": "Access denied. You can only update your own attendance records."
        }), 403

    if role not in ["admin", "teacher"]:
        return jsonify({
            "success": False,
            "message": "Invalid role."
        }), 403

    from datetime import datetime

    record_date = datetime.strptime(record.date, "%Y-%m-%d").date()
    today = datetime.now().date()

    days_difference = (today - record_date).days

    if days_difference > 5:
        return jsonify({
            "success": False,
            "message": "Attendance update is locked. Records can only be updated within 5 days."
        }), 403

    record.status = new_status
    record.time = datetime.now().strftime("%H:%M:%S")

    db.session.commit()

    return jsonify({
        "success": True,
        "message": "Attendance status updated successfully.",
        "attendance": {
            "id": record.id,
            "status": record.status,
            "time": record.time
        }
    }), 200

def migrate_attendance_time_columns():
    with db.engine.connect() as connection:
        columns = connection.execute(text("PRAGMA table_info(attendance)")).fetchall()

        column_names = [column[1] for column in columns]

        if "lecture_start_time" not in column_names:
            connection.execute(text("ALTER TABLE attendance ADD COLUMN lecture_start_time VARCHAR(20)"))
            print("Added lecture_start_time column.")

        if "is_extra_class" not in column_names:
          connection.execute(text("ALTER TABLE attendance ADD COLUMN is_extra_class BOOLEAN DEFAULT 0"))
          print("Added is_extra_class column.")

        if "lecture_end_time" not in column_names:
            connection.execute(text("ALTER TABLE attendance ADD COLUMN lecture_end_time VARCHAR(20)"))
            print("Added lecture_end_time column.")

        connection.commit()

@app.route("/api/today-attendance", methods=["GET"])
@jwt_required()
def get_today_attendance():
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get("role")

    from datetime import datetime
    today = datetime.now().strftime("%Y-%m-%d")

    result = []

    if role == "admin":
        assignments = TeacherAssignment.query.order_by(
            TeacherAssignment.id.desc()
        ).all()

    elif role == "teacher":
        assignments = TeacherAssignment.query.filter_by(
            teacher_id=user_id
        ).order_by(TeacherAssignment.id.desc()).all()

    else:
        return jsonify({
            "success": False,
            "message": "Invalid role."
        }), 403

    for assignment in assignments:
        teacher = User.query.get(assignment.teacher_id)

        students = Student.query.filter_by(
            branch=assignment.branch,
            section=assignment.section
        ).order_by(Student.name.asc()).all()

        for student in students:
            today_records = Attendance.query.filter_by(
                student_id=student.student_id,
                subject=assignment.subject,
                date=today
            ).order_by(Attendance.id.desc()).all()

            if today_records:
                for record in today_records:
                    result.append({
                        "id": record.id,
                        "student_id": student.student_id,
                        "student_name": student.name,
                        "branch": student.branch,
                        "section": student.section,
                        "subject": assignment.subject,
                        "lecture_no": record.lecture_no,
                        "lecture_start_time": record.lecture_start_time,
                        "lecture_end_time": record.lecture_end_time,
                        "is_extra_class": record.is_extra_class,
                        "date": record.date,
                        "time": record.time,
                        "status": record.status,
                        "teacher_name": teacher.name if teacher else "-"
                    })
            else:
                result.append({
                    "id": f"not-marked-{assignment.id}-{student.student_id}",
                    "student_id": student.student_id,
                    "student_name": student.name,
                    "branch": student.branch,
                    "section": student.section,
                    "subject": assignment.subject,
                    "lecture_no": "-",
                    "lecture_start_time": None,
                    "lecture_end_time": None,
                    "is_extra_class": False,
                    "date": today,
                    "time": "-",
                    "status": "Not Marked",
                    "teacher_name": teacher.name if teacher else "-"
                })

    return jsonify({
        "success": True,
        "date": today,
        "attendance": result
    }), 200
def migrate_student_password_column():
    with db.engine.connect() as connection:
        columns = connection.execute(text("PRAGMA table_info(students)")).fetchall()
        column_names = [column[1] for column in columns]

        if "password_hash" not in column_names:
            connection.execute(text("ALTER TABLE students ADD COLUMN password_hash VARCHAR(255)"))
            print("Added password_hash column to students.")

        connection.commit()


def set_default_student_passwords():
    students = Student.query.all()

    for student in students:
        if not student.password_hash:
            student.set_password(student.student_id)

    db.session.commit()
    print("Default passwords set for students without password.")

@app.route("/api/student/my-attendance", methods=["GET"])
@jwt_required()
def get_my_student_attendance():
    claims = get_jwt()
    role = claims.get("role")

    if role != "student":
        return jsonify({
            "success": False,
            "message": "Student access required."
        }), 403

    student_id = claims.get("student_id")

    student = Student.query.filter_by(student_id=student_id).first()

    if not student:
        return jsonify({
            "success": False,
            "message": "Student not found."
        }), 404

    records = Attendance.query.filter_by(
        student_id=student_id
    ).order_by(Attendance.date.desc(), Attendance.id.desc()).all()

    attendance_list = []

    present_count = 0
    absent_count = 0

    for record in records:
        teacher = User.query.get(record.teacher_id)

        if record.status == "Present":
            present_count += 1

        if record.status == "Absent":
            absent_count += 1

        attendance_list.append({
            "id": record.id,
            "subject": record.subject,
            "lecture_no": record.lecture_no,
            "lecture_start_time": record.lecture_start_time,
            "lecture_end_time": record.lecture_end_time,
            "is_extra_class": record.is_extra_class,
            "date": record.date,
            "time": record.time,
            "status": record.status,
            "teacher_name": teacher.name if teacher else "-"
        })

    total_count = present_count + absent_count

    percentage = round((present_count / total_count) * 100, 2) if total_count > 0 else 0

    return jsonify({
        "success": True,
        "student": {
            "student_id": student.student_id,
            "name": student.name,
            "branch": student.branch,
            "section": student.section,
            "email": student.email,
            "phone": student.phone
        },
        "summary": {
            "present": present_count,
            "absent": absent_count,
            "total": total_count,
            "percentage": percentage
        },
        "attendance": attendance_list
    }), 200

if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        create_default_admin()
        migrate_attendance_time_columns()
        migrate_student_password_column()
        set_default_student_passwords()

    app.run(debug=True, host="127.0.0.1", port=5000)