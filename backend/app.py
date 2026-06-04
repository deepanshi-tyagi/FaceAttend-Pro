from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
    get_jwt
)
from models import db, User, Student, TeacherAssignment, Attendance
from datetime import timedelta


app = Flask(__name__)

app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///database.db"
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["JWT_SECRET_KEY"] = "faceattend_pro_secret_key"
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)

CORS(app, supports_credentials=True, origins=[
    "http://localhost:5173",
    "http://127.0.0.1:5173"
])

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

    role = data.get("role")
    username = data.get("username")
    password = data.get("password")

    if not role or not username or not password:
        return jsonify({
            "success": False,
            "message": "Role, username, and password are required."
        }), 400

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

    if role == "admin":
        total_students = Student.query.count()
        total_teachers = User.query.filter_by(role="teacher").count()
        total_assignments = TeacherAssignment.query.count()
        total_attendance = Attendance.query.count()

        return jsonify({
            "success": True,
            "role": "admin",
            "cards": {
                "total_students": total_students,
                "total_teachers": total_teachers,
                "total_assignments": total_assignments,
                "total_attendance": total_attendance
            }
        })

    if role == "teacher":
        assigned_classes = TeacherAssignment.query.filter_by(teacher_id=user_id).count()

        assignments = TeacherAssignment.query.filter_by(teacher_id=user_id).all()

        assigned_students_set = set()

        for assignment in assignments:
            students = Student.query.filter_by(
                branch=assignment.branch,
                section=assignment.section
            ).all()

            for student in students:
                assigned_students_set.add(student.student_id)

        total_attendance = Attendance.query.filter_by(teacher_id=user_id).count()

        return jsonify({
            "success": True,
            "role": "teacher",
            "cards": {
                "assigned_classes": assigned_classes,
                "assigned_students": len(assigned_students_set),
                "total_attendance": total_attendance
            }
        })

    return jsonify({
        "success": False,
        "message": "Invalid role."
    }), 400

def require_admin():
    claims = get_jwt()
    return claims.get("role") == "admin"

@app.route("/api/teachers", methods=["GET"])
@jwt_required()
def get_teachers():
    if not require_admin():
        return jsonify({
            "success": False,
            "message": "Admin access required."
        }), 403

    teachers = User.query.filter_by(role="teacher").order_by(User.id.desc()).all()

    teacher_list = []

    for teacher in teachers:
        teacher_list.append({
            "id": teacher.id,
            "name": teacher.name,
            "email": teacher.email,
            "username": teacher.username,
            "department": teacher.department
        })

    return jsonify({
        "success": True,
        "teachers": teacher_list
    }), 200


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


if __name__ == "__main__":
    with app.app_context():
        db.create_all()
        create_default_admin()

    app.run(debug=True, host="127.0.0.1", port=5000)