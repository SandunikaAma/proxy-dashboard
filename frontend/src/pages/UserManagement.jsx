import React, { useEffect, useState } from "react";
import io from "socket.io-client";
import "./UserManagement.css";

// Socket.IO connection
const socket = io("http://localhost:3004");

export default function UserManagement() {
  const [activeUsers, setActiveUsers] = useState([]);

  useEffect(() => {
    // Listen for real-time updates
    socket.on("users:update", (users) => setActiveUsers(users));

    // Initial fetch
    fetch("http://localhost:3004/api/active-users")
      .then((res) => res.json())
      .then((data) => setActiveUsers(data));

    return () => socket.off("users:update");
  }, []);

  // Function to assign role badge classes
  const getRoleClass = (role) => {
    switch (role) {
      case "admin":
        return "admin-role";
      case "support":
        return "support-role";
      case "engineer":
        return "engineer-role";
      case "ethical-hacker":
        return "user-role";
      default:
        return "user-role";
    }
  };

  return (
    <div className="user-mgmt-page">
      <div className="page-header">
        <h2>Active Users</h2>
        <p>Monitor currently logged-in users and the sites they are accessing in real time.</p>
      </div>

      <div className="table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>User Name</th>
              <th>Role</th>
              <th>Accessing Site</th>
            </tr>
          </thead>
          <tbody>
            {activeUsers.length === 0 ? (
              <tr>
                <td colSpan={3} className="no-users">
                  No active users
                </td>
              </tr>
            ) : (
              activeUsers.map((user) => (
                <tr key={user.id}>
                  <td>{user.username}</td>
                  <td>
                    <span className={`role-badge ${getRoleClass(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td>{user.site}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
