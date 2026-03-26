import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Header() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    if (user) fetchNotifications();
  }, [user]);

  const fetchNotifications = async () => {
    try {
      const res = await fetch(`http://localhost:5000/notifications/${user.id}/${role}`);
      const data = await res.json();
      if (data.success) {
        setNotifications(data.notifications);
        setUnread(data.notifications.filter((n) => !n.is_read).length);
      }
    } catch (_) {}
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const isActive = (path) => location.pathname === path;

  const navLinks =
    role === "teacher"
      ? [
          { label: "Dashboard", path: "/teacher/dashboard" },
          { label: "Create Session", path: "/teacher/create-session" },
          { label: "Analytics", path: "/teacher/analytics" },
        ]
      : [
          { label: "Dashboard", path: "/dashboard" },
          { label: "Scan QR", path: "/scanner" },
          { label: "History", path: "/history" },
        ];

  return (
    <nav style={styles.nav}>
      <div style={styles.inner}>
        {/* Logo */}
        <div style={styles.logo} onClick={() => navigate(role === "teacher" ? "/teacher/dashboard" : "/dashboard")}>
          <div style={styles.logoIcon}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
              <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
              <path d="M6 12v5c3 3 9 3 12 0v-5" />
            </svg>
          </div>
          <span style={styles.logoText}>AttendTrack</span>
        </div>

        {/* Nav Links */}
        {user && (
          <div style={styles.links}>
            {navLinks.map((link) => (
              <button
                key={link.path}
                onClick={() => navigate(link.path)}
                style={{
                  ...styles.navBtn,
                  ...(isActive(link.path) ? styles.navBtnActive : {}),
                }}
              >
                {link.label}
              </button>
            ))}
          </div>
        )}

        {/* Right side */}
        {user && (
          <div style={styles.right}>
            {/* Notification Bell */}
            <div style={{ position: "relative" }}>
              <button style={styles.iconBtn} onClick={() => setShowNotifs(!showNotifs)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                {unread > 0 && <span style={styles.badge}>{unread}</span>}
              </button>
              {showNotifs && (
                <div style={styles.dropdown}>
                  <div style={styles.dropdownHeader}>Notifications</div>
                  {notifications.length === 0 ? (
                    <div style={styles.dropdownEmpty}>No notifications</div>
                  ) : (
                    notifications.slice(0, 5).map((n) => (
                      <div key={n.id} style={{ ...styles.notifItem, opacity: n.is_read ? 0.6 : 1 }}>
                        <strong style={{ fontSize: "13px" }}>{n.title}</strong>
                        <p style={{ fontSize: "12px", margin: "2px 0 0" }}>{n.message}</p>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            {/* User chip */}
            <div style={styles.userChip}>
              <div style={styles.avatar}>{user.name?.charAt(0).toUpperCase()}</div>
              <div>
                <div style={{ fontSize: "13px", fontWeight: 600, lineHeight: 1.2 }}>{user.name}</div>
                <div style={{ fontSize: "11px", opacity: 0.7, textTransform: "capitalize" }}>{role}</div>
              </div>
            </div>

            <button style={styles.logoutBtn} onClick={handleLogout}>
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}

const styles = {
  nav: {
    background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
    padding: "0 24px",
    height: "64px",
    display: "flex",
    alignItems: "center",
    boxShadow: "0 2px 20px rgba(0,0,0,0.3)",
    position: "sticky",
    top: 0,
    zIndex: 1000,
    color: "white",
  },
  inner: {
    width: "100%",
    maxWidth: "1200px",
    margin: "0 auto",
    display: "flex",
    alignItems: "center",
    gap: "24px",
  },
  logo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    cursor: "pointer",
    flexShrink: 0,
  },
  logoIcon: {
    width: "36px",
    height: "36px",
    background: "linear-gradient(135deg, #e94560, #ff6b9d)",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  logoText: {
    fontSize: "18px",
    fontWeight: 700,
    letterSpacing: "-0.3px",
    color: "white",
  },
  links: {
    display: "flex",
    gap: "4px",
    flex: 1,
  },
  navBtn: {
    background: "transparent",
    border: "none",
    color: "rgba(255,255,255,0.7)",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: 500,
    transition: "all 0.2s",
  },
  navBtnActive: {
    background: "rgba(233,69,96,0.2)",
    color: "#ff6b9d",
  },
  right: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginLeft: "auto",
  },
  iconBtn: {
    background: "rgba(255,255,255,0.1)",
    border: "none",
    color: "white",
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: "-4px",
    right: "-4px",
    background: "#e94560",
    color: "white",
    fontSize: "10px",
    fontWeight: 700,
    width: "16px",
    height: "16px",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  dropdown: {
    position: "absolute",
    top: "48px",
    right: 0,
    width: "280px",
    background: "#1a1a2e",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
    overflow: "hidden",
  },
  dropdownHeader: {
    padding: "12px 16px",
    fontWeight: 600,
    borderBottom: "1px solid rgba(255,255,255,0.1)",
    fontSize: "14px",
  },
  dropdownEmpty: {
    padding: "20px",
    textAlign: "center",
    fontSize: "13px",
    opacity: 0.6,
  },
  notifItem: {
    padding: "12px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.05)",
    cursor: "pointer",
  },
  userChip: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    background: "rgba(255,255,255,0.08)",
    padding: "6px 12px",
    borderRadius: "10px",
  },
  avatar: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    background: "linear-gradient(135deg, #e94560, #ff6b9d)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: "14px",
  },
  logoutBtn: {
    background: "rgba(233,69,96,0.15)",
    border: "1px solid rgba(233,69,96,0.4)",
    color: "#e94560",
    padding: "7px 14px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: 600,
  },
};