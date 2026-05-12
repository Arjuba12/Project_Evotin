import { apiFetch } from "../utils/apiFetch";
import React, { useEffect, useState } from "react";
import "../styles/ProfilePage.css";

export default function ProfilePage() {
  const [user, setUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = localStorage.getItem("token");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const [u, s] = await Promise.all([
          fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
          fetch(`${import.meta.env.VITE_API_URL}/stats`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(r => r.json()),
        ]);
        setUser(u);
        setStats(s);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  function getInitials(name) {
    if (!name) return "?";
    return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
  }

  function getAvatarColor(name) {
    const colors = ["#f59e0b", "#6366f1", "#10b981", "#ef4444", "#8b5cf6", "#0ea5e9"];
    if (!name) return colors[0];
    const idx = name.charCodeAt(0) % colors.length;
    return colors[idx];
  }

  if (loading) return (
    <div className="profile-page">
      <p className="profile-loading">Memuat profil...</p>
    </div>
  );

  const avatarColor = getAvatarColor(user?.name);

  return (
    <div className="profile-page">
      <div className="profile-container">

        {/* CARD UTAMA */}
        <div className="profile-card">
          <div className="profile-avatar" style={{ background: avatarColor }}>
            {getInitials(user?.name)}
          </div>
          <div className="profile-identity">
            <h1 className="profile-name">{user?.name ?? "–"}</h1>
            <p className="profile-email">{user?.email ?? "–"}</p>
          </div>
          <div className="profile-badge-row">
            <span className="profile-badge badge-verified">
              <span className="badge-icon">✓</span> Terverifikasi
            </span>
            <span className={`profile-badge ${stats?.has_voted ? "badge-voted" : "badge-notvoted"}`}>
              {stats?.has_voted ? "✓ Sudah Memilih" : "Belum Memilih"}
            </span>
          </div>
        </div>

        {/* INFO GRID */}
        <div className="profile-info-grid">
          <div className="profile-info-card">
            <p className="info-label">Nama Lengkap</p>
            <p className="info-value">{user?.name ?? "–"}</p>
          </div>
          <div className="profile-info-card">
            <p className="info-label">Email</p>
            <p className="info-value">{user?.email ?? "–"}</p>
          </div>
          <div className="profile-info-card">
            <p className="info-label">NIM</p>
            <p className="info-value nim-value">{user?.nim ?? "–"}</p>
          </div>
          <div className="profile-info-card">
            <p className="info-label">Status Akun</p>
            <p className="info-value">
              <span className="status-dot status-active"></span>
              Aktif & Terverifikasi
            </p>
          </div>
          <div className="profile-info-card">
            <p className="info-label">Hak Suara</p>
            <p className="info-value">
              <span className={`status-dot ${stats?.has_voted ? "status-used" : "status-active"}`}></span>
              {stats?.has_voted ? "Sudah digunakan" : "Belum digunakan"}
            </p>
          </div>
          <div className="profile-info-card">
            <p className="info-label">Total Pemilih</p>
            <p className="info-value">{stats?.total_users ?? "–"} mahasiswa</p>
          </div>
        </div>

        {/* PARTISIPASI */}
        <div className="profile-participation">
          <p className="info-label">Partisipasi Voting</p>
          <div className="participation-bar-row">
            <div className="participation-bar">
              <div
                className="participation-fill"
                style={{
                  width: stats?.total_users > 0
                    ? `${(stats.total_votes / stats.total_users) * 100}%`
                    : "0%"
                }}
              />
            </div>
            <span className="participation-pct">
              {stats?.total_users > 0
                ? `${((stats.total_votes / stats.total_users) * 100).toFixed(1)}%`
                : "0%"}
            </span>
          </div>
          <p className="participation-desc">
            {stats?.total_votes ?? 0} dari {stats?.total_users ?? 0} pemilih telah memberikan suara
          </p>
        </div>

      </div>
    </div>
  );
}
