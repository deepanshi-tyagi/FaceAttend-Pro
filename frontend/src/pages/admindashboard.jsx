import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";

import { Doughnut } from "react-chartjs-2";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(ArcElement, Tooltip, Legend);

function AdminDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [cards, setCards] = useState({});
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [message, setMessage] = useState("");

  const [todayStats, setTodayStats] = useState({
    present: 0,
    absent: 0,
    notMarked: 0,
  });

  useEffect(() => {
    fetchDashboard();
    fetchTodayAttendance();
  }, []);

  async function fetchDashboard() {
    try {
      const response = await api.get("/api/dashboard");

      setCards(response.data.cards || {});
      setRecentAttendance(response.data.recent_attendance || []);
      setMessage("");
    } catch (error) {
      setMessage("Unable to load dashboard data.");
    }
  }

  async function fetchTodayAttendance() {
    try {
      const response = await api.get("/api/today-attendance");
      const records = response.data.attendance || [];

      const present = records.filter(
        (record) => record.status === "Present"
      ).length;

      const absent = records.filter(
        (record) => record.status === "Absent"
      ).length;

      const notMarked = records.filter(
        (record) => record.status === "Not Marked"
      ).length;

      setTodayStats({
        present,
        absent,
        notMarked,
      });
    } catch (error) {
      console.log("Unable to load today attendance chart data.");
    }
  }

  async function handleRefreshDashboard() {
    await fetchDashboard();
    await fetchTodayAttendance();
  }

  const attendanceChartData = {
    labels: ["Present", "Absent", "Not Marked"],
    datasets: [
      {
        data: [todayStats.present, todayStats.absent, todayStats.notMarked],
        backgroundColor: ["#16a34a", "#dc2626", "#f59e0b"],
        borderWidth: 0,
      },
    ],
  };

  const attendanceChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
      },
    },
  };

  return (
    <Layout role={user?.role}>
      <div className="page-header dashboard-hero">
        <span>Admin Dashboard</span>
        <h1>Welcome, {user?.name}</h1>
        <p>
          Monitor students, teachers, class assignments, and attendance activity
          from one professional dashboard.
        </p>
      </div>

      {message && <div className="alert info-alert">{message}</div>}

      <div className="card-grid dashboard-card-grid">
        <div className="card">
          <span>Total Students</span>
          <h2>{cards.total_students || 0}</h2>
        </div>

        <div className="card">
          <span>Total Teachers</span>
          <h2>{cards.total_teachers || 0}</h2>
        </div>

        <div className="card">
          <span>Total Assignments</span>
          <h2>{cards.total_assignments || 0}</h2>
        </div>

        <div className="card">
          <span>Total Attendance</span>
          <h2>{cards.total_attendance || 0}</h2>
        </div>
      </div>

      <div className="card-grid dashboard-card-grid">
        <div className="card">
          <span>Present Today</span>
          <h2>{cards.present_today || 0}</h2>
        </div>

        <div className="card">
          <span>Absent Today</span>
          <h2>{cards.absent_today || 0}</h2>
        </div>

        <div className="card">
          <span>Recent Records</span>
          <h2>{cards.recent_count || 0}</h2>
        </div>

        <div className="card">
          <span>System Role</span>
          <h2>Admin</h2>
        </div>
      </div>

      <div className="section-card chart-card">
        <div className="table-header">
          <div>
            <h2>Today Attendance Overview</h2>
            <p>Present vs Absent vs Not Marked attendance status for today.</p>
          </div>

          <button className="secondary-btn" onClick={handleRefreshDashboard}>
            Refresh
          </button>
        </div>

        <div className="chart-wrapper">
          <Doughnut data={attendanceChartData} options={attendanceChartOptions} />
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="section-card">
          <div className="table-header">
            <div>
              <h2>Recent Attendance</h2>
              <p>Latest attendance activity across all classes.</p>
            </div>

            <button className="secondary-btn" onClick={handleRefreshDashboard}>
              Refresh
            </button>
          </div>

          {recentAttendance.length === 0 ? (
            <div className="empty-state">
              <h3>No recent attendance</h3>
              <p>No attendance records have been marked yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>S.No.</th>
                    <th>Student</th>
                    <th>Subject</th>
                    <th>Lecture</th>
                    <th>Date</th>
                    <th>Time</th>
                    <th>Status</th>
                    <th>Teacher</th>
                  </tr>
                </thead>

                <tbody>
                  {recentAttendance.map((record, index) => (
                    <tr key={record.id}>
                      <td>{index + 1}</td>

                      <td>
                        <strong>{record.student_name}</strong>
                        <br />
                        <small>{record.student_id}</small>
                      </td>

                      <td>{record.subject}</td>
                      <td>{record.lecture_no}</td>
                      <td>{record.date}</td>
                      <td>{record.time}</td>

                      <td>
                        {record.status === "Present" ? (
                          <span className="badge-good">Present</span>
                        ) : record.status === "Absent" ? (
                          <span className="badge-low">Absent</span>
                        ) : (
                          <span className="badge-warning">Not Marked</span>
                        )}
                      </td>

                      <td>{record.teacher_name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="section-card dashboard-info-card">
          <h2>Quick Overview</h2>

          <div className="overview-list">
            <div>
              <span>Student Management</span>
              <strong>Add, edit, delete, and manage student records.</strong>
            </div>

            <div>
              <span>Teacher Management</span>
              <strong>Create teacher accounts and update details.</strong>
            </div>

            <div>
              <span>Class Assignment</span>
              <strong>Assign subject, branch, and section to teachers.</strong>
            </div>

            <div>
              <span>Attendance Reports</span>
              <strong>Export attendance records using CSV and PDF.</strong>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}

export default AdminDashboard;