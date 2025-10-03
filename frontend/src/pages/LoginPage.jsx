import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useNavigate } from "react-router-dom";
import "../styles/LoginPage.css";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false); // ✅ state untuk checkbox
  const navigate = useNavigate();

  const [showPassword, setShowPassword] = useState(false); // ✅ state toggle

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
                type={showPassword ? "text" : "password"}
                id="password"
                name="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <label htmlFor="password">Password</label>

              {/* Ikon toggle */}
              <span
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  // 👁 Ikon open eye
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="white"
                    width="20"
                    height="20"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                ) : (
                  // 🚫 Ikon eye-off
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="white"
                    width="20"
                    height="20"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7
                          a10.05 10.05 0 012.042-3.442m3.7-2.82A9.956 9.956 0 0112 5c4.477 0
                          8.268 2.943 9.542 7a9.956 9.956 0 01-4.132 5.411M15 12a3 3 0 11-6
                          0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 3l18 18"
                    />
                  </svg>
                )}
              </span>

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
            <a href="/about" className="forgot-link">
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
