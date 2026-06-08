import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import api from "../api/axios";

function ChangePassword() {
  const user = JSON.parse(localStorage.getItem("user"));
  const navigate = useNavigate();

  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    old_password: "",
    new_password: "",
    confirm_password: "",
  });

  function handleChange(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage("");

    try {
      const response = await api.put("/api/change-password", form);

      setMessage(response.data.message);

      localStorage.removeItem("token");
      localStorage.removeItem("user");

      setTimeout(() => {
        navigate("/");
      }, 1500);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to change password.");
    }
  }

  return (
    <Layout role={user?.role}>
      <div className="page-header">
        <span>Account Security</span>
        <h1>Change Password</h1>
        <p>Update your account password securely using your old password.</p>
      </div>

      {message && <div className="alert info-alert">{message}</div>}

      <div className="section-card">
        <h2>Update Password</h2>

        <form onSubmit={handleSubmit} className="form-grid">
          <input
            type="password"
            name="old_password"
            placeholder="Old Password"
            value={form.old_password}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="new_password"
            placeholder="New Password"
            value={form.new_password}
            onChange={handleChange}
            required
          />

          <input
            type="password"
            name="confirm_password"
            placeholder="Confirm New Password"
            value={form.confirm_password}
            onChange={handleChange}
            required
          />

          <button type="submit" className="primary-btn">
            Change Password
          </button>
        </form>
      </div>
    </Layout>
  );
}

export default ChangePassword;