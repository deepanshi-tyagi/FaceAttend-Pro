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
    <div className="professional-login-page">
      <div className="professional-login-container">
        <section className="professional-login-brand">
          <div className="brand-mark">FaceAttend-Pro</div>

          <div className="brand-content">
            <h1>Attendance Management System</h1>
            <p>
              Secure role-based attendance tracking for administrators,
              teachers, and students.
            </p>
          </div>

          <div className="brand-footer">
            <span>Face Recognition</span>
            <span>Manual Attendance</span>
            <span>Reports</span>
          </div>
        </section>

        <section className="professional-login-card">
          <div className="login-title-block">
            <h2>Sign in</h2>
            <p>Access your dashboard using your assigned credentials.</p>
          </div>

          {message && <div className="professional-login-alert">{message}</div>}

          <form onSubmit={handleLogin} autoComplete="off" className="professional-login-form">
            <div className="professional-field">
              <label>Role</label>
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

            <div className="professional-field">
              <label>{role === "student" ? "Student ID" : "Username"}</label>
              <input
                type="text"
                placeholder={role === "student" ? "Enter student ID" : "Enter username"}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="off"
                required
              />
            </div>

            <div className="professional-field">
              <label>Password</label>
              <input
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" className="professional-login-button">
              Continue
            </button>
          </form>

          <div className="credential-note">
          {role === "admin" && <p>Sign in using your administrator account.</p>}

          {role === "teacher" && (
            <p>Use the credentials provided by the administrator.</p>
          )}

          {role === "student" && (
            <p>Use your Student ID and assigned password to continue.</p>
          )}
        </div>
        </section>
      </div>
    </div>
  );
}

export default Login;