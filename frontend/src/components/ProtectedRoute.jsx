import { Navigate } from "react-router-dom";

function isTokenExpired(token) {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    // exp dalam detik, Date.now() dalam milidetik
    return payload.exp * 1000 < Date.now();
  } catch {
    return true; // kalau gagal parse, anggap expired
  }
}

export default function ProtectedRoute({ children }) {
  const token = localStorage.getItem("token");

  if (!token || isTokenExpired(token)) {
    localStorage.removeItem("token");
    return <Navigate to="/login" replace />;
  }

  return children;
}
