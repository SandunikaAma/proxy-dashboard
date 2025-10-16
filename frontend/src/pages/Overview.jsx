import React, { useEffect, useState, useMemo } from "react";
import { Line, Bar } from "react-chartjs-2";
import { io } from "socket.io-client";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import "./Overview.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const socket = io("http://localhost:3004", { transports: ["websocket"] });

export default function Overview({ authToken }) {
  const [alertsList, setAlertsList] = useState([]);
  const [trafficSeries, setTrafficSeries] = useState([]);
  const [bandwidthSeries, setBandwidthSeries] = useState([]);
  const [activeUsers, setActiveUsers] = useState(0);
  const [topSites, setTopSites] = useState([]);
  const [uptimeSpark, setUptimeSpark] = useState([]);
  const [uptimePercentage, setUptimePercentage] = useState(100);
  const [errorLogs, setErrorLogs] = useState([]);
  const [speedData, setSpeedData] = useState({
    ip: "",
    download: 0,
    upload: 0,
    loading: false,
  });

  // Fetch initial data
  useEffect(() => {
    const headers = authToken ? { Authorization: `Bearer ${authToken}` } : {};
    const safeFetch = (url, setter) =>
      fetch(url, { headers })
        .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
        .then((json) => setter(json))
        .catch((err) => console.warn("Failed to fetch", url, err));

    safeFetch("http://localhost:3004/api/metrics/traffic?minutes=60", setTrafficSeries);
    safeFetch("http://localhost:3004/api/metrics/bandwidth?minutes=60", setBandwidthSeries);
    safeFetch("http://localhost:3004/api/top/sites?limit=6", setTopSites);
    safeFetch("http://localhost:3004/api/alerts?limit=50", (data) => setAlertsList(data || []));
    safeFetch("http://localhost:3004/api/logs/recent?limit=20", setErrorLogs);
    safeFetch("http://localhost:3004/api/metrics/uptime?minutes=60", (data) => {
      if (data) {
        setUptimeSpark(Array.isArray(data.spark) ? data.spark : []);
        setUptimePercentage(data.percentage || 100);
      }
    });
    safeFetch("http://localhost:3004/api/active-users", (data) => {
      setActiveUsers(Array.isArray(data) ? data.length : 0);
    });
  }, [authToken]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (authToken) socket.emit("user:login", authToken);

    socket.on("traffic:update", (point) =>
      setTrafficSeries((prev) => [...prev.slice(-119), point])
    );
    socket.on("bandwidth:update", (point) =>
      setBandwidthSeries((prev) => [...prev.slice(-119), point])
    );
    socket.on("alerts:update", (alert) =>
      setAlertsList((prev) => [alert, ...prev].slice(0, 100))
    );
    socket.on("users:update", (users) => setActiveUsers(users.length));
    socket.on("sites:update", (sites) => setTopSites(sites));
    socket.on("uptime:update", (u) => {
      if (u.spark) setUptimeSpark((prev) => [...prev.slice(-59), ...u.spark].slice(-120));
      if (u.percentage) setUptimePercentage(u.percentage);
    });
    socket.on("log:new", (log) => setErrorLogs((prev) => [log, ...prev].slice(0, 50)));

    return () => socket.removeAllListeners();
  }, [authToken]);

  const fmtTime = (ts) => {
    try {
      const d = new Date(ts * 1000);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return ts;
    }
  };

  // Perform actual speed test (Ookla-style)
  const runSpeedTest = async () => {
    try {
      setSpeedData({ ...speedData, loading: true });
      const ipRes = await fetch("https://api.ipify.org?format=json");
      const ipData = await ipRes.json();

      // Download test
      const start = Date.now();
      await fetch("https://speed.cloudflare.com/__down?bytes=10000000");
      const end = Date.now();
      const downloadMbps = (80 / ((end - start) / 1000)).toFixed(2);

      // Upload test
      const uploadStart = Date.now();
      await fetch("https://speed.cloudflare.com/__up", {
        method: "POST",
        body: new Blob(["x".repeat(1000000)]),
      });
      const uploadEnd = Date.now();
      const uploadMbps = (8 / ((uploadEnd - uploadStart) / 1000)).toFixed(2);

      setSpeedData({
        ip: ipData.ip,
        download: downloadMbps,
        upload: uploadMbps,
        loading: false,
      });
    } catch (err) {
      console.error("Speedtest failed:", err);
      setSpeedData({ ip: "Error", download: 0, upload: 0, loading: false });
    }
  };

  // Chart configs
  const trafficChart = useMemo(() => {
    const labels = trafficSeries.map((p) => fmtTime(p.ts));
    const requests = trafficSeries.map((p) => p.requests);
    const blocked = trafficSeries.map((p) => p.blocked);
    return {
      data: {
        labels,
        datasets: [
          {
            label: "Traffic",
            data: requests,
            fill: true,
            backgroundColor: "#10B98122",
            borderColor: "#10B981",
            tension: 0.3,
            pointRadius: 0,
          },
          {
            label: "Blocked",
            data: blocked,
            fill: false,
            borderColor: "#EF4444",
            tension: 0.3,
            pointRadius: 0,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: "var(--text-color)" } } },
        scales: {
          x: { ticks: { color: "var(--text-color-muted)" }, grid: { color: "var(--chart-grid)" } },
          y: { ticks: { color: "var(--text-color-muted)" }, grid: { color: "var(--chart-grid)" } },
        },
      },
    };
  }, [trafficSeries]);

  const bandwidthChart = useMemo(() => {
    const labels = bandwidthSeries.map((p) => fmtTime(p.ts));
    const kbps = bandwidthSeries.map((p) => p.kbps);
    return {
      data: {
        labels,
        datasets: [
          {
            label: "Kbps",
            data: kbps,
            fill: true,
            borderColor: "#F59E0B",
            backgroundColor: "#F59E0B22",
            tension: 0.3,
            pointRadius: 0,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "var(--text-color-muted)" }, grid: { color: "var(--chart-grid)" } },
          y: { ticks: { color: "var(--text-color-muted)" }, grid: { color: "var(--chart-grid)" } },
        },
      },
    };
  }, [bandwidthSeries]);

  const sitesBar = useMemo(() => {
    const labels = topSites.map((s) => s.site);
    const counts = topSites.map((s) => s.count);
    return {
      data: { labels, datasets: [{ label: "Hits", data: counts, backgroundColor: "#8B5CF6", barThickness: 18 }] },
      options: {
        indexAxis: "y",
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: "var(--text-color-muted)" }, grid: { color: "var(--chart-grid)" } },
          y: { ticks: { color: "var(--text-color)" } },
        },
      },
    };
  }, [topSites]);

  // Cards
  function SecurityAlertsCard() {
    return (
      <div className="card overview-card">
        <h3>Security Alerts</h3>
        <div className="alerts-count">{alertsList.length}</div>
      </div>
    );
  }

  function ActiveUsersCard() {
    return (
      <div className="card overview-card">
        <h3>Active Users</h3>
        <div className="active-count">{activeUsers}</div>
      </div>
    );
  }

  function UptimeCard() {
    const data = {
      labels: uptimeSpark.map((p) => fmtTime(p.ts)),
      datasets: [
        {
          data: uptimeSpark.map((p) => p.val),
          borderColor: "#10B981",
          backgroundColor: "rgba(16,185,129,0.12)",
          pointRadius: 0,
          tension: 0.3,
          fill: true,
        },
      ],
    };
    const options = {
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } },
    };

    return (
      <div className="card overview-card">
        <Line data={data} options={options} />
        <div className="uptime-percent">{uptimePercentage?.toFixed(1)}%</div>
      </div>
    );
  }

  function ErrorLogsCard() {
    return (
      <div className="card overview-card logs-card">
        <h3>Error Logs</h3>
        <table>
          <thead>
            <tr><th>Timestamp</th><th>Message</th></tr>
          </thead>
          <tbody>
            {errorLogs.slice(0, 8).map((l, i) => (
              <tr key={i}><td>{fmtTime(l.ts || l.timestamp)}</td><td>{l.message}</td></tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  function SpeedtestCard() {
    return (
      <div className="card overview-card speedtest-card">
        <h3>Speedtest by Ookla</h3>
        {speedData.ip && <p>Router IP: {speedData.ip}</p>}
        <button className="speedtest-btn" onClick={runSpeedTest} disabled={speedData.loading}>
          {speedData.loading ? "Testing..." : "GO"}
        </button>
        {speedData.download && (
          <div className="speed-results">
            <p>⬇ Download Speed: {speedData.download} Mbps</p>
            <p>⬆ Upload Speed: {speedData.upload} Mbps</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="overview-grid">
      <SecurityAlertsCard />
      <ActiveUsersCard />
      <UptimeCard />
      <div className="card overview-card traffic-card">
        <h3>Traffic</h3>
        <Line data={trafficChart.data} options={trafficChart.options} />
      </div>
      <div className="card overview-card bandwidth-card">
        <h3>Bandwidth</h3>
        <Line data={bandwidthChart.data} options={bandwidthChart.options} />
      </div>
      <div className="card overview-card sites-card">
        <h3>Sites Accessed</h3>
        <Bar data={sitesBar.data} options={sitesBar.options} />
      </div>
      <ErrorLogsCard />
      <div className="card overview-card">
        <h3>Quick Alerts</h3>
        <ul>
          {alertsList.slice(0, 6).map((a, i) => (
            <li key={i}>{a.message}</li>
          ))}
        </ul>
      </div>
      <SpeedtestCard />
    </div>
  );
}

