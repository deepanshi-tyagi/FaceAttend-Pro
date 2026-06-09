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
  });

  async function fetchClasses() {
    try {
      const response = await api.get("/api/take-attendance/classes");
      setClasses(response.data.classes);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load classes.");
    }
  }

  useEffect(() => {
    fetchClasses();
  }, []);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleLoadStudents(e) {
    e.preventDefault();
    setMessage("");
    setStudents([]);
    setAssignmentInfo(null);

    try {
      const response = await api.post("/api/manual-attendance/students", {
        assignment_id: Number(form.assignment_id),
        lecture_no: form.lecture_no,
      });

      setStudents(response.data.students);
      setAssignmentInfo(response.data.assignment);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load students.");
    }
  }

  function updateStatus(studentId, status) {
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

    if (!assignmentInfo || students.length === 0) {
      setMessage("Please load students first.");
      return;
    }

    const attendancePayload = students.map((student) => ({
      student_id: student.student_id,
      status: student.status,
    }));

    try {
      const response = await api.post("/api/manual-attendance/save", {
        assignment_id: assignmentInfo.id,
        lecture_no: assignmentInfo.lecture_no,
        attendance: attendancePayload,
      });

      setMessage(`${response.data.message} Records saved: ${response.data.saved_count}`);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to save attendance.");
    }
  }

  return (
    <Layout role={user?.role}>
      <div className="page-header">
        <span>Manual Attendance</span>
        <h1>Manual Attendance</h1>
        <p>
          Select class and lecture, then mark students Present or Absent manually.
        </p>
      </div>

      {message && <div className="alert info-alert">{message}</div>}

      <div className="section-card">
        <h2>Select Class and Lecture</h2>

        {classes.length > 0 ? (
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
                  {user?.role === "admin" ? ` - ${item.teacher_name}` : ""}
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
              <option value="Lab">Lab</option>
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

            <button type="submit" className="primary-btn">
              Load Students
            </button>
          </form>
        ) : (
          <div className="empty-state">
            <h3>No classes found</h3>
            <p>No assigned classes are available for attendance.</p>
          </div>
        )}
      </div>

      {assignmentInfo && (
        <div className="section-card">
          <div className="table-header">
            <div>
              <h2>
                {assignmentInfo.subject} - {assignmentInfo.branch}{" "}
                {assignmentInfo.section}
              </h2>
              <p>{assignmentInfo.lecture_no}</p>
            </div>

            <div className="action-buttons">
              <button className="secondary-btn" onClick={() => markAll("Present")}>
                Mark All Present
              </button>

              <button className="danger-btn" onClick={() => markAll("Absent")}>
                Mark All Absent
              </button>
            </div>
          </div>

          {students.length > 0 ? (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>S.No.</th>
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
                      <td>
                        <strong>{student.name}</strong>
                        <br />
                        <small>{student.email || "-"}</small>
                      </td>
                      <td>{student.branch}</td>
                      <td>{student.section}</td>
                      <td>
                        <div className="status-toggle">
                          <button
                            className={
                              student.status === "Present"
                                ? "present-btn active"
                                : "present-btn"
                            }
                            onClick={() => updateStatus(student.student_id, "Present")}
                          >
                            Present
                          </button>

                          <button
                            className={
                              student.status === "Absent"
                                ? "absent-btn active"
                                : "absent-btn"
                            }
                            onClick={() => updateStatus(student.student_id, "Absent")}
                          >
                            Absent
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                className="primary-btn"
                style={{ marginTop: "18px" }}
                onClick={handleSaveAttendance}
              >
                Save Attendance
              </button>
            </>
          ) : (
            <div className="empty-state">
              <h3>No students found</h3>
              <p>No students are available in this branch and section.</p>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

export default ManualAttendance;