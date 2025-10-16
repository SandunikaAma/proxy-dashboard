import React, { useEffect, useState } from "react";
import { Link, Routes, Route, Navigate } from "react-router-dom";
import Overview from "./pages/Overview";
import TrafficMonitoring from "./pages/TrafficMonitoring";
import UserManagement from "./pages/UserManagement";
import SecurityAlerts from "./pages/SecurityAlerts";
import HistoryView from "./pages/HistoryView";
import Settings from "./pages/Settings";
import Recommendations from "./pages/Recommendations";
import "./DashboardLayout.css";

export default function DashboardLayout({ user }) {
  const [version, setVersion] = useState("1");
  const [theme, setTheme] = useState("light");
  const [userInfo, setUserInfo] = useState({ username: "", role: "" });
  const [speedData, setSpeedData] = useState({
    ip: "",
    download: null,
    upload: null,
    loading: false,
  });

  // Fetch settings
  useEffect(() => {
    if (!user) return;
    fetch(`http://localhost:3004/api/settings/${user}`)
      .then((res) => res.json())
      .then((data) => {
        setVersion(data.version || "1");
        setTheme(data.theme || "light");
        document.body.setAttribute("data-theme", data.theme || "light");
      })
      .catch(() => {
        setVersion("1");
        setTheme("light");
        document.body.setAttribute("data-theme", "light");
      });
  }, [user]);

  // Fetch logged-in user info
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) return;
    fetch("http://localhost:3004/api/user/status", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.username) {
          setUserInfo({ username: data.username, role: data.role });
        }
      });
  }, []);


  // Apply theme immediately
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <div className="dashboard-container">
      {/* Navigation Bar */}
      <nav className="navbar">
        <h2 className="nav-title">Proxy Monitoring Dashboard</h2>
        <div className="nav-links">
          <Link to="">Dashboard</Link>
          <Link to="traffic">Traffic Monitoring</Link>
          <Link to="users">User Management</Link>
          <Link to="alerts">Security Alerts & Logs</Link>
          <Link to="history">History View</Link>
          {version === "2" && <Link to="recommendations">Recommendations</Link>}
          <Link to="settings">Settings</Link>
        </div>
      </nav>

      {/* Logged-in User Section */}
      {userInfo.username && (
        <div className="user-info-banner">
          <h3>
            👤 Logged in as: <span>{userInfo.username}</span>{" "}
            <small>({userInfo.role})</small>
          </h3>
        </div>
      )}


      {/* Main Content */}
      <div className="content">
        <Routes>
          <Route path="" element={<Overview />} />
          <Route path="traffic" element={<TrafficMonitoring />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="alerts" element={<SecurityAlerts />} />
          <Route path="history" element={<HistoryView />} />
          <Route
            path="settings"
            element={
              <Settings
                user={user}
                version={version}
                setVersion={setVersion}
                theme={theme}
                setTheme={setTheme}
              />
            }
          />
          {version === "2" && <Route path="recommendations" element={<Recommendations />} />}
          <Route path="*" element={<Navigate to="" />} />
        </Routes>
      </div>
    </div>
  );
}
