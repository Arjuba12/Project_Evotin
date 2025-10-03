import React, { useState } from "react";
import "../styles/CandidateCard.css";

export default function CandidateCard({ image, name, visi, misi }) {
  const [flipped, setFlipped] = useState(false);

  // pastikan misi sudah array, kalau masih string JSON parse dulu
  const misiList = Array.isArray(misi) ? misi : JSON.parse(misi || "[]");

  return (
    <div className="card" onClick={() => setFlipped(!flipped)}>
      <div className={`card-inner ${flipped ? "flipped" : ""}`}>
        <div className="card-front">
          <img src={image} alt={name} />
          <h3>{name}</h3>
        </div>

        <div className="card-back">
          <h4>Visi</h4>
          <p>{visi}</p>

          <h4 style={{ marginTop: "15px" }}>Misi</h4>
          <ul>
            {misiList.map((item, index) => (
              <li key={index}>{item}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
