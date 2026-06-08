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

  const [editingStudent, setEditingStudent] = useState(null);

const [editForm, setEditForm] = useState({
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
   async function handleCaptureFace(studentId) {
  const confirmCapture = window.confirm(
    "Camera will open and capture face data for this student. Continue?"
  );

  if (!confirmCapture) return;

  setMessage("Opening camera for face capture...");

  try {
    const response = await api.post(`/api/capture-face/${studentId}`);
    setMessage(
      `${response.data.message} Images captured: ${response.data.images_captured}`
    );
  } catch (error) {
    setMessage(error.response?.data?.message || "Unable to capture face data.");
  }
}

async function handleTrainModel() {
  const confirmTrain = window.confirm(
    "Train face recognition model using captured face data?"
  );

  if (!confirmTrain) return;

  setMessage("Training model. Please wait...");

  try {
    const response = await api.post("/api/train-model");
    setMessage(
      `${response.data.message} Faces trained: ${response.data.faces_trained}`
    );
  } catch (error) {
    setMessage(error.response?.data?.message || "Unable to train model.");
  }
}

function handleEditClick(student) {
  setEditingStudent(student);

  setEditForm({
    student_id: student.student_id,
    name: student.name,
    branch: student.branch,
    section: student.section,
    email: student.email || "",
    phone: student.phone || "",
  });

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

function handleEditChange(e) {
  setEditForm({
    ...editForm,
    [e.target.name]: e.target.value,
  });
}

function cancelEdit() {
  setEditingStudent(null);

  setEditForm({
    student_id: "",
    name: "",
    branch: "",
    section: "",
    email: "",
    phone: "",
  });
}

async function handleUpdateStudent(e) {
  e.preventDefault();
  setMessage("");

  if (!editingStudent) {
    setMessage("No student selected for editing.");
    return;
  }

  try {
    const response = await api.put(
      `/api/students/${editingStudent.id}`,
      editForm
    );

    setMessage(response.data.message);

    cancelEdit();
    fetchStudents();
  } catch (error) {
    setMessage(error.response?.data?.message || "Unable to update student.");
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

      {user?.role === "admin" && editingStudent && (
  <div className="section-card edit-card">
    <h2>Edit Student Details</h2>

    <form onSubmit={handleUpdateStudent} className="form-grid">
      <input
        type="text"
        name="student_id"
        placeholder="Student ID"
        value={editForm.student_id}
        onChange={handleEditChange}
        required
      />

      <input
        type="text"
        name="name"
        placeholder="Student Name"
        value={editForm.name}
        onChange={handleEditChange}
        required
      />

      <input
        type="text"
        name="branch"
        placeholder="Branch"
        value={editForm.branch}
        onChange={handleEditChange}
        required
      />

      <input
        type="text"
        name="section"
        placeholder="Section"
        value={editForm.section}
        onChange={handleEditChange}
        required
      />

      <input
        type="email"
        name="email"
        placeholder="Email Address"
        value={editForm.email}
        onChange={handleEditChange}
      />

      <input
        type="text"
        name="phone"
        placeholder="Phone Number"
        value={editForm.phone}
        onChange={handleEditChange}
      />

      <button type="submit" className="primary-btn">
        Update Student
      </button>

      <button type="button" className="secondary-btn" onClick={cancelEdit}>
        Cancel
      </button>
    </form>
  </div>
)}

      {user?.role === "admin" && (
       <div className="section-card">
        <h2>Face Recognition Training</h2>
        <p style={{ color: "#64748b", marginBottom: "16px" }}>
        Capture student face data first, then train the recognition model.
        </p>

      <button className="primary-btn" onClick={handleTrainModel}>
       Train Face Recognition Model
        </button>
         </div>
         )}

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
                       <div className="action-buttons">
                        <button
        className="edit-btn"
        onClick={() => handleEditClick(student)}
      >
        Edit
      </button>

      <button
        className="secondary-btn"
        onClick={() => handleCaptureFace(student.student_id)}
      >
        Capture Face
      </button>

      <button
        className="danger-btn"
        onClick={() => handleDelete(student.id)}
      >
        Delete
      </button>
    </div>
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