import React, { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "../styles/Navbars.css";

const navItems = [
  { path: "/home", label: "Beranda" },
  { path: "/statistik", label: "Statistik" },
  { path: "/profile", label: "Profil" },
];

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <>
      <nav className="navbar">
        <div className="logo">NEOVOTE</div>

        <ul className="nav-links">
          {navItems.map((item) => (
            <li key={item.path}>
              <a
                href={item.path}
                style={isActive(item.path) ? { color: "var(--accent)", background: "var(--accent-soft)" } : {}}
              >
                {item.label}
              </a>
            </li>
          ))}
          <li>
            <button onClick={handleLogout} className="special-btn">Keluar</button>
          </li>
        </ul>

        <div className="menu-icon" onClick={() => setIsOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="14" y2="17" />
          </svg>
        </div>
      </nav>

      <div className={`overlay ${isOpen ? "show" : ""}`} onClick={() => setIsOpen(false)} />

      <div className={`sidebar ${isOpen ? "open" : ""}`}>
        <div className="sidebar-header">
          <h2>NEOVOTE</h2>
          <button className="close-btn" onClick={() => setIsOpen(false)}>✕</button>
        </div>

        <ul className="sidebar-menu">
          {navItems.map((item) => (
            <li key={item.path}>
              <a
                href={item.path}
                className={isActive(item.path) ? "active" : ""}
                onClick={() => setIsOpen(false)}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="logout-section">
          <button onClick={handleLogout} className="special-btn">Keluar</button>
        </div>
      </div>
    </>
  );
}
