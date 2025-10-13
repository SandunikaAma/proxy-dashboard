// backend-server/server.js
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const PORT = process.env.PORT || 3004;
const SECRET_KEY = "supersecretkey";

// --- Middleware ---
app.use(cors({ origin: "*", methods: ["GET", "POST", "PUT", "DELETE"], allowedHeaders: ["Content-Type", "Authorization"] }));
app.use(bodyParser.json());

// --- Health check ---
app.get("/health", (req, res) => res.status(200).json({ status: "ok", message: "Backend is healthy ✅" }));

// --- Database setup ---
const db = new sqlite3.Database("./users.db", (err) => {
  if (err) console.error("DB error:", err.message);
  else console.log("Connected to SQLite DB.");
});

// --- Create tables ---
db.run(`CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT UNIQUE, role TEXT, password TEXT)`);
db.run(`CREATE TABLE IF NOT EXISTS settings (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT UNIQUE, version TEXT DEFAULT '1', theme TEXT DEFAULT 'light')`);
db.run(`CREATE TABLE IF NOT EXISTS logs (id INTEGER PRIMARY KEY AUTOINCREMENT, message TEXT, ts INTEGER)`);
db.run(`CREATE TABLE IF NOT EXISTS saved_alerts (id INTEGER PRIMARY KEY AUTOINCREMENT, message TEXT, ts INTEGER)`);
db.run(`CREATE TABLE IF NOT EXISTS performance_logs (id INTEGER PRIMARY KEY AUTOINCREMENT, ts INTEGER, site TEXT, requests INTEGER, blocked INTEGER, bandwidth INTEGER)`);
db.run(`CREATE TABLE IF NOT EXISTS recommendations (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT, message TEXT, status TEXT DEFAULT 'new', created_at DATETIME DEFAULT CURRENT_TIMESTAMP)`);

// --- Socket.IO setup ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// --- Globals ---
const sites = ["dashboard.proxy.local", "intranet.local", "vpn.local"];
let loggedInUsers = [];
let trafficData = [], bandwidthData = [], uptimeData = [], perfBarsData = [];

// --- User Authentication ---
app.post("/api/signup", (req, res) => {
  const { name, role, password } = req.body;
  if (!name || !role || !password) return res.status(400).json({ error: "All fields required" });
  const hashedPassword = bcrypt.hashSync(password, 10);
  db.run("INSERT INTO users (name, role, password) VALUES (?, ?, ?)", [name, role, hashedPassword], function (err) {
    if (err) return res.status(400).json({ error: "User already exists" });
    res.json({ message: "Signup successful", userId: this.lastID });
  });
});

app.post("/api/login", (req, res) => {
  const { name, password } = req.body;
  db.get("SELECT * FROM users WHERE name = ?", [name], (err, user) => {
    if (err) return res.status(500).json({ error: "DB error" });
    if (!user) return res.status(400).json({ error: "User not found" });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: "Invalid password" });
    const token = jwt.sign({ id: user.id, role: user.role, name: user.name }, SECRET_KEY, { expiresIn: "1h" });
    res.json({ message: "Login successful", token });
  });
});

app.post("/api/forgot-password", (req, res) => {
  const { name } = req.body;
  db.get("SELECT * FROM users WHERE name = ?", [name], (err, user) => {
    if (err || !user) return res.status(400).json({ error: "User not found" });
    res.json({ message: "Password reset link (mock) generated", resetToken: "RESET123" });
  });
});

// --- Settings ---
app.post("/api/settings", (req, res) => {
  const { user, version, theme } = req.body;
  db.run(
    `INSERT INTO settings (user, version, theme) VALUES (?, ?, ?) ON CONFLICT(user) DO UPDATE SET version=?, theme=?`,
    [user, version, theme, version, theme],
    (err) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json({ message: "Settings saved successfully" });
    }
  );
});

app.get("/api/settings/:user", (req, res) => {
  db.get("SELECT * FROM settings WHERE user = ?", [req.params.user], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(row || { version: "1", theme: "light" });
  });
});

