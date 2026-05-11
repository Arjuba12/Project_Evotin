import React from "react";
import { Link } from "react-router-dom";
import "../styles/LandingPage.css";

export default function LandingPage() {
  return (
    <div className="landing">

      {/* NAVBAR */}
      <nav className="landing-nav">
        <span className="landing-logo">NEOVOTE</span>
        <div className="landing-nav-links">
          <a href="#fitur">Fitur</a>
          <a href="#cara-kerja">Cara Kerja</a>
          <Link to="/login" className="nav-btn-outline">Masuk</Link>
          <Link to="/register" className="nav-btn-solid">Daftar</Link>
        </div>
      </nav>

      {/* HERO */}
      <section className="hero">
        <div className="hero-badge">
          <span className="badge-dot"></span>
          Sistem Voting Digital
        </div>
        <h1>Pemilihan himpunan yang<br /><span className="hero-accent">transparan</span> & aman</h1>
        <p>NEOVOTE adalah platform e-voting modern untuk organisasi kampus. Verifikasi NIM, OTP email, dan hasil real-time — semua dalam satu sistem.</p>
        <div className="hero-btns">
          <Link to="/register" className="btn-primary">Mulai Voting →</Link>
          <Link to="/login" className="btn-secondary">Sudah punya akun</Link>
        </div>
      </section>

      {/* STATS BAR */}
      <div className="stats-bar">
        <div className="stat-item">
          <span className="stat-num">100%</span>
          <span className="stat-lbl">Terverifikasi NIM</span>
        </div>
        <div className="stat-item">
          <span className="stat-num">1x</span>
          <span className="stat-lbl">Suara per mahasiswa</span>
        </div>
        <div className="stat-item">
          <span className="stat-num">Live</span>
          <span className="stat-lbl">Hasil real-time</span>
        </div>
      </div>

      {/* FITUR */}
      <section className="section" id="fitur">
        <p className="section-tag">Fitur</p>
        <h2>Dirancang untuk organisasi kampus</h2>
        <div className="feature-grid">
          {[
            { icon: "🪪", color: "amber", title: "Verifikasi NIM", desc: "Hanya mahasiswa terdaftar yang dapat membuat akun dan memberikan suara." },
            { icon: "📧", color: "blue", title: "OTP Email", desc: "Setiap akun diverifikasi lewat kode OTP yang dikirim ke email kampus." },
            { icon: "📊", color: "green", title: "Hasil Real-time", desc: "Grafik hasil voting diperbarui langsung tanpa perlu refresh halaman." },
            { icon: "⏱️", color: "red", title: "Periode Voting", desc: "Admin mengatur waktu buka dan tutup voting. Otomatis terkunci setelah selesai." },
            { icon: "🔒", color: "amber", title: "Satu Suara", desc: "Sistem mencegah double voting — setiap akun hanya bisa memilih satu kali." },
            { icon: "📱", color: "blue", title: "Mobile Friendly", desc: "Tampilan responsif, nyaman diakses dari HP maupun laptop." },
          ].map((f, i) => (
            <div className={`feature-card feat-${f.color}`} key={i}>
              <div className="feat-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CARA KERJA */}
      <section className="section" id="cara-kerja">
        <p className="section-tag">Cara Kerja</p>
        <h2>Proses voting dalam 4 langkah</h2>
        <div className="steps">
          {[
            { num: "01", title: "Daftar dengan NIM", desc: "Mahasiswa mendaftar menggunakan NIM yang sudah terdaftar di sistem. NIM yang tidak valid akan ditolak otomatis." },
            { num: "02", title: "Verifikasi email", desc: "Kode OTP 6 digit dikirim ke email. Masukkan kode untuk mengaktifkan akun." },
            { num: "03", title: "Pilih kandidat", desc: "Lihat profil, visi, dan misi setiap kandidat. Klik tombol pilih untuk memberikan suara." },
            { num: "04", title: "Lihat hasil", desc: "Setelah periode voting selesai, hasil ditampilkan secara transparan di halaman statistik." },
          ].map((s, i) => (
            <div className="step-row" key={i}>
              <span className="step-num">{s.num}</span>
              <div className="step-content">
                <h4>{s.title}</h4>
                <p>{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <h2>Siap berpartisipasi?</h2>
        <p>Daftar sekarang dan gunakan hak suaramu.</p>
        <div className="cta-btns">
          <Link to="/register" className="btn-primary">Daftar Sekarang</Link>
          <Link to="/login" className="btn-secondary">Masuk</Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <span className="landing-logo-sm">NEOVOTE</span>
        <p>© 2025 · Dibuat oleh Arjuna</p>
      </footer>

    </div>
  );
}
