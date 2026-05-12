const API = import.meta.env.VITE_API_URL;

function logout() {
  localStorage.removeItem("token");
  window.location.href = "/login";
}

export async function apiFetch(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  // Token expired atau invalid → auto logout
  if (res.status === 401) {
    logout();
    return null;
  }

  return res;
}