// --- Logs & Alerts ---
app.get("/api/logs/recent", (req, res) => {
  db.all("SELECT * FROM logs ORDER BY ts DESC LIMIT 50", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

app.post("/api/alerts/save", (req, res) => {
  const { message, ts } = req.body;
  db.run("INSERT INTO saved_alerts (message, ts) VALUES (?, ?)", [message, ts], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: "Alert saved!", id: this.lastID });
  });
});

app.get("/api/saved-alerts", (req, res) => {
  db.all("SELECT * FROM saved_alerts ORDER BY ts DESC LIMIT 50", (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// --- Active Users & Socket.IO ---
io.on("connection", (socket) => {
  console.log("Client connected:", socket.id);

  socket.on("user:login", (token) => {
    try {
      const decoded = jwt.verify(token, SECRET_KEY);
      const site = sites[Math.floor(Math.random() * sites.length)];
      const timestamp = Date.now();
      const userData = { id: decoded.id, username: decoded.name, role: decoded.role, site, timestamp, socketId: socket.id };
      const existingIndex = loggedInUsers.findIndex(u => u.id === decoded.id);
      if (existingIndex !== -1) loggedInUsers[existingIndex] = userData;
      else loggedInUsers.push(userData);
      io.emit("users:update", loggedInUsers);
    } catch (e) { console.error("Invalid token:", e.message); }
  });

  socket.on("disconnect", () => {
    loggedInUsers = loggedInUsers.filter(u => u.socketId !== socket.id);
    io.emit("users:update", loggedInUsers);
  });
});

app.get("/api/active-users", (req, res) => res.json(loggedInUsers));

app.get("/api/user/status", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "No token provided" });
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, SECRET_KEY);
    const userSites = sites.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * sites.length) + 1);
    res.json({ username: decoded.name, role: decoded.role, accessingSites: userSites, timestamp: new Date().toISOString() });
  } catch (err) { res.status(401).json({ error: "Invalid or expired token" }); }
});

// --- Real-time metrics, alerts, recommendations, history ---
setInterval(() => {
  const ts = Math.floor(Date.now() / 1000);

  // Metrics
  const trafficPoint = { ts, requests: Math.floor(Math.random() * 200), blocked: Math.floor(Math.random() * 50) };
  trafficData.push(trafficPoint); if (trafficData.length > 120) trafficData.shift(); io.emit("traffic:update", trafficPoint);

  const bandwidthPoint = { ts, kbps: Math.floor(Math.random() * 500) };
  bandwidthData.push(bandwidthPoint); if (bandwidthData.length > 120) bandwidthData.shift(); io.emit("bandwidth:update", bandwidthPoint);

  const perfPoint = { ts, site: sites[Math.floor(Math.random() * sites.length)], requests: trafficPoint.requests, blocked: trafficPoint.blocked, bandwidth: bandwidthPoint.kbps };
  perfBarsData.push(perfPoint); if (perfBarsData.length > 120) perfBarsData.shift(); io.emit("perf:update", perfBarsData);

  const uptimePoint = { ts, val: Math.random() * 100 };
  uptimeData.push(uptimePoint); if (uptimeData.length > 120) uptimeData.shift(); io.emit("uptime:update", { spark: uptimeData, percentage: uptimeData[uptimeData.length-1].val || 100 });

  // Random Alerts
  const alertsList = ["Unauthorized access","Blocked URL","Firewall violation","Suspicious login"];
  const randomAlert = { id: Date.now(), message: alertsList[Math.floor(Math.random() * alertsList.length)], ts };
  db.run("INSERT INTO logs (message, ts) VALUES (?, ?)", [randomAlert.message, ts]);
  io.emit("alerts:update", randomAlert);

  // History logs
  const perfLog = { ts, site: sites[Math.floor(Math.random() * sites.length)], requests: trafficPoint.requests, blocked: trafficPoint.blocked, bandwidth: bandwidthPoint.kbps };
  db.run("INSERT INTO performance_logs (ts, site, requests, blocked, bandwidth) VALUES (?, ?, ?, ?, ?)", [perfLog.ts, perfLog.site, perfLog.requests, perfLog.blocked, perfLog.bandwidth]);
  io.emit("history:update", perfLog);

  // Recommendations
  const recommendationTypes = ["Traffic", "Blocked", "Security", "Performance"];
  const rec = { type: recommendationTypes[Math.floor(Math.random()*recommendationTypes.length)], message: `Recommendation ${Math.floor(Math.random()*1000)}`, status: "new" };
  db.run("INSERT INTO recommendations (type, message, status) VALUES (?, ?, ?)", [rec.type, rec.message, rec.status], function(err) {
    if (!err) io.emit("recommendation:new", { id: this.lastID, ...rec, created_at: new Date().toISOString() });
  });
}, 5000);

