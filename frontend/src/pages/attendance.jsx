import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";

function Attendance() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  async function fetchAttendance() {
    try {
      const response = await api.get("/api/attendance");
      setRecords(response.data.attendance);
      setFilteredRecords(response.data.attendance);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load attendance records.");
    }
  }

  useEffect(() => {
    fetchAttendance();
  }, []);

  function handleSearch(e) {
    const value = e.target.value;
    setSearch(value);

    const lowerValue = value.toLowerCase();

    const filtered = records.filter((record) => {
      return (
        record.student_id.toLowerCase().includes(lowerValue) ||
        record.student_name.toLowerCase().includes(lowerValue) ||
        record.branch.toLowerCase().includes(lowerValue) ||
        record.section.toLowerCase().includes(lowerValue) ||
        record.subject.toLowerCase().includes(lowerValue) ||
        record.lecture_no.toLowerCase().includes(lowerValue) ||
        record.date.toLowerCase().includes(lowerValue) ||
        record.status.toLowerCase().includes(lowerValue) ||
        record.teacher_name.toLowerCase().includes(lowerValue)
      );
    });

    setFilteredRecords(filtered);
  }

  return (
    <Layout role={user?.role}>
      <div className="page-header">
        <span>Attendance Records</span>
        <h1>Attendance</h1>

        {user?.role === "admin" ? (
          <p>View all attendance records across teachers, subjects, and classes.</p>
        ) : (
          <p>View attendance records taken by you.</p>
        )}
      </div>

      {message && <div className="alert info-alert">{message}</div>}

      <div className="section-card">
        <div className="table-header">
          <div>
            <h2>Attendance Logs</h2>
            <p>Total Records: {filteredRecords.length}</p>
          </div>
        </div>

        <input
          className="search-input"
          type="text"
          placeholder="Search by student, subject, branch, section, lecture, date, status or teacher"
          value={search}
          onChange={handleSearch}
        />

        {filteredRecords.length > 0 ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>S.No.</th>
                <th>Student</th>
                <th>Branch</th>
                <th>Section</th>
                <th>Subject</th>
                <th>Lecture</th>
                <th>Date</th>
                <th>Time</th>
                <th>Status</th>
                {user?.role === "admin" && <th>Teacher</th>}
              </tr>
            </thead>

            <tbody>
              {filteredRecords.map((record, index) => (
                <tr key={record.id}>
                  <td>{index + 1}</td>

                  <td>
                    <strong>{record.student_name}</strong>
                    <br />
                    <small>{record.student_id}</small>
                  </td>

                  <td>{record.branch}</td>
                  <td>{record.section}</td>
                  <td>{record.subject}</td>
                  <td>{record.lecture_no}</td>
                  <td>{record.date}</td>
                  <td>{record.time}</td>

                  <td>
                    <span
                      className={
                        record.status === "Present"
                          ? "badge-good"
                          : "badge-low"
                      }
                    >
                      {record.status}
                    </span>
                  </td>

                  {user?.role === "admin" && <td>{record.teacher_name}</td>}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="empty-state">
            <h3>No attendance records found</h3>
            <p>Attendance records will appear here after face recognition marking.</p>
          </div>
        )}
      </div>
    </Layout>
  );
}

export default Attendance;