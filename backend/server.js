const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Connect to XAMPP MySQL Database
const db = mysql.createConnection({
  host: "localhost",
  user: "root", // default XAMPP username
  password: "", // keep empty unless you set one in phpMyAdmin
  database: "attendance_system"
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL database");
  }
});

// ✅ API to mark attendance
app.post("/mark-attendance", (req, res) => {
  const { student_id, session_id, latitude, longitude } = req.body;

  const query = `
    INSERT INTO attendance (student_id, session_id, latitude, longitude)
    VALUES (?, ?, ?, ?)
  `;

  db.query(query, [student_id, session_id, latitude, longitude], (err, result) => {
    if (err) {
      console.error("❌ Error inserting data:", err);
      res.status(500).json({ error: "Failed to mark attendance" });
    } else {
      console.log("✅ Attendance added:", result.insertId);
      res.json({ message: "✅ Attendance marked successfully!" });
    }
  });
});

app.listen(5000, () => console.log("🚀 Server running on port 5000"));
