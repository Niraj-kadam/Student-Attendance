const express = require("express");
const cors = require("cors");
const mysql = require("mysql2");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "attendance_system_secret_2024";

// ✅ Connect to MySQL
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "",
  database: "attendance_system",
  port: 3307,
});

db.connect((err) => {
  if (err) {
    console.error("❌ Database connection failed:", err);
  } else {
    console.log("✅ Connected to MySQL database");
    initializeTables();
  }
});

// ✅ Auto-create tables on startup
function initializeTables() {
  const tables = [
    `CREATE TABLE IF NOT EXISTS students (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      roll_number VARCHAR(50),
      branch VARCHAR(100),
      semester INT DEFAULT 1,
      profile_photo VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS teachers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      subject VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
    `CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(100) PRIMARY KEY,
      teacher_id INT,
      subject VARCHAR(100),
      session_date DATE,
      start_time TIME,
      end_time TIME,
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      radius_meters INT DEFAULT 100,
      is_active BOOLEAN DEFAULT TRUE,
      qr_code TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (teacher_id) REFERENCES teachers(id)
    )`,
    `CREATE TABLE IF NOT EXISTS attendance (
      id INT AUTO_INCREMENT PRIMARY KEY,
      student_id INT,
      session_id VARCHAR(100),
      latitude DECIMAL(10, 8),
      longitude DECIMAL(11, 8),
      distance_from_class DECIMAL(10, 2),
      status ENUM('present','absent','late') DEFAULT 'present',
      marked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (student_id) REFERENCES students(id),
      FOREIGN KEY (session_id) REFERENCES sessions(id),
      UNIQUE KEY unique_attendance (student_id, session_id)
    )`,
    `CREATE TABLE IF NOT EXISTS notifications (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT,
      user_type ENUM('student','teacher'),
      title VARCHAR(200),
      message TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,
  ];

  tables.forEach((query) => {
    db.query(query, (err) => {
      if (err) console.error("❌ Table creation error:", err.message);
    });
  });
  console.log("✅ All tables initialized");
}

// ================== MIDDLEWARE ==================
const authenticateToken = (req, res, next) => {
  const token = req.headers["authorization"]?.split(" ")[1];
  if (!token) return res.json({ success: false, message: "No token provided" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.json({ success: false, message: "Invalid token" });
    req.user = user;
    next();
  });
};

// ================== UTILITY ==================
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

// ================== STUDENT ROUTES ==================

app.post("/register", async (req, res) => {
  const { name, email, password, roll_number, branch, semester } = req.body;
  if (!name || !email || !password)
    return res.json({ success: false, message: "All fields are required" });

  const hashed = await bcrypt.hash(password, 10);
  const checkEmail = "SELECT id FROM students WHERE email = ?";
  db.query(checkEmail, [email], (err, result) => {
    if (result?.length > 0)
      return res.json({ success: false, message: "Email already registered" });

    db.query(
      "INSERT INTO students (name, email, password, roll_number, branch, semester) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hashed, roll_number || null, branch || null, semester || 1],
      (err) => {
        if (err) return res.json({ success: false, message: "Registration failed" });
        res.json({ success: true, message: "Registration successful!" });
      }
    );
  });
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM students WHERE email = ?", [email], async (err, result) => {
    if (!result?.length)
      return res.json({ success: false, message: "Email not found" });

    const user = result[0];
    let valid = false;
    // Support both hashed and plain (migration)
    try {
      valid = await bcrypt.compare(password, user.password);
    } catch {
      valid = password === user.password;
    }

    if (!valid) return res.json({ success: false, message: "Invalid password" });

    const token = jwt.sign({ id: user.id, role: "student" }, JWT_SECRET, { expiresIn: "24h" });
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email, roll_number: user.roll_number, branch: user.branch, semester: user.semester },
    });
  });
});

// ================== TEACHER ROUTES ==================

app.post("/teacher/register", async (req, res) => {
  const { name, email, password, subject } = req.body;
  if (!name || !email || !password)
    return res.json({ success: false, message: "All fields required" });

  const hashed = await bcrypt.hash(password, 10);
  db.query("SELECT id FROM teachers WHERE email = ?", [email], (err, result) => {
    if (result?.length > 0)
      return res.json({ success: false, message: "Email already registered" });

    db.query(
      "INSERT INTO teachers (name, email, password, subject) VALUES (?, ?, ?, ?)",
      [name, email, hashed, subject || null],
      (err) => {
        if (err) return res.json({ success: false, message: "Registration failed" });
        res.json({ success: true, message: "Teacher registered!" });
      }
    );
  });
});

app.post("/teacher/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM teachers WHERE email = ?", [email], async (err, result) => {
    if (!result?.length)
      return res.json({ success: false, message: "Email not found" });

    const teacher = result[0];
    const valid = await bcrypt.compare(password, teacher.password);
    if (!valid) return res.json({ success: false, message: "Invalid password" });

    const token = jwt.sign({ id: teacher.id, role: "teacher" }, JWT_SECRET, { expiresIn: "24h" });
    res.json({
      success: true,
      token,
      user: { id: teacher.id, name: teacher.name, email: teacher.email, subject: teacher.subject },
    });
  });
});