// --- Recommendations endpoints ---
app.get("/api/fetchRecommendations", (req, res) => {
  db.all("SELECT * FROM recommendations ORDER BY created_at DESC LIMIT 50", (err, rows) => { if (err) return res.status(500).json({ error: err.message }); res.json(rows); });
});

app.post("/api/updateRecommendation", (req, res) => {
  const { id, status } = req.body;
  db.run("UPDATE recommendations SET status=? WHERE id=?", [status, id], function(err) {
    if (err) return res.status(500).json({ error: err.message });
    io.emit("recommendation:update", { id, status });
    res.json({ success: true });
  });
});

// --- Start server ---
server.listen(PORT, () => console.log(`🚀 Server running with Socket.IO on port ${PORT}`));






// with advanced features to try with real network environment
// ─── Dependencies ────────────────────────────────────────────────
// const express = require("express");
// const cors = require("cors");
// const bodyParser = require("body-parser");
// const sqlite3 = require("sqlite3").verbose();
// const bcrypt = require("bcryptjs");
// const jwt = require("jsonwebtoken");
// const http = require("http");
// const { Server } = require("socket.io");

// // ─── App Setup ───────────────────────────────────────────────────
// const app = express();
// const PORT = 3008;
// const SECRET_KEY = "supersecretkey"; // ⚠️ Change this in production!

// app.use(cors());
// app.use(bodyParser.json());

// // ─── Database Setup ──────────────────────────────────────────────
// const db = new sqlite3.Database("./users.db", (err) => {
//   if (err) console.error("❌ DB error:", err.message);
//   else console.log("✅ Connected to SQLite DB.");
// });

// // Create tables in sequence
// db.serialize(() => {
//   db.run(`
//     CREATE TABLE IF NOT EXISTS users (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT UNIQUE,
//       role TEXT,
//       password TEXT
//     )
//   `);

//   db.run(`
//     CREATE TABLE IF NOT EXISTS settings (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       user TEXT UNIQUE,
//       version TEXT DEFAULT '1',
//       theme TEXT DEFAULT 'light'
//     )
//   `);

//   db.run(`
//     CREATE TABLE IF NOT EXISTS logs (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       message TEXT,
//       ts INTEGER
//     )
//   `);

//   db.run(`
//     CREATE TABLE IF NOT EXISTS saved_alerts (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       message TEXT,
//       ts INTEGER
//     )
//   `);

//   db.run(`
//     CREATE TABLE IF NOT EXISTS performance_logs (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       ts INTEGER,
//       site TEXT,
//       requests INTEGER,
//       blocked INTEGER,
//       bandwidth INTEGER
//     )
//   `);

//   db.run(`
//     CREATE TABLE IF NOT EXISTS history_logs (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       site TEXT,
//       action TEXT,
//       bandwidth INTEGER,
//       timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
//     )
//   `);
// });

// // ─── Socket.IO Setup ─────────────────────────────────────────────
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: { origin: "*", methods: ["GET", "POST"] },
// });

