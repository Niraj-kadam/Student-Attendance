import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header";
import Login from "./components/Login";
import Register from "./components/Register";
import QRScanner from "./components/QRscanner";

function App() {
  return (
    <Router>
      <Header />

      {/* Define all routes for your app */}
      <Routes>
        {/* Login Page */}
        <Route path="/" element={<Login />} />

        {/* Register Page */}
        <Route path="/register" element={<Register />} />

        {/* QR Scanner Page (after login) */}
        <Route path="/scanner" element={<QRScanner />} />
      </Routes>
    </Router>
  );
}

export default App;
