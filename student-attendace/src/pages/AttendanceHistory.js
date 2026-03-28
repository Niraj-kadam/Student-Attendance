import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";

const AttendanceHistory = () => {
  const { user } = useAuth();
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    if (!user) return;
    fetch(`http://localhost:5000/student/attendance-history/${user.id}`)
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          // Normalize: null / undefined / empty status → "absent"
          const normalized = d.history.map(r => ({
            ...r,
            status: (r.status || "absent").toLowerCase().trim(),
          }));
          setHistory(normalized);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [user]);

  const filtered = filter === "all" ? history : history.filter(h => h.status === filter);

  const statusStyles = {
    present: { bg: "rgba(74,222,128,0.12)", color: "#4ade80", border: "rgba(74,222,128,0.3)" },
    late: { bg: "rgba(250,204,21,0.12)", color: "#facc15", border: "rgba(250,204,21,0.3)" },
    absent: { bg: "rgba(233,69,96,0.12)", color: "#e94560", border: "rgba(233,69,96,0.3)" },
  };

  return (
    <div style={{ padding: "32px 24px", maxWidth: "900px", margin: "0 auto", color: "white", fontFamily: "'Segoe UI', sans-serif" }}>
      <h1 style={{ fontSize: "26px", fontWeight: 800, margin: "0 0 6px" }}>Attendance History</h1>
      <p style={{ opacity: 0.6, fontSize: "14px", margin: "0 0 24px" }}>Your complete attendance record</p>

      {/* Filter Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
        {["all", "present", "late", "absent"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{
            padding: "8px 18px",
            borderRadius: "20px",
            border: "1px solid rgba(255,255,255,0.15)",
            background: filter === f ? "linear-gradient(135deg, #e94560, #ff6b9d)" : "rgba(255,255,255,0.05)",
            color: "white",
            cursor: "pointer",
            fontWeight: 600,
            fontSize: "13px",
            textTransform: "capitalize",
          }}>
            {f === "all" ? `All (${history.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${history.filter(h => (h.status || "absent") === f).length})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: "center", padding: "60px", opacity: 0.5 }}>Loading...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px", opacity: 0.5 }}>
          <div style={{ fontSize: "48px" }}>📭</div>
          <p>No records found</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {filtered.map((row, i) => {
            const st = row.status || "absent";
            const ss = statusStyles[st] || statusStyles.absent;
            return (
              <div key={i} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid rgba(255,255,255,0.08)`, borderRadius: "14px", padding: "16px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", borderLeft: `3px solid ${ss.color}` }}>
                <div style={{ flex: 1 }}>
                  <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>{row.subject || "Unknown Subject"}</h3>
                  <p style={{ margin: "4px 0 0", fontSize: "13px", opacity: 0.6 }}>
                    {row.teacher_name && `by ${row.teacher_name}`}
                  </p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "13px", opacity: 0.7, marginBottom: "6px" }}>
                    {row.session_date ? new Date(row.session_date).toLocaleDateString("en-IN", { weekday: "short", year: "numeric", month: "short", day: "numeric" }) : "—"}
                    {row.start_time ? ` · ${row.start_time.slice(0, 5)}` : ""}
                  </div>
                  <span style={{ background: ss.bg, color: ss.color, border: `1px solid ${ss.border}`, padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase" }}>
                    {st}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AttendanceHistory;