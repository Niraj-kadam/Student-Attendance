import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const StatCard = ({ label, value, color, icon, sub }) => (
  <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px", flex: 1 }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
      <div>
        <p style={{ margin: 0, fontSize: "13px", opacity: 0.6 }}>{label}</p>
        <h2 style={{ margin: "8px 0 4px", fontSize: "36px", fontWeight: 800, color }}>{value ?? "—"}</h2>
        {sub && <p style={{ margin: 0, fontSize: "12px", opacity: 0.5 }}>{sub}</p>}
      </div>
      <div style={{ fontSize: "28px" }}>{icon}</div>
    </div>
  </div>
);

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    Promise.all([
      fetch(`http://localhost:5000/student/attendance-summary/${user.id}`).then(r => r.json()),
      fetch(`http://localhost:5000/student/attendance-history/${user.id}`).then(r => r.json()),
    ]).then(([s, h]) => {
      // Always recompute stats from the full history so absences are counted correctly
      if (h.success && h.history) {
        // Normalize: null / undefined / empty status → "absent" (matches DB behaviour)
        const fullHistory = h.history.map(r => ({
          ...r,
          status: (r.status || "absent").toLowerCase().trim(),
        }));
        const present = fullHistory.filter(r => r.status === "present").length;
        const late    = fullHistory.filter(r => r.status === "late").length;
        const absent  = fullHistory.filter(r => r.status === "absent").length;
        const total   = fullHistory.length;
        const percentage = total > 0 ? Math.round((present + late) / total * 100) : 0;

        setSummary({
          total_sessions: total,
          present,
          late,
          absent,
          percentage,
        });
        setHistory(fullHistory.slice(0, 6));
      } else if (s.success) {
        // Fallback to server summary if history fetch failed
        setSummary(s.summary);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [user]);

  const pct = summary?.percentage ?? 0;
  const pctColor = pct >= 75 ? "#4ade80" : pct >= 60 ? "#facc15" : "#e94560";

  if (loading) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", color: "white", fontFamily: "'Segoe UI', sans-serif" }}>
        <div style={{ textAlign: "center", opacity: 0.5 }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>⏳</div>
          <p>Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const statusBadge = (status) => {
    const map = { present: { bg: "rgba(74,222,128,0.15)", color: "#4ade80", label: "Present" }, late: { bg: "rgba(250,204,21,0.15)", color: "#facc15", label: "Late" }, absent: { bg: "rgba(233,69,96,0.15)", color: "#e94560", label: "Absent" } };
    const s = map[status] || map.absent;
    return <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}>{s.label}</span>;
  };

  if (!user) { navigate("/"); return null; }

  return (
    <div style={styles.page}>
      {/* Greeting */}
      <div style={styles.greeting}>
        <div>
          <h1 style={styles.greetingTitle}>Hello, {user.name?.split(" ")[0]} 👋</h1>
          <p style={styles.greetingMeta}>
            {user.roll_number && `Roll No: ${user.roll_number}`}
            {user.branch && ` · ${user.branch}`}
            {user.semester && ` · Semester ${user.semester}`}
          </p>
        </div>
        <button style={styles.scanBtn} onClick={() => navigate("/scanner")}>
          📷 Scan QR
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", opacity: 0.5 }}>Loading...</div>
      ) : (
        <>
          {/* Attendance Percentage Ring */}
          <div style={styles.ringSection}>
            <div style={styles.ringCard}>
              <svg width="120" height="120" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
                <circle cx="60" cy="60" r="50" fill="none" stroke={pctColor} strokeWidth="10"
                  strokeDasharray={`${2 * Math.PI * 50}`}
                  strokeDashoffset={`${2 * Math.PI * 50 * (1 - pct / 100)}`}
                  strokeLinecap="round" transform="rotate(-90 60 60)"
                  style={{ transition: "stroke-dashoffset 1s ease" }} />
                <text x="60" y="55" textAnchor="middle" fill="white" fontSize="20" fontWeight="800">{pct}%</text>
                <text x="60" y="72" textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10">Attendance</text>
              </svg>
              <div>
                <p style={{ margin: "0 0 4px", fontSize: "13px", opacity: 0.6 }}>Attendance Status</p>
                <p style={{ margin: 0, fontWeight: 700, color: pctColor, fontSize: "15px" }}>
                  {pct >= 75 ? "✅ Good Standing" : pct >= 60 ? "⚠️ At Risk" : "❌ Critical"}
                </p>
                {pct < 75 && summary && (
                  <p style={{ margin: "6px 0 0", fontSize: "12px", opacity: 0.6 }}>
                    Need {Math.ceil((0.75 * ((summary.total_sessions || 0) + 10) - ((summary.present || 0) + (summary.late || 0))))} more attendances to reach 75%
                  </p>
                )}
              </div>
            </div>

            {/* Stats */}
            <div style={styles.statsRow}>
              <StatCard label="Total Sessions" value={summary?.total_sessions} color="white" icon="📅" />
              <StatCard label="Present" value={summary?.present} color="#4ade80" icon="✅" />
              <StatCard label="Late" value={summary?.late} color="#facc15" icon="⏰" />
              <StatCard label="Absent" value={summary?.absent} color="#e94560" icon="❌" />
            </div>
          </div>

          {/* Recent History */}
          <div style={styles.section}>
            <div style={styles.sectionHeader}>
              <h2 style={styles.sectionTitle}>Recent Attendance</h2>
              <button style={styles.viewAll} onClick={() => navigate("/history")}>View all →</button>
            </div>
            <div style={styles.table}>
              <div style={styles.tableHeader}>
                <span>Subject</span>
                <span>Date</span>
                <span>Teacher</span>
                <span>Status</span>
              </div>
              {history.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px", opacity: 0.5 }}>No attendance records yet</div>
              ) : history.map((row, i) => (
                <div key={i} style={styles.tableRow}>
                  <span style={{ fontWeight: 600 }}>{row.subject || "—"}</span>
                  <span style={{ opacity: 0.7 }}>{row.session_date ? new Date(row.session_date).toLocaleDateString("en-IN") : "—"}</span>
                  <span style={{ opacity: 0.7 }}>{row.teacher_name || "—"}</span>
                  <span>{statusBadge(row.status)}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default StudentDashboard;

const styles = {
  page: { padding: "32px 24px", maxWidth: "1100px", margin: "0 auto", color: "white", fontFamily: "'Segoe UI', sans-serif" },
  greeting: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", flexWrap: "wrap", gap: "16px" },
  greetingTitle: { fontSize: "28px", fontWeight: 800, margin: 0 },
  greetingMeta: { fontSize: "14px", opacity: 0.6, margin: "4px 0 0" },
  scanBtn: { background: "linear-gradient(135deg, #e94560, #ff6b9d)", border: "none", color: "white", padding: "12px 24px", borderRadius: "12px", cursor: "pointer", fontWeight: 700, fontSize: "15px", boxShadow: "0 4px 20px rgba(233,69,96,0.4)" },
  ringSection: { display: "flex", flexDirection: "column", gap: "20px", marginBottom: "32px" },
  ringCard: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", padding: "24px", display: "flex", alignItems: "center", gap: "28px" },
  statsRow: { display: "flex", gap: "16px", flexWrap: "wrap" },
  section: { marginBottom: "32px" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" },
  sectionTitle: { fontSize: "18px", fontWeight: 700, margin: 0 },
  viewAll: { background: "transparent", border: "none", color: "#ff6b9d", cursor: "pointer", fontSize: "14px", fontWeight: 600 },
  table: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "16px", overflow: "hidden" },
  tableHeader: { display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr", padding: "14px 20px", background: "rgba(255,255,255,0.05)", fontSize: "12px", fontWeight: 600, opacity: 0.6, textTransform: "uppercase", letterSpacing: "0.5px" },
  tableRow: { display: "grid", gridTemplateColumns: "2fr 1.5fr 1.5fr 1fr", padding: "14px 20px", borderTop: "1px solid rgba(255,255,255,0.06)", fontSize: "14px", alignItems: "center" },
};