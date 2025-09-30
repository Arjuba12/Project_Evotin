import React from "react";
import { useNavigate } from "react-router-dom"; // ✅ import navigate
import "../styles/Navbar.css";

export default function Navbar() {
  const navigate = useNavigate(); // ✅ buat instance navigate

  const handleLogout = () => {
    localStorage.removeItem("token"); // hapus token
    navigate("/login");              // pindah ke login
    window.location.reload();        // optional, biar langsung refresh juga
  };

  return (
    <nav className="navbar">
      <div className="logo">NEOVOTE</div>
      <ul className="nav-links">
        <li>
          <a href="/home">Home</a>
        </li>
        <li>
          <a href="/statistik">Statistik</a>
        </li>
        <li>
          <a href="/profile">Profile</a>
        </li>
        <li>
          <button onClick={handleLogout} className="special-btn">
            Logout
          </button>
        </li>
      </ul>
    </nav>
  );
}
