import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";

function TeacherDashboard() {
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
    <Layout role="teacher">
      <div className="page-header">
        <span>Teacher Workspace</span>
        <h1>Teacher Dashboard</h1>
        <p>Take attendance and view records for assigned classes.</p>
      </div>

      {message && <div className="alert">{message}</div>}

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
    </Layout>
  );
}

export default TeacherDashboard;