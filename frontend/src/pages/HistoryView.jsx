// import React, { useState, useEffect, useCallback } from "react";
// import io from "socket.io-client";
// import axios from "axios";
// import {
//   LineChart,
//   Line,
//   XAxis,
//   YAxis,
//   Tooltip,
//   CartesianGrid,
//   Legend,
//   ResponsiveContainer,
//   BarChart,
//   Bar
// } from "recharts";
// import "./HistoryView.css";

// const socket = io("http://localhost:3008");

// const HistoryView = ({ theme }) => {
//   const [logs, setLogs] = useState([]);
//   const [bandwidthData, setBandwidthData] = useState([]);
//   const [siteFilter, setSiteFilter] = useState("");

//   // ✅ Memoized function to avoid missing dependency warning
//   const fetchLogs = useCallback(async () => {
//     try {
//       const res = await axios.get("http://localhost:3008/api/history", {
//         params: { site: siteFilter || undefined },
//       });
//       setLogs(res.data);
//     } catch (err) {
//       console.error(err);
//     }
//   }, [siteFilter]);

//   const fetchBandwidth = useCallback(async () => {
//     try {
//       const res = await axios.get("http://localhost:3008/api/history/bandwidth");
//       setBandwidthData(res.data);
//     } catch (err) {
//       console.error(err);
//     }
//   }, []);

//   // ✅ Fetch initial history logs + bandwidth data
//   useEffect(() => {
//     fetchLogs();
//     fetchBandwidth();
//   }, [fetchLogs, fetchBandwidth]);

//   // ✅ Real-time socket updates
//   useEffect(() => {
//     socket.on("history:update", (newLog) => {
//       setLogs((prev) => [newLog, ...prev]);
//       setBandwidthData((prev) => [
//         ...prev,
//         { ts: newLog.ts, bandwidth: newLog.bandwidth },
//       ]);
//     });

//     return () => socket.off("history:update");
//   }, []);

//   const handleFilterChange = (e) => setSiteFilter(e.target.value);
//   const handleFilterApply = () => fetchLogs();

//   return (
//     <div className={`history-container ${theme}`}>
//       <h2>History View</h2>

//       {/* 🔸 Filter Panel */}
//       <div className="filter-panel">
//         <input
//           type="text"
//           placeholder="Filter by site..."
//           value={siteFilter}
//           onChange={handleFilterChange}
//         />
//         <button onClick={handleFilterApply}>Apply</button>
//       </div>

//       {/* 🔸 Charts */}
//       <div className="charts-section">
//         {/* Line Chart */}
//         <div className="line-chart-container">
//           <h3>Requests & Blocked History</h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <LineChart data={[...logs].reverse()}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis
//                 dataKey="ts"
//                 tickFormatter={(ts) => new Date(ts * 1000).toLocaleTimeString()}
//               />
//               <YAxis />
//               <Tooltip
//                 labelFormatter={(ts) => new Date(ts * 1000).toLocaleString()}
//               />
//               <Legend />
//               <Line type="monotone" dataKey="requests" stroke="#8884d8" />
//               <Line type="monotone" dataKey="blocked" stroke="#ff4d4f" />
//             </LineChart>
//           </ResponsiveContainer>
//         </div>

//         {/* Bar Chart */}
//         <div className="bar-chart-container">
//           <h3>Bandwidth Usage (KB/s)</h3>
//           <ResponsiveContainer width="100%" height={300}>
//             <BarChart data={bandwidthData}>
//               <CartesianGrid strokeDasharray="3 3" />
//               <XAxis
//                 dataKey="ts"
//                 tickFormatter={(ts) => new Date(ts * 1000).toLocaleTimeString()}
//               />
//               <YAxis />
//               <Tooltip
//                 labelFormatter={(ts) => new Date(ts * 1000).toLocaleString()}
//               />
//               <Legend />
//               <Bar dataKey="bandwidth" fill="#82ca9d" />
//             </BarChart>
//           </ResponsiveContainer>
//         </div>
//       </div>

//       {/* 🔸 History Log List */}
//       <div className="history-log-list">
//         <h3>Past Logs</h3>
//         {logs.map((log, idx) => (
//           <div key={idx} className="log-item">
//             <span>{new Date(log.ts * 1000).toLocaleString()} - </span>
//             <span>
//               {log.site} | Requests: {log.requests} | Blocked: {log.blocked} |
//               Bandwidth: {log.bandwidth} KB/s
//             </span>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// };

// export default HistoryView;


//advanced one
import React, { useState, useEffect, useCallback } from "react";
import io from "socket.io-client";
import axios from "axios";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts";
import "./HistoryView.css";

const socket = io("http://localhost:3004");

