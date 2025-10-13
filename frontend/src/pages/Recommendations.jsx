import React, { useState, useEffect } from "react";
import io from "socket.io-client";
import "./Recommendations.css";

const socket = io("http://localhost:3004");

function Recommendations({ theme }) {
  const [activeTab, setActiveTab] = useState("All");
  const [recommendations, setRecommendations] = useState([]);
  const [alerts, setAlerts] = useState([]);

  const tabs = ["All", "Traffic", "Blocked", "Security", "Performance"];

  const fetchRecommendations = async () => {
    try {
      const res = await fetch("http://localhost:3004/api/fetchRecommendations");
      const data = await res.json();
      setRecommendations(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAlerts = async () => {
    try {
      const res = await fetch("http://localhost:3004/api/alerts");
      const data = await res.json();
      setAlerts(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    fetchAlerts();

    socket.on("recommendation:new", (rec) => {
      setRecommendations((prev) => [rec, ...prev]);
    });

    socket.on("recommendation:update", ({ id, status }) => {
      setRecommendations((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status } : r))
      );
    });

    socket.on("alerts:update", (alert) => {
      setAlerts((prev) => [alert, ...prev]);
    });

    return () => {
      socket.off("recommendation:new");
      socket.off("recommendation:update");
      socket.off("alerts:update");
    };
  }, []);

  const updateStatus = async (id, status) => {
    try {
      await fetch("http://localhost:3004/api/updateRecommendation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const saveAlert = async (alert) => {
    try {
      await fetch("http://localhost:3004/api/alerts/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: alert.message, ts: alert.ts }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Assign badge colors based on type/severity
  const getBadgeClass = (type) => {
    switch (type) {
      case "Traffic":
        return "badge-traffic";
      case "Blocked":
        return "badge-blocked";
      case "Security":
        return "badge-security";
      case "Performance":
        return "badge-performance";
      default:
        return "badge-default";
    }
  };

  return (
    <div className={`smart-dashboard ${theme}`}>
      <h2>Smart Proxy Monitoring</h2>

      <div className="tabs">
        {tabs.map((tab) => (
          <button
            key={tab}
            className={activeTab === tab ? "active" : ""}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
          </button>
        ))}
      </div>

      <div className="dashboard-panels">
        {/* Recommendations Panel */}
        <div className="panel recommendations-panel">
          <h3>Recommendations</h3>
          <div className="recommendation-cards">
            {recommendations
              .filter((rec) => activeTab === "All" || rec.type === activeTab)
              .map((rec) => (
                <div key={rec.id} className={`card ${rec.status} animate-card`}>
                  <span className={`badge ${getBadgeClass(rec.type)}`}>
                    {rec.type}
                  </span>
                  <p>{rec.message}</p>
                  <div className="actions">
                    <button onClick={() => updateStatus(rec.id, "dismiss")}>
                      Dismiss
                    </button>
                    <button onClick={() => updateStatus(rec.id, "review")}>
                      Review
                    </button>
                    <button onClick={() => updateStatus(rec.id, "block")}>
                      Block
                    </button>
                  </div>
                </div>
              ))}
          </div>
        </div>

        {/* Alerts Panel */}
        <div className="panel alerts-panel">
          <h3>Security Alerts</h3>
          <div className="alert-cards">
            {alerts.map((alert) => (
              <div
                key={alert.id || alert.ts}
                className="alert-card animate-card"
              >
                <span className="badge badge-security">ALERT</span>
                <p>{alert.message}</p>
                <div className="actions">
                  <button onClick={() => saveAlert(alert)}>Save</button>
                  <button
                    onClick={() =>
                      setAlerts((prev) => prev.filter((a) => a !== alert))
                    }
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Recommendations;
