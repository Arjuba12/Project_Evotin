import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import HomePage from "./pages/HomePage";
import StatistikPage from "./pages/StatistikPage";
import ProfilePage from "./pages/ProfilePage";
import LandingPage from "./pages/LandingPage";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import AboutPage from "./pages/AboutPage";

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Landing page — halaman utama */}
        <Route path="/" element={<LandingPage />} />

        {/* Halaman publik */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/about" element={<AboutPage />} />

        {/* Halaman yang butuh login */}
        <Route path="/home" element={
          <ProtectedRoute>
            <><Navbar /><HomePage /></>
          </ProtectedRoute>
        } />
        <Route path="/statistik" element={
          <ProtectedRoute>
            <><Navbar /><StatistikPage /></>
          </ProtectedRoute>
        } />
        <Route path="/profile" element={
          <ProtectedRoute>
            <><Navbar /><ProfilePage /></>
          </ProtectedRoute>
        } />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}
