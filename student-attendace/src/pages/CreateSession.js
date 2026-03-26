import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const CreateSession = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    subject: "", session_date: new Date().toISOString().split("T")[0],
    start_time: "", end_time: "", latitude: "", longitude: "", radius_meters: 100
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [gettingLoc, setGettingLoc] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const getLocation = () => {
    setGettingLoc(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm(f => ({ ...f, latitude: pos.coords.latitude.toFixed(6), longitude: pos.coords.longitude.toFixed(6) }));
        setGettingLoc(false);
      },
      () => { setGettingLoc(false); setError("Location access denied"); }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("http://localhost:5000/teacher/create-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) {
        setResult(data);
      } else {
        setError(data.message || "Failed to create session");
      }
    } catch {
      setError("Cannot connect to server");
    }
    setLoading(false);
  };

  const inputStyle = { width: "100%", padding: "11px 14px", background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: "10px", color: "white", fontSize: "14px", outline: "none", boxSizing: "border-box" };
  const labelStyle = { display: "block", fontSize: "13px", fontWeight: 600, marginBottom: "6px", opacity: 0.8 };

  return (
    <div style={{ padding: "32px 24px", maxWidth: "700px", margin: "0 auto", color: "white", fontFamily: "'Segoe UI', sans-serif" }}>
      <button onClick={() => navigate("/teacher/dashboard")} style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", marginBottom: "20px", fontSize: "14px" }}>
        ← Back to Dashboard
      </button>

      <h1 style={{ fontSize: "26px", fontWeight: 800, margin: "0 0 6px" }}>Create Attendance Session</h1>
      <p style={{ opacity: 0.6, fontSize: "14px", margin: "0 0 28px" }}>Generate a QR code for your class</p>

      {!result ? (
        <div style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: "20px", padding: "32px" }}>
          {error && (
            <div style={{ background: "rgba(233,69,96,0.1)", border: "1px solid rgba(233,69,96,0.3)", color: "#e94560", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", fontSize: "14px" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>Subject / Class Name *</label>
                <input style={inputStyle} type="text" placeholder="e.g. Data Structures" value={form.subject} onChange={update("subject")} required />
              </div>

              <div>
                <label style={labelStyle}>Session Date *</label>
                <input style={inputStyle} type="date" value={form.session_date} onChange={update("session_date")} required />
              </div>

              <div style={{ display: "flex", gap: "10px" }}>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>Start Time</label>
                  <input style={inputStyle} type="time" value={form.start_time} onChange={update("start_time")} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle}>End Time</label>
                  <input style={inputStyle} type="time" value={form.end_time} onChange={update("end_time")} />
                </div>
              </div>

              {/* Location Section */}
              <div style={{ gridColumn: "1/-1" }}>
                <label style={labelStyle}>📍 Classroom Location (for geo-verification)</label>
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                  <input style={{ ...inputStyle, flex: 1 }} type="number" step="any" placeholder="Latitude" value={form.latitude} onChange={update("latitude")} />
                  <input style={{ ...inputStyle, flex: 1 }} type="number" step="any" placeholder="Longitude" value={form.longitude} onChange={update("longitude")} />
                  <button type="button" onClick={getLocation} disabled={gettingLoc} style={{ padding: "11px 16px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px", color: "white", cursor: "pointer", whiteSpace: "nowrap", fontWeight: 600 }}>
                    {gettingLoc ? "Getting..." : "📍 Use My Location"}
                  </button>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <label style={{ ...labelStyle, margin: 0, whiteSpace: "nowrap" }}>Allowed radius:</label>
                  <input style={{ ...inputStyle, maxWidth: "120px" }} type="number" value={form.radius_meters} onChange={update("radius_meters")} min="10" max="1000" />
                  <span style={{ opacity: 0.5, fontSize: "13px" }}>meters</span>
                </div>
              </div>
            </div>

            <button type="submit" disabled={loading} style={{ marginTop: "24px", width: "100%", padding: "14px", background: "linear-gradient(135deg, #e94560, #ff6b9d)", border: "none", borderRadius: "12px", color: "white", fontWeight: 700, fontSize: "15px", cursor: "pointer", boxShadow: "0 4px 20px rgba(233,69,96,0.4)" }}>
              {loading ? "Generating QR Code..." : "🎯 Generate QR Code"}
            </button>
          </form>
        </div>
      ) : (
        /* Success - Show QR Code */
        <div style={{ textAlign: "center", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(74,222,128,0.3)", borderRadius: "20px", padding: "40px" }}>
          <div style={{ fontSize: "40px", marginBottom: "12px" }}>✅</div>
          <h2 style={{ fontWeight: 800, marginBottom: "6px" }}>Session Created!</h2>
          <p style={{ opacity: 0.6, marginBottom: "28px" }}>Share this QR code with your students</p>

          <div style={{ display: "inline-block", background: "white", padding: "16px", borderRadius: "16px", marginBottom: "24px" }}>
            <img src={result.qr_code} alt="Session QR Code" style={{ width: "220px", height: "220px" }} />
          </div>

          <div style={{ background: "rgba(255,255,255,0.06)", borderRadius: "12px", padding: "16px", marginBottom: "24px", textAlign: "left" }}>
            <p style={{ margin: "0 0 6px", fontSize: "12px", opacity: 0.5, textTransform: "uppercase", fontWeight: 600 }}>Session ID</p>
            <code style={{ fontSize: "13px", wordBreak: "break-all", opacity: 0.8 }}>{result.session_id}</code>
          </div>

          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button onClick={() => { const a = document.createElement("a"); a.href = result.qr_code; a.download = "session-qr.png"; a.click(); }} style={{ padding: "12px 24px", background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", borderRadius: "10px", color: "white", cursor: "pointer", fontWeight: 600 }}>
              ⬇ Download QR
            </button>
            <button onClick={() => navigate("/teacher/dashboard")} style={{ padding: "12px 24px", background: "linear-gradient(135deg, #e94560, #ff6b9d)", border: "none", borderRadius: "10px", color: "white", cursor: "pointer", fontWeight: 700 }}>
              Go to Dashboard
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateSession;