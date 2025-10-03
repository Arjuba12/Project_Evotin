import React from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
// import ConnectWalletPage from "./pages/ConnectWalletPage"; 
import HomePage from "./pages/HomePage";
import StatistikPage from "./pages/StatistikPage";
import ProfilePage from "./pages/ProfilePage";
import ProtectedRoute from "./components/ProtectedRoute";
import Navbar from "./components/Navbar";
import AboutPage from "./pages/AboutPage";


export default function App() {
  return (
    <Router>
      <Routes>
        {/* halaman publik */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/about" element={<AboutPage />} />

        {/* halaman connect wallet
        <Route
          path="/connect-wallet"
          element={
            <ProtectedRoute>
              <ConnectWalletPage />
            </ProtectedRoute>
          }
        /> */}

        {/* halaman yang butuh login */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <HomePage />
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path="/statistik"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <StatistikPage />
              </>
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <>
                <Navbar />
                <ProfilePage />
              </>
            </ProtectedRoute>
          }
        />

        {/* default → redirect ke login */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}