// // ─── Mock Data Sources ───────────────────────────────────────────
// const sites = ["google.com", "facebook.com", "youtube.com", "twitter.com", "wso2.com", "github.com"];
// const actions = ["ALLOW", "BLOCK", "MONITOR"];
// let activeUsersList = [
//   { id: 1, username: "admin01", role: "Admin", site: "dashboard.proxy.local" },
//   { id: 2, username: "engineer01", role: "Engineer", site: "logs.proxy.local" },
//   { id: 3, username: "user01", role: "User", site: "example.com" },
// ];

// // ─── Auth Routes ────────────────────────────────────────────────
// app.post("/api/signup", (req, res) => {
//   const { name, role, password } = req.body;
//   if (!name || !role || !password) return res.status(400).json({ error: "All fields required" });

//   const hashedPassword = bcrypt.hashSync(password, 10);
//   db.run(
//     "INSERT INTO users (name, role, password) VALUES (?, ?, ?)",
//     [name, role, hashedPassword],
//     function (err) {
//       if (err) return res.status(400).json({ error: "User already exists" });
//       res.json({ message: "Signup successful", userId: this.lastID });
//     }
//   );
// });

// app.post("/api/login", (req, res) => {
//   const { name, password } = req.body;
//   db.get("SELECT * FROM users WHERE name = ?", [name], (err, user) => {
//     if (err) return res.status(500).json({ error: "DB error" });
//     if (!user) return res.status(400).json({ error: "User not found" });

//     const validPassword = bcrypt.compareSync(password, user.password);
//     if (!validPassword) return res.status(401).json({ error: "Invalid password" });

//     const token = jwt.sign({ id: user.id, role: user.role }, SECRET_KEY, { expiresIn: "1h" });
//     res.json({ message: "Login successful", token });
//   });
// });

// // ─── Settings Routes ────────────────────────────────────────────
// app.post("/api/settings", (req, res) => {
//   const { user, version, theme } = req.body;
//   db.run(
//     `
//     INSERT INTO settings (user, version, theme)
//     VALUES (?, ?, ?)
//     ON CONFLICT(user) DO UPDATE SET version=?, theme=?
//     `,
//     [user, version, theme, version, theme],
//     (err) => {
//       if (err) return res.status(500).json({ error: err.message });
//       res.json({ message: "Settings saved successfully" });
//     }
//   );
// });

// app.get("/api/settings/:user", (req, res) => {
//   db.get("SELECT * FROM settings WHERE user = ?", [req.params.user], (err, row) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json(row || { version: "1", theme: "light" });
//   });
// });

// // ─── Security Alerts ────────────────────────────────────────────
// const alertsList = [
//   { id: 1, message: "Unauthorized access attempt detected" },
//   { id: 2, message: "Blocked URL accessed" },
//   { id: 3, message: "Firewall rule violation" },
//   { id: 4, message: "Suspicious login attempt" }
// ];

// setInterval(() => {
//   const randomAlert = alertsList[Math.floor(Math.random() * alertsList.length)];
//   const alertWithTs = { ...randomAlert, ts: Math.floor(Date.now() / 1000) };

//   db.run("INSERT INTO logs (message, ts) VALUES (?, ?)", [alertWithTs.message, alertWithTs.ts]);
//   io.emit("alerts:update", alertWithTs);
// }, 7000);

// app.get("/api/logs/recent", (req, res) => {
//   db.all("SELECT * FROM logs ORDER BY ts DESC LIMIT 10", (err, rows) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json(rows);
//   });
// });

// app.post("/api/alerts/save", (req, res) => {
//   const { message, ts } = req.body;
//   db.run("INSERT INTO saved_alerts (message, ts) VALUES (?, ?)", [message, ts], function (err) {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json({ message: "Alert saved!", id: this.lastID });
//   });
// });

// app.get("/api/saved-alerts", (req, res) => {
//   db.all("SELECT * FROM saved_alerts ORDER BY ts DESC LIMIT 50", (err, rows) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json(rows);
//   });
// });

