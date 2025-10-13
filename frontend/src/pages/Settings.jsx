import React, { useEffect, useState } from "react";
import "./Settings.css";

function Settings({ user, version, setVersion, theme, setTheme }) {
  const [activeTab, setActiveTab] = useState("interface");

  // Load settings on mount
  useEffect(() => {
    if (!user) return;
    fetch(`http://localhost:3004/api/settings/${user}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.version) setVersion(data.version);
        if (data.theme) setTheme(data.theme);
        document.body.setAttribute("data-theme", data.theme || "light");
      })
      .catch((err) => console.error("Failed to load settings:", err));
  }, [user, setVersion, setTheme]);

  // Auto-save whenever version or theme changes
  useEffect(() => {
    if (!user) return;
    fetch("http://localhost:3004/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user, version, theme }),
    }).catch((err) => console.error("Failed to save settings:", err));
  }, [user, version, theme]);

  // Apply theme immediately
  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
  }, [theme]);

  // FAQ content
  const faqContent = [
    {
      q: "What types of proxies does this tool support?",
      a: "Supports HTTP, HTTPS, SOCKS4/5, and transparent proxies. Users can monitor upstream and downstream traffic, including encrypted connections."
    },
    {
      q: "How does the recommendation system work?",
      a: "It analyzes historical traffic, latency, and load patterns, then suggests optimal proxy configurations to reduce bottlenecks and improve security."
    },
    {
      q: "Can this system detect malicious traffic?",
      a: "Yes. It uses anomaly detection algorithms, IP reputation lists, and custom rule sets to flag suspicious activity in real-time."
    },
    {
      q: "How is data secured in this system?",
      a: "All sensitive data, including credentials and logs, are encrypted at rest and in transit. JWT tokens secure session management."
    },
    {
      q: "Can multiple engineers collaborate using this dashboard?",
      a: "Absolutely. The system supports multi-user access with role-based permissions for admins, engineers, and auditors."
    },
    {
      q: "How can I export logs for auditing?",
      a: "Traffic and event logs can be exported in JSON or CSV formats. Scheduled exports and API endpoints for automated reporting are also supported."
    },
    {
      q: "Does the system support integration with third-party security tools?",
      a: "Yes. It can integrate with threat intelligence feeds, SIEM platforms, and external alerting systems via REST APIs."
    },
  ];

  // Updates content
  const updatesContent = [
    {
      version: "v3.1.1",
      date: "2026-01-15",
      details: [
        "Upcoming Version",
        "Hope to include Threat Intelligence Integration,Visual Session Replay & Anomaly Detection features.",
        "Dashboard Highlights if a site is flagged in public threat databases.",
        "Step-by-step visualization of intrusion attempts.",
        "Highlight unusual traffic spikes or behavior.",
      ]
    },
    {
      version: "v2.1.1",
      date: "2025-09-30",
      details: [
        "Introduced Recommendation System for optimal proxy configurations.",
        "Real-time metrics visualization for latency, throughput, and packet loss.",
        "Exportable logs in JSON and CSV formats for audits and compliance."
      ]
    },
    {
      version: "v1.1.2",
      date: "2025-09-10",
      details: [
        "Optimized database queries for faster retrieval of historical traffic data.",
        "Reduced CPU and memory footprint during heavy concurrent connections.",
        "Bug fixes for multi-user session management."
      ]
    },
    {
      version: "v1.1.1",
      date: "2025-08-22",
      details: [
        "Customizable alerts for suspicious network activity.",
        "Enhanced filtering and search for traffic logs with advanced regex support.",
        "Integration with third-party threat intelligence APIs for automated alerts."
      ]
    },
  ];

  return (
    <div className="settings-container">
      <aside className="settings-sidebar">
        <button
          onClick={() => setActiveTab("interface")}
          className={activeTab === "interface" ? "active" : ""}
        >
          Interface
        </button>
        <button
          onClick={() => setActiveTab("updates")}
          className={activeTab === "updates" ? "active" : ""}
        >
          Updates
        </button>
        <button
          onClick={() => setActiveTab("faq")}
          className={activeTab === "faq" ? "active" : ""}
        >
          FAQ
        </button>
      </aside>

      <main className="settings-main">
        {activeTab === "interface" && (
          <>
            <h2>Interface Settings</h2>
            <div className="form-group">
              <label>Version:</label>
              <select value={version} onChange={(e) => setVersion(e.target.value)}>
                <option value="1">Version 1</option>
                <option value="2">Version 2</option>
              </select>
            </div>

            <div className="form-group">
              <label>Theme:</label>
              <select value={theme} onChange={(e) => setTheme(e.target.value)}>
                <option value="light">Light Mode</option>
                <option value="dark">Dark Mode</option>
              </select>
            </div>
          </>
        )}

        {activeTab === "updates" && (
          <>
            <h2>Latest System Updates</h2>
            {updatesContent.map((update) => (
              <div key={update.version} className="update-entry">
                <strong>{update.version}</strong> ({update.date})
                <ul>
                  {update.details.map((item, i) => (
                    <li key={i}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )}

        {activeTab === "faq" && (
          <>
            <h2>Frequently Asked Questions</h2>
            {faqContent.map((item, idx) => (
              <div key={idx} className="faq-entry">
                <strong>Q: {item.q}</strong>
                <p>A: {item.a}</p>
              </div>
            ))}
          </>
        )}
      </main>
    </div>
  );
}

export default Settings;
