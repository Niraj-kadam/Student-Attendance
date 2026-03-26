import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = role === "teacher" ? "/teacher/login" : "/login";

    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await response.json();

      if (data.success) {
        login(data.user, role, data.token);
        navigate(role === "teacher" ? "/teacher/dashboard" : "/dashboard");
      } else {
        setError(data.message || "Invalid credentials");
      }
    } catch {
      setError("Cannot connect to server. Make sure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.page}>
      {/* Animated background blobs */}
      <div style={styles.blob1} />
      <div style={styles.blob2} />

      <div style={styles.card}>
        {/* Logo */}
        <div style={styles.logoArea}>
          <div style={styles.logoIcon}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <h1 style={styles.logoText}>AttendTrack</h1>
          <p style={styles.tagline}>Smart Attendance Management</p>
        </div>

        {/* Role Toggle */}
        <div style={styles.toggle}>
          {["student", "teacher"].map((r) => (
            <button
              key={r}
              style={{ ...styles.toggleBtn, ...(role === r ? styles.toggleActive : {}) }}
              onClick={() => { setRole(r); setError(""); }}
            >
              {r === "student" ? "🎓 Student" : "👨‍🏫 Teacher"}
            </button>
          ))}
        </div>

        <h2 style={styles.heading}>Welcome back</h2>
        <p style={styles.subheading}>Sign in to your {role} account</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleLogin}>
          <div style={styles.field}>
            <label style={styles.label}>Email address</label>
            <input
              type="email"
              style={styles.input}
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              style={styles.input}
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" style={styles.submitBtn} disabled={loading}>
            {loading ? (
              <span style={styles.spinner} />
            ) : (
              `Sign In as ${role.charAt(0).toUpperCase() + role.slice(1)}`
            )}
          </button>
        </form>

        <div style={styles.divider}><span>or</span></div>

        <p style={styles.switchText}>
          Don't have an account?{" "}
          <span
            style={styles.link}
            onClick={() => navigate(role === "teacher" ? "/teacher/register" : "/register")}
          >
            Register here
          </span>
        </p>

        {/* Demo credentials */}
        <div style={styles.demoBox}>
          <p style={{ margin: 0, fontSize: "11px", opacity: 0.7, fontWeight: 600 }}>DEMO CREDENTIALS</p>
          <p style={{ margin: "4px 0 0", fontSize: "12px" }}>
            Student: student@demo.com / student123
          </p>
          <p style={{ margin: "2px 0 0", fontSize: "12px" }}>
            Teacher: teacher@demo.com / teacher123
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "20px",
    position: "relative",
    overflow: "hidden",
    fontFamily: "'Segoe UI', sans-serif",
  },
  blob1: {
    position: "absolute",
    width: "500px",
    height: "500px",
    background: "radial-gradient(circle, rgba(233,69,96,0.15) 0%, transparent 70%)",
    top: "-100px",
    right: "-100px",
    borderRadius: "50%",
  },
  blob2: {
    position: "absolute",
    width: "400px",
    height: "400px",
    background: "radial-gradient(circle, rgba(100,100,255,0.1) 0%, transparent 70%)",
    bottom: "-100px",
    left: "-100px",
    borderRadius: "50%",
  },
  card: {
    background: "rgba(255,255,255,0.05)",
    backdropFilter: "blur(20px)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "24px",
    padding: "40px",
    width: "100%",
    maxWidth: "420px",
    color: "white",
    position: "relative",
    zIndex: 1,
  },
  logoArea: {
    textAlign: "center",
    marginBottom: "28px",
  },
  logoIcon: {
    width: "56px",
    height: "56px",
    background: "linear-gradient(135deg, #e94560, #ff6b9d)",
    borderRadius: "16px",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "12px",
    boxShadow: "0 8px 24px rgba(233,69,96,0.4)",
  },
  logoText: {
    fontSize: "24px",
    fontWeight: 800,
    margin: 0,
    letterSpacing: "-0.5px",
  },
  tagline: {
    fontSize: "13px",
    opacity: 0.6,
    margin: "4px 0 0",
  },
  toggle: {
    display: "flex",
    background: "rgba(255,255,255,0.08)",
    borderRadius: "12px",
    padding: "4px",
    marginBottom: "24px",
    gap: "4px",
  },
  toggleBtn: {
    flex: 1,
    padding: "10px",
    border: "none",
    background: "transparent",
    color: "rgba(255,255,255,0.6)",
    borderRadius: "9px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "14px",
    transition: "all 0.2s",
  },
  toggleActive: {
    background: "linear-gradient(135deg, #e94560, #ff6b9d)",
    color: "white",
    boxShadow: "0 4px 12px rgba(233,69,96,0.4)",
  },
  heading: {
    fontSize: "22px",
    fontWeight: 700,
    margin: "0 0 4px",
  },
  subheading: {
    fontSize: "14px",
    opacity: 0.6,
    margin: "0 0 24px",
  },
  error: {
    background: "rgba(233,69,96,0.15)",
    border: "1px solid rgba(233,69,96,0.4)",
    color: "#ff6b9d",
    borderRadius: "10px",
    padding: "12px 16px",
    fontSize: "13px",
    marginBottom: "16px",
  },
  field: { marginBottom: "16px" },
  label: {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    marginBottom: "6px",
    opacity: 0.8,
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "10px",
    color: "white",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  },
  submitBtn: {
    width: "100%",
    padding: "14px",
    background: "linear-gradient(135deg, #e94560, #ff6b9d)",
    border: "none",
    borderRadius: "12px",
    color: "white",
    fontSize: "15px",
    fontWeight: 700,
    cursor: "pointer",
    marginTop: "8px",
    boxShadow: "0 4px 20px rgba(233,69,96,0.4)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: "20px",
    height: "20px",
    border: "2px solid rgba(255,255,255,0.3)",
    borderTop: "2px solid white",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  divider: {
    textAlign: "center",
    margin: "20px 0",
    fontSize: "13px",
    opacity: 0.4,
    position: "relative",
  },
  switchText: {
    textAlign: "center",
    fontSize: "14px",
    margin: 0,
  },
  link: {
    color: "#ff6b9d",
    cursor: "pointer",
    fontWeight: 600,
    textDecoration: "underline",
  },
  demoBox: {
    marginTop: "20px",
    background: "rgba(255,255,255,0.05)",
    borderRadius: "10px",
    padding: "12px",
    color: "rgba(255,255,255,0.7)",
  },
};