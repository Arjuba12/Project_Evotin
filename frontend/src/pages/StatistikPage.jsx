import React, { useEffect, useState } from "react";
import { Bar, Pie } from "react-chartjs-2";
import "../styles/Statistik.css";
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement,
  ArcElement, Title, Tooltip, Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

export default function StatistikPage() {
  const [stats, setStats] = useState(null);
  const [results, setResults] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem("token");
    Promise.all([
      fetch(`${import.meta.env.VITE_API_URL}/stats`, { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
      fetch(`${import.meta.env.VITE_API_URL}/results`).then(r => r.json()),
    ]).then(([s, r]) => { setStats(s); setResults(r); }).catch(console.error);
  }, []);

  if (!stats || results.length === 0) return (
    <div className="statistik-page">
      <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>Memuat data...</p>
    </div>
  );

  const colors = ["#f59e0b", "#d97706", "#fbbf24"];

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
    plugins: { legend: { labels: { color: "#9898a8", font: { family: "Sora" }, padding: 16 } } },
    scales: {
      x: { ticks: { color: "#5c5c6e", font: { family: "Sora" } }, grid: { color: "#242428" } },
      y: { ticks: { color: "#5c5c6e", font: { family: "Sora" } }, grid: { color: "#242428" } },
    },
  };

  const participation = stats.total_users > 0
    ? ((stats.total_votes / stats.total_users) * 100).toFixed(1) : 0;

  return (
    <div className="statistik-page">
      <h1 className="page-title">Statistik Voting</h1>
      <p className="page-subtitle">Data real-time pemilihan himpunan</p>

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
        <Pie data={pieData} options={{ plugins: { legend: { labels: { color: "#9898a8", font: { family: "Sora" } } } } }} />
      </div>
    </div>
  );
}
