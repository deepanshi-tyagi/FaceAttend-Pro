import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";

function Assignments() {
  const [teachers, setTeachers] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    teacher_id: "",
    subject: "",
    branch: "",
    section: "",
  });

  async function fetchTeachers() {
    try {
      const response = await api.get("/api/teachers");
      setTeachers(response.data.teachers);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load teachers.");
    }
  }

  async function fetchAssignments() {
    try {
      const response = await api.get("/api/assignments");
      setAssignments(response.data.assignments);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load assignments.");
    }
  }

  useEffect(() => {
    fetchTeachers();
    fetchAssignments();
  }, []);

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    try {
      const response = await api.post("/api/assignments", {
        teacher_id: Number(form.teacher_id),
        subject: form.subject,
        branch: form.branch,
        section: form.section,
      });

      setMessage(response.data.message);

      setForm({
        teacher_id: "",
        subject: "",
        branch: "",
        section: "",
      });

      fetchAssignments();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to assign class.");
    }
  }

  async function handleDelete(id) {
    const confirmDelete = window.confirm("Delete this assignment?");

    if (!confirmDelete) return;

    try {
      const response = await api.delete(`/api/assignments/${id}`);
      setMessage(response.data.message);
      fetchAssignments();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to delete assignment.");
    }
  }

  return (
    <Layout role="admin">
      <div className="page-header">
        <span>Teacher Assignment</span>
        <h1>Assignments</h1>
        <p>Assign subjects, branches, and sections to teachers.</p>
      </div>

      {message && <div className="alert info-alert">{message}</div>}

      <div className="section-card">
        <h2>Assign Class to Teacher</h2>

        <form onSubmit={handleSubmit} className="form-grid">
          <select
            name="teacher_id"
            value={form.teacher_id}
            onChange={handleChange}
            required
          >
            <option value="">Select Teacher</option>

            {teachers.map((teacher) => (
              <option key={teacher.id} value={teacher.id}>
                {teacher.name} ({teacher.username})
              </option>
            ))}
          </select>

          <input
            type="text"
            name="subject"
            placeholder="Subject e.g. DAA"
            value={form.subject}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="branch"
            placeholder="Branch e.g. CSE"
            value={form.branch}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="section"
            placeholder="Section e.g. A"
            value={form.section}
            onChange={handleChange}
            required
          />

          <button type="submit" className="primary-btn">
            Assign Class
          </button>
        </form>
      </div>

      <div className="section-card">
        <div className="table-header">
          <div>
            <h2>Assigned Classes</h2>
            <p>Total Assignments: {assignments.length}</p>
          </div>
        </div>

        {assignments.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Teacher</th>
                <th>Username</th>
                <th>Subject</th>
                <th>Branch</th>
                <th>Section</th>
                <th>Action</th>
              </tr>
            </thead>

            <tbody>
              {assignments.map((assignment) => (
                <tr key={assignment.id}>
                  <td>{assignment.id}</td>
                  <td>{assignment.teacher_name}</td>
                  <td>{assignment.teacher_username}</td>
                  <td>{assignment.subject}</td>
                  <td>{assignment.branch}</td>
                  <td>{assignment.section}</td>
                  <td>
                    <button
                      className="danger-btn"
                      onClick={() => handleDelete(assignment.id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <h3>No assignments yet</h3>
            <p>Assign a subject and class to a teacher.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Assignments;