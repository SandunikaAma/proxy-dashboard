// frontend/src/App.jsx
import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./AuthPage.jsx";
import DashboardLayout from "./DashboardLayout.jsx";
import "./App.css";

// Helper to check if user is logged in
const isLoggedIn = () => !!localStorage.getItem("token");

// Protected Route component
function PrivateRoute({ children }) {
  return isLoggedIn() ? children : <Navigate to="/" />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login/Signup Page */}
        <Route path="/" element={<AuthPage />} />

        {/* Dashboard - Protected */}
        <Route
          path="/dashboard/*"
          element={
            <PrivateRoute>
              <DashboardLayout user={localStorage.getItem("token")} />
            </PrivateRoute>
          }
        />

        {/* Redirect unknown routes to home */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
}