// ================== SESSION / QR ROUTES ==================

app.post("/teacher/create-session", authenticateToken, async (req, res) => {
  if (req.user.role !== "teacher")
    return res.json({ success: false, message: "Unauthorized" });

  const { subject, session_date, start_time, end_time, latitude, longitude, radius_meters } = req.body;
  const session_id = uuidv4();

  try {
    const qrData = JSON.stringify({ session_id, subject, session_date });
    const qrCode = await QRCode.toDataURL(qrData);

    db.query(
      "INSERT INTO sessions (id, teacher_id, subject, session_date, start_time, end_time, latitude, longitude, radius_meters, qr_code) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [session_id, req.user.id, subject, session_date, start_time, end_time, latitude, longitude, radius_meters || 100, qrCode],
      (err) => {
        if (err) return res.json({ success: false, message: "Failed to create session" });
        res.json({ success: true, session_id, qr_code: qrCode, message: "Session created!" });
      }
    );
  } catch (err) {
    res.json({ success: false, message: "QR generation failed" });
  }
});

app.get("/teacher/sessions", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher")
    return res.json({ success: false, message: "Unauthorized" });

  db.query(
    "SELECT * FROM sessions WHERE teacher_id = ? ORDER BY created_at DESC",
    [req.user.id],
    (err, results) => {
      if (err) return res.json({ success: false, message: "DB error" });
      res.json({ success: true, sessions: results });
    }
  );
});

app.patch("/teacher/session/:id/toggle", authenticateToken, (req, res) => {
  const { id } = req.params;
  db.query(
    "UPDATE sessions SET is_active = NOT is_active WHERE id = ? AND teacher_id = ?",
    [id, req.user.id],
    (err) => {
      if (err) return res.json({ success: false, message: "Update failed" });
      res.json({ success: true, message: "Session status toggled" });
    }
  );
});

// ================== ATTENDANCE ROUTES ==================

app.post("/mark-attendance", async (req, res) => {
  const { student_id, session_id, latitude, longitude } = req.body;
  if (!student_id || !session_id)
    return res.json({ success: false, message: "Missing data" });

  // Get session info
  db.query("SELECT * FROM sessions WHERE id = ?", [session_id], (err, sessions) => {
    if (!sessions?.length)
      return res.json({ success: false, message: "Invalid session" });

    const session = sessions[0];
    if (!session.is_active)
      return res.json({ success: false, message: "This session is no longer active" });

    // Calculate distance if session has location
    let distance = null;
    if (session.latitude && session.longitude && latitude && longitude) {
      distance = calculateDistance(latitude, longitude, session.latitude, session.longitude);
      if (distance > session.radius_meters) {
        return res.json({
          success: false,
          message: `You are too far from the classroom (${Math.round(distance)}m away, max ${session.radius_meters}m)`,
        });
      }
    }

    const checkQuery = "SELECT * FROM attendance WHERE student_id = ? AND session_id = ?";
    db.query(checkQuery, [student_id, session_id], (err, result) => {
      if (result?.length > 0)
        return res.json({ success: false, message: "Attendance already marked for this session!" });

      // Determine if late
      const now = new Date();
      const sessionTime = session.start_time ? new Date(`${session.session_date} ${session.start_time}`) : null;
      const status = sessionTime && now > new Date(sessionTime.getTime() + 15 * 60000) ? "late" : "present";

      db.query(
        "INSERT INTO attendance (student_id, session_id, latitude, longitude, distance_from_class, status) VALUES (?, ?, ?, ?, ?, ?)",
        [student_id, session_id, latitude, longitude, distance, status],
        (err, result) => {
          if (err) return res.json({ success: false, message: "Failed to mark attendance" });
          res.json({
            success: true,
            status,
            message: status === "late" ? "⚠️ Marked as Late" : "✅ Attendance marked successfully!",
          });
        }
      );
    });
  });
});

// ================== REPORTS & ANALYTICS ==================

app.get("/student/attendance-summary/:student_id", (req, res) => {
  const { student_id } = req.params;
  db.query(
    `SELECT 
      COUNT(*) as total_sessions,
      SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) as present,
      SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) as late,
      SUM(CASE WHEN a.status = 'absent' THEN 1 ELSE 0 END) as absent,
      ROUND((SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1) as percentage
    FROM sessions s
    LEFT JOIN attendance a ON s.id = a.session_id AND a.student_id = ?
    WHERE s.is_active = FALSE`,
    [student_id],
    (err, result) => {
      if (err) return res.json({ success: false, message: "DB error" });
      res.json({ success: true, summary: result[0] });
    }
  );
});

