// src/api.js
// export const API_URL = "http://3.6.126.4:3004";  
// export const API_URL = import.meta.env.VITE_API_URL || "http://3.6.126.4:3004";
export const API_URL = import.meta.env.VITE_API_URL || "/api";
// export const API_URL = "https://store-backend-render-4.onrender.com"; 
// Check if token is expired
// export const API_URL = "http://16.171.35.43:3004/auth/login";  
export function isTokenExpired(token) {
  if (!token) return true;
  
  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;
    
    // exp is in seconds, Date.now() is in milliseconds
    const expirationTime = decoded.exp * 1000;
    const currentTime = Date.now();
    
    // Add 5 second buffer to account for clock skew
    return currentTime >= expirationTime - 5000;
  } catch (e) {
    return true;
  }
}

export async function loginUser(identifier, password) {
  // If identifier looks like an employee id (S followed by digits), send as employee_id
  const isEmployeeId = /^S\d+$/i.test(identifier.trim());
  
  const res = await fetch(`${API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(
      isEmployeeId 
        ? { employee_id: identifier, password }
        : { user_name: identifier, password }
    ),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error || data.message || "Login failed");
  
  // Store the token in localStorage
  if (data.success && data.token) {
    localStorage.setItem('token', data.token);
  }
  
  return data;
}

export async function logoutUser() {
  const token = localStorage.getItem("token");

  const res = await fetch(`${API_URL}/auth/logout`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  // even if backend says no token, we still clear on client
  return res.json().catch(() => ({}));
}

export function decodeToken(token) {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(atob(base64));
  } catch (e) {
    console.error("Invalid token:", e);
    return null;
  }
}

// Handle 401/403 responses and redirect to login
export function handleAuthError() {
  localStorage.removeItem("token");
  // Redirect to login page
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}
