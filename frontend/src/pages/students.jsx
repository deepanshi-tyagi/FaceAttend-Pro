import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";

function Students() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    student_id: "",
    name: "",
    branch: "",
    section: "",
    email: "",
    phone: "",
  });

  async function fetchStudents() {
    try {
      const response = await api.get("/api/students");
      setStudents(response.data.students);
      setFilteredStudents(response.data.students);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load students.");
    }
  }

  useEffect(() => {
    fetchStudents();
  }, []);

  function handleSearch(e) {
    const value = e.target.value;
    setSearch(value);

    const lowerValue = value.toLowerCase();

    const filtered = students.filter((student) => {
      return (
        student.student_id.toLowerCase().includes(lowerValue) ||
        student.name.toLowerCase().includes(lowerValue) ||
        student.branch.toLowerCase().includes(lowerValue) ||
        student.section.toLowerCase().includes(lowerValue) ||
        (student.email || "").toLowerCase().includes(lowerValue) ||
        (student.phone || "").toLowerCase().includes(lowerValue)
      );
    });

    setFilteredStudents(filtered);
  }

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
      const response = await api.post("/api/students", form);

      setMessage(response.data.message);

      setForm({
        student_id: "",
        name: "",
        branch: "",
        section: "",
        email: "",
        phone: "",
      });

      fetchStudents();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to add student.");
    }
  }

  async function handleDelete(id) {
    const confirmDelete = window.confirm("Delete this student?");

    if (!confirmDelete) return;

    try {
      const response = await api.delete(`/api/students/${id}`);
      setMessage(response.data.message);
      fetchStudents();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to delete student.");
    }
  }

  return (
    <Layout role={user?.role}>
      <div className="page-header">
        <span>Student Management</span>
        <h1>Students</h1>

        {user?.role === "admin" ? (
          <p>Add, view, and manage student records.</p>
        ) : (
          <p>View students from your assigned branch and section.</p>
        )}
      </div>

      {message && <div className="alert info-alert">{message}</div>}

      {user?.role === "admin" && (
        <div className="section-card">
          <h2>Add Student</h2>

          <form onSubmit={handleSubmit} className="form-grid">
            <input
              type="text"
              name="student_id"
              placeholder="Student ID e.g. 101"
              value={form.student_id}
              onChange={handleChange}
              required
            />

            <input
              type="text"
              name="name"
              placeholder="Student Name"
              value={form.name}
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

            <input
              type="email"
              name="email"
              placeholder="Email Address"
              value={form.email}
              onChange={handleChange}
            />

            <input
              type="text"
              name="phone"
              placeholder="Phone Number"
              value={form.phone}
              onChange={handleChange}
            />

            <button type="submit" className="primary-btn">
              Add Student
            </button>
          </form>
        </div>
      )}

      <div className="section-card">
        <div className="table-header">
          <div>
            <h2>Student Records</h2>
            <p>Total Students: {filteredStudents.length}</p>
          </div>
        </div>

        <input
          className="search-input"
          type="text"
          placeholder="Search by ID, name, branch, section, email or phone"
          value={search}
          onChange={handleSearch}
        />

        {filteredStudents.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Student ID</th>
                <th>Name</th>
                <th>Branch</th>
                <th>Section</th>
                <th>Present</th>
                <th>Absent</th>
                <th>Total</th>
                <th>Attendance %</th>
                {user?.role === "admin" && <th>Action</th>}
              </tr>
            </thead>

            <tbody>
              {filteredStudents.map((student, index) => (
                <tr key={student.id}>
                  <td>{index + 1}</td>
                  <td>{student.student_id}</td>
                  <td>
                    <strong>{student.name}</strong>
                    <br />
                    <small>{student.email || "-"}</small>
                  </td>
                  <td>{student.branch}</td>
                  <td>{student.section}</td>
                  <td>{student.present_count}</td>
                  <td>{student.absent_count}</td>
                  <td>{student.total_records}</td>
                  <td>
                    <span
                      className={
                        student.attendance_percentage >= 75
                          ? "badge-good"
                          : student.attendance_percentage >= 50
                          ? "badge-warning"
                          : "badge-low"
                      }
                    >
                      {student.attendance_percentage}%
                    </span>
                  </td>

                  {user?.role === "admin" && (
                    <td>
                      <button
                        className="danger-btn"
                        onClick={() => handleDelete(student.id)}
                      >
                        Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <h3>No students found</h3>
            <p>
              {user?.role === "admin"
                ? "Add students to start managing attendance."
                : "No students are available for your assigned classes."}
            </p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Students;