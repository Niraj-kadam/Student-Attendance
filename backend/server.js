const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
app.use(cors());
app.use(express.json());

// ✅ Connect to XAMPP MySQL Database
const db = mysql.createConnection({
  host: "localhost",
  user: "root", // XAMPP default username
  password: "", // leave empty unless you set one
  database: "attendance_system", // make sure this name matches your DB
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL database");
  }
});

// ===============================
// 📝 REGISTER API
// ===============================
app.post("/register", (req, res) => {
  const { name, email, password } = req.body;

  // Check if all fields are filled
  if (!name || !email || !password) {
    return res.json({ success: false, message: "All fields are required" });
  }

  // Check if email already exists
  const checkEmail = "SELECT * FROM students WHERE email = ?";
  db.query(checkEmail, [email], (err, result) => {
    if (err) {
      console.error("❌ Error checking email:", err);
      return res.json({ success: false, message: "Database error" });
    }

    if (result.length > 0) {
      return res.json({ success: false, message: "Email already registered" });
    }

    // Insert new student
    const insertQuery =
      "INSERT INTO students (name, email, password) VALUES (?, ?, ?)";
    db.query(insertQuery, [name, email, password], (err, result) => {
      if (err) {
        console.error("❌ Error inserting student:", err);
        res.json({ success: false, message: "Registration failed" });
      } else {
        console.log("✅ Student registered successfully!");
        res.json({ success: true, message: "Registration successful!" });
      }
    });
  });
});

// ===============================
// 🔑 LOGIN API
// ===============================
app.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.json({ success: false, message: "All fields required" });
  }

  const query = "SELECT * FROM students WHERE email = ?";
  db.query(query, [email], (err, result) => {
    if (err) {
      console.error("❌ Database error:", err);
      return res.json({ success: false, message: "Database error" });
    }

    if (result.length === 0) {
      return res.json({ success: false, message: "Email not found" });
    }

    const user = result[0];

    // Compare password directly (simple version)
    if (password === user.password) {
      res.json({
        success: true,
        message: "Login successful",
        user: { id: user.id, name: user.name, email: user.email },
      });
    } else {
      res.json({ success: false, message: "Invalid password" });
    }
  });
});

// ===============================
// 📅 MARK ATTENDANCE API
// ===============================
// ===============================
// 📅 MARK ATTENDANCE API
// ===============================
app.post("/mark-attendance", (req, res) => {
  const { student_id, session_id, latitude, longitude } = req.body;

  // Check for missing values
  if (!student_id || !session_id) {
    return res.json({ success: false, message: "Missing data" });
  }

  // 1️⃣ Check if attendance already exists for same student & session
  const checkQuery =
    "SELECT * FROM attendance WHERE student_id = ? AND session_id = ?";
  db.query(checkQuery, [student_id, session_id], (err, result) => {
    if (err) {
      console.error("❌ Error checking attendance:", err);
      return res.json({ success: false, message: "Database error" });
    }

    if (result.length > 0) {
      // Already marked
      return res.json({
        success: false,
        message: "Attendance already marked for this session!",
      });
    }

    // 2️⃣ If not marked, insert new attendance record
    const insertQuery = `
      INSERT INTO attendance (student_id, session_id, latitude, longitude)
      VALUES (?, ?, ?, ?)
    `;

    db.query(
      insertQuery,
      [student_id, session_id, latitude, longitude],
      (err, result) => {
        if (err) {
          console.error("❌ Error inserting attendance:", err);
          res.json({ success: false, message: "Failed to mark attendance" });
        } else {
          console.log("✅ Attendance added:", result.insertId);
          res.json({ success: true, message: "✅ Attendance marked successfully!" });
        }
      }
    );
  });
});

// ✅ Start Server
app.listen(5000, () => console.log("🚀 Server running on port 5000"));
