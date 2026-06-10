import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";

function ManualAttendance() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [assignmentInfo, setAssignmentInfo] = useState(null);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    assignment_id: "",
    lecture_no: "Lecture 1",
    lecture_start_time: "",
    lecture_end_time: "",
    is_extra_class: false,
  });

  useEffect(() => {
    fetchClasses();
  }, []);

  async function fetchClasses() {
    try {
      const response = await api.get("/api/take-attendance/classes");
      setClasses(response.data.classes || []);
    } catch (error) {
      setMessage("Unable to load assigned classes.");
    }
  }

  function handleChange(e) {
    const { name, value, type, checked } = e.target;

    setForm({
      ...form,
      [name]: type === "checkbox" ? checked : value,
    });
  }

  async function handleLoadStudents(e) {
    e.preventDefault();

    setMessage("");
    setStudents([]);
    setAssignmentInfo(null);

    if (
      !form.assignment_id ||
      !form.lecture_no ||
      !form.lecture_start_time ||
      !form.lecture_end_time
    ) {
      setMessage("Class, lecture, start time, and end time are required.");
      return;
    }

    try {
      const response = await api.post("/api/manual-attendance/students", {
        assignment_id: form.assignment_id,
        lecture_no: form.lecture_no,
        lecture_start_time: form.lecture_start_time,
        lecture_end_time: form.lecture_end_time,
        is_extra_class: form.is_extra_class,
      });

      setStudents(response.data.students || []);
      setAssignmentInfo(response.data.assignment);
      setMessage("Students loaded successfully.");
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load students.");
    }
  }

  function updateStudentStatus(studentId, status) {
    const updatedStudents = students.map((student) => {
      if (student.student_id === studentId) {
        return {
          ...student,
          status,
        };
      }

      return student;
    });

    setStudents(updatedStudents);
  }

  function markAll(status) {
    const updatedStudents = students.map((student) => ({
      ...student,
      status,
    }));

    setStudents(updatedStudents);
  }

  async function handleSaveAttendance() {
    setMessage("");

    if (!assignmentInfo) {
      setMessage("Please load students first.");
      return;
    }

    if (students.length === 0) {
      setMessage("No students available to save attendance.");
      return;
    }

    const attendancePayload = students.map((student) => ({
      student_id: student.student_id,
      status: student.status,
    }));

    try {
      const response = await api.post("/api/manual-attendance/save", {
        assignment_id: form.assignment_id,
        lecture_no: form.lecture_no,
        lecture_start_time: form.lecture_start_time,
        lecture_end_time: form.lecture_end_time,
        is_extra_class: form.is_extra_class,
        attendance: attendancePayload,
      });

      setMessage(response.data.message || "Attendance saved successfully.");
    } catch (error) {
      console.log("Save attendance error:", error.response?.data || error);
      setMessage(error.response?.data?.message || "Unable to save attendance.");
    }
  }

  return (
    <Layout role={user?.role}>
      <div className="page-header">
        <span>Manual Attendance</span>
        <h1>Manual Attendance</h1>
        <p>
          Mark attendance manually for regular or extra classes using selected
          lecture timing.
        </p>
      </div>

      {message && <div className="alert info-alert">{message}</div>}

      <div className="section-card">
        <h2>Select Class Details</h2>

        <form onSubmit={handleLoadStudents} className="form-grid">
          <select
            name="assignment_id"
            value={form.assignment_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Subject / Class</option>

            {classes.map((item) => (
              <option key={item.assignment_id} value={item.assignment_id}>
                {item.subject} - {item.branch} {item.section}
              </option>
            ))}
          </select>

          <select
            name="lecture_no"
            value={form.lecture_no}
            onChange={handleChange}
            required
          >
            <option value="Lecture 1">Lecture 1</option>
            <option value="Lecture 2">Lecture 2</option>
            <option value="Lecture 3">Lecture 3</option>
            <option value="Lecture 4">Lecture 4</option>
            <option value="Lab">Lab</option>
            <option value="Extra Class">Extra Class</option>
          </select>

          <input
            type="time"
            name="lecture_start_time"
            value={form.lecture_start_time}
            onChange={handleChange}
            required
          />

          <input
            type="time"
            name="lecture_end_time"
            value={form.lecture_end_time}
            onChange={handleChange}
            required
          />

          <label className="checkbox-row">
            <input
              type="checkbox"
              name="is_extra_class"
              checked={form.is_extra_class}
              onChange={handleChange}
            />
            Mark as Extra Class
          </label>

          <button type="submit" className="primary-btn">
            Load Students
          </button>
        </form>
      </div>

      {assignmentInfo && (
        <div className="section-card">
          <h2>Selected Class</h2>

          <div className="session-summary">
            <p>
              <strong>Subject:</strong> {assignmentInfo.subject}
            </p>

            <p>
              <strong>Class:</strong> {assignmentInfo.branch}{" "}
              {assignmentInfo.section}
            </p>

            <p>
              <strong>Lecture:</strong> {assignmentInfo.lecture_no}
            </p>

            <p>
              <strong>Time:</strong> {assignmentInfo.lecture_start_time} -{" "}
              {assignmentInfo.lecture_end_time}
            </p>

            <p>
              <strong>Class Type:</strong>{" "}
              {assignmentInfo.is_extra_class ? (
                <span className="badge-warning">Extra Class</span>
              ) : (
                <span className="badge-good">Regular Class</span>
              )}
            </p>
          </div>
        </div>
      )}

      {students.length > 0 && (
        <div className="section-card">
          <div className="table-header">
            <div>
              <h2>Mark Attendance</h2>
              <p>Total students: {students.length}</p>
            </div>

            <div className="action-buttons">
              <button
                type="button"
                className="secondary-btn"
                onClick={() => markAll("Present")}
              >
                Mark All Present
              </button>

              <button
                type="button"
                className="danger-btn"
                onClick={() => markAll("Absent")}
              >
                Mark All Absent
              </button>

              <button
                type="button"
                className="primary-btn"
                onClick={handleSaveAttendance}
              >
                Save Attendance
              </button>
            </div>
          </div>

          <table className="data-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Student ID</th>
                <th>Name</th>
                <th>Branch</th>
                <th>Section</th>
                <th>Status</th>
              </tr>
            </thead>

            <tbody>
              {students.map((student, index) => (
                <tr key={student.student_id}>
                  <td>{index + 1}</td>
                  <td>{student.student_id}</td>
                  <td>{student.name}</td>
                  <td>{student.branch}</td>
                  <td>{student.section}</td>

                  <td>
                    <div className="status-toggle">
                      <button
                        type="button"
                        className={
                          student.status === "Present"
                            ? "present-btn active"
                            : "present-btn"
                        }
                        onClick={() =>
                          updateStudentStatus(student.student_id, "Present")
                        }
                      >
                        Present
                      </button>

                      <button
                        type="button"
                        className={
                          student.status === "Absent"
                            ? "absent-btn active"
                            : "absent-btn"
                        }
                        onClick={() =>
                          updateStudentStatus(student.student_id, "Absent")
                        }
                      >
                        Absent
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {assignmentInfo && students.length === 0 && (
        <div className="empty-state">
          <h3>No students found</h3>
          <p>No students are available for this branch and section.</p>
        </div>
      )}
    </Layout>
  );
}

export default ManualAttendance;

