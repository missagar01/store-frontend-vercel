// src/api.js

// 🔹 Decide BASE API URL based on environment (local vs production)
// src/api.js

const envApi = import.meta.env.VITE_API_URL;
const DEFAULT_API = "https://storebackend.sagartmt.com";

// 🟢 Prefer explicit env override
// 🔵 Otherwise: always fall back to known backend (avoid /api 404s on static hosts)
// 🔒 If the page is served over HTTPS, auto-upgrade an http:// API to https:// to avoid mixed-content blocks in Vercel/S3.
const rawApi = (envApi || DEFAULT_API || "").trim();
const isBrowser = typeof window !== "undefined";
const shouldUpgradeToHttps =
  isBrowser && window.location.protocol === "https:" && rawApi.startsWith("http://");

export const API_URL = (shouldUpgradeToHttps
  ? rawApi.replace(/^http:\/\//i, "https://")
  : rawApi
).replace(/\/+$/, "");


// ================= AUTH HELPERS =================

export function isTokenExpired(token) {
  if (!token) return true;

  try {
    const decoded = decodeToken(token);
    if (!decoded || !decoded.exp) return true;

    const expirationTime = decoded.exp * 1000; // seconds → ms
    const currentTime = Date.now();

    return currentTime >= expirationTime - 5000; // 5s buffer
  } catch (e) {
    return true;
  }
}

export async function loginUser(identifier, password) {
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

  // 🔹 404 / empty response ke case me JSON.parse error na aaye:
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { message: text || "Unknown error" };
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || "Login failed");
  }

  if (data.success && data.token) {
    localStorage.setItem("token", data.token);
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


export function handleAuthError() {
  localStorage.removeItem("token");
  if (window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}
