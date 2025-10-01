import React, { useState, useEffect } from "react";
import "../styles/LoginPage.css";

export default function RegisterPage() {
  const [step, setStep] = useState("register"); // register | otp
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [generatedOtp, setGeneratedOtp] = useState("");

  // Step 1: Register + request OTP
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      alert("❌ Passwords do not match!");
      return;
    }

    // 🔹 Validasi password di frontend
    if (password.length < 8) {
      alert("❌ Password minimal 8 karakter!");
      return;
    }
    if (!/[A-Z]/.test(password)) {
      alert("❌ Password harus ada huruf besar!");
      return;
    }
    if (!/[0-9]/.test(password)) {
      alert("❌ Password harus ada angka!");
      return;
    }
    if (!/[@$!%*?&]/.test(password)) {
      alert("❌ Password harus ada simbol (@$!%*?&)");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`❌ ${data.detail || "Gagal register"}`);
        return;
      }

      // OTP sudah dikirim langsung ke email, frontend tidak perlu tahu OTP
      alert(
        `✅ Registrasi berhasil! OTP telah dikirim ke email Anda (${email}).`
      );
      setStep("otp"); // lanjut ke step OTP
    } catch (err) {
      console.error(err);
      alert("⚠️ Terjadi kesalahan server!");
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e) => {
    e.preventDefault();

    setLoading(true);
    try {
      const response = await fetch("`${import.meta.env.VITE_API_URL}/verify-otp`", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, otp }),
      });

      const data = await response.json();

      if (!response.ok) {
        alert(`❌ ${data.detail || "OTP salah"}`);
      } else {
        alert("✅ OTP benar! Akun terverifikasi.");
        window.location.href = "/"; // balik ke login
      }
    } catch (err) {
      console.error(err);
      alert("⚠️ Gagal terhubung ke server!");
    } finally {
      setLoading(false);
    }
  };

  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setInterval(() => {
        setResendCooldown((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [resendCooldown]);

  // Step 3: Resend OTP
  const handleResendOtp = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/resend-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("✅ OTP baru dikirim ke email" + ` (${email}) OTP: ${data.otp}`);
        setResendCooldown(120);
      } else {
        alert(data.detail || "Gagal mengirim OTP");
      }
    } catch (err) {
      console.error(err);
      alert("⚠️ Terjadi kesalahan saat mengirim OTP");
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="logo-icon">⚡</div>
          <h2>{step === "register" ? "Create Account" : "Verify OTP"}</h2>
          <p>
            {step === "register"
              ? "Register to start voting"
              : "Enter the code we sent to your email"}
          </p>
        </div>

        {/* Step Indicator */}
        <div className="step-indicator">
          <div className={`step ${step === "register" ? "active" : ""}`}>
            1. Register
          </div>
          <div className={`step ${step === "otp" ? "active" : ""}`}>2. OTP</div>
        </div>

        {/* Form Register */}
        {step === "register" && (
          <form className="login-form" onSubmit={handleSubmit} noValidate>
            {/* Name */}
            <div className="form-group">
              <div className="input-wrapper">
                <input
                  type="text"
                  id="name"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
                <label htmlFor="name">Full Name</label>
                <span className="input-line"></span>
              </div>
            </div>

            {/* Email */}
            <div className="form-group">
              <div className="input-wrapper">
                <input
                  type="email"
                  id="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <label htmlFor="email">Email</label>
                <span className="input-line"></span>
              </div>
            </div>

            {/* Password */}
            <div className="form-group">
              <div className="input-wrapper password-wrapper">
                <input
                  type="password"
                  id="password"
                  required
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <label htmlFor="password">Password</label>
                <span className="input-line"></span>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="form-group">
              <div className="input-wrapper password-wrapper">
                <input
                  type="password"
                  id="confirmPassword"
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
                <label htmlFor="confirmPassword">Confirm Password</label>
                <span className="input-line"></span>
              </div>
            </div>

            <button type="submit" className="login-btn btn" disabled={loading}>
              {loading ? "Registering..." : "Sign Up"}
            </button>
          </form>
        )}

        {/* Link ke Login */}
        {step === "register" && (
          <div className="signup-link">
            <p>
              Already have an account? <a href="/">Sign in</a>
            </p>
          </div>
        )}

        {/* Step OTP */}
        {step === "otp" && (
          <form className="login-form" onSubmit={handleVerifyOtp}>
            <div className="form-group">
              <div className="input-wrapper">
                <input
                  type="text"
                  maxLength="6"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                />
                <span className="input-line"></span>
              </div>
            </div>
            <button type="submit" className="login-btn btn">
              Verify OTP
            </button>

            {/* Kirim ulang OTP */}
            <p
              style={{
                cursor: resendCooldown > 0 ? "not-allowed" : "pointer",
                color: resendCooldown > 0 ? "gray" : "blue",
                marginTop: "10px",
              }}
              onClick={() => {
                if (resendCooldown === 0) {
                  if (!email) {
                    alert("Masukkan email dulu");
                    return;
                  }
                  handleResendOtp();
                }
              }}
            >
              {resendCooldown > 0
                ? `Kirim ulang OTP dalam ${resendCooldown} detik`
                : "Kirim ulang OTP"}
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
