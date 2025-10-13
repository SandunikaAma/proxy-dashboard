import React, { useState, useEffect } from "react";
import "./AuthPage.css";
import { useNavigate } from "react-router-dom";
import io from "socket.io-client";

const socket = io("http://localhost:3004");

export default function AuthPage() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [formData, setFormData] = useState({ name: "", role: "", password: "" });
  const [userStatus, setUserStatus] = useState(null);

  const handleChange = (e) =>
    setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    const endpoint = isLogin ? "/api/login" : "/api/signup";

    try {
      const res = await fetch(`http://localhost:3004${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();

      if (res.ok) {
        alert(data.message);

        if (data.token) {
          localStorage.setItem("token", data.token);

          // Notify backend via Socket.IO
          socket.emit("user:login", data.token);

          navigate("/dashboard");

          // Fetch user status every second
          fetchUserStatus(); // immediate fetch
          const interval = setInterval(fetchUserStatus, 1000);
          window.addEventListener("beforeunload", () => clearInterval(interval));
        }
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert("Server error");
    }
  };

  const fetchUserStatus = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const res = await fetch("http://localhost:3004/api/user/status", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const status = await res.json();
        setUserStatus(status);
      }
    } catch (err) {
      console.error("Error fetching user status:", err);
    }
  };

  const handleForgotPassword = async () => {
    const username = prompt("Enter your username:");
    if (!username) return;

    try {
      const res = await fetch("http://localhost:3004/api/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: username }),
      });
      const data = await res.json();
      alert(data.message);
    } catch (err) {
      console.error(err);
      alert("Error contacting server");
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2 className="auth-title">{isLogin ? "Login" : "Sign Up"}</h2>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <>
              <input
                type="text"
                name="name"
                placeholder="Full Name"
                value={formData.name}
                onChange={handleChange}
                className="auth-input"
                required
              />
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="auth-select"
                required
              >
                <option value="">Select Role</option>
                <option value="engineer">Engineer</option>
                <option value="ethical-hacker">Ethical Hacker</option>
                <option value="admin">Admin</option>
              </select>
            </>
          )}

          <input
            type="text"
            name="name"
            placeholder="Username"
            value={formData.name}
            onChange={handleChange}
            className="auth-input"
            required
          />

          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="auth-input"
            required
          />

          <button type="submit" className="auth-btn">
            {isLogin ? "Login" : "Sign Up"}
          </button>
        </form>

        <div className="auth-links">
          <button onClick={() => setIsLogin(!isLogin)}>
            {isLogin ? "Need an account? Sign Up" : "Already have an account? Login"}
          </button>
          <button onClick={handleForgotPassword}>Forgot Password?</button>
        </div>

        {userStatus && (
          <div className="user-status">
            <h4>
              Welcome, {userStatus.username} ({userStatus.role})
            </h4>
            <p>Accessing Sites:</p>
            <ul>
              {userStatus.accessingSites.map((site, idx) => (
                <li key={idx}>{site}</li>
              ))}
            </ul>
            <small>Last updated: {new Date(userStatus.timestamp).toLocaleTimeString()}</small>
          </div>
        )}
      </div>
    </div>
  );
}
