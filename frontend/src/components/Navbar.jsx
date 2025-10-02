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
    <>
      <nav className="navbar">
        <div className="logo">NEOVOTE</div>

        {/* hamburger */}
        <div className="menu-icon" onClick={() => setIsOpen(true)}>
          ☰
        </div>
      </nav>

      {/* overlay */}
      <div
        className={`overlay ${isOpen ? "show" : ""}`}
        onClick={() => setIsOpen(false)}
      ></div>

      {/* sidebar drawer */}
      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <button className="close-btn" onClick={() => setIsOpen(false)}>
          ×
        </button>
        <div className="sidebar-header">
          <img
            src="https://via.placeholder.com/60"
            alt="avatar"
            className="avatar"
          />
          <h3>Renan Borba</h3>
          <p>renandbm.rb@gmail.com</p>
        </div>
        <ul>
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
      </div>
    </>
  );
}
