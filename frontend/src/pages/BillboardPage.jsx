import React, { useEffect, useState, useCallback, useRef } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import "../styles/Billboard.css";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
);

const API = import.meta.env.VITE_API_URL;
const HIMPUNAN_LIST = ["HIMAIF", "HIMASIF", "HIMAKA"];
const HIMPUNAN_COLORS = {
  HIMAIF: "#38bdf8",
  HIMASIF: "#facc15",
  HIMAKA: "#ef4444",
};
const POLL_INTERVAL = 5000;

export default function BillboardPage() {
  const [himpunan, setHimpunan] = useState("HIMAIF");
  const [results, setResults] = useState([]);
  const [period, setPeriod] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const rootRef = useRef(null);

  const fetchData = useCallback(async () => {
    try {
      const [r, c, periods] = await Promise.all([
        fetch(`${API}/results?himpunan=${himpunan}`).then((res) => res.json()),
        fetch(`${API}/candidates?himpunan=${himpunan}`).then((res) =>
          res.json(),
        ),
        fetch(`${API}/voting-period`).then((res) => res.json()),
      ]);
      // gabungin data suara (results) sama foto kandidat (candidates), samain berdasarkan id
      const photoMap = {};
      c.forEach((cand) => {
        photoMap[cand.id] = cand.image;
      });
      setResults(r.map((row) => ({ ...row, image: photoMap[row.id] || null })));
      if (periods?.length > 0) {
        const latest = periods.reduce(
          (a, b) => (b.id > a.id ? b : a),
          periods[0],
        );
        setPeriod(latest);
      }
      setLastUpdated(new Date());
    } catch {
      // biarin data lama tetep tampil kalau fetch gagal sesaat
    }
  }, [himpunan]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [fetchData]);

  useEffect(() => {
    function handleChange() {
      setIsFullscreen(!!document.fullscreenElement);
    }
    document.addEventListener("fullscreenchange", handleChange);
    return () => document.removeEventListener("fullscreenchange", handleChange);
  }, []);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      rootRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }

  let status = "—";
  let statusClass = "";
  if (period) {
    const now = new Date();
    const start = new Date(period.start_date);
    const end = new Date(period.end_date);
    if (now < start) {
      status = "Belum Dibuka";
      statusClass = "status-pending";
    } else if (now > end) {
      status = "Sudah Selesai";
      statusClass = "status-ended";
    } else {
      status = "Sedang Berlangsung";
      statusClass = "status-live";
    }
  }

  const totalVotes = results.reduce((a, b) => a + b.total_votes, 0);
  const sorted = [...results].sort((a, b) => b.total_votes - a.total_votes);
  const color = HIMPUNAN_COLORS[himpunan] || "#f59e0b";

  const chartData = {
    labels: sorted.map((r) => r.name),
    datasets: [
      {
        label: "Jumlah Suara",
        data: sorted.map((r) => r.total_votes),
        backgroundColor: color,
        borderRadius: 8,
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 400 },
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: "#e5e5ea", font: { size: 16, weight: "600" } },
        grid: { display: false },
      },
      y: {
        ticks: {
          color: "#9898a8",
          font: { size: 14 },
          stepSize: 1,
          precision: 0,
        },
        grid: { color: "#242428" },
        beginAtZero: true,
      },
    },
  };

  return (
    <div
      className="billboard-root"
      ref={rootRef}
      style={{ "--himpunan-color": color }}
    >
      <div className="billboard-toolbar">
        <div className="billboard-tabs">
          {HIMPUNAN_LIST.map((h) => (
            <button
              key={h}
              className={`billboard-tab ${himpunan === h ? "active" : ""}`}
              style={
                himpunan === h
                  ? {
                      borderColor: HIMPUNAN_COLORS[h],
                      color: HIMPUNAN_COLORS[h],
                    }
                  : {}
              }
              onClick={() => setHimpunan(h)}
            >
              {h}
            </button>
          ))}
        </div>
        <button className="billboard-fullscreen-btn" onClick={toggleFullscreen}>
          {isFullscreen ? "⤡ Keluar Fullscreen" : "⛶ Fullscreen"}
        </button>
      </div>

      <div className="billboard-header">
        <p className="billboard-eyebrow">NEOVOTE — LIVE RESULTS</p>
        <h1 className="billboard-title">Pemilihan Ketua {himpunan}</h1>
        <span className={`billboard-status ${statusClass}`}>{status}</span>
      </div>

      <div className="billboard-chart-wrap">
        <Bar data={chartData} options={chartOptions} />
      </div>

      <div className="billboard-cards">
        {sorted.map((r, i) => {
          const pct =
            totalVotes > 0
              ? ((r.total_votes / totalVotes) * 100).toFixed(1)
              : 0;
          const isLeader = i === 0 && r.total_votes > 0;
          return (
            <div
              className={`billboard-card ${isLeader ? "billboard-card-leader" : ""}`}
              key={r.id}
            >
              <div className="billboard-card-photo">
                {r.image ? (
                  <img src={r.image} alt={r.name} />
                ) : (
                  <span className="billboard-card-photo-fallback">
                    {r.name.charAt(0)}
                  </span>
                )}
              </div>
              {isLeader && (
                <p className="billboard-card-winner-label">Pemenang</p>
              )}
              <p className="billboard-card-rank">#{i + 1}</p>
              <p className="billboard-card-name">{r.name}</p>
              <p className="billboard-card-pct">{pct}%</p>
            </div>
          );
        })}
        {sorted.length === 0 && (
          <p className="billboard-empty">
            Belum ada kandidat untuk {himpunan}.
          </p>
        )}
      </div>

      <div className="billboard-footer">
        <span>Total suara masuk: {totalVotes}</span>
        {lastUpdated && (
          <span>
            Update terakhir: {lastUpdated.toLocaleTimeString("id-ID")}
          </span>
        )}
      </div>
    </div>
  );
}
