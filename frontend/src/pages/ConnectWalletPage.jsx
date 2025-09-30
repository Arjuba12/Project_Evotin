import React, { createContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css"; // Pakai CSS login agar konsisten

export default function ConnectWalletPage() {
  const [walletAddress, setWalletAddress] = useState("");
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleConnectWallet = async () => {
    if (!window.ethereum) {
      alert("⚠️ MetaMask belum terpasang!");
      return;
    }

    setLoading(true);
    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });
      setWalletAddress(accounts[0]);
      setConnected(true);
      alert(`✅ Wallet connected: ${accounts[0]}`);
    } catch (err) {
      console.error(err);
      alert("⚠️ Gagal connect wallet!");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectWallet = () => {
    setWalletAddress("");
    setConnected(false);
    alert("🔌 Wallet disconnected");
  };

  const handleProceed = () => {
    if (!connected) {
      alert("⚠️ Harap connect wallet terlebih dahulu!");
      return;
    }
    navigate("/home"); // Redirect ke home atau voting page
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">💎</div>
          <h2>Connect Wallet</h2>
          <p>Sign in with your wallet to vote</p>
        </div>

        <div className="login-form">
          <button
            className="login-btn btn"
            onClick={connected ? handleDisconnectWallet : handleConnectWallet}
            disabled={loading}
          >
            {loading
              ? "Loading..."
              : connected
              ? `Disconnect Wallet`
              : "Connect Wallet"}
          </button>

          {connected && (
            <p
              style={{
                color: "#00ff88",
                marginTop: "16px",
                wordBreak: "break-all",
              }}
            >
              Connected: {walletAddress}
            </p>
          )}

          <button
            className="login-btn btn"
            style={{ marginTop: "24px" }}
            onClick={handleProceed}
          >
            Proceed to Voting
          </button>
        </div>
      </div>

      <div className="background-effects">
        <div className="glow-orb glow-orb-1"></div>
        <div className="glow-orb glow-orb-2"></div>
        <div className="glow-orb glow-orb-3"></div>
      </div>
    </div>
  );
}
