import React, { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

const Register = (props) => {
  const { role: paramRole } = useParams();
  const role = props.role || paramRole || "student";
  const [form, setForm] = useState({
    name: "", email: "", password: "", confirmPassword: "",
    roll_number: "", branch: "", semester: "1", subject: ""
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    setError("");

    const endpoint = role === "teacher" ? "/teacher/register" : "/register";
    try {
      const response = await fetch(`http://localhost:5000${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await response.json();
      if (data.success) {
        navigate("/");
      } else {
        setError(data.message || "Registration failed");
      }
    } catch {
      setError("Cannot connect to server");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", padding: "11px 14px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "10px", color: "white",
    fontSize: "14px", outline: "none", boxSizing: "border-box",
  };
  const labelStyle = { display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", opacity: 0.8 };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #0f0c29, #302b63, #24243e)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "'Segoe UI', sans-serif" }}>
      <div style={{ background: "rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "24px", padding: "40px", width: "100%", maxWidth: "460px", color: "white" }}>
        <div style={{ textAlign: "center", marginBottom: "28px" }}>
          <div style={{ width: "56px", height: "56px", background: "linear-gradient(135deg, #e94560, #ff6b9d)", borderRadius: "16px", display: "inline-flex", alignItems: "center", justifyContent: "center", marginBottom: "12px", boxShadow: "0 8px 24px rgba(233,69,96,0.4)" }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, margin: 0 }}>
            {role === "teacher" ? "Teacher Registration" : "Student Registration"}
          </h1>
          <p style={{ fontSize: "13px", opacity: 0.6, margin: "4px 0 0" }}>Create your {role} account</p>
        </div>

        {error && (
          <div style={{ background: "rgba(233,69,96,0.15)", border: "1px solid rgba(233,69,96,0.4)", color: "#ff6b9d", borderRadius: "10px", padding: "12px 16px", fontSize: "13px", marginBottom: "16px" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px" }}>
            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Full Name</label>
              <input style={inputStyle} type="text" placeholder="Your full name" value={form.name} onChange={update("name")} required />
            </div>

            <div style={{ gridColumn: "1/-1" }}>
              <label style={labelStyle}>Email Address</label>
              <input style={inputStyle} type="email" placeholder="your@email.com" value={form.email} onChange={update("email")} required />
            </div>

            {role === "student" && <>
              <div>
                <label style={labelStyle}>Roll Number</label>
                <input style={inputStyle} type="text" placeholder="CS2024001" value={form.roll_number} onChange={update("roll_number")} />
              </div>
              <div>
                <label style={labelStyle}>Semester</label>
                <select style={{ ...inputStyle, cursor: "pointer" }} value={form.semester} onChange={update("semester")}>
                  {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s} style={{ background: "#1a1a2e" }}>Semester {s}</option>)}
                </select>
              </div>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Branch / Department</label>
                <input style={inputStyle} type="text" placeholder="Computer Science" value={form.branch} onChange={update("branch")} />
              </div>
            </>}

            {role === "teacher" && (
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Subject</label>
                <input style={inputStyle} type="text" placeholder="Your primary subject" value={form.subject} onChange={update("subject")} />
              </div>
            )}

            <div>
              <label style={labelStyle}>Password</label>
              <input style={inputStyle} type="password" placeholder="Min 6 characters" value={form.password} onChange={update("password")} required minLength={6} />
            </div>
            <div>
              <label style={labelStyle}>Confirm Password</label>
              <input style={inputStyle} type="password" placeholder="Repeat password" value={form.confirmPassword} onChange={update("confirmPassword")} required />
            </div>
          </div>

          <button type="submit"
            style={{ width: "100%", marginTop: "20px", padding: "14px", background: "linear-gradient(135deg, #e94560, #ff6b9d)", border: "none", borderRadius: "12px", color: "white", fontSize: "15px", fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 20px rgba(233,69,96,0.4)" }}
            disabled={loading}
          >
            {loading ? "Creating Account..." : `Register as ${role === "teacher" ? "Teacher" : "Student"}`}
          </button>
        </form>

        <p style={{ textAlign: "center", fontSize: "14px", marginTop: "20px" }}>
          Already have an account?{" "}
          <span style={{ color: "#ff6b9d", cursor: "pointer", fontWeight: 600 }} onClick={() => navigate("/")}>
            Sign in here
          </span>
        </p>
      </div>
    </div>
  );
};

export default Register;