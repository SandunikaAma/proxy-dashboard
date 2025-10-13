import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import axios from "axios";
import "./SecurityAlerts.css";

const socket = io("http://localhost:3004");

const SecurityAlerts = () => {
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [savedAlerts, setSavedAlerts] = useState([]);

  // Fetch initial logs
  useEffect(() => {
    axios.get("http://localhost:3004/api/logs/recent")
      .then(res => setLogs(res.data))
      .catch(err => console.error(err));
  }, []);

  // Real-time alerts from server
  useEffect(() => {
    socket.on("alerts:update", (newAlert) => {
      setAlerts(prev => [newAlert, ...prev]);
    });

    // Simulate server alerts if none
    const fetchAlerts = setInterval(async () => {
      const res = await axios.get("http://localhost:3004/api/alerts");
      setAlerts(prev => [res.data[0], ...prev]);
    }, 5000);

    return () => {
      socket.off("alerts:update");
      clearInterval(fetchAlerts);
    };
  }, []);

  const saveAlert = (alert) => {
    setSavedAlerts(prev => [...prev, alert]);
    alert("Notification saved!");
  };

  return (
    <div className="security-alerts-container">
      <div className="alerts-panel">
        <h2>Security Alerts & Logs</h2>
        <div className="alerts-list">
          {alerts.map((alert, index) => (
            <div key={index} className="alert-item">
              <span>{alert.message}</span>
              <button onClick={() => saveAlert(alert)}>💾</button>
            </div>
          ))}
          <h3>Recent Logs</h3>
          {logs.map((log, index) => (
            <div key={index} className="log-item">
              {new Date(log.ts * 1000).toLocaleTimeString()} - {log.message}
            </div>
          ))}
        </div>
      </div>
      <div className="saved-alerts-panel">
        <h2>Saved Notifications</h2>
        {savedAlerts.length === 0 && <p>No saved notifications yet.</p>}
        {savedAlerts.map((alert, index) => (
          <div key={index} className="saved-alert-item">
            {alert.message}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SecurityAlerts;
