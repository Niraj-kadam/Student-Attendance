import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

const TeacherDashboard = ({ initialTab }) => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState(null);
  const [attendance, setAttendance] = useState([]);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [allAttendance, setAllAttendance] = useState([]);
  const [qrModal, setQrModal] = useState(null); // holds session object when modal is open
  const [studentFilter, setStudentFilter] = useState("all"); // "all" | "present" | "late" | "absent"
  const [studentSearch, setStudentSearch] = useState("");

  // Determine active tab: prop wins, then URL, then default sessions
  const getInitialTab = () => {
    if (initialTab) return initialTab;
    if (location.pathname === "/teacher/analytics") return "analytics";
    return "sessions";
  };
  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Sync tab when navbar link changes the route (handles in-page navigation)
  useEffect(() => {
    if (location.pathname === "/teacher/analytics") {
      setActiveTab("analytics");
    } else if (location.pathname === "/teacher/dashboard") {
      setActiveTab("sessions");
    }
  }, [location.pathname]);

  useEffect(() => {
    if (!user) { navigate("/"); return; }
    fetchSessions();
  }, [user]);

  useEffect(() => {
    if (sessions.length > 0) {
      fetchAllAttendance();
    }
  }, [sessions]);

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

  const fetchAllAttendance = async () => {
    try {
      const res = await fetch("http://localhost:5000/teacher/all-attendance", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setAllAttendance(data.attendance || []);
        return;
      }
    } catch (_) {}

    // Fallback: aggregate per session
    try {
      const allData = [];
      for (const session of sessions) {
        const res = await fetch(`http://localhost:5000/teacher/session-attendance/${session.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.attendance) {
          // Always produce a clean YYYY-MM-DD string regardless of how MySQL serializes DATE
          const rawDate = session.session_date;
          const dateStr = rawDate
            ? (rawDate instanceof Date ? rawDate : new Date(rawDate))
                .toISOString().slice(0, 10)
            : null;
          const enriched = data.attendance.map(a => ({
            ...a,
            session_id: session.id,
            session_date: dateStr,
            session_subject: session.subject,
          }));
          allData.push(...enriched);
        }
      }
      setAllAttendance(allData);
    } catch (_) {}
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

  // Analytics calculations
  const calculateAnalytics = () => {
    // ── Step 1: Normalize statuses and ensure every row has a clean date ──
    const normalized = allAttendance.map(a => ({
      ...a,
      status: (a.status || "absent").toLowerCase().trim(),
      // session_date is always YYYY-MM-DD from the new endpoint; guard for fallback
      session_date: a.session_date
        ? String(a.session_date).slice(0, 10)
        : (a.marked_at ? String(a.marked_at).slice(0, 10) : 'Unknown'),
    }));

    // ── Step 2: Unique students by student_id (stable numeric key) ────────
    const uniqueStudentIds = new Set(normalized.map(a => a.student_id).filter(Boolean));
    const totalStudents = uniqueStudentIds.size;
    const totalSessions = sessions.length;

    const present = normalized.filter(a => a.status === "present").length;
    const late    = normalized.filter(a => a.status === "late").length;
    const absent  = normalized.filter(a => a.status === "absent").length;
    const totalRecords = present + late + absent;

    const attendanceRate = totalRecords > 0
      ? ((present + late) / totalRecords * 100).toFixed(1) : 0;
    const punctualityRate = (present + late) > 0
      ? (present / (present + late) * 100).toFixed(1) : 0;

    // ── Step 3: Group by date ─────────────────────────────────────────────
    const byDate = {};
    normalized.forEach(a => {
      const date = a.session_date;
      if (!byDate[date]) byDate[date] = { present: 0, late: 0, absent: 0, total: 0 };
      byDate[date][a.status] = (byDate[date][a.status] || 0) + 1;
      byDate[date].total++;
    });

    const dates = Object.keys(byDate).sort().slice(-7);
    const trendData = dates.map(date => ({
      date,
      rate: byDate[date].total > 0
        ? ((byDate[date].present + byDate[date].late) / byDate[date].total * 100).toFixed(1)
        : "0.0",
      present: byDate[date].present,
      late:    byDate[date].late,
      absent:  byDate[date].absent,
    }));

    // ── Step 4: Top students — keyed by student_id ───────────────────────
    const byStudent = {};
    normalized.forEach(a => {
      const key = a.student_id || a.name || 'Unknown';
      const label = a.name || String(a.student_id) || 'Unknown';
      if (!byStudent[key]) byStudent[key] = { name: label, present: 0, late: 0, absent: 0, total: 0 };
      byStudent[key][a.status] = (byStudent[key][a.status] || 0) + 1;
      byStudent[key].total++;
      if (a.name) byStudent[key].name = a.name; // keep name updated
    });
    const topStudents = Object.values(byStudent)
      .map(data => ({
        name: data.name,
        rate: data.total > 0
          ? ((data.present + data.late) / data.total * 100).toFixed(1) : "0.0",
        total: data.total,
      }))
      .sort((a, b) => b.rate - a.rate)
      .slice(0, 5);

    // ── Step 5: Per-student breakdown — keyed by student_id ──────────────
    const studentBreakdown = {};
    normalized.forEach(a => {
      const key = a.student_id || a.name || 'Unknown';
      const label = a.name || String(a.student_id) || 'Unknown';
      if (!studentBreakdown[key]) {
        studentBreakdown[key] = { name: label, present: 0, late: 0, absent: 0, total: 0, latestStatus: 'absent' };
      }
      studentBreakdown[key][a.status] = (studentBreakdown[key][a.status] || 0) + 1;
      studentBreakdown[key].total++;
      if (a.name) studentBreakdown[key].name = a.name;
      // Prefer non-absent as the "latest" status
      if (a.status !== 'absent') studentBreakdown[key].latestStatus = a.status;
    });

    const studentList = Object.values(studentBreakdown)
      .map(d => ({
        name: d.name,
        present: d.present || 0,
        late: d.late || 0,
        absent: d.absent || 0,
        total: d.total || 0,
        rate: d.total > 0 ? Math.round((d.present + d.late) / d.total * 100) : 0,
        latestStatus: d.latestStatus || 'absent',
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return {
      totalRecords,
      present,
      late,
      absent,
      attendanceRate,
      punctualityRate,
      trendData,
      topStudents,
      byDate,
      totalStudents,
      totalSessions,
      studentList,
    };
  };

  const analytics = calculateAnalytics();

  const statusBadge = (status) => {
    const map = {
      present: { bg: "rgba(74,222,128,0.15)", color: "#4ade80", label: "Present" },
      late: { bg: "rgba(250,204,21,0.15)", color: "#facc15", label: "Late" },
      absent: { bg: "rgba(233,69,96,0.15)", color: "#e94560", label: "Absent" },
    };
    const s = map[status] || map.absent;
    return <span style={{ background: s.bg, color: s.color, padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 600 }}>{s.label}</span>;
  };

  // Pure CSS Donut Chart Component
  const DonutChart = ({ present, late, absent }) => {
    const total = present + late + absent;
    if (total === 0) return <div style={{ textAlign: 'center', opacity: 0.4, padding: '40px' }}>No data</div>;
    
    const presentPercent = (present / total * 100).toFixed(1);
    const latePercent = (late / total * 100).toFixed(1);
    const absentPercent = (absent / total * 100).toFixed(1);
    
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '20px' }}>
        <div style={{ position: 'relative', width: '200px', height: '200px' }}>
          <svg viewBox="0 0 200 200" style={{ transform: 'rotate(-90deg)' }}>
            {/* Background circle */}
            <circle cx="100" cy="100" r="80" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="30" />
            
            {/* Present segment */}
            <circle 
              cx="100" 
              cy="100" 
              r="80" 
              fill="none" 
              stroke="#4ade80" 
              strokeWidth="30"
              strokeDasharray={`${present / total * 502} 502`}
              strokeDashoffset="0"
              style={{ transition: 'all 0.5s ease' }}
            />
            
            {/* Late segment */}
            <circle 
              cx="100" 
              cy="100" 
              r="80" 
              fill="none" 
              stroke="#facc15" 
              strokeWidth="30"
              strokeDasharray={`${late / total * 502} 502`}
              strokeDashoffset={`-${present / total * 502}`}
              style={{ transition: 'all 0.5s ease' }}
            />
            
            {/* Absent segment */}
            <circle 
              cx="100" 
              cy="100" 
              r="80" 
              fill="none" 
              stroke="#e94560" 
              strokeWidth="30"
              strokeDasharray={`${absent / total * 502} 502`}
              strokeDashoffset={`-${(present + late) / total * 502}`}
              style={{ transition: 'all 0.5s ease' }}
            />
          </svg>
          
          {/* Center text */}
          <div style={{ 
            position: 'absolute', 
            top: '50%', 
            left: '50%', 
            transform: 'translate(-50%, -50%)',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#4ade80' }}>{analytics.attendanceRate}%</div>
            <div style={{ fontSize: '11px', opacity: 0.6 }}>Attendance</div>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#4ade80' }} />
            <span style={{ fontSize: '12px' }}>Present ({presentPercent}%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#facc15' }} />
            <span style={{ fontSize: '12px' }}>Late ({latePercent}%)</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: '#e94560' }} />
            <span style={{ fontSize: '12px' }}>Absent ({absentPercent}%)</span>
          </div>
        </div>
      </div>
    );
  };

  // Bar Chart Component
  const BarChart = ({ data, maxValue }) => {
    if (!data || data.length === 0) {
      return <div style={{ textAlign: 'center', opacity: 0.4, padding: '40px' }}>No data</div>;
    }

    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '200px', padding: '20px 0' }}>
        {data.map((item, i) => (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: '#4ade80' }}>{item.rate}%</div>
            <div style={{ 
              width: '100%', 
              height: `${(item.rate / 100) * 160}px`,
              background: 'linear-gradient(180deg, #e94560, #ff6b9d)',
              borderRadius: '8px 8px 0 0',
              transition: 'all 0.3s ease',
              minHeight: '4px',
              position: 'relative',
              boxShadow: '0 -2px 10px rgba(233, 69, 96, 0.3)'
            }}>
              <div style={{
                position: 'absolute',
                top: '-20px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '10px',
                opacity: 0.6
              }}>
                {item.present + item.late}/{item.present + item.late + item.absent}
              </div>
            </div>
            <div style={{ fontSize: '10px', opacity: 0.6, textAlign: 'center', maxWidth: '100%', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {new Date(item.date).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // ── QR Share Modal ──────────────────────────────────────────────────
  const QRModal = ({ session, onClose }) => {
    const [copied, setCopied] = useState(false);
    const copyId = () => {
      navigator.clipboard.writeText(session.id).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    };
    const downloadQR = () => {
      const a = document.createElement("a");
      a.href = session.qr_code;
      a.download = `QR-${session.subject}-${session.session_date}.png`;
      a.click();
    };
    return (
      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "20px"
      }} onClick={onClose}>
        <div style={{
          background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
          border: "1px solid rgba(255,255,255,0.12)",
          borderRadius: "24px", padding: "36px 32px",
          width: "100%", maxWidth: "420px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
          position: "relative"
        }} onClick={e => e.stopPropagation()}>

          {/* Close button */}
          <button onClick={onClose} style={{
            position: "absolute", top: "16px", right: "16px",
            background: "rgba(255,255,255,0.08)", border: "none",
            color: "white", width: "32px", height: "32px",
            borderRadius: "8px", cursor: "pointer", fontSize: "16px",
            display: "flex", alignItems: "center", justifyContent: "center"
          }}>✕</button>

          {/* Header */}
          <div style={{ marginBottom: "24px" }}>
            <h2 style={{ margin: "0 0 4px", fontSize: "20px", fontWeight: 800 }}>
              📤 Share QR Code
            </h2>
            <p style={{ margin: 0, fontSize: "13px", opacity: 0.5 }}>
              {session.subject} · {session.session_date ? new Date(session.session_date).toLocaleDateString("en-IN") : ""}
              {session.start_time ? ` · ${session.start_time.slice(0,5)}` : ""}
            </p>
          </div>

          {/* QR Code */}
          {session.qr_code ? (
            <div style={{ textAlign: "center", marginBottom: "24px" }}>
              <div style={{
                display: "inline-block", background: "white",
                padding: "16px", borderRadius: "16px",
                boxShadow: "0 8px 32px rgba(0,0,0,0.4)"
              }}>
                <img src={session.qr_code} alt="QR Code"
                  style={{ width: "200px", height: "200px", display: "block" }} />
              </div>
              <p style={{ margin: "12px 0 0", fontSize: "12px", opacity: 0.4 }}>
                Students scan this to mark attendance
              </p>
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", opacity: 0.4, marginBottom: "24px" }}>
              <div style={{ fontSize: "48px" }}>❌</div>
              <p style={{ fontSize: "13px" }}>QR code not available</p>
            </div>
          )}

          {/* Session ID */}
          <div style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            borderRadius: "12px", padding: "14px 16px",
            marginBottom: "20px"
          }}>
            <div style={{ fontSize: "11px", opacity: 0.5, fontWeight: 600, textTransform: "uppercase", marginBottom: "6px" }}>
              Session ID / Key
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <code style={{ flex: 1, fontSize: "13px", wordBreak: "break-all", color: "#60a5fa", lineHeight: 1.5 }}>
                {session.id}
              </code>
              <button onClick={copyId} style={{
                flexShrink: 0, padding: "6px 12px",
                background: copied ? "rgba(74,222,128,0.15)" : "rgba(255,255,255,0.08)",
                border: copied ? "1px solid rgba(74,222,128,0.4)" : "1px solid rgba(255,255,255,0.15)",
                color: copied ? "#4ade80" : "white",
                borderRadius: "8px", cursor: "pointer",
                fontSize: "12px", fontWeight: 600, transition: "all 0.2s"
              }}>
                {copied ? "✓ Copied!" : "📋 Copy"}
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "10px" }}>
            {session.qr_code && (
              <button onClick={downloadQR} style={{
                flex: 1, padding: "12px",
                background: "rgba(255,255,255,0.08)",
                border: "1px solid rgba(255,255,255,0.15)",
                borderRadius: "10px", color: "white",
                cursor: "pointer", fontWeight: 600, fontSize: "13px"
              }}>
                ⬇ Download QR
              </button>
            )}
            <button onClick={onClose} style={{
              flex: 1, padding: "12px",
              background: "linear-gradient(135deg, #e94560, #ff6b9d)",
              border: "none", borderRadius: "10px",
              color: "white", cursor: "pointer",
              fontWeight: 700, fontSize: "13px",
              boxShadow: "0 4px 16px rgba(233,69,96,0.35)"
            }}>
              Done
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>Teacher Dashboard</h1>
          <p style={styles.sub}>Welcome back, {user?.name} · {user?.subject}</p>
        </div>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <button 
            style={{...styles.tabBtn, ...(activeTab === "sessions" ? styles.tabBtnActive : {})}} 
            onClick={() => { setActiveTab("sessions"); navigate("/teacher/dashboard"); }}
          >
            📋 Sessions
          </button>
          <button 
            style={{...styles.tabBtn, ...(activeTab === "analytics" ? styles.tabBtnActive : {})}} 
            onClick={() => { setActiveTab("analytics"); navigate("/teacher/analytics"); }}
          >
            📊 Analytics
          </button>
          <button style={styles.createBtn} onClick={() => navigate("/teacher/create-session")}>
            + Create Session
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={styles.statsRow}>
        {[
          { label: "Total Sessions", value: sessions.length, color: "white", icon: "📅" },
          { label: "Attendance Rate", value: `${analytics.attendanceRate}%`, color: "#4ade80", icon: "✅",
            sub: `${analytics.present + analytics.late} of ${analytics.totalRecords} slots` },
          { label: "Unique Students", value: analytics.totalStudents, color: "#facc15", icon: "👥" },
        ].map((s, i) => (
          <div key={i} style={styles.statCard}>
            <div style={{ fontSize: "28px" }}>{s.icon}</div>
            <div>
              <div style={{ fontSize: "28px", fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: "13px", opacity: 0.6 }}>{s.label}</div>
              {s.sub && <div style={{ fontSize: "11px", opacity: 0.4, marginTop: "2px" }}>{s.sub}</div>}
            </div>
          </div>
        ))}
      </div>

      {/* SESSIONS TAB */}
      {activeTab === "sessions" && (
        <div style={styles.grid}>
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

                  {s.qr_code && (
                    <img src={s.qr_code} alt="QR" style={{ width: "80px", height: "80px", borderRadius: "8px", border: "2px solid rgba(255,255,255,0.1)" }} />
                  )}

                  <div style={styles.sessionActions}>
                    <button style={styles.actionBtn} onClick={() => viewAttendance(s)}>👁 View Attendance</button>
                    <button style={{ ...styles.actionBtn, color: "#a78bfa" }} onClick={() => setQrModal(s)}>
                      📤 Share QR
                    </button>
                    <button style={{ ...styles.actionBtn, color: s.is_active ? "#e94560" : "#4ade80" }} onClick={() => toggleSession(s.id)}>
                      {s.is_active ? "🔒 Close" : "🔓 Reopen"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

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
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "500px", overflowY: "auto" }}>
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
      )}

      {/* ANALYTICS TAB */}
      {activeTab === "analytics" && (
        <div style={styles.analyticsGrid}>
          {/* Status Distribution */}
          <div style={styles.chartPanel}>
            <h3 style={styles.chartTitle}>📊 Attendance Distribution</h3>
            <DonutChart 
              present={analytics.present} 
              late={analytics.late} 
              absent={analytics.absent} 
            />
          </div>

          {/* Weekly Trend */}
          <div style={{ ...styles.chartPanel, gridColumn: 'span 2' }}>
            <h3 style={styles.chartTitle}>📈 7-Day Attendance Trend</h3>
            <BarChart data={analytics.trendData} maxValue={100} />
          </div>

          {/* Quick Stats Grid */}
          <div style={styles.chartPanel}>
            <h3 style={styles.chartTitle}>💡 Key Metrics</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '16px' }}>
              <div style={styles.metricCard}>
                <div style={{ fontSize: '28px' }}>🎯</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>Overall Attendance</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#4ade80' }}>{analytics.attendanceRate}%</div>
                  <div style={{ fontSize: '10px', opacity: 0.4 }}>{analytics.present + analytics.late}/{analytics.totalRecords} attended</div>
                </div>
              </div>

              <div style={styles.metricCard}>
                <div style={{ fontSize: '28px' }}>⏱️</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>Late Arrivals</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#facc15' }}>{analytics.late}</div>
                  <div style={{ fontSize: '10px', opacity: 0.4 }}>
                    {analytics.totalRecords > 0 ? ((analytics.late / analytics.totalRecords) * 100).toFixed(1) : 0}% late rate
                  </div>
                </div>
              </div>

              <div style={styles.metricCard}>
                <div style={{ fontSize: '28px' }}>❌</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '11px', opacity: 0.6, marginBottom: '4px' }}>Absences</div>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: '#e94560' }}>{analytics.absent}</div>
                  <div style={{ fontSize: '10px', opacity: 0.4 }}>
                    {analytics.totalRecords > 0 ? ((analytics.absent / analytics.totalRecords) * 100).toFixed(1) : 0}% absence rate
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div style={{ ...styles.chartPanel, gridColumn: 'span 2' }}>
            <h3 style={styles.chartTitle}>🏆 Top 5 Students by Attendance</h3>
            {analytics.topStudents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '16px' }}>
                {analytics.topStudents.map((student, i) => (
                  <div key={i} style={styles.leaderboardItem}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <div style={{ 
                        width: '32px', 
                        height: '32px', 
                        borderRadius: '8px', 
                        background: i === 0 ? 'linear-gradient(135deg, #ffd700, #ffed4e)' : 
                                   i === 1 ? 'linear-gradient(135deg, #c0c0c0, #e8e8e8)' :
                                   i === 2 ? 'linear-gradient(135deg, #cd7f32, #e6a57e)' :
                                   'rgba(255,255,255,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '14px',
                        fontWeight: 800,
                        color: i < 3 ? '#000' : '#fff'
                      }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '14px' }}>{student.name}</div>
                        <div style={{ fontSize: '11px', opacity: 0.5 }}>{student.total} sessions attended</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ 
                        width: `${student.rate}%`, 
                        maxWidth: '100px',
                        height: '6px', 
                        background: 'linear-gradient(90deg, #4ade80, #22c55e)',
                        borderRadius: '3px',
                        minWidth: '20px'
                      }} />
                      <div style={{ fontSize: '16px', fontWeight: 700, color: '#4ade80', minWidth: '50px', textAlign: 'right' }}>
                        {student.rate}%
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px', opacity: 0.4 }}>
                <div style={{ fontSize: '48px' }}>🏆</div>
                <p>Not enough data yet</p>
              </div>
            )}
          </div>

          {/* ── Student Status Breakdown ─────────────────────────────── */}
          <div style={{ ...styles.chartPanel, gridColumn: 'span 3' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              <h3 style={{ ...styles.chartTitle, margin: 0 }}>👨‍🎓 Student Status Breakdown</h3>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                {/* Search */}
                <input
                  type="text"
                  placeholder="🔍 Search student..."
                  value={studentSearch}
                  onChange={e => setStudentSearch(e.target.value)}
                  style={{
                    background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.15)',
                    borderRadius: '8px', color: 'white', padding: '7px 12px', fontSize: '13px',
                    outline: 'none', width: '180px',
                  }}
                />
                {/* Filter pills */}
                {["all","present","late","absent"].map(f => (
                  <button key={f} onClick={() => setStudentFilter(f)} style={{
                    padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', border: 'none',
                    background: studentFilter === f
                      ? f === 'present' ? '#4ade80' : f === 'late' ? '#facc15' : f === 'absent' ? '#e94560' : 'linear-gradient(135deg,#e94560,#ff6b9d)'
                      : 'rgba(255,255,255,0.08)',
                    color: studentFilter === f && f !== 'all' ? '#000' : 'white',
                  }}>
                    {f === 'all' ? `All (${analytics.studentList.length})`
                      : f === 'present' ? `✅ Present (${analytics.studentList.filter(s=>s.present>0).length})`
                      : f === 'late'    ? `⏰ Late (${analytics.studentList.filter(s=>s.late>0).length})`
                      :                   `❌ Absent (${analytics.studentList.filter(s=>s.absent>0).length})`}
                  </button>
                ))}
              </div>
            </div>

            {analytics.studentList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', opacity: 0.4 }}>
                <div style={{ fontSize: '48px' }}>👨‍🎓</div>
                <p>No student data yet</p>
              </div>
            ) : (() => {
              const displayed = analytics.studentList
                .filter(s => studentSearch === '' || s.name.toLowerCase().includes(studentSearch.toLowerCase()))
                .filter(s => {
                  if (studentFilter === 'all') return true;
                  if (studentFilter === 'present') return s.present > 0;
                  if (studentFilter === 'late')    return s.late > 0;
                  if (studentFilter === 'absent')  return s.absent > 0;
                  return true;
                });
              return displayed.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', opacity: 0.4 }}>No students match this filter</div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  {/* Table header */}
                  <div style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px',
                    padding: '10px 16px', background: 'rgba(255,255,255,0.05)',
                    borderRadius: '10px', marginBottom: '6px',
                    fontSize: '11px', fontWeight: 700, opacity: 0.5, textTransform: 'uppercase', letterSpacing: '0.5px'
                  }}>
                    <span>Student</span>
                    <span style={{ textAlign: 'center' }}>Present</span>
                    <span style={{ textAlign: 'center' }}>Late</span>
                    <span style={{ textAlign: 'center' }}>Absent</span>
                    <span style={{ textAlign: 'center' }}>Total</span>
                    <span style={{ textAlign: 'center' }}>Rate</span>
                  </div>
                  {/* Table rows */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '360px', overflowY: 'auto' }}>
                    {displayed.map((s, i) => {
                      const rateColor = s.rate >= 75 ? '#4ade80' : s.rate >= 50 ? '#facc15' : '#e94560';
                      return (
                        <div key={i} style={{
                          display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 120px',
                          padding: '12px 16px', borderRadius: '10px', alignItems: 'center',
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          transition: 'background 0.15s',
                        }}>
                          {/* Name + avatar */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '8px', flexShrink: 0,
                              background: `linear-gradient(135deg, ${rateColor}33, ${rateColor}22)`,
                              border: `1px solid ${rateColor}44`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '13px', fontWeight: 800, color: rateColor,
                            }}>
                              {s.name.charAt(0).toUpperCase()}
                            </div>
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>{s.name}</span>
                          </div>
                          {/* Present */}
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ background: 'rgba(74,222,128,0.12)', color: '#4ade80', padding: '3px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                              {s.present}
                            </span>
                          </div>
                          {/* Late */}
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ background: 'rgba(250,204,21,0.12)', color: '#facc15', padding: '3px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                              {s.late}
                            </span>
                          </div>
                          {/* Absent */}
                          <div style={{ textAlign: 'center' }}>
                            <span style={{ background: 'rgba(233,69,96,0.12)', color: '#e94560', padding: '3px 10px', borderRadius: '20px', fontSize: '13px', fontWeight: 700 }}>
                              {s.absent}
                            </span>
                          </div>
                          {/* Total */}
                          <div style={{ textAlign: 'center', fontSize: '13px', opacity: 0.6, fontWeight: 600 }}>
                            {s.total}
                          </div>
                          {/* Rate bar + % */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.08)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ height: '100%', width: `${s.rate}%`, background: rateColor, borderRadius: '3px', transition: 'width 0.4s ease' }} />
                            </div>
                            <span style={{ fontSize: '13px', fontWeight: 800, color: rateColor, minWidth: '38px', textAlign: 'right' }}>
                              {s.rate}%
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {/* Recent Activity */}
          <div style={{ ...styles.chartPanel, gridColumn: 'span 3' }}>
            <h3 style={styles.chartTitle}>🕐 Recent Activity</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '10px', marginTop: '16px', maxHeight: '300px', overflowY: 'auto' }}>
              {allAttendance.length > 0 ? (
                allAttendance
                  .sort((a, b) => new Date(b.marked_at) - new Date(a.marked_at))
                  .slice(0, 12)
                  .map((a, i) => (
                    <div key={i} style={styles.activityCard}>
                      <div style={{ fontSize: '24px' }}>
                        {a.status === 'present' ? '✅' : a.status === 'late' ? '⏰' : '❌'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{a.name}</div>
                        <div style={{ fontSize: '11px', opacity: 0.5 }}>
                          {a.marked_at ? new Date(a.marked_at).toLocaleString('en-IN', { 
                            month: 'short', 
                            day: 'numeric', 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          }) : '—'}
                        </div>
                      </div>
                      {statusBadge(a.status)}
                    </div>
                  ))
              ) : (
                <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', opacity: 0.4 }}>
                  <div style={{ fontSize: '48px' }}>🕐</div>
                  <p>No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* QR Share Modal */}
      {qrModal && <QRModal session={qrModal} onClose={() => setQrModal(null)} />}
    </div>
  );
};

export default TeacherDashboard;

const styles = {
  page: { 
    padding: "32px 24px", 
    maxWidth: "1400px", 
    margin: "0 auto", 
    color: "white", 
    fontFamily: "'Segoe UI', -apple-system, sans-serif",
    minHeight: "100vh"
  },
  header: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "center", 
    marginBottom: "28px", 
    flexWrap: "wrap", 
    gap: "16px" 
  },
  title: { fontSize: "26px", fontWeight: 800, margin: 0 },
  sub: { fontSize: "14px", opacity: 0.6, margin: "4px 0 0" },
  tabBtn: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    color: "rgba(255,255,255,0.6)",
    padding: "10px 18px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "13px",
    transition: "all 0.2s"
  },
  tabBtnActive: {
    background: "rgba(233,69,96,0.15)",
    borderColor: "rgba(233,69,96,0.4)",
    color: "#e94560"
  },
  createBtn: { 
    background: "linear-gradient(135deg, #e94560, #ff6b9d)", 
    border: "none", 
    color: "white", 
    padding: "12px 24px", 
    borderRadius: "12px", 
    cursor: "pointer", 
    fontWeight: 700, 
    fontSize: "14px", 
    boxShadow: "0 4px 20px rgba(233,69,96,0.4)" 
  },
  statsRow: { 
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "16px", 
    marginBottom: "28px"
  },
  statCard: { 
    background: "rgba(255,255,255,0.05)", 
    border: "1px solid rgba(255,255,255,0.08)", 
    borderRadius: "16px", 
    padding: "20px 24px", 
    display: "flex", 
    alignItems: "center", 
    gap: "16px" 
  },
  grid: { 
    display: "grid", 
    gridTemplateColumns: "1fr 1fr", 
    gap: "24px" 
  },
  analyticsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "20px"
  },
  panel: { 
    background: "rgba(255,255,255,0.03)", 
    border: "1px solid rgba(255,255,255,0.08)", 
    borderRadius: "20px", 
    padding: "24px" 
  },
  chartPanel: {
    background: "rgba(255,255,255,0.03)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "20px",
    padding: "24px"
  },
  chartTitle: {
    fontSize: "15px",
    fontWeight: 700,
    margin: "0 0 12px",
    color: "#fff"
  },
  panelTitle: { 
    fontSize: "16px", 
    fontWeight: 700, 
    margin: "0 0 20px" 
  },
  sessionCard: { 
    background: "rgba(255,255,255,0.04)", 
    border: "1px solid rgba(255,255,255,0.08)", 
    borderRadius: "14px", 
    padding: "16px", 
    marginBottom: "12px", 
    display: "flex", 
    flexDirection: "column", 
    gap: "12px" 
  },
  sessionCardActive: { 
    borderColor: "rgba(233,69,96,0.4)", 
    background: "rgba(233,69,96,0.05)" 
  },
  sessionTop: { 
    display: "flex", 
    justifyContent: "space-between", 
    alignItems: "flex-start" 
  },
  sessionActions: { 
    display: "flex", 
    gap: "8px" 
  },
  actionBtn: { 
    background: "rgba(255,255,255,0.08)", 
    border: "1px solid rgba(255,255,255,0.12)", 
    color: "white", 
    padding: "7px 14px", 
    borderRadius: "8px", 
    cursor: "pointer", 
    fontSize: "12px", 
    fontWeight: 600 
  },
  metricCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '12px',
    padding: '14px',
    border: '1px solid rgba(255,255,255,0.06)'
  },
  leaderboardItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '12px',
    padding: '14px 16px',
    border: '1px solid rgba(255,255,255,0.06)'
  },
  activityCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    background: 'rgba(255,255,255,0.04)',
    borderRadius: '10px',
    padding: '12px 14px',
    border: '1px solid rgba(255,255,255,0.06)'
  }
};