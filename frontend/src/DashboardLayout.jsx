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

  // Fetch settings (version + theme) on mount
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

  // Apply theme immediately when it changes
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

      {/* Content */}
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
