import React, { useEffect, useState } from "react";
import { Bar, Pie, Line } from "react-chartjs-2";
import "../styles/Statistik.css";

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

export default function StatistikPage() {
  const [stats, setStats] = useState(null);
  const [results, setResults] = useState([]);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const token = localStorage.getItem("token"); // pastikan simpan token pas login
        const resStats = await fetch(`${import.meta.env.VITE_API_URL}/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const dataStats = await resStats.json();
        setStats(dataStats);

        const resResults = await fetch(`${import.meta.env.VITE_API_URL}/results`);
        const dataResults = await resResults.json();
        setResults(dataResults);
      } catch (err) {
        console.error("Error fetch statistik:", err);
      }
    };

    fetchStats();
  }, []);

  if (!stats || results.length === 0) {
    return <p>Loading statistik...</p>;
  }

  // data kandidat
  const kandidatData = {
    labels: results.map((r) => r.name),
    datasets: [
      {
        label: "Jumlah Suara",
        data: results.map((r) => r.total_votes),
        backgroundColor: ["#0ff", "#f0f", "#ff0"],
        borderColor: "#111",
        borderWidth: 2,
      },
    ],
  };

  const pieData = {
    labels: results.map((r) => r.name),
    datasets: [
      {
        data: results.map((r) => r.total_votes),
        backgroundColor: ["#0ff", "#f0f", "#ff0"],
        borderWidth: 2,
      },
    ],
  };

  return (
    <div className="statistik-page">
      <h1 className="page-title">📊 Statistik Voting NeoVote</h1>

      <div className="statistik-info">
        <div className="stat-box">
          <h3>Total Pemilih</h3>
          <p>{stats.total_users}</p>
        </div>
        <div className="stat-box">
          <h3>Sudah Voting</h3>
          <p>{stats.total_votes}</p>
        </div>
        <div className="stat-box">
          <h3>Belum Voting</h3>
          <p>{stats.total_users - stats.total_votes}</p>
        </div>
        <div className="stat-box">
          <h3>Partisipasi</h3>
          <p>{((stats.total_votes / stats.total_users) * 100).toFixed(1)}%</p>
        </div>
      </div>

      <div className="chart-container">
        <h2>Suara per Kandidat</h2>
        <Bar data={kandidatData} />
      </div>

      <div className="chart-container">
        <h2>Proporsi Suara</h2>
        <Pie data={pieData} />
      </div>

      <div className="background-effects">
        <div className="glow-orb glow-orb-1"></div>
        <div className="glow-orb glow-orb-2"></div>
        <div className="glow-orb glow-orb-3"></div>
      </div>
    </div>
  );
}
