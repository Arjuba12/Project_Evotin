import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Navbar.css";

export default function Navbar() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
    window.location.reload();
  };

  return (
    <nav className="navbar">
      <div className="logo">NEOVOTE</div>

      {/* hamburger menu */}
      <div className="menu-icon" onClick={() => setIsOpen(!isOpen)}>
        ☰
      </div>

      <ul className={`nav-links ${isOpen ? "active" : ""}`}>
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
