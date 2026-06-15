import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";

function StudentDashboard() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [student, setStudent] = useState(null);
  const [summary, setSummary] = useState({});
  const [attendance, setAttendance] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [message, setMessage] = useState("");

  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();

  useEffect(() => {
    fetchMyAttendance();
  }, []);

  async function fetchMyAttendance() {
    try {
      const response = await api.get("/api/student/my-attendance");

      setStudent(response.data.student);
      setSummary(response.data.summary || {});
      setAttendance(response.data.attendance || []);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Unable to load attendance."
      );
    }
  }

  function formatDate(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");

    return `${yyyy}-${mm}-${dd}`;
  }

  function getDaysInMonth() {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];

    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }

    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }

  function getRecordsForDate(dateString) {
    return attendance.filter((record) => record.date === dateString);
  }

  function getDateStatus(dateString) {
    const records = getRecordsForDate(dateString);

    if (records.length === 0) {
      return "not-marked";
    }

    const hasPresent = records.some((record) => record.status === "Present");
    const hasAbsent = records.some((record) => record.status === "Absent");

    if (hasPresent && hasAbsent) {
      return "mixed";
    }

    if (hasPresent) {
      return "present";
    }

    if (hasAbsent) {
      return "absent";
    }

    return "not-marked";
  }

  function getTimeSlot(record) {
    if (record.lecture_start_time && record.lecture_end_time) {
      return `${record.lecture_start_time} - ${record.lecture_end_time}`;
    }

    return "Not saved";
  }

  const selectedRecords = selectedDate ? getRecordsForDate(selectedDate) : [];

  return (
    <Layout role={user?.role}>
      <div className="page-header dashboard-hero">
        <span>Student Dashboard</span>
        <h1>Welcome, {student?.name || user?.name}</h1>
        <p>
          View your attendance calendar, subject records, and attendance summary.
        </p>
      </div>

      {message && <div className="alert info-alert">{message}</div>}

      <div className="card-grid dashboard-card-grid">
        <div className="card">
          <span>Present</span>
          <h2>{summary.present || 0}</h2>
        </div>

        <div className="card">
          <span>Absent</span>
          <h2>{summary.absent || 0}</h2>
        </div>

        <div className="card">
          <span>Total Classes</span>
          <h2>{summary.total || 0}</h2>
        </div>

        <div className="card">
          <span>Attendance %</span>
          <h2>{summary.percentage || 0}%</h2>
        </div>
      </div>

      <div className="section-card">
        <div className="table-header">
          <div>
            <h2>Attendance Calendar</h2>
            <p>
              Click a date to view all attendance records for that day.
            </p>
          </div>

          <button className="secondary-btn" onClick={fetchMyAttendance}>
            Refresh
          </button>
        </div>

        <div className="calendar-legend">
          <span className="legend-item present-dot">Present</span>
          <span className="legend-item absent-dot">Absent</span>
          <span className="legend-item mixed-dot">Mixed</span>
          <span className="legend-item not-marked-dot">Not Marked</span>
        </div>

        <div className="calendar-grid">
          <div className="calendar-day-name">Sun</div>
          <div className="calendar-day-name">Mon</div>
          <div className="calendar-day-name">Tue</div>
          <div className="calendar-day-name">Wed</div>
          <div className="calendar-day-name">Thu</div>
          <div className="calendar-day-name">Fri</div>
          <div className="calendar-day-name">Sat</div>

          {getDaysInMonth().map((date, index) => {
            if (!date) {
              return <div key={`empty-${index}`} className="calendar-empty"></div>;
            }

            const dateString = formatDate(date);
            const status = getDateStatus(dateString);

            return (
              <button
                key={dateString}
                className={`calendar-date ${status}`}
                onClick={() => setSelectedDate(dateString)}
              >
                <strong>{date.getDate()}</strong>
                <span>{status.replace("-", " ")}</span>
              </button>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className="section-card">
          <div className="table-header">
            <div>
              <h2>Attendance Details</h2>
              <p>Date: {selectedDate}</p>
            </div>

            <button
              className="secondary-btn"
              onClick={() => setSelectedDate(null)}
            >
              Close
            </button>
          </div>

          {selectedRecords.length === 0 ? (
            <div className="empty-state">
              <h3>Attendance not marked</h3>
              <p>No attendance record is available for this date.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>S.No.</th>
                    <th>Subject</th>
                    <th>Lecture</th>
                    <th>Time Slot</th>
                    <th>Class Type</th>
                    <th>Status</th>
                    <th>Teacher</th>
                    <th>Saved Time</th>
                  </tr>
                </thead>

                <tbody>
                  {selectedRecords.map((record, index) => (
                    <tr key={record.id}>
                      <td>{index + 1}</td>
                      <td>{record.subject}</td>
                      <td>{record.lecture_no}</td>
                      <td>{getTimeSlot(record)}</td>

                      <td>
                        {record.is_extra_class ? (
                          <span className="badge-warning">Extra Class</span>
                        ) : (
                          <span className="badge-good">Regular</span>
                        )}
                      </td>

                      <td>
                        {record.status === "Present" ? (
                          <span className="badge-good">Present</span>
                        ) : (
                          <span className="badge-low">Absent</span>
                        )}
                      </td>

                      <td>{record.teacher_name}</td>
                      <td>{record.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Layout>
  );
}

export default StudentDashboard;