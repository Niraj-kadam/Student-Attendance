import React, { useState } from "react";
import QrReader from "react-qr-reader-es6";

const QRScanner = () => {
  const [scanResult, setScanResult] = useState("");
  const [counter, setCounter] = useState(0);

  // Handle scanning QR code
  const handleScan = (result) => {
    if (result) {
      setScanResult(result);
      setCounter((prev) => prev + 1);

      navigator.geolocation.getCurrentPosition(async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const student_id = 1; // Replace with actual logged-in student ID
        const session_id = result; // The scanned QR value

        try {
          const response = await fetch("http://localhost:5000/mark-attendance", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ student_id, session_id, latitude, longitude }),
          });

          const data = await response.text(); // Using .text() since backend sends string
          alert(data);
        } catch (error) {
          console.error("❌ Error:", error);
          alert("Error connecting to server.");
        }
      });
    }
  };

  const handleError = (err) => {
    console.error("QR Scanner Error:", err);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>QR Code Scanner</h2>
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
          delay={300}
          onError={handleError}
          onScan={handleScan}
          style={{ width: "100%" }}
          facingMode="environment"
        />
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3>Scanned Result:</h3>
        <p style={{ fontWeight: "bold" }}>{scanResult || "No QR scanned yet"}</p>
        <h3>Total QR Scanned: {counter}</h3>
      </div>
    </div>
  );
};

export default QRScanner;
