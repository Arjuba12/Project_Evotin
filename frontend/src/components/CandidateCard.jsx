import React, { useState } from "react";
import "../styles/CandidateCard.css";

export default function CandidateCard({ image, name, visiMisi }) {
  const [flipped, setFlipped] = useState(false);

  return (
    <div className="card" onClick={() => setFlipped(!flipped)}>
      <div className={`card-inner ${flipped ? "flipped" : ""}`}>
        <div className="card-front">
          <img src={image} alt={name} />
          <h3>{name}</h3>
        </div>
        <div className="card-back">
          <h4>Visi & Misi</h4>
          <p>{visiMisi}</p>
        </div>
      </div>
    </div>
  );
}
