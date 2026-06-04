import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";

function AdminDashboard() {
  const [cards, setCards] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const response = await api.get("/api/dashboard");
        setCards(response.data.cards);
      } catch (error) {
        setMessage(error.response?.data?.message || "Unable to load dashboard.");
      }
    }

    fetchDashboard();
  }, []);

  return (
    <Layout role="admin">
      <div className="page-header">
        <span>Attendance Management</span>
        <h1>Admin Dashboard</h1>
        <p>Manage teachers, students, attendance, and system reports.</p>
      </div>

      {message && <div className="alert">{message}</div>}

      <div className="card-grid">
        <div className="card">
          <span>Total Students</span>
          <h2>{cards?.total_students ?? "--"}</h2>
        </div>

        <div className="card">
          <span>Total Teachers</span>
          <h2>{cards?.total_teachers ?? "--"}</h2>
        </div>

        <div className="card">
          <span>Total Assignments</span>
          <h2>{cards?.total_assignments ?? "--"}</h2>
        </div>

        <div className="card">
          <span>Total Attendance</span>
          <h2>{cards?.total_attendance ?? "--"}</h2>
        </div>
      </div>
    </Layout>
  );
}

export default AdminDashboard;