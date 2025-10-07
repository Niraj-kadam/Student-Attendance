import React, { useState } from "react";
import QrReader from "react-qr-reader-es6";

const QRScanner = () => {
  const [scanResult, setScanResult] = useState("");
  const [counter, setCounter] = useState(0);

  const handleScan = (result) => {
    if (result && result !== scanResult) {
      setScanResult(result);
      setCounter((prev) => prev + 1);
    }
  };

  const handleError = (error) => {
    console.error("QR Scan Error:", error);
  };

  return (
    <div style={{ textAlign: "center", marginTop: "40px" }}>
      <h2>📷 QR Code Scanner</h2>
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
