import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const TeacherDashboard = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetchSessions();
  }, [user]);

  const fetchSessions = async () => {
    try {
      const res = await fetch("http://localhost:5000/teacher/sessions", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setSessions(data.sessions);
    } catch (_) {}
    setLoading(false);
  };

  const toggleSession = async (id) => {
    await fetch(`http://localhost:5000/teacher/session/${id}/toggle`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${token}` },
    });
    fetchSessions();
  };

  const viewAttendance = async (session) => {
    setSelectedSession(session);
    setLoadingAttendance(true);
    try {
      const res = await fetch(`http://localhost:5000/teacher/session-attendance/${session.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) setAttendance(data.attendance);
    } catch (_) {}
    setLoadingAttendance(false);
  };

  const statusBadge = (status) => {
    const map = {
      present: { bg: "rgba(74,222,128,0.15)", color: "#4ade80", label: "Present" },
      late: { bg: "rgba(250,204,21,0.15)", color: "#facc15", label: "Late" },
      absent: { bg: "rgba(233,69,96,0.15)", color: "#e94560", label: "Absent" },
    };
    const s = map[status] || map.absent;
    return <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}>{s.label}</span>;
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Teacher Dashboard</h1>
          <p style={styles.sub}>Welcome back, {user?.name} · {user?.subject}</p>
        </div>
        <button style={styles.createBtn} onClick={() => navigate("/teacher/create-session")}>
          + Create Session
        </button>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        {[
          { label: "Total Sessions", value: sessions.length, color: "white", icon: "📅" },
          { label: "Active Sessions", value: sessions.filter(s => s.is_active).length, color: "#4ade80", icon: "🟢" },
          { label: "Total QR Codes", value: sessions.length, color: "#60a5fa", icon: "📱" },
        ].map((s, i) => (
          <div key={i} style={styles.statCard}>
            <div style={{ fontSize: "28px" }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "13px", opacity: 0.6 }}>{s.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={styles.grid}>
        {/* Sessions List */}
        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>📋 Sessions</h2>
          {loading ? (
            <div style={{ textAlign: "center", padding: "40px", opacity: 0.5 }}>Loading...</div>
          ) : sessions.length === 0 ? (
            <div style={{ textAlign: "center", padding: "40px", opacity: 0.5 }}>
              <div style={{ fontSize: "48px" }}>📅</div>
              <p>No sessions created yet</p>
              <button style={styles.createBtn} onClick={() => navigate("/teacher/create-session")}>Create First Session</button>
            </div>
          ) : (
            sessions.map((s) => (
              <div key={s.id} style={{ ...styles.sessionCard, ...(selectedSession?.id === s.id ? styles.sessionCardActive : {}) }}>
                <div style={styles.sessionTop}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{s.subject}</h3>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", opacity: 0.6 }}>
                      {s.session_date ? new Date(s.session_date).toLocaleDateString("en-IN") : "—"}
                      {s.start_time ? ` · ${s.start_time.slice(0, 5)}` : ""}
                      {s.end_time ? ` – ${s.end_time.slice(0, 5)}` : ""}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                    <span style={{ background: s.is_active ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.08)", color: s.is_active ? "#4ade80" : "rgba(255,255,255,0.4)", padding: "4px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 600 }}>
                      {s.is_active ? "Active" : "Closed"}
                    </span>
                  </div>
                </div>

                {/* QR Code preview */}
                {s.qr_code && (
                  <img src={s.qr_code} alt="QR" style={{ width: "80px", height: "80px", borderRadius: "8px", border: "2px solid rgba(255,255,255,0.1)" }} />
                )}

                <div style={styles.sessionActions}>
                  <button style={styles.actionBtn} onClick={() => viewAttendance(s)}>👁 View Attendance</button>
                  <button style={{ ...styles.actionBtn, color: s.is_active ? "#e94560" : "#4ade80" }} onClick={() => toggleSession(s.id)}>
                    {s.is_active ? "🔒 Close" : "🔓 Reopen"}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Attendance Panel */}
        <div style={styles.panel}>
          <h2 style={styles.panelTitle}>
            {selectedSession ? `✅ ${selectedSession.subject} — Attendance` : "📊 Select a session to view attendance"}
          </h2>
          {!selectedSession && (
            <div style={{ textAlign: "center", padding: "60px 20px", opacity: 0.4 }}>
              <div style={{ fontSize: "48px" }}>👆</div>
              <p>Click "View Attendance" on any session</p>
            </div>
          )}
          {loadingAttendance && <div style={{ textAlign: "center", padding: "40px", opacity: 0.5 }}>Loading...</div>}
          {selectedSession && !loadingAttendance && (
            <>
              <div style={{ marginBottom: "12px", display: "flex", gap: "12px" }}>
                {["present", "late", "absent"].map(s => ({
                  s, count: attendance.filter(a => a.status === s).length
                })).map(({ s, count }) => (
                  <div key={s} style={{ background: "rgba(255,255,255,0.05)", borderRadius: "8px", padding: "8px 14px", fontSize: "13px" }}>
                    <span style={{ opacity: 0.6, textTransform: "capitalize" }}>{s}: </span>
                    <strong>{count}</strong>
                  </div>
                ))}
              </div>

              {attendance.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", opacity: 0.5 }}>No attendance records yet</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                  {attendance.map((a, i) => (
                    <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.04)", borderRadius: "10px", padding: "12px 16px" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "14px" }}>{a.name}</div>
                        <div style={{ fontSize: "12px", opacity: 0.5 }}>
                          {a.roll_number || "No roll no."} · {a.branch || ""}
                          {a.distance_from_class ? ` · ${Math.round(a.distance_from_class)}m away` : ""}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <span style={{ fontSize: "12px", opacity: 0.5 }}>
                          {a.marked_at ? new Date(a.marked_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : ""}
                        </span>
                        {statusBadge(a.status)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;

const styles = {
  page: { padding: "32px 24px", maxWidth: "1200px", margin: "0 auto", color: "white", fontFamily: "'Segoe UI', sans-serif" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", flexWrap: "wrap", gap: "16px" },
  title: { fontSize: "26px", fontWeight: 800, margin: 0 },
  sub: { fontSize: "14px", opacity: 0.6, margin: "4px 0 0" },
  createBtn: { background: "linear-gradient(135deg, #e94560, #ff6b9d)", border: "none", color: "white", padding: "12px 24px", borderRadius: "12px", cursor: "pointer", fontWeight: 700, fontSize: "14px", boxShadow: "0 4px 20px rgba(233,69,96,0.4)" },
  statsRow: { display: "flex", gap: "16px", marginBottom: "28px", flexWrap: "wrap" },
  statCard: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "20px 24px", flex: 1, minWidth: "160px", display: "flex", alignItems: "center", gap: "16px" },
  grid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" },
  panel: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "20px", padding: "24px" },
  panelTitle: { fontSize: "16px", fontWeight: 700, margin: "0 0 20px" },
  sessionCard: { background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "14px", padding: "16px", marginBottom: "12px", display: "flex", flexDirection: "column", gap: "12px" },
  sessionCardActive: { borderColor: "rgba(233,69,96,0.4)", background: "rgba(233,69,96,0.05)" },
  sessionTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start" },
  sessionActions: { display: "flex", gap: "8px" },
  actionBtn: { background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.12)", color: "white", padding: "7px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 600 },
};