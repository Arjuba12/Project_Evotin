import React, { useEffect, useState } from "react";
import CandidateCard from "../components/CandidateCard";
import "../styles/HomePage.css";

export default function HomePage() {
  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [period, setPeriod] = useState(null);
  const [timeLeft, setTimeLeft] = useState({});
  const token = localStorage.getItem("token"); // token disimpan setelah login

  // Ambil kandidat
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/candidates`)
      .then((res) => res.json())
      .then((data) => {
        setCandidates(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error fetching candidates:", err);
        setLoading(false);
      });
  }, []);

  // Ambil statistik
  useEffect(() => {
    if (token) {
      fetch(`${import.meta.env.VITE_API_URL}/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => res.json())
        .then((data) => setStats(data))
        .catch((err) => console.error("Error fetching stats:", err));
    }
  }, [token]);

  // Handle vote
  const handleVote = async (candidateId) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        alert("Anda harus login dulu untuk vote");
        return;
      }

      const res = await fetch(`${import.meta.env.VITE_API_URL}/vote`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ candidate_id: candidateId }),
      });

      const data = await res.json(); // ⬅️ parse dulu responsenya

      if (!res.ok) {
        if (data.detail === "User sudah voting") {
          alert("⚠️ Kamu sudah memberikan suara, tidak bisa vote lagi.");
          return;
        }
        throw new Error(data.detail || "GagalVote");
      }

      // Hanya tampilkan alert sukses sekali saja (vote pertama)
      alert("✅ Vote berhasil!");
      console.log("Vote response:", data);
    } catch (err) {
      console.error("Error voting:", err);
      alert(err.message);
    }
  };

  // helper untuk format ke WIB
  function formatWIB(dateStr) {
    return new Date(dateStr).toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
      dateStyle: "short",
      timeStyle: "short",
    });
  }

  // Ambil periode voting
  useEffect(() => {
    fetch(`${import.meta.env.VITE_API_URL}/voting-period`)
      .then((res) => res.json())
      .then((data) => {
        if (data.length > 0) {
          setPeriod(data[0]); // ambil periode pertama
        }
      })
      .catch(console.error);
  }, []);

  // Countdown realtime
  useEffect(() => {
    if (!period) return;

    const interval = setInterval(() => {
      // Pakai UTC agar akurat
      const start = new Date(period.start_date).getTime();
      const end = new Date(period.end_date).getTime();
      const now = new Date().getTime();

      let distance;
      let status;

      if (now < start) {
        distance = start - now;
        status = "Belum Dibuka";
      } else if (now >= start && now <= end) {
        distance = end - now;
        status = "Sedang Berlangsung";
      } else {
        distance = 0;
        status = "Selesai";
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor(
        (distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
      );
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds, status });
    }, 1000);

    return () => clearInterval(interval);
  }, [period]);

  // ==================================================||=================================================
  return (
    <div className="homepage">
      <div className="header-section">
        <h1 className="homepage-title">GOVERNANCE APP</h1>
        <h2 className="homepage-subtitle">
          Voting Cepat, Transparan, dan Aman
        </h2>
      </div>
      {/* Countdown Section */}
      {period && (
        <div className="countdown">
          <h2>⏳ Countdown Pemilihan</h2>
          <div className="countdown-timer">
            <div>
              <span>{timeLeft.days ?? 0}</span>
              <p>Hari</p>
            </div>
            <div>
              <span>{timeLeft.hours ?? 0}</span>
              <p>Jam</p>
            </div>
            <div>
              <span>{timeLeft.minutes ?? 0}</span>
              <p>Menit</p>
            </div>
            <div>
              <span>{timeLeft.seconds ?? 0}</span>
              <p>Detik</p>
            </div>
          </div>
          <br />
          <h3>Pemilihan {timeLeft.status}</h3>
        </div>
      )}

      {/* Candidate List */}
      <div className="card-container">
        {loading ? (
          <p>Memuat kandidat...</p>
        ) : candidates.length > 0 ? (
          candidates.map((c) => (
            <div key={c.id} className="candidate-wrapper">
              <CandidateCard
                image={c.image}
                name={c.name}
                visi={c.visi}
                misi={c.misi}
              />
              <button
                className="vote-btn"
                onClick={() => {
                  const confirmVote = window.confirm(
                    `Apakah Anda yakin ingin memilih ${c.name}?`
                  );
                  if (confirmVote) {
                    handleVote(c.id);
                  }
                }}
              >
                Vote {c.name}
              </button>
            </div>
          ))
        ) : (
          <p>Tidak ada kandidat ditemukan.</p>
        )}
      </div>
      {/* Statistik */}
      <div className="section-grid">
        <div className="info-voting">
          <h2>📢 Info Voting</h2>
          <p>
            🗓️ Periode:{" "}
            {period
              ? `${formatWIB(period.start_date)} - ${formatWIB(
                  period.end_date
                )}`
              : "-"}
          </p>

          <p>👥 Pemilih Terdaftar: {stats ? stats.total_users : "-"}</p>
          <p>
            ✅ Status Anda: {stats?.has_voted ? "Sudah Voting" : "Belum Voting"}
          </p>
        </div>

        <div className="statistik">
          <h2>📊 Statistik Singkat</h2>
          <p>
            Jumlah pemilih saat ini:{" "}
            {stats ? `${stats.total_votes}/${stats.total_users}` : "-"}
          </p>
          <div className="progress-bar">
            <div
              className="progress"
              style={{
                width: stats
                  ? `${(stats.total_votes / stats.total_users) * 100}%`
                  : "0%",
              }}
            ></div>
          </div>
        </div>

        <div className="aturan">
          <h2>⚖️ Aturan</h2>
          <ul>
            <li>Setiap akun hanya dapat memberikan 1 suara.</li>
            <li>Pilihan yang sudah dikirim tidak dapat diubah.</li>
            <li>Voting bersifat rahasia dan terenkripsi.</li>
            <li>Gunakan hak suara Anda dengan bijak.</li>
          </ul>
        </div>
      </div>
      <footer className="footer">
        <p>© 2025 NEOVOTE - Sistem Voting Terdesentralisasi</p>
        <p>© 2025 ARJUNA. All rights reserved.</p>
      </footer>

      <div className="background-effects">
        <div className="glow-orb glow-orb-1"></div>
        <div className="glow-orb glow-orb-2"></div>
        <div className="glow-orb glow-orb-3"></div>
      </div>
    </div>
  );
}
