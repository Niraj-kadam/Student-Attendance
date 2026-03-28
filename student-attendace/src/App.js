import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";

import Header from "./components/Header";
import Login from "./pages/Login";
import Register from "./pages/Register";
import StudentDashboard from "./pages/StudentDashboard";
import QRScanner from "./pages/QRScanner";
import AttendanceHistory from "./pages/AttendanceHistory";
import TeacherDashboard from "./pages/TeacherDashboard";
import CreateSession from "./pages/CreateSession";
import TeacherAnalytics from "./pages/TeacherAnalytics";

// Page background wrapper
const PageWrapper = ({ children }) => (
  <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0c29 0%, #1a1a2e 40%, #16213e 100%)" }}>
    <Header />
    {children}
  </div>
);

// Protected route
const Protected = ({ children, allowedRole }) => {
  const { user, role } = useAuth();
  if (!user) return <Navigate to="/" replace />;
  if (allowedRole && role !== allowedRole) return <Navigate to="/" replace />;
  return children;
};

const AppRoutes = () => {
  const { user, role } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Navigate to={role === "teacher" ? "/teacher/dashboard" : "/dashboard"} replace /> : <Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/teacher/register" element={<Register role="teacher" />} />

      {/* Student routes */}
      <Route path="/dashboard" element={
        <Protected allowedRole="student">
          <PageWrapper><StudentDashboard /></PageWrapper>
        </Protected>
      } />
      <Route path="/scanner" element={
        <Protected allowedRole="student">
          <PageWrapper><QRScanner /></PageWrapper>
        </Protected>
      } />
      <Route path="/history" element={
        <Protected allowedRole="student">
          <PageWrapper><AttendanceHistory /></PageWrapper>
        </Protected>
      } />

      {/* Teacher routes */}
      <Route path="/teacher/dashboard" element={
        <Protected allowedRole="teacher">
          <PageWrapper><TeacherDashboard /></PageWrapper>
        </Protected>
      } />
      <Route path="/teacher/create-session" element={
        <Protected allowedRole="teacher">
          <PageWrapper><CreateSession /></PageWrapper>
        </Protected>
      } />
      <Route path="/teacher/analytics" element={
        <Protected allowedRole="teacher">
          <PageWrapper><TeacherAnalytics /></PageWrapper>
        </Protected>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;