import React, { useState, useRef } from "react";
import QrReader from "react-qr-reader-es6";

const QRScanner = () => {
  const [scanResult, setScanResult] = useState("");
  const [counter, setCounter] = useState(0);
  const lastScannedRef = useRef(""); // 👈 store last scanned QR to prevent duplicates

  // Handle scanning QR code
  const handleScan = async (result) => {
    if (result && result !== lastScannedRef.current) {
      // 👆 prevent duplicate scans of the same QR
      lastScannedRef.current = result; // remember last scanned QR
      setScanResult(result);
      setCounter((prev) => prev + 1);

      // ✅ Get current logged-in student from localStorage
      const student = JSON.parse(localStorage.getItem("student"));
      if (!student) {
        alert("Please login first!");
        return;
      }

      const student_id = student.id; // student ID from login data
      const session_id = result; // QR code data (like session ID)

      // ✅ Get device location
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const latitude = position.coords.latitude;
          const longitude = position.coords.longitude;

          try {
            // ✅ Send attendance data to backend
            const response = await fetch(
              "http://localhost:5000/mark-attendance",
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  student_id,
                  session_id,
                  latitude,
                  longitude,
                }),
              }
            );

            const data = await response.json();
            alert(data.message || "Attendance marked successfully!");
          } catch (error) {
            console.error("❌ Error:", error);
            alert("Error connecting to server.");
          }
        },
        (error) => {
          console.error("❌ Location error:", error);
          alert("Please enable location access.");
        }
      );
    }
  };

  const handleError = (err) => {
    console.error("QR Scanner Error:", err);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>📸 QR Code Scanner</h2>

      <div
        style={{
          width: "300px",
          margin: "auto",
          border: "2px solid #333",
          borderRadius: "10px",
          overflow: "hidden",
        }}
      >
        <QrReader
          delay={800} // 👈 slower scan rate to prevent duplicates
          onError={handleError}
          onScan={handleScan}
          style={{ width: "100%" }}
          facingMode="environment"
        />
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Scanned Result:</h3>
        <p style={{ fontWeight: "bold" }}>
          {scanResult || "No QR scanned yet"}
        </p>
        <h3>Total Unique QRs Scanned: {counter}</h3>
      </div>
    </div>
  );
};

export default QRScanner;
