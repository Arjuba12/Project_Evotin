import { apiFetch } from "../utils/apiFetch";
import React, { useEffect, useState, useCallback } from "react";
import { Bar, Pie } from "react-chartjs-2";
import "../styles/Statistik.css";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

const POLL_INTERVAL = 5000; // 5 detik

export default function StatistikPage() {
  const [stats, setStats] = useState(null);
  const [results, setResults] = useState([]);
  const [myHimpunan, setMyHimpunan] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLive, setIsLive] = useState(true);

  const fetchData = useCallback(async () => {
    const token = localStorage.getItem("token");
    try {
      const me = token
        ? await fetch(`${import.meta.env.VITE_API_URL}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          }).then(res => res.json())
        : null;
      const himpunan = me?.himpunan || null;
      setMyHimpunan(himpunan);

      const resultsUrl = himpunan
        ? `${import.meta.env.VITE_API_URL}/results?himpunan=${himpunan}`
        : `${import.meta.env.VITE_API_URL}/results`;

      const [s, r] = await Promise.all([
        fetch(`${import.meta.env.VITE_API_URL}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        }).then(res => res.json()),
        fetch(resultsUrl).then(res => res.json()),
      ]);
      setStats(s);
      setResults(r);
      setLastUpdated(new Date());
      setIsLive(true);
    } catch {
      setIsLive(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (!stats || results.length === 0) return (
    <div className="statistik-page">
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Memuat data...</p>
    </div>
  );

  const PUBLIC_CHART_COLORS = ["#6366f1", "#ec4899", "#14b8a6", "#f59e0b", "#8b5cf6", "#f43f5e", "#0ea5e9", "#84cc16"];
  const colors = results.map((_, i) => PUBLIC_CHART_COLORS[i % PUBLIC_CHART_COLORS.length]);

  const barData = {
    labels: results.map((r) => r.name),
    datasets: [{
      label: "Jumlah Suara",
      data: results.map((r) => r.total_votes),
      backgroundColor: colors,
      borderRadius: 6,
      borderWidth: 0,
    }],
  };

  const pieData = {
    labels: results.map((r) => r.name),
    datasets: [{ data: results.map((r) => r.total_votes), backgroundColor: colors, borderWidth: 0 }],
  };

  const chartOpts = {
    animation: { duration: 400 },
    plugins: { legend: { labels: { color: "#9898a8", font: { family: "Sora" }, padding: 16 } } },
    scales: {
      x: { ticks: { color: "#5c5c6e", font: { family: "Sora" } }, grid: { color: "#242428" } },
      y: { ticks: { color: "#5c5c6e", font: { family: "Sora" } }, grid: { color: "#242428" }, beginAtZero: true },
    },
  };

  const participation = stats.total_users > 0
    ? ((stats.total_votes / stats.total_users) * 100).toFixed(1) : 0;

  return (
    <div className="statistik-page">
      <div className="statistik-header">
        <div>
          <h1 className="page-title">Statistik Voting</h1>
          <p className="page-subtitle">Data real-time pemilihan {myHimpunan || "himpunan"}</p>
        </div>
        <div className="live-indicator">
          <span className={`live-dot ${isLive ? "live-dot-active" : "live-dot-off"}`}></span>
          <span className="live-label">{isLive ? "Live" : "Offline"}</span>
          {lastUpdated && (
            <span className="last-updated">
              Diperbarui {lastUpdated.toLocaleTimeString("id-ID")}
            </span>
          )}
        </div>
      </div>

      <div className="statistik-info">
        <div className="stat-box"><h3>Total Pemilih</h3><p>{stats.total_users}</p></div>
        <div className="stat-box"><h3>Sudah Voting</h3><p>{stats.total_votes}</p></div>
        <div className="stat-box"><h3>Belum Voting</h3><p>{stats.total_users - stats.total_votes}</p></div>
        <div className="stat-box"><h3>Partisipasi</h3><p>{participation}%</p></div>
      </div>

      <div className="chart-container">
        <h2>Suara per Kandidat</h2>
        <Bar data={barData} options={chartOpts} />
      </div>

      <div className="chart-container">
        <h2>Proporsi Suara</h2>
        <Pie data={pieData} options={{
          animation: { duration: 400 },
          plugins: { legend: { labels: { color: "#9898a8", font: { family: "Sora" } } } }
        }} />
      </div>
    </div>
  );
}
