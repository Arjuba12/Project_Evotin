import { useState } from "react";
import "../styles/HomePage.css"; // ✅ pastikan file CSS ada

export default function VotePage() {
  const [selected, setSelected] = useState(null);

  const candidates = [
    { id: 1, name: "Alice", desc: "Calon dengan visi membangun masa depan." },
    { id: 2, name: "Bob", desc: "Mengutamakan transparansi dan integritas." },
    { id: 3, name: "Charlie", desc: "Berorientasi pada inovasi dan teknologi." },
  ];

  const handleVote = (id) => {
    setSelected(id);
    alert(`You voted for ${candidates.find((c) => c.id === id).name}`);
  };

  return (
    <div className="container">
      <h1 className="page-title">🗳️ Voting Page</h1>

      <div className="card-grid">
        {candidates.map((c) => (
          <div
            key={c.id}
            className={`vote-card ${selected === c.id ? "selected" : ""}`}
          >
            <h2>{c.name}</h2>
            <p>{c.desc}</p>
            <button onClick={() => handleVote(c.id)}>Vote</button>
          </div>
        ))}
      </div>

      {selected && (
        <p className="result">
          ✅ You voted for:{" "}
          <span>{candidates.find((c) => c.id === selected).name}</span>
        </p>
      )}
    </div>
  );
}
