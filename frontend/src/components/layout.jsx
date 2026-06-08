import { Link, useLocation, useNavigate } from "react-router-dom";

function Layout({ role, children }) {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem("user"));

  function logout() {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/");
  }

  function isActive(path) {
    return location.pathname === path ? "active" : "";
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="brand">
          <h2>FaceAttend</h2>
          <p>{role === "admin" ? "Admin Console" : "Teacher Console"}</p>
        </div>

        <nav>
          <Link
            className={isActive(role === "admin" ? "/admin" : "/teacher")}
            to={role === "admin" ? "/admin" : "/teacher"}
          >
            Dashboard
          </Link>

          <Link className={isActive("/students")} to="/students">
            Students
          </Link>

          <Link className={isActive("/attendance")} to="/attendance">
            Attendance
          </Link>

          {role === "admin" && (
            <>
              <Link className={isActive("/teachers")} to="/teachers">
                Teachers
              </Link>

              <Link className={isActive("/assignments")} to="/assignments">
                Assignments
              </Link>
            </>
          )}

          <Link className={isActive("/take-attendance")} to="/take-attendance">
            Take Attendance
          </Link>

          <Link className={isActive("/manual-attendance")} to="/manual-attendance">
            Manual Attendance
          </Link>
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