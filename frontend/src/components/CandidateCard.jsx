import React, { useState } from "react";
import "../styles/CandidateCard.css";

// 🔹 Backend nyimpen `misi` sebagai 1 string panjang (bukan array), jadi harus di-parse
//    jadi list dulu sebelum dirender. Diprioritaskan pisah per BARIS BARU (paling aman,
//    karena isi tiap poin sering ada tanda komanya sendiri, misal
//    "Meningkatkan kualitas akademik, khususnya di bidang riset" — itu tetap 1 poin).
//    Fallback ke koma cuma buat kompatibilitas data lama yang udah kadung disimpen gitu.
function parseMisi(misi) {
  if (Array.isArray(misi))
    return misi.map((s) => String(s).trim()).filter(Boolean);
  if (typeof misi !== "string" || !misi.trim()) return [];

  if (misi.includes("\n")) {
    return misi
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return misi
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export default function CandidateCard({ image, name, visi, misi }) {
  const [flipped, setFlipped] = useState(false);
  const misiList = parseMisi(misi);

  return (
    <div className="card" onClick={() => setFlipped(!flipped)}>
      <div className={`card-inner ${flipped ? "flipped" : ""}`}>
        <div className="card-front">
          <img src={image} alt={name} className="card-front-img" />
          <div className="card-front-info">
            <h3>{name}</h3>
            <span className="card-hint">tap →</span>
          </div>
        </div>
        <div className="card-back">
          {visi && (
            <div className="card-back-section">
              <h4>Visi</h4>
              <p>{visi}</p>
            </div>
          )}
          {misiList.length > 0 && (
            <div className="card-back-section">
              <h4>Misi</h4>
              <ul>
                {misiList.map((item, i) => (
                  <li key={i}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
