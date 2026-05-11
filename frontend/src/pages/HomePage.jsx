import React, { useEffect, useState } from "react";
import CandidateCard from "../components/CandidateCard";
import "../styles/HomePage.css";

export default function HomePage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState(null);
  const [timeLeft, setTimeLeft] = useState({});
  const token = localStorage.getItem("token");

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/candidates`)
      .then((r) => r.json())
      .then((d) => { setCandidates(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`${import.meta.env.VITE_API_URL}/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((r) => r.json()).then(setStats).catch(console.error);
  }, [token]);

  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/voting-period`)
      .then((r) => r.json())
      .then((d) => { if (d.length > 0) setPeriod(d[0]); })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!period) return;
    const tick = () => {
      const start = new Date(period.start_date).getTime();
      const end = new Date(period.end_date).getTime();
      const now = Date.now();
      let distance, status;
      if (now < start) { distance = start - now; status = "Belum Dibuka"; }
      else if (now <= end) { distance = end - now; status = "Berlangsung"; }
      else { distance = 0; status = "Selesai"; }
      setTimeLeft({
        days: Math.floor(distance / 86400000),
        hours: Math.floor((distance % 86400000) / 3600000),
        minutes: Math.floor((distance % 3600000) / 60000),
        seconds: Math.floor((distance % 60000) / 1000),
        status,
      });
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [period]);

  const handleVote = async (candidateId, name) => {
    if (!window.confirm(`Yakin ingin memilih ${name}?`)) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ candidate_id: candidateId }),
      });
      const data = await res.json();
      alert(res.ok ? "Vote berhasil!" : data.detail || "Gagal vote");
    } catch (err) { alert(err.message); }
  };

  const fmt = (d) => new Date(d).toLocaleString("id-ID", {
    timeZone: "Asia/Jakarta", dateStyle: "short", timeStyle: "short",
  });

  const pad = (n) => String(n ?? 0).padStart(2, "0");

  return (
    <div className="homepage">
      <div className="header-section">
        <h1 className="homepage-title">Pemilihan Himpunan</h1>
        <p className="homepage-subtitle">Berikan suaramu — transparan, aman, dan tercatat.</p>
      </div>

      {period && (
        <div className="countdown">
          <div className="countdown-left">
            <h2>Status Voting</h2>
            <h3>{timeLeft.status}</h3>
          </div>
          <div className="countdown-timer">
            <div><span>{pad(timeLeft.days)}</span><p>Hari</p></div>
            <div><span>{pad(timeLeft.hours)}</span><p>Jam</p></div>
            <div><span>{pad(timeLeft.minutes)}</span><p>Menit</p></div>
            <div><span>{pad(timeLeft.seconds)}</span><p>Detik</p></div>
          </div>
        </div>
      )}

      <p className="section-label">Kandidat</p>
      <div className="card-container">
        {loading ? <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Memuat...</p>
          : candidates.length > 0
            ? candidates.map((c) => (
              <div key={c.id} className="candidate-wrapper">
                <CandidateCard image={c.image} name={c.name} visi={c.visi} misi={c.misi} />
                <button className="vote-btn" onClick={() => handleVote(c.id, c.name)}>
                  Pilih {c.name}
                </button>
              </div>
            ))
            : <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Belum ada kandidat.</p>
        }
      </div>

      <div className="section-grid">
        <div className="info-voting">
          <h2>Info Voting</h2>
          <p>Periode: {period ? `${fmt(period.start_date)} – ${fmt(period.end_date)}` : "–"}</p>
          <p>Pemilih terdaftar: {stats?.total_users ?? "–"}</p>
          <p>Status kamu: {stats?.has_voted ? "✓ Sudah memilih" : "Belum memilih"}</p>
        </div>
        <div className="statistik">
          <h2>Partisipasi</h2>
          <p>{stats ? `${stats.total_votes} dari ${stats.total_users} pemilih` : "–"}</p>
          <div className="progress-bar">
            <div className="progress" style={{
              width: stats && stats.total_users > 0
                ? `${(stats.total_votes / stats.total_users) * 100}%` : "0%"
            }} />
          </div>
        </div>
        <div className="aturan">
          <h2>Aturan</h2>
          <ul>
            <li>Setiap akun hanya dapat memberikan 1 suara.</li>
            <li>Pilihan yang sudah dikirim tidak dapat diubah.</li>
            <li>Voting bersifat rahasia dan terenkripsi.</li>
            <li>Gunakan hak suara kamu dengan bijak.</li>
          </ul>
        </div>
      </div>

      <footer className="footer">
        <p>© 2025 NEOVOTE · Sistem Voting Himpunan</p>
        <p>Dibuat oleh Arjuna</p>
      </footer>
    </div>
  );
}
