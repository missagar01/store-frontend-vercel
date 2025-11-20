// src/context/AuthContext.tsx
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
} from "react";
import { Toaster } from "@/components/ui/sonner";
import {
  loginUser,
  logoutUser as apiLogout,
  decodeToken as decodeJwtFromApi,
  isTokenExpired,
  handleAuthError,
} from "@/api";

interface DecodedToken {
  sub?: number;
  email?: string | null;
  username?: string;
  user_name?: string;
  name?: string;
  employee_id?: string;   // 👈 we care about this
  role?: string;
  receiveItemView?: boolean;
  receiveItemAction?: boolean;
  userIndent?: boolean;
  iat?: number;
  exp?: number;
  iss?: string;
  [key: string]: string | number | boolean | null | undefined;
}

interface AuthState {
  loggedIn: boolean;
  login: (identifier: string, password: string) => Promise<boolean>;
  logout: () => Promise<void> | void;
  loading: boolean;
  user: DecodedToken | null;
  role: string | null;
  employee_id: string | null;  // 👈 expose it
}

const AuthContext = createContext<AuthState | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [loggedIn, setLoggedIn] = useState(false);
  const [user, setUser] = useState<DecodedToken | null>(null);
  const [loading, setLoading] = useState(true);
  const tokenCheckIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const decodeJwtSafe = (token: string): DecodedToken | null => {
    try {
      return decodeJwtFromApi(token) as DecodedToken;
    } catch (e) {
      console.error("Failed to decode token", e);
      return null;
    }
  };

  const checkTokenValidity = () => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoggedIn(false);
      setUser(null);
      return false;
    }

    if (isTokenExpired(token)) {
      console.log("Token expired, logging out...");
      handleAuthError();
      setLoggedIn(false);
      setUser(null);
      return false;
    }

    const decoded = decodeJwtSafe(token);
    if (!decoded) {
      localStorage.removeItem("token");
      setLoggedIn(false);
      setUser(null);
      return false;
    }

    setUser(decoded);
    setLoggedIn(true);
    return true;
  };

  useEffect(() => {
    const isValid = checkTokenValidity();
    setLoading(false);

    if (isValid) {
      tokenCheckIntervalRef.current = setInterval(() => {
        checkTokenValidity();
      }, 30000);
    }

    return () => {
      if (tokenCheckIntervalRef.current) {
        clearInterval(tokenCheckIntervalRef.current);
      }
    };
  }, []);

  async function login(identifier: string, password: string) {
    try {
      const data = await loginUser(identifier, password);
      if (data.success && data.token) {
        const decoded = decodeJwtSafe(data.token);
        setUser(decoded);
        setLoggedIn(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error(err);
      return false;
    }
  }

  async function logout() {
    try {
      await apiLogout();
    } catch (e) {
      console.error("logout api failed", e);
    }
    localStorage.removeItem("token");
    setLoggedIn(false);
    setUser(null);
  }

  const normalizedRole = user?.role ? user.role.toString().toLowerCase() : null;
  const employeeId = user?.employee_id ?? null;

  return (
    <AuthContext.Provider
      value={{
        login,
        loggedIn,
        logout,
        user,
        loading,
        role: normalizedRole,
        employee_id: employeeId,   // 👈 now available
      }}
    >
      {children}
      <Toaster expand richColors theme="light" closeButton />
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext)!;
