import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import api from "../api/axios";

function Attendance() {
  const user = JSON.parse(localStorage.getItem("user"));

  const [attendance, setAttendance] = useState([]);
  const [search, setSearch] = useState("");
  const [message, setMessage] = useState("");

  const [selectedStudent, setSelectedStudent] = useState(null);
  const [studentAttendance, setStudentAttendance] = useState([]);

  useEffect(() => {
    fetchAttendance();
  }, []);

  async function fetchAttendance() {
    try {
      const response = await api.get("/api/today-attendance");
      setAttendance(response.data.attendance || []);
    } catch (error) {
      setMessage("Unable to load attendance records.");
    }
  }

  async function fetchStudentAttendance(studentId) {
    setMessage("");

    try {
      const response = await api.get(`/api/students/${studentId}/attendance`);

      setSelectedStudent(response.data.student);
      setStudentAttendance(response.data.attendance || []);
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Unable to load student attendance."
      );
    }
  }

  async function handleExportCSV() {
    try {
      const response = await api.get("/api/export-attendance-csv", {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");

      link.href = url;
      link.setAttribute("download", "attendance_report.csv");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setMessage("Unable to export CSV.");
    }
  }

  async function handleStatusUpdate(recordId, currentStatus) {
    const newStatus = currentStatus === "Present" ? "Absent" : "Present";

    const confirmUpdate = window.confirm(
      `Change attendance status to ${newStatus}? This is allowed only within 5 days.`
    );

    if (!confirmUpdate) return;

    try {
      const response = await api.put(`/api/attendance/${recordId}/status`, {
        status: newStatus,
      });

      setMessage(response.data.message);
      fetchAttendance();

      if (selectedStudent) {
        fetchStudentAttendance(selectedStudent.student_id);
      }
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Unable to update attendance status."
      );
    }
  }

  function getTimeSlot(record) {
    if (record.lecture_start_time && record.lecture_end_time) {
      return `${record.lecture_start_time} - ${record.lecture_end_time}`;
    }

    return "Not saved";
  }

  const filteredAttendance = attendance.filter((record) => {
    const keyword = search.toLowerCase();

    return (
      record.student_id?.toLowerCase().includes(keyword) ||
      record.student_name?.toLowerCase().includes(keyword) ||
      record.branch?.toLowerCase().includes(keyword) ||
      record.section?.toLowerCase().includes(keyword) ||
      record.subject?.toLowerCase().includes(keyword) ||
      record.lecture_no?.toLowerCase().includes(keyword) ||
      record.date?.toLowerCase().includes(keyword) ||
      record.time?.toLowerCase().includes(keyword) ||
      record.status?.toLowerCase().includes(keyword) ||
      record.teacher_name?.toLowerCase().includes(keyword)
    );
  });

  return (
    <Layout role={user?.role}>
      <div className="page-header">
        <span>Attendance Records</span>
        <h1>Attendance</h1>
        <p>
          View attendance records and click a student to see complete attendance
          details.
        </p>
      </div>

      {message && <div className="alert info-alert">{message}</div>}

      <div className="section-card">
        <div className="table-header">
          <div>
            <h2>Today's Attendance</h2>
           <p>Total Students/Class Records Today: {filteredAttendance.length}</p>
          </div>

          <div className="action-buttons">
            <button className="primary-btn" onClick={handleExportCSV}>
              Export CSV
            </button>
          </div>
        </div>

        <input
          type="text"
          className="search-input"
          placeholder="Search by student, subject, branch, section, lecture, date, status or teacher"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {filteredAttendance.length === 0 ? (
          <div className="empty-state">
            <h3>No attendance records found</h3>
            <p>No records match your search.</p>
          </div>
        ) : (
          <div className="table-responsive">
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
                  <th>Saved Time</th>
                  <th>Status</th>
                  <th>Teacher</th>
                  <th>Action</th>
                </tr>
              </thead>

              <tbody>
                {filteredAttendance.map((record, index) => (
                  <tr key={record.id}>
                    <td>{index + 1}</td>

                    <td>
                      <button
                        type="button"
                        className="student-link-btn"
                        onClick={() =>
                          fetchStudentAttendance(record.student_id)
                        }
                      >
                        {record.student_name}
                      </button>
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
                      {record.status === "Present" ? (
                        <span className="badge-good">Present</span>
                      ) : record.status === "Absent" ? (
                        <span className="badge-low">Absent</span>
                      ) : (
                        <span className="badge-warning">Not Marked</span>
                      )}
                    </td>

                    <td>{record.teacher_name}</td>

                    <td>
                      {record.status === "Not Marked" ? (
                          <span className="badge-warning">Attendance not taken</span>
                        ) : (
                          <button
                            className={
                              record.status === "Present"
                                ? "danger-btn action-small-btn"
                                : "edit-btn action-small-btn"
                            }
                            onClick={() => handleStatusUpdate(record.id, record.status)}
                          >
                            Mark {record.status === "Present" ? "Absent" : "Present"}
                          </button>
                        )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {selectedStudent && (
        <div className="section-card">
          <div className="table-header">
            <div>
              <h2>Student Attendance Details</h2>
              <p>
                {selectedStudent.name} | {selectedStudent.student_id} |{" "}
                {selectedStudent.branch} {selectedStudent.section}
              </p>
            </div>

            <button
              className="secondary-btn"
              onClick={() => {
                setSelectedStudent(null);
                setStudentAttendance([]);
              }}
            >
              Close
            </button>
          </div>

          {studentAttendance.length === 0 ? (
            <div className="empty-state">
              <h3>No attendance found</h3>
              <p>This student has no attendance records yet.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="data-table attendance-detail-table">
                <thead>
                  <tr>
                    <th>S.No.</th>
                    <th>Subject</th>
                    <th>Lecture</th>
                    <th>Time Slot</th>
                    <th>Class Type</th>
                    <th>Date</th>
                    <th>Saved Time</th>
                    <th>Status</th>
                    <th>Teacher</th>
                  </tr>
                </thead>

                <tbody>
                  {studentAttendance.map((record, index) => (
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
      )}
    </Layout>
  );
}

export default Attendance;