import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function Login() {
  const navigate = useNavigate();

  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }, []);

  async function handleLogin(e) {
    e.preventDefault();
    setMessage("");

    localStorage.removeItem("token");
    localStorage.removeItem("user");

    try {
      const response = await api.post("/api/login", {
        role: role.toLowerCase(),
        username: username.trim(),
        password: password.trim(),
      });

      localStorage.setItem("token", response.data.token);
      localStorage.setItem("user", JSON.stringify(response.data.user));

      const userRole = response.data.user.role;

      if (userRole === "admin") {
        navigate("/admin", { replace: true });
      } else if (userRole === "teacher") {
        navigate("/teacher", { replace: true });
      } else if (userRole === "student") {
        navigate("/student", { replace: true });
      } else {
        navigate("/", { replace: true });
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Login failed.");
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-background-blur auth-blur-one"></div>
      <div className="auth-background-blur auth-blur-two"></div>

      <div className="auth-container">
        <section className="auth-brand-panel">
          <div className="auth-brand-top">
            <div className="auth-logo">FA</div>
            <div>
              <h1>FaceAttend-Pro</h1>
              <p>Smart AI Attendance Platform</p>
            </div>
          </div>

          <div className="auth-hero-content">
            <span>AI-Based Attendance Management</span>
            <h2>Secure attendance tracking for modern classrooms.</h2>
            <p>
              Manage students, teachers, timetable-based attendance, manual
              fallback, reports, and student calendar views from one system.
            </p>
          </div>

          <div className="auth-stats">
            <div>
              <strong>3</strong>
              <span>Role Portals</span>
            </div>

            <div>
              <strong>AI</strong>
              <span>Face Recognition</span>
            </div>

            <div>
              <strong>PDF</strong>
              <span>Reports</span>
            </div>
          </div>

          <div className="auth-feature-grid">
            <div>
              <b>Face Recognition</b>
              <span>Camera-based attendance marking</span>
            </div>

            <div>
              <b>Manual Backup</b>
              <span>Fallback attendance for edge cases</span>
            </div>

            <div>
              <b>Student Calendar</b>
              <span>Daily attendance visibility</span>
            </div>

            <div>
              <b>Role Security</b>
              <span>Admin, teacher, and student access</span>
            </div>
          </div>
        </section>

        <section className="auth-card">
          <div className="auth-card-header">
            <span>Welcome Back</span>
            <h2>Sign in to your account</h2>
            <p>Select your role and continue to your dashboard.</p>
          </div>

          {message && <div className="auth-alert">{message}</div>}

          <form onSubmit={handleLogin} autoComplete="off" className="auth-form">
            <div className="auth-field">
              <label>Login Role</label>
              <select
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setUsername("");
                  setPassword("");
                  setMessage("");
                }}
                required
              >
                <option value="admin">Admin</option>
                <option value="teacher">Teacher</option>
                <option value="student">Student</option>
              </select>
            </div>

            <div className="auth-field">
              <label>{role === "student" ? "Student ID" : "Username"}</label>
              <input
                type="text"
                placeholder={
                  role === "student" ? "Enter Student ID" : "Enter Username"
                }
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            <div className="auth-field">
              <label>Password</label>
              <input
                type="password"
                placeholder={
                  role === "student"
                    ? "Default password is Student ID"
                    : "Enter Password"
                }
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="auth-submit-btn">
              Sign In
            </button>
          </form>

          <div className="auth-helper-card">
            {role === "admin" && (
              <>
                <span>Default Admin Login</span>
                <strong>admin / admin123</strong>
              </>
            )}

            {role === "teacher" && (
              <>
                <span>Teacher Login</span>
                <strong>Use credentials created by Admin</strong>
              </>
            )}

            {role === "student" && (
              <>
                <span>Student Login</span>
                <strong>Student ID / Student ID</strong>
              </>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default Login;