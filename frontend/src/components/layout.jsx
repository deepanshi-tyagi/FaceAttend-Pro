import { Link, useNavigate } from "react-router-dom";

function Layout({ role, children }) {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user"));

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <h2>FaceAttend</h2>
          <p>{role === "admin" ? "Admin Console" : "Teacher Console"}</p>
        </div>

        <nav>
          <Link to={role === "admin" ? "/admin" : "/teacher"}>Dashboard</Link>
          <Link to="/students">Students</Link>
          <Link to="/attendance">Attendance</Link>

          {role === "admin" && (
            <>
              <Link to="/teachers">Teachers</Link>
              <Link to="/assignments">Assignments</Link>
            </>
          )}

          <Link to="/take-attendance">Take Attendance</Link>
          <Link to="/manual-attendance">Manual Attendance</Link>
        </nav>

        <div className="user-box">
          <span>Signed in as</span>
          <strong>{user?.name}</strong>
          <button onClick={logout}>Logout</button>
        </div>
      </aside>

      <main className="main-content">{children}</main>
    </div>
  );
}

export default Layout;