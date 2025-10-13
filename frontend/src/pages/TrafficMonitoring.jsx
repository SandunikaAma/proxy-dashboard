import React, { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import "./TrafficMonitoring.css";

const TrafficMonitoring = ({ theme = "light" }) => {
  const [data, setData] = useState([]);
  const [period, setPeriod] = useState("daily");
  const [filter, setFilter] = useState("traffic-blocked"); // default both

  // ✅ Simulate real-time traffic data
  useEffect(() => {
    const generateData = () => {
      const now = new Date();
      const newPoint = {
        time: now.toLocaleTimeString(),
        traffic: Math.floor(Math.random() * 1000),
        blocked: Math.floor(Math.random() * 500),
      };
      setData((prevData) => [...prevData.slice(-19), newPoint]);
    };

    generateData();
    const interval = setInterval(generateData, 2000);
    return () => clearInterval(interval);
  }, []);

  // 🎨 Correct theme-based chart colors
  const chartColors =
    theme === "dark"
      ? { text: "#FFFFFF", grid: "#444", traffic: "#4FC3F7", blocked: "#FF7043" }
      : { text: "#000000", grid: "#ddd", traffic: "#1976D2", blocked: "#E64A19" };

  return (
    <div
      className={`traffic-monitoring-container ${
        theme === "dark" ? "dark-mode" : "light-mode"
      }`}
    >
      <div className="traffic-header">
        <h2 className="traffic-title">Traffic Monitoring</h2>

        <div className="traffic-controls">
          {/* Period Filter */}
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="traffic-select"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>

          {/* ✅ Traffic Filter */}
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="traffic-select"
          >
            <option value="traffic">Traffic</option>
            <option value="blocked">Blocked</option>
            <option value="traffic-blocked">Traffic & Blocked</option>
          </select>
        </div>
      </div>

      <div className="traffic-chart">
        {data.length === 0 ? (
          <p className="no-data-text">No monitoring data yet...</p>
        ) : (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data}>
              <CartesianGrid stroke={chartColors.grid} strokeDasharray="3 3" />
              <XAxis dataKey="time" stroke={chartColors.text} />
              <YAxis stroke={chartColors.text} />
              <Tooltip
                contentStyle={{
                  backgroundColor: theme === "dark" ? "#333" : "#fff",
                  color: chartColors.text,
                }}
              />
              <Legend
                wrapperStyle={{
                  color: chartColors.text,
                }}
              />

              {(filter === "traffic" || filter === "traffic-blocked") && (
                <Line
                  type="monotone"
                  dataKey="traffic"
                  stroke={chartColors.traffic}
                  strokeWidth={2}
                  dot={false}
                  name="Traffic"
                />
              )}

              {(filter === "blocked" || filter === "traffic-blocked") && (
                <Line
                  type="monotone"
                  dataKey="blocked"
                  stroke={chartColors.blocked}
                  strokeWidth={2}
                  dot={false}
                  name="Blocked"
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default TrafficMonitoring;
