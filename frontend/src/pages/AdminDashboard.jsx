import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
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
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import "../styles/AdminDashboard.css";

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
  HIMAIF: "#f59e0b",
  HIMASIF: "#22c55e",
  HIMAKA: "#38bdf8",
};
// Palet chart khusus admin — beda gaya sama yang di StatistikPage (web voting mahasiswa)
const ADMIN_CHART_COLORS = [
  "#6366f1",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
  "#8b5cf6",
  "#f43f5e",
  "#0ea5e9",
  "#84cc16",
];

function getToken() {
  return localStorage.getItem("admin_token");
}

function himpunanBadgeClass(h) {
  if (h === "HIMAIF") return "himpunan-badge-if";
  if (h === "HIMASIF") return "himpunan-badge-si";
  if (h === "HIMAKA") return "himpunan-badge-ka";
  return "";
}

function authHeaders() {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${getToken()}`,
  };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [users, setUsers] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [results, setResults] = useState([]);
  const [mahasiswaList, setMahasiswaList] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [himpunanFilter, setHimpunanFilter] = useState("ALL"); // filter buat tabel Kandidat/Pengguna/Mahasiswa/Hasil
  const [mhsSearch, setMhsSearch] = useState("");
  const [mhsStatusFilter, setMhsStatusFilter] = useState("ALL"); // ALL | REGISTERED | NOT_REGISTERED
  const [mhsSort, setMhsSort] = useState({ key: "nim", dir: "asc" });
  const chartRef = useRef(null);

  // Candidate form
  const [candForm, setCandForm] = useState({
    name: "",
    image: "",
    visi: "",
    misi: "",
    himpunan: "HIMAIF",
  });
  const [editingCand, setEditingCand] = useState(null);

  // Period form
  const [periodForm, setPeriodForm] = useState({
    start_date: "",
    end_date: "",
  });
  const [editingPeriod, setEditingPeriod] = useState(null);

  // Mahasiswa form
  const [mhsForm, setMhsForm] = useState({
    nim: "",
    nama: "",
    himpunan: "HIMAIF",
  });

  // Import Excel mahasiswa
  const [importHimpunan, setImportHimpunan] = useState("HIMAIF");
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // Log Admin — pencarian & filter (buat audit keamanan: register/OTP gagal, dsb)
  const [logSearch, setLogSearch] = useState("");
  const [logActionFilter, setLogActionFilter] = useState("ALL");
  const [logOnlySuspicious, setLogOnlySuspicious] = useState(false);

  useEffect(() => {
    if (!getToken()) {
      navigate("/admin");
      return;
    }
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [s, c, u, p, r, m, l] = await Promise.all([
        fetch(`${API}/admin/stats`, { headers: authHeaders() }).then((r) =>
          r.json(),
        ),
        fetch(`${API}/candidates`).then((r) => r.json()),
        fetch(`${API}/admin/users`, { headers: authHeaders() }).then((r) =>
          r.json(),
        ),
        fetch(`${API}/voting-period`).then((r) => r.json()),
        fetch(`${API}/results`).then((r) => r.json()),
        fetch(`${API}/admin/mahasiswa`, { headers: authHeaders() }).then((r) =>
          r.json(),
        ),
        fetch(`${API}/admin/logs`, { headers: authHeaders() }).then((r) =>
          r.json(),
        ),
      ]);
      setStats(s);
      setCandidates(c);
      setUsers(u);
      setPeriods(p);
      setResults(r);
      setMahasiswaList(m);
      setLogs(l);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  const filteredCandidates =
    himpunanFilter === "ALL"
      ? candidates
      : candidates.filter((c) => c.himpunan === himpunanFilter);
  const filteredUsers =
    himpunanFilter === "ALL"
      ? users
      : users.filter((u) => u.himpunan === himpunanFilter);
  const filteredResults =
    himpunanFilter === "ALL"
      ? results
      : results.filter((r) => r.himpunan === himpunanFilter);

  function toggleMhsSort(key) {
    setMhsSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: "asc" },
    );
  }

  const filteredMahasiswa = mahasiswaList
    .filter((m) => himpunanFilter === "ALL" || m.himpunan === himpunanFilter)
    .filter((m) => {
      if (mhsStatusFilter === "ALL") return true;
      return mhsStatusFilter === "REGISTERED"
        ? m.sudah_mendaftar
        : !m.sudah_mendaftar;
    })
    .filter((m) => {
      const q = mhsSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        m.nim.toLowerCase().includes(q) || m.nama.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => {
      const { key, dir } = mhsSort;
      let va = a[key],
        vb = b[key];
      if (key === "sudah_mendaftar") {
        va = va ? 1 : 0;
        vb = vb ? 1 : 0;
      } else {
        va = String(va ?? "").toLowerCase();
        vb = String(vb ?? "").toLowerCase();
      }
      if (va < vb) return dir === "asc" ? -1 : 1;
      if (va > vb) return dir === "asc" ? 1 : -1;
      return 0;
    });

  // Action log yang dianggap "patut dicurigai" — dipakai buat toggle "Cuma yang mencurigakan"
  // dan buat kasih warna beda di tabel supaya gampang keliatan pas audit.
  const SUSPICIOUS_ACTIONS = ["REGISTER_FAILED", "OTP_FAILED", "OTP_LOCKED"];

  function logRowClass(action) {
    if (SUSPICIOUS_ACTIONS.includes(action)) return "log-row-suspicious";
    if (action === "REGISTER_SUCCESS" || action === "OTP_SUCCESS")
      return "log-row-success";
    return "";
  }

  function logRowStyle(action) {
    if (SUSPICIOUS_ACTIONS.includes(action)) {
      return { background: "rgba(239, 68, 68, 0.08)" }; // merah samar
    }
    if (action === "REGISTER_SUCCESS" || action === "OTP_SUCCESS") {
      return { background: "rgba(34, 197, 94, 0.06)" }; // hijau samar
    }
    return undefined;
  }

  const logActionOptions = [
    "ALL",
    ...Array.from(new Set(logs.map((l) => l.action))).sort(),
  ];

  const filteredLogs = logs
    .filter((l) => logActionFilter === "ALL" || l.action === logActionFilter)
    .filter((l) =>
      logOnlySuspicious ? SUSPICIOUS_ACTIONS.includes(l.action) : true,
    )
    .filter((l) => {
      const q = logSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        (l.detail || "").toLowerCase().includes(q) ||
        (l.action || "").toLowerCase().includes(q)
      );
    });

  function HimpunanTabs() {
    return (
      <div className="himpunan-tabs">
        {["ALL", ...HIMPUNAN_LIST].map((h) => (
          <button
            key={h}
            className={`himpunan-tab ${himpunanFilter === h ? "active" : ""}`}
            onClick={() => setHimpunanFilter(h)}
          >
            {h === "ALL" ? "Semua" : h}
          </button>
        ))}
      </div>
    );
  }

  const chartData = {
    labels: filteredResults.map((r) => r.name),
    datasets: [
      {
        label: "Jumlah Suara",
        data: filteredResults.map((r) => r.total_votes),
        backgroundColor: filteredResults.map(
          (r, i) => ADMIN_CHART_COLORS[i % ADMIN_CHART_COLORS.length],
        ),
        borderRadius: 6,
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    animation: { duration: 300 },
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: "#9898a8" }, grid: { color: "#242428" } },
      y: {
        ticks: { color: "#9898a8", stepSize: 1 },
        grid: { color: "#242428" },
        beginAtZero: true,
      },
    },
  };

  // ===== EXPORT PDF (data pemilihan + chart + log admin) =====
  function handleExportPDF() {
    const doc = new jsPDF();
    const waktu = new Date().toLocaleString("id-ID", {
      timeZone: "Asia/Jakarta",
    });

    // Halaman 1: ringkasan
    doc.setFontSize(16);
    doc.text("Laporan Pemilihan Himpunan — NEOVOTE", 14, 18);
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(`Dicetak: ${waktu} WIB`, 14, 24);
    doc.setTextColor(0);

    autoTable(doc, {
      startY: 32,
      head: [["Metrik", "Nilai"]],
      body: [
        ["Total Pemilih", String(stats?.total_users ?? 0)],
        ["Sudah Voting", String(stats?.total_votes ?? 0)],
        [
          "Belum Voting",
          String((stats?.total_users ?? 0) - (stats?.total_votes ?? 0)),
        ],
        [
          "Partisipasi",
          stats?.total_users > 0
            ? `${((stats.total_votes / stats.total_users) * 100).toFixed(1)}%`
            : "0%",
        ],
      ],
    });

    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 10,
      head: [["Himpunan", "Sudah Voting", "Total Pemilih", "Partisipasi"]],
      body: (stats?.breakdown || []).map((b) => [
        b.himpunan,
        String(b.total_votes),
        String(b.total_users),
        b.total_users > 0
          ? `${((b.total_votes / b.total_users) * 100).toFixed(1)}%`
          : "0%",
      ]),
    });

    // Halaman 2: chart perolehan suara
    if (chartRef.current) {
      doc.addPage();
      doc.setFontSize(13);
      doc.text("Grafik Perolehan Suara", 14, 18);
      const imgData = chartRef.current.toBase64Image();
      doc.addImage(imgData, "PNG", 14, 26, 180, 100);
    }

    // Halaman 3: data pemilihan (hasil per kandidat)
    doc.addPage();
    doc.setFontSize(13);
    doc.text("Data Pemilihan", 14, 18);
    autoTable(doc, {
      startY: 26,
      head: [["Kandidat", "Himpunan", "Jumlah Suara"]],
      body: results.map((r) => [r.name, r.himpunan, String(r.total_votes)]),
    });

    // Halaman 4: log aktivitas admin
    doc.addPage();
    doc.setFontSize(13);
    doc.text("Log Aktivitas Admin", 14, 18);
    autoTable(doc, {
      startY: 26,
      head: [["Waktu", "Aksi", "Detail"]],
      body: logs.map((l) => [
        new Date(l.created_at).toLocaleString("id-ID", {
          timeZone: "Asia/Jakarta",
        }),
        l.action,
        l.detail || "-",
      ]),
      styles: { fontSize: 8 },
    });

    doc.save(`laporan-neovote-${Date.now()}.pdf`);
  }

  // ===== MAHASISWA =====
  async function saveMahasiswa(e) {
    e.preventDefault();
    const res = await fetch(`${API}/admin/mahasiswa`, {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify(mhsForm),
    });
    if (res.ok) {
      fetchAll();
      setMhsForm({ nim: "", nama: "", himpunan: "HIMAIF" });
    } else {
      const d = await res.json();
      alert(d.detail || "Gagal");
    }
  }

  async function handleImportExcel(e) {
    e.preventDefault();
    if (!importFile) return;

    setImporting(true);
    setImportResult(null);
    try {
      const formData = new FormData();
      formData.append("himpunan", importHimpunan);
      formData.append("file", importFile);

      const res = await fetch(`${API}/admin/mahasiswa/import`, {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` }, // jangan set Content-Type manual, biar browser yang atur boundary form-data
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || "Gagal import file");
      } else {
        setImportResult(data);
        setImportFile(null);
        fetchAll();
      }
    } catch (err) {
      alert("Gagal upload file: " + err.message);
    } finally {
      setImporting(false);
    }
  }

  async function deleteMahasiswa(nim) {
    if (!window.confirm(`Hapus data mahasiswa NIM ${nim}?`)) return;
    await fetch(`${API}/admin/mahasiswa/${nim}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    fetchAll();
  }

  // ===== USERS =====
  async function deleteUser(id, name) {
    if (
      !window.confirm(
        `Yakin mau hapus akun "${name}"? Suara yang udah dia kasih (kalau ada) juga ikut kehapus.`,
      )
    )
      return;
    await fetch(`${API}/admin/users/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    fetchAll();
  }

  // ===== CANDIDATES =====
  async function saveCandidate(e) {
    e.preventDefault();
    const url = editingCand
      ? `${API}/candidates/${editingCand}`
      : `${API}/candidates`;
    const method = editingCand ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(candForm),
    });
    if (res.ok) {
      fetchAll();
      setCandForm({
        name: "",
        image: "",
        visi: "",
        misi: "",
        himpunan: "HIMAIF",
      });
      setEditingCand(null);
    } else {
      const d = await res.json();
      alert(d.detail || "Gagal");
    }
  }

  async function deleteCandidate(id) {
    if (!window.confirm("Hapus kandidat ini?")) return;
    await fetch(`${API}/candidates/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    fetchAll();
  }

  function editCandidate(c) {
    setEditingCand(c.id);
    setCandForm({
      name: c.name,
      image: c.image || "",
      visi: c.visi || "",
      misi: c.misi || "",
      himpunan: c.himpunan || "HIMAIF",
    });
    setActiveTab("candidates");
  }

  // ===== PERIODS =====
  async function savePeriod(e) {
    e.preventDefault();
    const url = editingPeriod
      ? `${API}/voting-period/${editingPeriod}`
      : `${API}/voting-period`;
    const method = editingPeriod ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify(periodForm),
    });
    if (res.ok) {
      fetchAll();
      setPeriodForm({ start_date: "", end_date: "" });
      setEditingPeriod(null);
    } else {
      const d = await res.json();
      alert(d.detail || "Gagal");
    }
  }

  async function deletePeriod(id) {
    if (!window.confirm("Hapus periode ini?")) return;
    await fetch(`${API}/voting-period/${id}`, {
      method: "DELETE",
      headers: authHeaders(),
    });
    fetchAll();
  }

  function handleLogout() {
    localStorage.removeItem("admin_token");
    navigate("/admin");
  }

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "candidates", label: "Kandidat" },
    { id: "periods", label: "Periode Voting" },
    { id: "users", label: "Pengguna" },
    { id: "mahasiswa", label: "Data Mahasiswa" },
    { id: "results", label: "Hasil" },
    { id: "logs", label: "Log Admin" },
  ];

  if (loading)
    return (
      <div className="admin-loading">
        <span>Memuat data...</span>
      </div>
    );

  return (
    <div className="admin-layout">
      {/* MOBILE TOPBAR */}
      <div className="admin-mobile-topbar">
        <span className="admin-mobile-brand">NEOVOTE Admin</span>
        <button
          className="admin-hamburger"
          onClick={() => setSidebarOpen(true)}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="14" y2="17" />
          </svg>
        </button>
      </div>

      {/* OVERLAY */}
      <div
        className={`admin-overlay ${sidebarOpen ? "show" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-brand">
          <span className="brand-dot"></span>
          NEOVOTE
          <span className="brand-tag">Admin</span>
        </div>
        <nav className="admin-nav">
          {tabs.map((t) => (
            <button
              key={t.id}
              className={`admin-nav-item ${activeTab === t.id ? "active" : ""}`}
              onClick={() => {
                setActiveTab(t.id);
                setSidebarOpen(false);
              }}
            >
              {t.label}
            </button>
          ))}
        </nav>
        <button className="admin-logout" onClick={handleLogout}>
          Keluar
        </button>
      </aside>

      {/* MAIN */}
      <main className="admin-main">
        <div className="admin-topbar">
          <h1 className="admin-page-title">
            {tabs.find((t) => t.id === activeTab)?.label}
          </h1>
          <span className="admin-topbar-meta">NEOVOTE Admin Panel</span>
        </div>

        {/* OVERVIEW */}
        {activeTab === "overview" && stats && (
          <div className="admin-content">
            <div className="overview-top">
              <div className="admin-stats-grid overview-stats-grid">
                {[
                  { label: "Total Pemilih", value: stats.total_users },
                  { label: "Sudah Voting", value: stats.total_votes },
                  {
                    label: "Belum Voting",
                    value: stats.total_users - stats.total_votes,
                  },
                  {
                    label: "Partisipasi",
                    value:
                      stats.total_users > 0
                        ? `${((stats.total_votes / stats.total_users) * 100).toFixed(1)}%`
                        : "0%",
                  },
                ].map((s, i) => (
                  <div className="admin-stat-card" key={i}>
                    <p className="admin-stat-label">{s.label}</p>
                    <p className="admin-stat-value">{s.value}</p>
                  </div>
                ))}
              </div>

              <div className="overview-actions">
                <button className="btn-save" onClick={handleExportPDF}>
                  ⬇ Ekspor PDF
                </button>
                <a
                  className="btn-cancel"
                  href="/billboard"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  🖥 Buka Billboard
                </a>
              </div>
            </div>

            <div className="admin-card">
              <h2 className="admin-card-title">Partisipasi per Himpunan</h2>
              <div className="admin-stats-grid">
                {(stats.breakdown || []).map((b) => (
                  <div className="admin-stat-card" key={b.himpunan}>
                    <p className="admin-stat-label">
                      <span
                        className={`himpunan-badge ${himpunanBadgeClass(b.himpunan)}`}
                      >
                        {b.himpunan}
                      </span>
                    </p>
                    <p className="admin-stat-value">
                      {b.total_votes} / {b.total_users}
                    </p>
                    <p className="label-hint">
                      {b.total_users > 0
                        ? `${((b.total_votes / b.total_users) * 100).toFixed(1)}% partisipasi`
                        : "belum ada pemilih"}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="admin-card">
              <h2 className="admin-card-title">Perolehan Suara</h2>
              <HimpunanTabs />
              <div className="overview-chart-wrap">
                <Bar ref={chartRef} data={chartData} options={chartOptions} />
              </div>
              <div className="result-list">
                {filteredResults.map((r, i) => {
                  const total = filteredResults.reduce(
                    (a, b) => a + b.total_votes,
                    0,
                  );
                  const pct =
                    total > 0 ? ((r.total_votes / total) * 100).toFixed(1) : 0;
                  return (
                    <div className="result-row" key={r.id}>
                      <span className="result-rank">#{i + 1}</span>
                      <span className="result-name">
                        {r.name}{" "}
                        <span
                          className={`himpunan-badge ${himpunanBadgeClass(r.himpunan)}`}
                        >
                          {r.himpunan}
                        </span>
                      </span>
                      <div className="result-bar-wrap">
                        <div
                          className="result-bar"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="result-count">
                        {r.total_votes} suara
                      </span>
                      <span className="result-pct">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* CANDIDATES */}
        {activeTab === "candidates" && (
          <div className="admin-content">
            <div className="admin-card">
              <h2 className="admin-card-title">
                {editingCand ? "Edit Kandidat" : "Tambah Kandidat"}
              </h2>
              <form className="admin-form" onSubmit={saveCandidate}>
                <div className="form-row">
                  <div className="admin-form-group">
                    <label>Nama</label>
                    <input
                      required
                      placeholder="Nama kandidat"
                      value={candForm.name}
                      onChange={(e) =>
                        setCandForm({ ...candForm, name: e.target.value })
                      }
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>URL Foto</label>
                    <input
                      placeholder="https://..."
                      value={candForm.image}
                      onChange={(e) =>
                        setCandForm({ ...candForm, image: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="admin-form-group">
                  <label>Himpunan</label>
                  <select
                    required
                    value={candForm.himpunan}
                    onChange={(e) =>
                      setCandForm({ ...candForm, himpunan: e.target.value })
                    }
                  >
                    {HIMPUNAN_LIST.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-form-group">
                  <label>Visi</label>
                  <textarea
                    rows={2}
                    placeholder="Visi kandidat..."
                    value={candForm.visi}
                    onChange={(e) =>
                      setCandForm({ ...candForm, visi: e.target.value })
                    }
                  />
                </div>
                <div className="admin-form-group">
                  <label>
                    Misi{" "}
                    <span className="label-hint">
                      (1 baris = 1 poin, tekan Enter buat poin baru)
                    </span>
                  </label>
                  <textarea
                    rows={5}
                    placeholder={"Misi 1\nMisi 2\nMisi 3..."}
                    value={candForm.misi}
                    onChange={(e) =>
                      setCandForm({ ...candForm, misi: e.target.value })
                    }
                  />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-save">
                    {editingCand ? "Simpan Perubahan" : "Tambah Kandidat"}
                  </button>
                  {editingCand && (
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => {
                        setEditingCand(null);
                        setCandForm({
                          name: "",
                          image: "",
                          visi: "",
                          misi: "",
                          himpunan: "HIMAIF",
                        });
                      }}
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h2 className="admin-card-title">
                Daftar Kandidat ({filteredCandidates.length})
              </h2>
              <HimpunanTabs />
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Foto</th>
                      <th>Nama</th>
                      <th>Himpunan</th>
                      <th>Visi</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredCandidates.map((c, i) => (
                      <tr key={c.id}>
                        <td>{i + 1}</td>
                        <td>
                          {c.image ? (
                            <img
                              src={c.image}
                              alt={c.name}
                              className="cand-thumb"
                            />
                          ) : (
                            "–"
                          )}
                        </td>
                        <td className="td-name">{c.name}</td>
                        <td>
                          <span
                            className={`himpunan-badge ${himpunanBadgeClass(c.himpunan)}`}
                          >
                            {c.himpunan}
                          </span>
                        </td>
                        <td className="td-visi">{c.visi || "–"}</td>
                        <td>
                          <div className="action-btns">
                            <button
                              className="btn-edit"
                              onClick={() => editCandidate(c)}
                            >
                              Edit
                            </button>
                            <button
                              className="btn-delete"
                              onClick={() => deleteCandidate(c.id)}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* PERIODS */}
        {activeTab === "periods" && (
          <div className="admin-content">
            <div className="admin-card">
              <h2 className="admin-card-title">
                {editingPeriod ? "Edit Periode" : "Tambah Periode Voting"}
              </h2>
              <form className="admin-form" onSubmit={savePeriod}>
                <div className="form-row">
                  <div className="admin-form-group">
                    <label>Waktu Mulai</label>
                    <input
                      type="datetime-local"
                      required
                      value={periodForm.start_date}
                      onChange={(e) =>
                        setPeriodForm({
                          ...periodForm,
                          start_date: e.target.value,
                        })
                      }
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Waktu Selesai</label>
                    <input
                      type="datetime-local"
                      required
                      value={periodForm.end_date}
                      onChange={(e) =>
                        setPeriodForm({
                          ...periodForm,
                          end_date: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-save">
                    {editingPeriod ? "Simpan" : "Tambah Periode"}
                  </button>
                  {editingPeriod && (
                    <button
                      type="button"
                      className="btn-cancel"
                      onClick={() => {
                        setEditingPeriod(null);
                        setPeriodForm({ start_date: "", end_date: "" });
                      }}
                    >
                      Batal
                    </button>
                  )}
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h2 className="admin-card-title">
                Daftar Periode ({periods.length})
              </h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Mulai</th>
                      <th>Selesai</th>
                      <th>Status</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {periods.map((p, i) => {
                      const now = Date.now();
                      const start = new Date(p.start_date).getTime();
                      const end = new Date(p.end_date).getTime();
                      const status =
                        now < start
                          ? "Belum"
                          : now <= end
                            ? "Berlangsung"
                            : "Selesai";
                      const statusClass =
                        status === "Berlangsung"
                          ? "badge-active"
                          : status === "Selesai"
                            ? "badge-done"
                            : "badge-pending";
                      return (
                        <tr key={p.id}>
                          <td>{i + 1}</td>
                          <td>
                            {new Date(p.start_date).toLocaleString("id-ID", {
                              timeZone: "Asia/Jakarta",
                            })}
                          </td>
                          <td>
                            {new Date(p.end_date).toLocaleString("id-ID", {
                              timeZone: "Asia/Jakarta",
                            })}
                          </td>
                          <td>
                            <span className={`badge ${statusClass}`}>
                              {status}
                            </span>
                          </td>
                          <td>
                            <div className="action-btns">
                              <button
                                className="btn-edit"
                                onClick={() => {
                                  setEditingPeriod(p.id);
                                  setPeriodForm({
                                    start_date: p.start_date.slice(0, 16),
                                    end_date: p.end_date.slice(0, 16),
                                  });
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="btn-delete"
                                onClick={() => deletePeriod(p.id)}
                              >
                                Hapus
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* USERS */}
        {activeTab === "users" && (
          <div className="admin-content">
            <div className="admin-card">
              <h2 className="admin-card-title">
                Daftar Pengguna ({filteredUsers.length})
              </h2>
              <HimpunanTabs />
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>Nama</th>
                      <th>Email</th>
                      <th>NIM</th>
                      <th>Himpunan</th>
                      <th>Verified</th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((u, i) => (
                      <tr key={u.id}>
                        <td>{i + 1}</td>
                        <td className="td-name">{u.username}</td>
                        <td>{u.email}</td>
                        <td>
                          <span className="nim-badge">{u.nim}</span>
                        </td>
                        <td>
                          <span
                            className={`himpunan-badge ${himpunanBadgeClass(u.himpunan)}`}
                          >
                            {u.himpunan}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${u.is_verified ? "badge-active" : "badge-pending"}`}
                          >
                            {u.is_verified ? "✓" : "–"}
                          </span>
                        </td>
                        <td>
                          <div className="action-btns">
                            <button
                              className="btn-delete"
                              onClick={() => deleteUser(u.id, u.username)}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* MAHASISWA */}
        {activeTab === "mahasiswa" && (
          <div className="admin-content">
            <div className="admin-card">
              <h2 className="admin-card-title">Tambah Data Mahasiswa</h2>
              <p className="label-hint" style={{ marginBottom: "0.75rem" }}>
                NIM yang ditambahin di sini yang boleh dipake buat register akun
                mahasiswa, sesuai himpunannya masing-masing.
              </p>
              <form className="admin-form" onSubmit={saveMahasiswa}>
                <div className="form-row">
                  <div className="admin-form-group">
                    <label>NIM</label>
                    <input
                      required
                      placeholder="Contoh: 2023230019"
                      value={mhsForm.nim}
                      onChange={(e) =>
                        setMhsForm({ ...mhsForm, nim: e.target.value })
                      }
                    />
                  </div>
                  <div className="admin-form-group">
                    <label>Nama</label>
                    <input
                      required
                      placeholder="Nama mahasiswa"
                      value={mhsForm.nama}
                      onChange={(e) =>
                        setMhsForm({ ...mhsForm, nama: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="admin-form-group">
                  <label>Himpunan</label>
                  <select
                    required
                    value={mhsForm.himpunan}
                    onChange={(e) =>
                      setMhsForm({ ...mhsForm, himpunan: e.target.value })
                    }
                  >
                    {HIMPUNAN_LIST.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-save">
                    Tambah Mahasiswa
                  </button>
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h2 className="admin-card-title">Import dari Excel (Bulk)</h2>
              <p className="label-hint" style={{ marginBottom: "0.75rem" }}>
                File Excel (.xlsx) cukup 2 kolom: <b>NIM</b> di kolom pertama,{" "}
                <b>Nama</b> di kolom kedua. Baris header (kalau ada) otomatis
                dilewatin. Semua baris bakal ke-assign ke himpunan yang lo pilih
                di bawah.
              </p>
              <form className="admin-form" onSubmit={handleImportExcel}>
                <div className="form-row">
                  <div className="admin-form-group">
                    <label>Himpunan Tujuan</label>
                    <select
                      value={importHimpunan}
                      onChange={(e) => setImportHimpunan(e.target.value)}
                    >
                      {HIMPUNAN_LIST.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-form-group">
                    <label>File Excel (.xlsx)</label>
                    <input
                      type="file"
                      accept=".xlsx,.xlsm"
                      onChange={(e) => setImportFile(e.target.files[0] || null)}
                    />
                  </div>
                </div>
                <div className="form-actions">
                  <button
                    type="submit"
                    className="btn-save"
                    disabled={!importFile || importing}
                  >
                    {importing ? "Mengimport..." : "Import Sekarang"}
                  </button>
                </div>
              </form>

              {importResult && (
                <div className="import-result">
                  <p>
                    ✅ Berhasil ditambahin: <b>{importResult.imported_count}</b>
                  </p>
                  {importResult.skipped_duplicate.length > 0 && (
                    <p>
                      ⚠️ Dilewatin (NIM udah ada):{" "}
                      {importResult.skipped_duplicate.join(", ")}
                    </p>
                  )}
                  {importResult.skipped_invalid.length > 0 && (
                    <p>
                      ⚠️ Dilewatin (data nggak lengkap):{" "}
                      {importResult.skipped_invalid.join(", ")}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="admin-card">
              <h2 className="admin-card-title">
                Daftar Mahasiswa ({filteredMahasiswa.length})
              </h2>
              <HimpunanTabs />

              <div className="mhs-toolbar">
                <input
                  type="text"
                  className="mhs-search-input"
                  placeholder="Cari NIM atau nama..."
                  value={mhsSearch}
                  onChange={(e) => setMhsSearch(e.target.value)}
                />
                <select
                  className="mhs-status-select"
                  value={mhsStatusFilter}
                  onChange={(e) => setMhsStatusFilter(e.target.value)}
                >
                  <option value="ALL">Semua status</option>
                  <option value="REGISTERED">Sudah daftar</option>
                  <option value="NOT_REGISTERED">Belum daftar</option>
                </select>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th
                        className="th-sortable"
                        onClick={() => toggleMhsSort("nim")}
                      >
                        NIM{" "}
                        {mhsSort.key === "nim" &&
                          (mhsSort.dir === "asc" ? "▲" : "▼")}
                      </th>
                      <th
                        className="th-sortable"
                        onClick={() => toggleMhsSort("nama")}
                      >
                        Nama{" "}
                        {mhsSort.key === "nama" &&
                          (mhsSort.dir === "asc" ? "▲" : "▼")}
                      </th>
                      <th
                        className="th-sortable"
                        onClick={() => toggleMhsSort("himpunan")}
                      >
                        Himpunan{" "}
                        {mhsSort.key === "himpunan" &&
                          (mhsSort.dir === "asc" ? "▲" : "▼")}
                      </th>
                      <th
                        className="th-sortable"
                        onClick={() => toggleMhsSort("sudah_mendaftar")}
                      >
                        Status{" "}
                        {mhsSort.key === "sudah_mendaftar" &&
                          (mhsSort.dir === "asc" ? "▲" : "▼")}
                      </th>
                      <th>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMahasiswa.map((m, i) => (
                      <tr key={m.nim}>
                        <td>{i + 1}</td>
                        <td>
                          <span className="nim-badge">{m.nim}</span>
                        </td>
                        <td className="td-name">{m.nama}</td>
                        <td>
                          <span
                            className={`himpunan-badge ${himpunanBadgeClass(m.himpunan)}`}
                          >
                            {m.himpunan}
                          </span>
                        </td>
                        <td>
                          <span
                            className={`badge ${m.sudah_mendaftar ? "badge-active" : "badge-pending"}`}
                          >
                            {m.sudah_mendaftar
                              ? "Sudah daftar"
                              : "Belum daftar"}
                          </span>
                        </td>
                        <td>
                          <div className="action-btns">
                            <button
                              className="btn-delete"
                              onClick={() => deleteMahasiswa(m.nim)}
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {filteredMahasiswa.length === 0 && (
                      <tr>
                        <td colSpan={6} className="mhs-empty">
                          Nggak ada data yang cocok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* RESULTS */}
        {activeTab === "results" && (
          <div className="admin-content">
            <div className="admin-card">
              <h2 className="admin-card-title">Hasil Voting</h2>
              <HimpunanTabs />
              <div className="result-list">
                {filteredResults.map((r, i) => {
                  const total = filteredResults.reduce(
                    (a, b) => a + b.total_votes,
                    0,
                  );
                  const pct =
                    total > 0 ? ((r.total_votes / total) * 100).toFixed(1) : 0;
                  return (
                    <div
                      className={`result-row ${i === 0 ? "result-winner" : ""}`}
                      key={r.id}
                    >
                      <span className="result-rank">
                        {i === 0 ? "🏆" : `#${i + 1}`}
                      </span>
                      <span className="result-name">
                        {r.name}{" "}
                        <span
                          className={`himpunan-badge ${himpunanBadgeClass(r.himpunan)}`}
                        >
                          {r.himpunan}
                        </span>
                      </span>
                      <div className="result-bar-wrap">
                        <div
                          className="result-bar"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <span className="result-count">
                        {r.total_votes} suara
                      </span>
                      <span className="result-pct">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* ADMIN LOG */}
        {activeTab === "logs" && (
          <div className="admin-content">
            <div className="admin-card">
              <h2 className="admin-card-title">
                Log Aktivitas Admin ({filteredLogs.length}
                {filteredLogs.length !== logs.length ? ` / ${logs.length}` : ""}
                )
              </h2>
              <p className="label-hint" style={{ marginBottom: "0.75rem" }}>
                Catatan aktivitas admin, dan sekarang juga percobaan registrasi
                & verifikasi OTP mahasiswa (lengkap dengan IP address-nya) —
                dipakai buat audit kalau ada laporan kecurangan NIM.
              </p>

              <div className="mhs-toolbar">
                <input
                  type="text"
                  className="mhs-search-input"
                  placeholder="Cari NIM, nama, email, atau IP..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                />
                <select
                  className="mhs-status-select"
                  value={logActionFilter}
                  onChange={(e) => setLogActionFilter(e.target.value)}
                >
                  {logActionOptions.map((a) => (
                    <option key={a} value={a}>
                      {a === "ALL" ? "Semua aksi" : a}
                    </option>
                  ))}
                </select>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "0.85rem",
                    color: "var(--text-muted, #9898a8)",
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={logOnlySuspicious}
                    onChange={(e) => setLogOnlySuspicious(e.target.checked)}
                  />
                  Cuma yang mencurigakan
                </label>
              </div>

              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Waktu</th>
                      <th>Aksi</th>
                      <th>Detail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredLogs.map((l) => (
                      <tr
                        key={l.id}
                        className={logRowClass(l.action)}
                        style={logRowStyle(l.action)}
                      >
                        <td className="td-nowrap">
                          {new Date(l.created_at).toLocaleString("id-ID", {
                            timeZone: "Asia/Jakarta",
                          })}
                        </td>
                        <td>
                          <span
                            className="himpunan-badge"
                            style={
                              SUSPICIOUS_ACTIONS.includes(l.action)
                                ? { background: "#ef4444", color: "#fff" }
                                : l.action === "REGISTER_SUCCESS" ||
                                    l.action === "OTP_SUCCESS"
                                  ? { background: "#22c55e", color: "#fff" }
                                  : undefined
                            }
                          >
                            {l.action}
                          </span>
                        </td>
                        <td>{l.detail || "–"}</td>
                      </tr>
                    ))}
                    {filteredLogs.length === 0 && (
                      <tr>
                        <td colSpan={3} className="mhs-empty">
                          Nggak ada log yang cocok.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
