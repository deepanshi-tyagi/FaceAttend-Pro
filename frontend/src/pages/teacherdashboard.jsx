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

function TeacherDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [cards, setCards] = useState({});
  const [assignments, setAssignments] = useState([]);
  const [recentAttendance, setRecentAttendance] = useState([]);
  const [message, setMessage] = useState("");

  useEffect(() => {
      fetchDashboard();
      fetchAssignments();
      fetchTodayAttendance();
    }, []); 

  async function fetchDashboard() {
    try {
      const response = await api.get("/api/dashboard");

      setCards(response.data.cards || {});
      setRecentAttendance(response.data.recent_attendance || []);
    } catch (error) {
      setMessage("Unable to load dashboard data.");
    }
  }

  async function fetchAssignments() {
    try {
      const response = await api.get("/api/my-assignments");
      setAssignments(response.data.assignments || []);
    } catch (error) {
      setMessage("Unable to load assigned classes.");
    }
  }

  const [todayStats, setTodayStats] = useState({
  present: 0,
  absent: 0,
  notMarked: 0,
});

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

const attendanceChartData = {
  labels: ["Present", "Absent", "Not Marked"],
  datasets: [
    {
      data: [
        todayStats.present,
        todayStats.absent,
        todayStats.notMarked,
      ],
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
        <span>Teacher Dashboard</span>
        <h1>Welcome, {user?.name}</h1>
        <p>
          Track your assigned classes, students, subjects, and attendance
          activity from one dashboard.
        </p>
      </div>

      {message && <div className="alert info-alert">{message}</div>}

      <div className="card-grid dashboard-card-grid">
        <div className="card">
          <span>Assigned Classes</span>
          <h2>{cards.assigned_classes || 0}</h2>
        </div>

        <div className="card">
          <span>Assigned Students</span>
          <h2>{cards.assigned_students || 0}</h2>
        </div>

        <div className="card">
          <span>Total Attendance</span>
          <h2>{cards.total_attendance || 0}</h2>
        </div>

        <div className="card">
          <span>Recent Records</span>
          <h2>{cards.recent_count || 0}</h2>
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
          <span>Teacher Role</span>
          <h2>Active</h2>
        </div>

        <div className="card">
          <span>Account</span>
          <h2>{user?.username}</h2>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="section-card">
          <div className="table-header">
            <div>
              <h2>My Assigned Subjects</h2>
              <p>Classes and subjects assigned to you by admin.</p>
            </div>
          </div>

          <div className="section-card chart-card">
            <div className="table-header">
              <div>
                <h2>Today Attendance Overview</h2>
                <p>Your assigned class attendance status for today.</p>
              </div>
            </div>

            <div className="chart-wrapper">
              <Doughnut data={attendanceChartData} options={attendanceChartOptions} />
            </div>
          </div>

          {assignments.length === 0 ? (
            <div className="empty-state">
              <h3>No assigned classes</h3>
              <p>No subject or class has been assigned to you yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
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
                  {assignments.map((item, index) => (
                    <tr key={item.id}>
                      <td>{index + 1}</td>
                      <td>{item.subject}</td>
                      <td>{item.branch}</td>
                      <td>{item.section}</td>
                      <td>{item.student_count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="section-card dashboard-info-card">
          <h2>Quick Actions</h2>

          <div className="overview-list">
            <div>
              <span>Take Attendance</span>
              <strong>
                Start camera-based attendance for your assigned classes.
              </strong>
            </div>

            <div>
              <span>Manual Attendance</span>
              <strong>
                Mark attendance manually when face recognition is not suitable.
              </strong>
            </div>

            <div>
              <span>Students</span>
              <strong>
                View students from only your assigned branch and section.
              </strong>
            </div>

            <div>
              <span>Change Password</span>
              <strong>
                Update your own password securely from your account.
              </strong>
            </div>
          </div>
        </div>
      </div>

      <div className="section-card">
        <div className="table-header">
          <div>
            <h2>Recent Attendance Taken By Me</h2>
            <p>Latest attendance records marked from your account.</p>
          </div>
        </div>

        {recentAttendance.length === 0 ? (
          <div className="empty-state">
            <h3>No recent attendance</h3>
            <p>You have not marked any attendance yet.</p>
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
                      ) : (
                        <span className="badge-low">Absent</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default TeacherDashboard;