// // ─── History Logs & Bandwidth ──────────────────────────────────
// setInterval(() => {
//   const ts = Math.floor(Date.now() / 1000);
//   const log = {
//     ts,
//     site: sites[Math.floor(Math.random() * sites.length)],
//     requests: Math.floor(Math.random() * 200),
//     blocked: Math.floor(Math.random() * 50),
//     bandwidth: Math.floor(Math.random() * 500),
//   };
//   db.run(
//     "INSERT INTO performance_logs (ts, site, requests, blocked, bandwidth) VALUES (?, ?, ?, ?, ?)",
//     [log.ts, log.site, log.requests, log.blocked, log.bandwidth]
//   );
//   io.emit("history:update", log);
// }, 5000);

// app.get("/api/history", (req, res) => {
//   const { site } = req.query;
//   let query = "SELECT * FROM performance_logs ORDER BY ts DESC LIMIT 100";
//   const params = [];
//   if (site) {
//     query = "SELECT * FROM performance_logs WHERE site=? ORDER BY ts DESC LIMIT 100";
//     params.push(site);
//   }
//   db.all(query, params, (err, rows) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json(rows);
//   });
// });

// app.get("/api/history/bandwidth", (req, res) => {
//   db.all("SELECT ts, bandwidth FROM performance_logs ORDER BY ts ASC LIMIT 100", (err, rows) => {
//     if (err) return res.status(500).json({ error: err.message });
//     res.json(rows);
//   });
// });

// // ─── Dashboard Metrics ─────────────────────────────────────────
// app.get("/api/metrics/traffic", (req, res) => {
//   const arr = [];
//   const now = Math.floor(Date.now() / 1000);
//   for (let i = 60; i > 0; i--) {
//     arr.push({ ts: now - i * 60, requests: Math.random() * 20 + 5, blocked: Math.random() * 3 });
//   }
//   res.json(arr);
// });

// app.get("/api/metrics/bandwidth", (req, res) => {
//   const arr = [];
//   const now = Math.floor(Date.now() / 1000);
//   for (let i = 60; i > 0; i--) {
//     arr.push({ ts: now - i * 60, kbps: Math.floor(Math.random() * 300) + 80 });
//   }
//   res.json(arr);
// });

// app.get("/api/top/sites", (req, res) => {
//   res.json([
//     { site: "example.com", count: 70 },
//     { site: "facebook.com", count: 50 },
//     { site: "youtube.com", count: 45 },
//     { site: "blocked.com", count: 30 },
//     { site: "twitter.com", count: 25 },
//   ]);
// });

// // ─── Real-time Proxy Logs Simulation ───────────────────────────
// function insertMockProxyLog() {
//   const site = sites[Math.floor(Math.random() * sites.length)];
//   const action = actions[Math.floor(Math.random() * actions.length)];
//   const bandwidth = Math.floor(Math.random() * 1000) + 100;

//   db.run(
//     `INSERT INTO history_logs (site, action, bandwidth) VALUES (?, ?, ?)`,
//     [site, action, bandwidth],
//     (err) => {
//       if (err) console.error("Insert error:", err);
//     }
//   );
// }
// setInterval(insertMockProxyLog, 3000);

// app.get("/api/proxy-logs", (req, res) => {
//   db.all(`SELECT * FROM history_logs ORDER BY timestamp DESC LIMIT 200`, (err, rows) => {
//     if (err) return res.status(500).json({ error: "Failed to fetch logs" });
//     res.json(rows);
//   });
// });

// // ─── Active Users Simulation ───────────────────────────────────
// setInterval(() => {
//   activeUsersList = activeUsersList.map((u) =>
//     Math.random() > 0.7 ? { ...u, site: sites[Math.floor(Math.random() * sites.length)] } : u
//   );
//   io.emit("users:update", activeUsersList);
// }, 3000);

// // ─── Start Server ──────────────────────────────────────────────
// server.listen(PORT, () => {
//   console.log(`🚀 Server running with Socket.IO on http://localhost:${PORT}`);
// });
