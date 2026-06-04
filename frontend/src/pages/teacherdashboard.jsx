import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";

function TeacherDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [cards, setCards] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [message, setMessage] = useState("");

  async function fetchDashboard() {
    try {
      const response = await api.get("/api/dashboard");
      setCards(response.data.cards);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load dashboard.");
    }
  }

  async function fetchAssignments() {
    try {
      const response = await api.get("/api/my-assignments");
      setAssignments(response.data.assignments);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load assigned subjects.");
    }
  }

  useEffect(() => {
    fetchDashboard();
    fetchAssignments();
  }, []);

  return (
    <Layout role="teacher">
      <div className="page-header">
        <span>Teacher Workspace</span>
        <h1>Teacher Dashboard</h1>
        <p>Welcome, {user?.name}. View your assigned subjects and classes.</p>
      </div>

      {message && <div className="alert info-alert">{message}</div>}

      <div className="card-grid">
        <div className="card">
          <span>Assigned Classes</span>
          <h2>{cards?.assigned_classes ?? "--"}</h2>
        </div>

        <div className="card">
          <span>Assigned Students</span>
          <h2>{cards?.assigned_students ?? "--"}</h2>
        </div>

        <div className="card">
          <span>Total Attendance</span>
          <h2>{cards?.total_attendance ?? "--"}</h2>
        </div>
      </div>

      <div className="section-card">
        <div className="table-header">
          <div>
            <h2>My Assigned Subjects</h2>
            <p>Subjects and class sections assigned by admin.</p>
          </div>
        </div>

        {assignments.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Subject</th>
                <th>Branch</th>
                <th>Section</th>
                <th>Students</th>
              </tr>
            </thead>

            <tbody>
              {assignments.map((assignment, index) => (
                <tr key={assignment.id}>
                  <td>{index + 1}</td>
                  <td>{assignment.subject}</td>
                  <td>{assignment.branch}</td>
                  <td>{assignment.section}</td>
                  <td>{assignment.student_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <h3>No subject assigned yet</h3>
            <p>Please contact admin to assign a subject and class.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default TeacherDashboard;