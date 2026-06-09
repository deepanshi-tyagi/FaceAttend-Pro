import cv2
import os
from datetime import datetime
from models import db, Student, Attendance
import cv2
import os
import numpy as np
from PIL import Image
from datetime import datetime
from models import db, Student, Attendance

DATASET_PATH = "dataset"
TRAINER_PATH = "trainer/trainer.yml"


def capture_student_faces(student_id):
    student = Student.query.filter_by(student_id=str(student_id)).first()

    if not student:
        return {
            "success": False,
            "message": "Student not found."
        }

    cam = cv2.VideoCapture(0)

    if not cam.isOpened():
        return {
            "success": False,
            "message": "Camera not available."
        }

    face_detector = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    student_folder = os.path.join(DATASET_PATH, str(student_id))

    if not os.path.exists(student_folder):
        os.makedirs(student_folder)

    count = 0

    while True:
        ret, frame = cam.read()

        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        faces = face_detector.detectMultiScale(
            gray,
            scaleFactor=1.3,
            minNeighbors=5,
            minSize=(80, 80)
        )

        for (x, y, w, h) in faces:
            count += 1

            face_image = gray[y:y + h, x:x + w]

            image_path = os.path.join(
                student_folder,
                f"{student_id}_{count}.jpg"
            )

            cv2.imwrite(image_path, face_image)

            cv2.rectangle(frame, (x, y), (x + w, y + h), (0, 255, 0), 2)

            cv2.putText(
                frame,
                f"Capturing {count}/50",
                (20, 40),
                cv2.FONT_HERSHEY_SIMPLEX,
                1,
                (0, 255, 0),
                2
            )

        cv2.imshow("Capture Student Face - Press ESC to stop", frame)

        if cv2.waitKey(1) == 27 or count >= 50:
            break

    cam.release()
    cv2.destroyAllWindows()

    if count == 0:
        return {
            "success": False,
            "message": "No face captured. Please try again with proper lighting."
        }

    return {
        "success": True,
        "message": f"Face data captured successfully for {student.name}.",
        "images_captured": count
    }


def train_face_model():
    if not os.path.exists(DATASET_PATH):
        return {
            "success": False,
            "message": "Dataset folder not found. Capture face data first."
        }

    face_samples = []
    ids = []

    for student_folder in os.listdir(DATASET_PATH):
        folder_path = os.path.join(DATASET_PATH, student_folder)

        if not os.path.isdir(folder_path):
            continue

        try:
            student_id = int(student_folder)
        except ValueError:
            continue

        for image_name in os.listdir(folder_path):
            image_path = os.path.join(folder_path, image_name)

            try:
                image = Image.open(image_path).convert("L")
                image_np = np.array(image, "uint8")

                face_samples.append(image_np)
                ids.append(student_id)

            except Exception:
                continue

    if len(face_samples) == 0:
        return {
            "success": False,
            "message": "No face images found. Capture student faces first."
        }

    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.train(face_samples, np.array(ids))

    if not os.path.exists("trainer"):
        os.makedirs("trainer")

    recognizer.write(TRAINER_PATH)

    return {
        "success": True,
        "message": "Face recognition model trained successfully.",
        "faces_trained": len(face_samples)
    }

def recognize_attendance_session(
    assignment,
    lecture_no,
    teacher_id,
    lecture_start_time,
    lecture_end_time
):
    if not os.path.exists(TRAINER_PATH):
        return {
            "success": False,
            "message": "Trainer file not found. Please train the model first."
        }

    allowed_students = Student.query.filter_by(
        branch=assignment.branch,
        section=assignment.section
    ).all()

    if not allowed_students:
        return {
            "success": False,
            "message": "No students found in selected branch and section."
        }

    allowed_student_ids = set()

    for student in allowed_students:
        try:
            allowed_student_ids.add(int(student.student_id))
        except ValueError:
            return {
                "success": False,
                "message": "Student ID must be numeric for face recognition."
            }

    recognizer = cv2.face.LBPHFaceRecognizer_create()
    recognizer.read(TRAINER_PATH)

    face_detector = cv2.CascadeClassifier(
        cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
    )

    cam = cv2.VideoCapture(0)

    if not cam.isOpened():
        return {
            "success": False,
            "message": "Camera not available."
        }

    today = datetime.now().strftime("%Y-%m-%d")
    current_time = datetime.now().strftime("%H:%M:%S")

    already_marked = Attendance.query.filter_by(
        subject=assignment.subject,
        lecture_no=lecture_no,
        date=today
    ).all()

    marked_ids = set()

    for record in already_marked:
        try:
            marked_ids.add(int(record.student_id))
        except ValueError:
            pass

    marked_now = []

    while True:
        ret, frame = cam.read()

        if not ret:
            break

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)

        faces = face_detector.detectMultiScale(
            gray,
            scaleFactor=1.2,
            minNeighbors=5,
            minSize=(80, 80)
        )

        for (x, y, w, h) in faces:
            predicted_id, confidence = recognizer.predict(gray[y:y + h, x:x + w])

            if predicted_id not in allowed_student_ids:
                label = "Not in selected class"
                color = (0, 0, 255)

            elif confidence < 75:
                student = Student.query.filter_by(
                    student_id=str(predicted_id)
                ).first()

                if not student:
                    label = "Unknown"
                    color = (0, 0, 255)

                elif predicted_id in marked_ids:
                    label = f"{student.name} - Already Marked"
                    color = (0, 165, 255)

                else:
                    attendance = Attendance(
                        student_id=student.student_id,
                        teacher_id=teacher_id,
                        subject=assignment.subject,
                        lecture_no=lecture_no,
                        lecture_start_time=lecture_start_time,
                        lecture_end_time=lecture_end_time,
                        date=today,
                        time=current_time,
                        status="Present"
)

                    db.session.add(attendance)
                    db.session.commit()

                    marked_ids.add(predicted_id)
                    marked_now.append(student.name)

                    label = f"{student.name} - Marked"
                    color = (0, 255, 0)

            else:
                label = "Unknown"
                color = (0, 0, 255)

            cv2.rectangle(frame, (x, y), (x + w, y + h), color, 2)

            cv2.putText(
                frame,
                label,
                (x, y - 10),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.75,
                color,
                2
            )

        processed_count = len(marked_ids.intersection(allowed_student_ids))
        total_students = len(allowed_student_ids)

        cv2.rectangle(frame, (0, 0), (frame.shape[1], 105), (15, 23, 42), -1)

        cv2.putText(
            frame,
            f"FaceAttend | {assignment.subject} - {lecture_no}",
            (20, 35),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.75,
            (255, 255, 255),
            2
        )

        cv2.putText(
            frame,
            f"Class: {assignment.branch} {assignment.section}",
            (20, 68),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.65,
            (203, 213, 225),
            2
        )

        cv2.putText(
            frame,
            f"Processed: {processed_count}/{total_students}",
            (20, 95),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.6,
            (203, 213, 225),
            2
        )

        cv2.imshow("FaceAttend Attendance Session", frame)

        if processed_count >= total_students:
            cv2.waitKey(2000)
            break

        if cv2.waitKey(1) == 27:
            break

    cam.release()
    cv2.destroyAllWindows()

    return {
        "success": True,
        "message": "Attendance session completed.",
        "marked_count": len(marked_now),
        "marked_students": marked_now
    }