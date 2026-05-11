import React, { useState } from "react";
import "../styles/CandidateCard.css";

export default function CandidateCard({ image, name, visi, misi }) {
  const [flipped, setFlipped] = useState(false);
  const misiList = Array.isArray(misi) ? misi : [];

  return (
    <div className="card" onClick={() => setFlipped(!flipped)}>
      <div className={`card-inner ${flipped ? "flipped" : ""}`}>
        <div className="card-front">
          <img src={image} alt={name} />
          <div className="card-front-info">
            <h3>{name}</h3>
            <span className="card-hint">tap →</span>
          </div>
        </div>
        <div className="card-back">
          <div className="card-back-section">
            <h4>Visi</h4>
            <p>{visi}</p>
          </div>
          {misiList.length > 0 && (
            <div className="card-back-section">
              <h4>Misi</h4>
              <ul>
                {misiList.map((item, i) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
