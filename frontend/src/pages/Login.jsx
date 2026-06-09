import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api/axios";

function Login() {
  const [role, setRole] = useState("admin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleLogin(e) {
    e.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const response = await api.post("/api/login", {
        role,
        username,
        password,
      });

      if (response.data.success) {
        localStorage.setItem("token", response.data.token);
        localStorage.setItem("user", JSON.stringify(response.data.user));

        if (response.data.user.role === "admin") {
          navigate("/admin");
        } else {
          navigate("/teacher");
        }
      }
    } catch (error) {
      setMessage(error.response?.data?.message || "Login failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-screen">
      <div className="login-card">
        <h1>FaceAttend Pro</h1>
        <p>Login as Admin or Teacher</p>

        {message && <div className="alert">{message}</div>}

        <form onSubmit={handleLogin} autoComplete="off">
          <div className="role-tabs">
            <button
              type="button"
              className={role === "admin" ? "role-tab active" : "role-tab"}
              onClick={() => setRole("admin")}
            >
              Admin
            </button>

            <button
              type="button"
              className={role === "teacher" ? "role-tab active" : "role-tab"}
              onClick={() => setRole("teacher")}
            >
              Teacher
            </button>
          </div>

         <input
           type="text"
           placeholder="Username"
           value={username}
           onChange={(e) => setUsername(e.target.value)}
           autoComplete="off"
           required
         />

          <input
           type="password"
           placeholder="Password"
           value={password}
           onChange={(e) => setPassword(e.target.value)}
           autoComplete="new-password"
           required
          />

          <button type="submit" className="primary-btn" disabled={loading}>
            {loading ? "Logging in..." : "Login"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;