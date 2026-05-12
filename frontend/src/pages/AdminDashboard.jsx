import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/AdminDashboard.css";

const API = import.meta.env.VITE_API_URL;

function getToken() { return localStorage.getItem("admin_token"); }

function authHeaders() {
  return { "Content-Type": "application/json", Authorization: `Bearer ${getToken()}` };
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("overview");
  const [stats, setStats] = useState(null);
  const [candidates, setCandidates] = useState([]);
  const [users, setUsers] = useState([]);
  const [periods, setPeriods] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Candidate form
  const [candForm, setCandForm] = useState({ name: "", image: "", visi: "", misi: "" });
  const [editingCand, setEditingCand] = useState(null);

  // Period form
  const [periodForm, setPeriodForm] = useState({ start_date: "", end_date: "" });
  const [editingPeriod, setEditingPeriod] = useState(null);

  useEffect(() => {
    if (!getToken()) { navigate("/admin"); return; }
    fetchAll();
  }, []);

  async function fetchAll() {
    setLoading(true);
    try {
      const [s, c, u, p, r] = await Promise.all([
        fetch(`${API}/stats`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/candidates`).then(r => r.json()),
        fetch(`${API}/admin/users`, { headers: authHeaders() }).then(r => r.json()),
        fetch(`${API}/voting-period`).then(r => r.json()),
        fetch(`${API}/results`).then(r => r.json()),
      ]);
      setStats(s); setCandidates(c); setUsers(u); setPeriods(p); setResults(r);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  // ===== CANDIDATES =====
  async function saveCandidate(e) {
    e.preventDefault();
    const url = editingCand ? `${API}/candidates/${editingCand}` : `${API}/candidates`;
    const method = editingCand ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(candForm) });
    if (res.ok) { fetchAll(); setCandForm({ name: "", image: "", visi: "", misi: "" }); setEditingCand(null); }
    else { const d = await res.json(); alert(d.detail || "Gagal"); }
  }

  async function deleteCandidate(id) {
    if (!window.confirm("Hapus kandidat ini?")) return;
    await fetch(`${API}/candidates/${id}`, { method: "DELETE", headers: authHeaders() });
    fetchAll();
  }

  function editCandidate(c) {
    setEditingCand(c.id);
    setCandForm({ name: c.name, image: c.image || "", visi: c.visi || "", misi: c.misi || "" });
    setActiveTab("candidates");
  }

  // ===== PERIODS =====
  async function savePeriod(e) {
    e.preventDefault();
    const url = editingPeriod ? `${API}/voting-period/${editingPeriod}` : `${API}/voting-period`;
    const method = editingPeriod ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: authHeaders(), body: JSON.stringify(periodForm) });
    if (res.ok) { fetchAll(); setPeriodForm({ start_date: "", end_date: "" }); setEditingPeriod(null); }
    else { const d = await res.json(); alert(d.detail || "Gagal"); }
  }

  async function deletePeriod(id) {
    if (!window.confirm("Hapus periode ini?")) return;
    await fetch(`${API}/voting-period/${id}`, { method: "DELETE", headers: authHeaders() });
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
    { id: "results", label: "Hasil" },
  ];

  if (loading) return <div className="admin-loading"><span>Memuat data...</span></div>;

  return (
    <div className="admin-layout">

      {/* MOBILE TOPBAR */}
      <div className="admin-mobile-topbar">
        <span className="admin-mobile-brand">NEOVOTE Admin</span>
        <button className="admin-hamburger" onClick={() => setSidebarOpen(true)}>
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <line x1="4" y1="7" x2="20" y2="7"/>
            <line x1="4" y1="12" x2="20" y2="12"/>
            <line x1="4" y1="17" x2="14" y2="17"/>
          </svg>
        </button>
      </div>

      {/* OVERLAY */}
      <div className={`admin-overlay ${sidebarOpen ? "show" : ""}`} onClick={() => setSidebarOpen(false)} />

      {/* SIDEBAR */}
      <aside className={`admin-sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="admin-brand">
          <span className="brand-dot"></span>
          NEOVOTE
          <span className="brand-tag">Admin</span>
        </div>
        <nav className="admin-nav">
          {tabs.map(t => (
            <button key={t.id} className={`admin-nav-item ${activeTab === t.id ? "active" : ""}`} onClick={() => { setActiveTab(t.id); setSidebarOpen(false); }}>
              {t.label}
            </button>
          ))}
        </nav>
        <button className="admin-logout" onClick={handleLogout}>Keluar</button>
      </aside>

      {/* MAIN */}
      <main className="admin-main">
        <div className="admin-topbar">
          <h1 className="admin-page-title">
            {tabs.find(t => t.id === activeTab)?.label}
          </h1>
          <span className="admin-topbar-meta">NEOVOTE Admin Panel</span>
        </div>

        {/* OVERVIEW */}
        {activeTab === "overview" && stats && (
          <div className="admin-content">
            <div className="admin-stats-grid">
              {[
                { label: "Total Pemilih", value: stats.total_users },
                { label: "Sudah Voting", value: stats.total_votes },
                { label: "Belum Voting", value: stats.total_users - stats.total_votes },
                { label: "Partisipasi", value: stats.total_users > 0 ? `${((stats.total_votes / stats.total_users) * 100).toFixed(1)}%` : "0%" },
              ].map((s, i) => (
                <div className="admin-stat-card" key={i}>
                  <p className="admin-stat-label">{s.label}</p>
                  <p className="admin-stat-value">{s.value}</p>
                </div>
              ))}
            </div>

            <div className="admin-card">
              <h2 className="admin-card-title">Perolehan Suara</h2>
              <div className="result-list">
                {results.map((r, i) => {
                  const total = results.reduce((a, b) => a + b.total_votes, 0);
                  const pct = total > 0 ? ((r.total_votes / total) * 100).toFixed(1) : 0;
                  return (
                    <div className="result-row" key={r.id}>
                      <span className="result-rank">#{i + 1}</span>
                      <span className="result-name">{r.name}</span>
                      <div className="result-bar-wrap">
                        <div className="result-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="result-count">{r.total_votes} suara</span>
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
              <h2 className="admin-card-title">{editingCand ? "Edit Kandidat" : "Tambah Kandidat"}</h2>
              <form className="admin-form" onSubmit={saveCandidate}>
                <div className="form-row">
                  <div className="admin-form-group">
                    <label>Nama</label>
                    <input required placeholder="Nama kandidat" value={candForm.name} onChange={e => setCandForm({ ...candForm, name: e.target.value })} />
                  </div>
                  <div className="admin-form-group">
                    <label>URL Foto</label>
                    <input placeholder="https://..." value={candForm.image} onChange={e => setCandForm({ ...candForm, image: e.target.value })} />
                  </div>
                </div>
                <div className="admin-form-group">
                  <label>Visi</label>
                  <textarea rows={2} placeholder="Visi kandidat..." value={candForm.visi} onChange={e => setCandForm({ ...candForm, visi: e.target.value })} />
                </div>
                <div className="admin-form-group">
                  <label>Misi <span className="label-hint">(pisah dengan koma)</span></label>
                  <textarea rows={3} placeholder="Misi 1, Misi 2, Misi 3..." value={candForm.misi} onChange={e => setCandForm({ ...candForm, misi: e.target.value })} />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-save">{editingCand ? "Simpan Perubahan" : "Tambah Kandidat"}</button>
                  {editingCand && <button type="button" className="btn-cancel" onClick={() => { setEditingCand(null); setCandForm({ name: "", image: "", visi: "", misi: "" }); }}>Batal</button>}
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h2 className="admin-card-title">Daftar Kandidat ({candidates.length})</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>#</th><th>Foto</th><th>Nama</th><th>Visi</th><th>Aksi</th></tr>
                  </thead>
                  <tbody>
                    {candidates.map((c, i) => (
                      <tr key={c.id}>
                        <td>{i + 1}</td>
                        <td>{c.image ? <img src={c.image} alt={c.name} className="cand-thumb" /> : "–"}</td>
                        <td className="td-name">{c.name}</td>
                        <td className="td-visi">{c.visi || "–"}</td>
                        <td>
                          <div className="action-btns">
                            <button className="btn-edit" onClick={() => editCandidate(c)}>Edit</button>
                            <button className="btn-delete" onClick={() => deleteCandidate(c.id)}>Hapus</button>
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
              <h2 className="admin-card-title">{editingPeriod ? "Edit Periode" : "Tambah Periode Voting"}</h2>
              <form className="admin-form" onSubmit={savePeriod}>
                <div className="form-row">
                  <div className="admin-form-group">
                    <label>Waktu Mulai</label>
                    <input type="datetime-local" required value={periodForm.start_date} onChange={e => setPeriodForm({ ...periodForm, start_date: e.target.value })} />
                  </div>
                  <div className="admin-form-group">
                    <label>Waktu Selesai</label>
                    <input type="datetime-local" required value={periodForm.end_date} onChange={e => setPeriodForm({ ...periodForm, end_date: e.target.value })} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-save">{editingPeriod ? "Simpan" : "Tambah Periode"}</button>
                  {editingPeriod && <button type="button" className="btn-cancel" onClick={() => { setEditingPeriod(null); setPeriodForm({ start_date: "", end_date: "" }); }}>Batal</button>}
                </div>
              </form>
            </div>

            <div className="admin-card">
              <h2 className="admin-card-title">Daftar Periode ({periods.length})</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>#</th><th>Mulai</th><th>Selesai</th><th>Status</th><th>Aksi</th></tr>
                  </thead>
                  <tbody>
                    {periods.map((p, i) => {
                      const now = Date.now();
                      const start = new Date(p.start_date).getTime();
                      const end = new Date(p.end_date).getTime();
                      const status = now < start ? "Belum" : now <= end ? "Berlangsung" : "Selesai";
                      const statusClass = status === "Berlangsung" ? "badge-active" : status === "Selesai" ? "badge-done" : "badge-pending";
                      return (
                        <tr key={p.id}>
                          <td>{i + 1}</td>
                          <td>{new Date(p.start_date).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</td>
                          <td>{new Date(p.end_date).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}</td>
                          <td><span className={`badge ${statusClass}`}>{status}</span></td>
                          <td>
                            <div className="action-btns">
                              <button className="btn-edit" onClick={() => {
                                setEditingPeriod(p.id);
                                setPeriodForm({ start_date: p.start_date.slice(0, 16), end_date: p.end_date.slice(0, 16) });
                              }}>Edit</button>
                              <button className="btn-delete" onClick={() => deletePeriod(p.id)}>Hapus</button>
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
              <h2 className="admin-card-title">Daftar Pengguna ({users.length})</h2>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead>
                    <tr><th>#</th><th>Nama</th><th>Email</th><th>NIM</th><th>Verified</th></tr>
                  </thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id}>
                        <td>{i + 1}</td>
                        <td className="td-name">{u.username}</td>
                        <td>{u.email}</td>
                        <td><span className="nim-badge">{u.nim}</span></td>
                        <td><span className={`badge ${u.is_verified ? "badge-active" : "badge-pending"}`}>{u.is_verified ? "✓" : "–"}</span></td>
                      </tr>
                    ))}
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
              <div className="result-list">
                {results.map((r, i) => {
                  const total = results.reduce((a, b) => a + b.total_votes, 0);
                  const pct = total > 0 ? ((r.total_votes / total) * 100).toFixed(1) : 0;
                  return (
                    <div className={`result-row ${i === 0 ? "result-winner" : ""}`} key={r.id}>
                      <span className="result-rank">{i === 0 ? "🏆" : `#${i + 1}`}</span>
                      <span className="result-name">{r.name}</span>
                      <div className="result-bar-wrap">
                        <div className="result-bar" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="result-count">{r.total_votes} suara</span>
                      <span className="result-pct">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
