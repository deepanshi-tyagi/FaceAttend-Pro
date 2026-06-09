import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";

function TakeAttendance() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [classes, setClasses] = useState([]);
  const [message, setMessage] = useState("");
  const [sessionInfo, setSessionInfo] = useState(null);

  const [form, setForm] = useState({
    assignment_id: "",
    lecture_no: "Lecture 1",
    lecture_start_time: "",
    lecture_end_time: "",

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

  async function handleStart(e) {
    e.preventDefault();
    setMessage("");
    setSessionInfo(null);

    try {
      const response = await api.post("/api/start-attendance", {
      assignment_id: Number(form.assignment_id),
      lecture_no: form.lecture_no,
      lecture_start_time: form.lecture_start_time,
      lecture_end_time: form.lecture_end_time,
   });

      setMessage(response.data.message);
      setSessionInfo(response.data.session);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to start attendance.");
    }
  }
 async function handleCameraStart() {
  if (!sessionInfo) {
    setMessage("Please prepare attendance session first.");
    return;
  }

  setMessage("Starting camera. Please wait...");

  try {
   const response = await api.post("/api/start-camera-attendance", {
     assignment_id: sessionInfo.assignment_id,
     lecture_no: sessionInfo.lecture_no,
     lecture_start_time: sessionInfo.lecture_start_time,
     lecture_end_time: sessionInfo.lecture_end_time,
  });
    setMessage(
      `${response.data.message} Marked: ${response.data.marked_count}`
    );
  } catch (error) {
    setMessage(
      error.response?.data?.message || "Unable to start camera attendance."
    );
  }
}
  return (
    <Layout role={user?.role}>
      <div className="page-header">
        <span>Attendance Session</span>
        <h1>Take Attendance</h1>
        <p>
          Select assigned subject, class section, and lecture before starting attendance.
        </p>
      </div>

      {message && <div className="alert info-alert">{message}</div>}

      <div className="section-card">
        <h2>Start Attendance Session</h2>

        {classes.length > 0 ? (
          <form onSubmit={handleStart} className="form-grid">
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
              Start Attendance
            </button>
          </form>
        ) : (
          <div className="empty-state">
            <h3>No assigned classes</h3>
            <p>
              {user?.role === "teacher"
                ? "No subject or class has been assigned to you yet."
                : "No teacher assignments are available yet."}
            </p>
          </div>
        )}
      </div>

      {sessionInfo && (
        <div className="section-card">
          <h2>Session Ready</h2>

          <div className="session-summary">
            <p>
              <strong>Subject:</strong> {sessionInfo.subject}
            </p>
            <p>
              <strong>Class:</strong> {sessionInfo.branch} {sessionInfo.section}
            </p>
            <p>
              <strong>Lecture:</strong> {sessionInfo.lecture_no}
            </p>
            <p>
              <strong>Total Students:</strong> {sessionInfo.student_count}
            </p>
          </div>

          <button
            className="primary-btn"
            style={{ marginTop: "16px" }}
            onClick={handleCameraStart}
       >
          Start Camera Attendance
          </button>

        </div>
      
      )}
    </Layout>
  );
}

export default TakeAttendance;