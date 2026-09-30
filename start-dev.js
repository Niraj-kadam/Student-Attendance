const { spawn } = require("child_process");
const path = require("path");

console.log("==================================================");
console.log("🎓 Starting Student Attendance System (Local Dev)");
console.log("==================================================");

const backend = spawn("node", ["server.js"], {
  cwd: path.join(__dirname, "backend"),
  stdio: "inherit",
  shell: true,
});

const frontend = spawn("npm", ["start"], {
  cwd: path.join(__dirname, "student-attendace"),
  stdio: "inherit",
  shell: true,
});

backend.on("error", (err) => console.error("❌ Backend error:", err));
frontend.on("error", (err) => console.error("❌ Frontend error:", err));

process.on("SIGINT", () => {
  console.log("\n🛑 Stopping servers...");
  backend.kill();
  frontend.kill();
  process.exit();
});