const HistoryView = ({ theme }) => {
  const [logs, setLogs] = useState([]);
  const [bandwidthData, setBandwidthData] = useState([]);

  // Filters
  const [siteOptions, setSiteOptions] = useState([]); // available sites from backend
  const [selectedSites, setSelectedSites] = useState([]);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Fetch available sites on mount
  useEffect(() => {
    const fetchSites = async () => {
      try {
        const res = await axios.get("http://localhost:3004/api/history/sites");
        setSiteOptions(res.data);
      } catch (err) {
        console.error("Error fetching sites:", err);
      }
    };
    fetchSites();
  }, []);

  // Fetch logs (with filters)
  const fetchLogs = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:3004/api/history", {
        params: {
          sites: selectedSites.join(",") || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      setLogs(res.data);
    } catch (err) {
      console.error("Error fetching logs:", err);
    }
  }, [selectedSites, startDate, endDate]);

  // Fetch bandwidth data (filtered)
  const fetchBandwidth = useCallback(async () => {
    try {
      const res = await axios.get("http://localhost:3004/api/history/bandwidth", {
        params: {
          sites: selectedSites.join(",") || undefined,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        },
      });
      setBandwidthData(res.data);
    } catch (err) {
      console.error("Error fetching bandwidth:", err);
    }
  }, [selectedSites, startDate, endDate]);

  // Initial load
  useEffect(() => {
    fetchLogs();
    fetchBandwidth();
  }, [fetchLogs, fetchBandwidth]);

  // Real-time updates
  useEffect(() => {
    socket.on("history:update", (newLog) => {
      setLogs((prev) => [newLog, ...prev]);
      setBandwidthData((prev) => [
        ...prev,
        { ts: newLog.ts, bandwidth: newLog.bandwidth, site: newLog.site },
      ]);
    });
    return () => socket.off("history:update");
  }, []);

  // Handlers
  const handleSiteSelect = (site) => {
    setSelectedSites((prev) =>
      prev.includes(site) ? prev.filter((s) => s !== site) : [...prev, site]
    );
  };

  const handleApplyFilters = () => {
    fetchLogs();
    fetchBandwidth();
  };

  const handleResetFilters = () => {
    setSelectedSites([]);
    setStartDate("");
    setEndDate("");
    fetchLogs();
    fetchBandwidth();
  };

  return (
    <div className={`history-container ${theme}`}>
      <h2>History View</h2>

      {/* 🧭 FILTER PANEL */}
      <div className="filter-panel">
        <div className="filter-group">
          <label>Sites:</label>
          <div className="multi-select">
            {siteOptions.map((site) => (
              <label key={site} className="site-option">
                <input
                  type="checkbox"
                  value={site}
                  checked={selectedSites.includes(site)}
                  onChange={() => handleSiteSelect(site)}
                />
                {site}
              </label>
            ))}
          </div>
        </div>

        <div className="filter-group">
          <label>From:</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>To:</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        <div className="filter-actions">
          <button onClick={handleApplyFilters}>Apply</button>
          <button onClick={handleResetFilters} className="reset-btn">
            Reset
          </button>
        </div>
      </div>

      {/* 📈 LINE CHART */}
      <div className="charts-section">
        <div className="chart-card">
          <h3>Requests & Blocked History</h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={[...logs].reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="ts"
                tickFormatter={(ts) => new Date(ts * 1000).toLocaleTimeString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(ts) => new Date(ts * 1000).toLocaleString()}
                content={({ payload, label }) => {
                  if (payload && payload.length) {
                    const d = payload[0].payload;
                    return (
                      <div className="custom-tooltip">
                        <p>{new Date(label * 1000).toLocaleString()}</p>
                        <p>Site: {d.site}</p>
                        <p>Requests: {d.requests}</p>
                        <p>Blocked: {d.blocked}</p>
                        <p>Bandwidth: {d.bandwidth} KB/s</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend />
              <Line type="monotone" dataKey="requests" stroke="#4b7bec" />
              <Line type="monotone" dataKey="blocked" stroke="#fc5c65" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 📊 BANDWIDTH CHART */}
        <div className="chart-card">
          <h3>Bandwidth Usage (KB/s)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={bandwidthData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="ts"
                tickFormatter={(ts) => new Date(ts * 1000).toLocaleTimeString()}
              />
              <YAxis />
              <Tooltip
                labelFormatter={(ts) => new Date(ts * 1000).toLocaleString()}
              />
              <Legend />
              <Bar dataKey="bandwidth" fill="#20bf6b" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 📝 LOG LIST */}
      <div className="history-log-list">
        <h3>Past Logs</h3>
        {logs.length === 0 ? (
          <p className="no-logs">No logs found for selected filters.</p>
        ) : (
          logs.map((log, idx) => (
            <div key={idx} className="log-item">
              <span>{new Date(log.ts * 1000).toLocaleString()} - </span>
              <span>
                {log.site} | Requests: {log.requests} | Blocked: {log.blocked} | Bandwidth:{" "}
                {log.bandwidth} KB/s
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default HistoryView;