app.get("/student/attendance-history/:student_id", (req, res) => {
  const { student_id } = req.params;
  db.query(
    `SELECT s.subject, s.session_date, s.start_time, a.status, a.marked_at, t.name as teacher_name
     FROM sessions s
     LEFT JOIN attendance a ON s.id = a.session_id AND a.student_id = ?
     LEFT JOIN teachers t ON s.teacher_id = t.id
     ORDER BY s.session_date DESC LIMIT 50`,
    [student_id],
    (err, results) => {
      if (err) return res.json({ success: false, message: "DB error" });
      res.json({ success: true, history: results });
    }
  );
});

// Returns every student × every session for this teacher.
// Students = not a teacher account.
app.get("/teacher/all-attendance", authenticateToken, (req, res) => {
  if (req.user.role !== "teacher")
    return res.json({ success: false, message: "Unauthorized" });

  const teacher_id = req.user.id;

  // Step 1: get student IDs
  db.query(
    `SELECT st.id AS student_id, st.name, st.roll_number, st.branch
     FROM students st
     WHERE st.email NOT IN (SELECT email FROM teachers)`,
    [],
    (err, students) => {
      if (err) return res.json({ success: false, message: "DB error (students)" });
      if (!students.length) return res.json({ success: true, attendance: [] });

      // Step 2: get all sessions for this teacher
      db.query(
        `SELECT id AS session_id,
                DATE_FORMAT(session_date, '%Y-%m-%d') AS session_date,
                subject AS session_subject
         FROM sessions WHERE teacher_id = ?`,
        [teacher_id],
        (err, sessions) => {
          if (err) return res.json({ success: false, message: "DB error (sessions)" });
          if (!sessions.length) return res.json({ success: true, attendance: [] });

          // Step 3: get all attendance rows for these sessions
          const sessionIds = sessions.map(s => s.session_id);
          db.query(
            `SELECT student_id, session_id, status, marked_at, distance_from_class
             FROM attendance WHERE session_id IN (?)`,
            [sessionIds],
            (err, attendanceRows) => {
              if (err) return res.json({ success: false, message: "DB error (attendance)" });

              // Build a lookup: "studentId_sessionId" → attendance row
              const lookup = {};
              attendanceRows.forEach(r => {
                lookup[`${r.student_id}_${r.session_id}`] = r;
              });

              // Cross-join in JS: every student × every session
              const results = [];
              for (const session of sessions) {
                for (const student of students) {
                  const key = `${student.student_id}_${session.session_id}`;
                  const att = lookup[key];
                  results.push({
                    student_id: student.student_id,
                    name: student.name,
                    roll_number: student.roll_number,
                    branch: student.branch,
                    session_id: session.session_id,
                    session_date: session.session_date,
                    session_subject: session.session_subject,
                    status: att ? att.status : 'absent',
                    marked_at: att ? att.marked_at : null,
                    distance_from_class: att ? att.distance_from_class : null,
                  });
                }
              }

              res.json({ success: true, attendance: results });
            }
          );
        }
      );
    }
  );
});

// Returns all students for a specific session (scanned = real status, not scanned = absent).
app.get("/teacher/session-attendance/:session_id", authenticateToken, (req, res) => {
  const { session_id } = req.params;
  db.query(
    `SELECT st.id AS student_id, st.name, st.roll_number, st.branch,
            COALESCE(a.status, 'absent') AS status,
            a.marked_at, a.distance_from_class
     FROM students st
     LEFT JOIN attendance a
           ON  a.student_id = st.id
           AND a.session_id = ?
     WHERE st.email NOT IN (SELECT email FROM teachers)
     ORDER BY a.marked_at ASC, st.name ASC`,
    [session_id],
    (err, results) => {
      if (err) return res.json({ success: false, message: "DB error" });
      res.json({ success: true, attendance: results });
    }
  );
});

app.get("/teacher/analytics/:teacher_id", authenticateToken, (req, res) => {
  const { teacher_id } = req.params;
  db.query(
    `SELECT 
      s.subject,
      s.session_date,
      s.id as session_id,
      COUNT(a.id) as present_count,
      (SELECT COUNT(*) FROM students) as total_students
     FROM sessions s
     LEFT JOIN attendance a ON s.id = a.session_id
     WHERE s.teacher_id = ?
     GROUP BY s.id
     ORDER BY s.session_date DESC`,
    [teacher_id],
    (err, results) => {
      if (err) return res.json({ success: false, message: "DB error" });
      res.json({ success: true, analytics: results });
    }
  );
});

// ================== NOTIFICATIONS ==================

app.get("/notifications/:user_id/:user_type", (req, res) => {
  const { user_id, user_type } = req.params;
  db.query(
    "SELECT * FROM notifications WHERE user_id = ? AND user_type = ? ORDER BY created_at DESC LIMIT 20",
    [user_id, user_type],
    (err, results) => {
      if (err) return res.json({ success: false });
      res.json({ success: true, notifications: results });
    }
  );
});

app.patch("/notifications/read/:id", (req, res) => {
  db.query("UPDATE notifications SET is_read = TRUE WHERE id = ?", [req.params.id], (err) => {
    res.json({ success: !err });
  });
});

// ✅ Start Server
app.listen(5000, () => console.log("🚀 Server running on port 5000"));