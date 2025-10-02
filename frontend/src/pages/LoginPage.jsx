import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`❌ ${data.detail}`);
      } else {
        alert(`✅ ${data.message || "Login berhasil"}`);

        // Simpan token (yang dikirim backend, misalnya data.access_token)
        if (data.access_token) {
          localStorage.setItem("token", data.access_token);
        }

        // Redirect ke /home tanpa reload full page
        navigate("/home");
      }
    } catch (err) {
      alert("⚠️ Gagal terhubung ke server!");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">⚡</div>
          <h2>Sign In</h2>
          <p>Access your account</p>
        </div>

        <form
          className="login-form"
          id="loginForm"
          onSubmit={handleSubmit}
          noValidate
        >
          <div className="form-group">
            <div className="input-wrapper">
              <input
                type="email"
                id="email"
                name="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <label htmlFor="email">Email</label>
              <span className="input-line"></span>
            </div>
            <span className="error-message" id="emailError"></span>
          </div>

          <div className="form-group">
            <div className="input-wrapper password-wrapper">
              <input
                type="password"
                id="password"
                name="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label htmlFor="password">Password</label>
              
              <span className="input-line"></span>
            </div>
            <span className="error-message" id="passwordError"></span>
          </div>

          <div className="form-options">
            <div className="remember-wrapper">
              <input type="checkbox" id="remember" name="remember" />
              <label htmlFor="remember" className="checkbox-label">
                <span className="custom-checkbox"></span>
                Keep me signed in
              </label>
            </div>
            <a href="#" className="forgot-password">
              Forgot password?
            </a>
          </div>

          <button type="submit" className="login-btn btn" disabled={loading}>
            {loading ? "Loading..." : "Sign In"}
          </button>
        </form>

        <div className="signup-link">
          <p>
            New here? <Link to="/register">Create an account</Link>
          </p>
        </div>

        <div className="success-message" id="successMessage">
          <div className="success-icon">✓</div>
          <h3>Welcome back!</h3>
          <p>Redirecting to your dashboard...</p>
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
