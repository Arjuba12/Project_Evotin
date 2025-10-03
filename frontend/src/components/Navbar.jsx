import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/Navbars.css";

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

        {/* menu desktop */}
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

        {/* hamburger di kanan (hanya muncul di mobile via CSS) */}
        <div className="menu-icon" onClick={() => setIsOpen(true)}>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            width="32"
            height="32"
          >
            <line x1="3" y1="12" x2="21" y2="12"></line>
            <line x1="3" y1="6" x2="21" y2="6"></line>
            <line x1="3" y1="18" x2="21" y2="18"></line>
          </svg>{" "}
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
