import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";

function Teachers() {
  const [teachers, setTeachers] = useState([]);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    username: "",
    password: "",
    department: "",
  });

  const [editingTeacher, setEditingTeacher] = useState(null);

const [editForm, setEditForm] = useState({
  name: "",
  email: "",
  username: "",
  password: "",
  department: "",
});

  async function fetchTeachers() {
    try {
      const response = await api.get("/api/teachers");
      setTeachers(response.data.teachers);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load teachers.");
    }
  }

  useEffect(() => {
    fetchTeachers();
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
      const response = await api.post("/api/teachers", form);
      setMessage(response.data.message);

      setForm({
        name: "",
        email: "",
        username: "",
        password: "",
        department: "",
      });

      fetchTeachers();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to add teacher.");
    }
  }

  async function handleDelete(id) {
    const confirmDelete = window.confirm("Delete this teacher account?");

    if (!confirmDelete) return;

    try {
      const response = await api.delete(`/api/teachers/${id}`);
      setMessage(response.data.message);
      fetchTeachers();
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to delete teacher.");
    }
  }

  function handleEditClick(teacher) {
  setEditingTeacher(teacher);

  setEditForm({
    name: teacher.name,
    email: teacher.email,
    username: teacher.username,
    password: "",
    department: teacher.department || "",
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
  setEditingTeacher(null);

  setEditForm({
    name: "",
    email: "",
    username: "",
    password: "",
    department: "",
  });
}

async function handleUpdateTeacher(e) {
  e.preventDefault();
  setMessage("");

  if (!editingTeacher) {
    setMessage("No teacher selected for editing.");
    return;
  }

  try {
    const response = await api.put(
      `/api/teachers/${editingTeacher.id}`,
      editForm
    );

    setMessage(response.data.message);

    cancelEdit();
    fetchTeachers();
  } catch (error) {
    setMessage(error.response?.data?.message || "Unable to update teacher.");
  }
}

  return (
    <Layout role="admin">
      <div className="page-header">
        <span>Teacher Management</span>
        <h1>Teachers</h1>
        <p>Create and manage individual teacher login accounts.</p>
      </div>

      {message && <div className="alert info-alert">{message}</div>}

      {editingTeacher && (
  <div className="section-card edit-card">
    <h2>Edit Teacher Details</h2>

    <form onSubmit={handleUpdateTeacher} className="form-grid">
      <input
        type="text"
        name="name"
        placeholder="Teacher Name"
        value={editForm.name}
        onChange={handleEditChange}
        required
      />

      <input
        type="email"
        name="email"
        placeholder="Email Address"
        value={editForm.email}
        onChange={handleEditChange}
        required
      />

      <input
        type="text"
        name="username"
        placeholder="Username"
        value={editForm.username}
        onChange={handleEditChange}
        required
      />

      <input
        type="password"
        name="password"
        placeholder="New Password optional"
        value={editForm.password}
        onChange={handleEditChange}
      />

      <input
        type="text"
        name="department"
        placeholder="Department"
        value={editForm.department}
        onChange={handleEditChange}
      />

      <button type="submit" className="primary-btn">
        Update Teacher
      </button>

      <button type="button" className="secondary-btn" onClick={cancelEdit}>
        Cancel
            </button>
          </form>
        </div>
       )}

      <div className="section-card">
        <h2>Add Teacher</h2>

        <form onSubmit={handleSubmit} className="form-grid">
          <input
            type="text"
            name="name"
            placeholder="Teacher Name"
            value={form.name}
            onChange={handleChange}
            required
          />

          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={form.email}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />

          <input
            type="text"
            name="department"
            placeholder="Department"
            value={form.department}
            onChange={handleChange}
          />

          <button type="submit" className="primary-btn">
            Add Teacher
          </button>
        </form>
      </div>

      <div className="section-card">
        <div className="table-header">
          <div>
            <h2>Teacher Accounts</h2>
            <p>Total Teachers: {teachers.length}</p>
          </div>
        </div>

        {teachers.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Name</th>
                <th>Email</th>
                <th>Username</th>
                <th>Department</th>
                <th>Action</th>
              </tr>
            </thead>

  <tbody>
  {teachers.map((teacher, index) => (
    <tr key={teacher.id}>
      <td>{index + 1}</td>
      <td>{teacher.name}</td>
      <td>{teacher.email}</td>
      <td>{teacher.username}</td>
      <td>{teacher.department || "-"}</td>
      <td>
        <div className="action-buttons">
         <button
          className="edit-btn"
          onClick={() => handleEditClick(teacher)}
         >
          Edit
         </button>

         <button
            className="danger-btn"
             onClick={() => handleDelete(teacher.id)}
         >
             Delete
            </button>
           </div>
          </td>
         </tr>
         ))}
      </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <h3>No teachers added yet</h3>
            <p>Add a teacher account to enable teacher login.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Teachers;