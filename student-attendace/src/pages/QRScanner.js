import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { Html5QrcodeScanner } from "html5-qrcode";
import { useEffect } from "react";

const QRScanner = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState("");
  const [status, setStatus] = useState(null); // 'success' | 'error' | 'warning'
  const [message, setMessage] = useState("");
  const [scanning, setScanning] = useState(false);
  const [sessionInfo, setSessionInfo] = useState(null);
  const lastScannedRef = useRef("");
  const videoRef = useRef(null);
  const streamRef = useRef(null);

  useEffect(() => {
    if (scanning) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: 250 },
        false,
      );

      scanner.render(
        (decodedText) => {
          console.log("QR Code:", decodedText);
          markAttendanceManual(decodedText); // use your existing function
          scanner.clear();
          setScanning(false);
        },
        (error) => {
          // ignore scan errors
        },
      );

      return () => scanner.clear().catch(() => {});
    }
  }, [scanning]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      setScanning(true);
    } catch (err) {
      setStatus("error");
      setMessage("Cannot access camera. Please grant camera permission.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
    setScanning(false);
  };

  // Manual session ID input (for testing or non-camera environments)
  const markAttendanceManual = async (sessionId) => {
    if (!user) {
      navigate("/");
      return;
    }
    if (sessionId === lastScannedRef.current) {
      setStatus("warning");
      setMessage("This QR code was already scanned.");
      return;
    }
    lastScannedRef.current = sessionId;
    setScanResult(sessionId);

    let sessionData;
    try {
      sessionData = JSON.parse(sessionId);
    } catch {
      sessionData = { session_id: sessionId };
    }

    if (sessionData.subject) setSessionInfo(sessionData);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch("http://localhost:5000/mark-attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              student_id: user.id,
              session_id: sessionData.session_id || sessionId,
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });
          const data = await res.json();
          setStatus(data.success ? "success" : "error");
          setMessage(data.message);
        } catch {
          setStatus("error");
          setMessage("Server error. Try again.");
        }
      },
      () => {
        // No location available, try without
        fetch("http://localhost:5000/mark-attendance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: user.id,
            session_id: sessionData.session_id || sessionId,
            latitude: null,
            longitude: null,
          }),
        })
          .then((r) => r.json())
          .then((data) => {
            setStatus(data.success ? "success" : "error");
            setMessage(data.message);
          });
      },
    );
  };

  const [manualId, setManualId] = useState("");

  const statusColors = {
    success: {
      bg: "rgba(74,222,128,0.1)",
      border: "rgba(74,222,128,0.3)",
      color: "#4ade80",
      icon: "✅",
    },
    error: {
      bg: "rgba(233,69,96,0.1)",
      border: "rgba(233,69,96,0.3)",
      color: "#e94560",
      icon: "❌",
    },
    warning: {
      bg: "rgba(250,204,21,0.1)",
      border: "rgba(250,204,21,0.3)",
      color: "#facc15",
      icon: "⚠️",
    },
  };
  const sc = status ? statusColors[status] : null;

  return (
    <div style={styles.page}>
      <div style={styles.container}>
        <h1 style={styles.title}>📷 QR Attendance Scanner</h1>
        <p style={styles.subtitle}>
          Scan the class QR code to mark your attendance
        </p>

        {/* Camera View */}
        <div style={styles.cameraBox}>
          {scanning ? (
            <>
              <div id="reader" style={{ width: "100%" }}></div>
              <div style={styles.scanOverlay}>
                <div style={styles.scanCorner} />
              </div>
              <button style={styles.stopBtn} onClick={stopCamera}>
                Stop Camera
              </button>
            </>
          ) : (
            <div style={styles.cameraPlaceholder}>
              <div style={{ fontSize: "64px" }}>📷</div>
              <p style={{ opacity: 0.6, margin: "12px 0 0" }}>
                Camera not active
              </p>
              <button style={styles.startBtn} onClick={startCamera}>
                Start Camera
              </button>
            </div>
          )}
        </div>

        {/* Session Info */}
        {sessionInfo && (
          <div style={styles.sessionInfo}>
            <h3 style={{ margin: "0 0 8px", fontSize: "15px" }}>
              📚 Session Details
            </h3>
            <p style={{ margin: "4px 0", opacity: 0.8 }}>
              Subject: <strong>{sessionInfo.subject}</strong>
            </p>
            {sessionInfo.session_date && (
              <p style={{ margin: "4px 0", opacity: 0.8 }}>
                Date: {new Date(sessionInfo.session_date).toLocaleDateString()}
              </p>
            )}
          </div>
        )}

        {/* Status Message */}
        {sc && (
          <div
            style={{
              background: sc.bg,
              border: `1px solid ${sc.border}`,
              borderRadius: "12px",
              padding: "16px 20px",
              color: sc.color,
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <span style={{ fontSize: "20px" }}>{sc.icon}</span>
            <span>{message}</span>
          </div>
        )}

        {/* Manual Entry */}
        <div style={styles.manualSection}>
          <h3 style={styles.manualTitle}>Manual Session ID Entry</h3>
          <p style={{ opacity: 0.5, fontSize: "13px", margin: "0 0 12px" }}>
            Use this if camera scanning is unavailable
          </p>
          <div style={styles.manualRow}>
            <input
              style={styles.manualInput}
              type="text"
              placeholder="Paste session ID from teacher"
              value={manualId}
              onChange={(e) => setManualId(e.target.value)}
            />
            <button
              style={styles.manualBtn}
              onClick={() => {
                if (manualId.trim()) markAttendanceManual(manualId.trim());
              }}
            >
              Mark
            </button>
          </div>
        </div>

        {/* Last Scan */}
        {scanResult && (
          <div
            style={{
              marginTop: "16px",
              background: "rgba(255,255,255,0.04)",
              borderRadius: "10px",
              padding: "12px 16px",
              fontSize: "13px",
              opacity: 0.6,
            }}
          >
            Last scan:{" "}
            <code style={{ wordBreak: "break-all" }}>
              {scanResult.slice(0, 60)}
              {scanResult.length > 60 ? "..." : ""}
            </code>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScanner;

const styles = {
  page: {
    padding: "32px 24px",
    maxWidth: "600px",
    margin: "0 auto",
    color: "white",
    fontFamily: "'Segoe UI', sans-serif",
  },
  container: {},
  title: { fontSize: "24px", fontWeight: 800, margin: "0 0 6px" },
  subtitle: { opacity: 0.6, fontSize: "14px", margin: "0 0 24px" },
  cameraBox: {
    background: "rgba(0,0,0,0.3)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "16px",
    overflow: "hidden",
    marginBottom: "20px",
    position: "relative",
    minHeight: "260px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  cameraPlaceholder: { textAlign: "center", padding: "40px" },
  startBtn: {
    marginTop: "16px",
    background: "linear-gradient(135deg, #e94560, #ff6b9d)",
    border: "none",
    color: "white",
    padding: "12px 28px",
    borderRadius: "10px",
    cursor: "pointer",
    fontWeight: 700,
    fontSize: "15px",
  },
  stopBtn: {
    position: "absolute",
    bottom: "12px",
    right: "12px",
    background: "rgba(0,0,0,0.6)",
    border: "1px solid rgba(255,255,255,0.2)",
    color: "white",
    padding: "8px 16px",
    borderRadius: "8px",
    cursor: "pointer",
  },
  scanOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    pointerEvents: "none",
  },
  scanCorner: {
    width: "200px",
    height: "200px",
    border: "3px solid #e94560",
    borderRadius: "16px",
    boxShadow: "0 0 0 9999px rgba(0,0,0,0.3)",
  },
  sessionInfo: {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: "12px",
    padding: "16px",
    marginBottom: "16px",
  },
  manualSection: {
    background: "rgba(255,255,255,0.04)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "16px",
    padding: "20px",
    marginTop: "8px",
  },
  manualTitle: { fontSize: "16px", fontWeight: 700, margin: "0 0 4px" },
  manualRow: { display: "flex", gap: "10px" },
  manualInput: {
    flex: 1,
    padding: "11px 14px",
    background: "rgba(255,255,255,0.08)",
    border: "1px solid rgba(255,255,255,0.15)",
    borderRadius: "10px",
    color: "white",
    fontSize: "14px",
    outline: "none",
  },
  manualBtn: {
    padding: "11px 20px",
    background: "linear-gradient(135deg, #e94560, #ff6b9d)",
    border: "none",
    borderRadius: "10px",
    color: "white",
    fontWeight: 700,
    cursor: "pointer",
  },
};
