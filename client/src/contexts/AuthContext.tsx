import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import {
  fetchAuthMe,
  verifyStaffToken,
  logout as apiLogout,
  getWorkbenchLoginUrl,
  type AuthUser,
} from "../lib/api";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  authenticated: boolean;
  logout: () => Promise<void>;
  redirectToLogin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  const redirectToLogin = useCallback(() => {
    window.location.href = getWorkbenchLoginUrl();
  }, []);

  const logout = useCallback(async () => {
    await apiLogout();
    setUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      // Step 1: Check for staff_token in URL (reverse SSO scenario)
      const params = new URLSearchParams(window.location.search);
      const staffToken = params.get("staff_token");

      if (staffToken) {
        try {
          const result = await verifyStaffToken(staffToken);
          if (result.success && result.user) {
            if (!cancelled) setUser(result.user);
          }
        } catch {
          // Token verification failed, fall through to session check
        }
        // Clean up URL parameters
        const url = new URL(window.location.href);
        url.searchParams.delete("staff_token");
        window.history.replaceState({}, "", url.toString());
        if (!cancelled) setLoading(false);
        return;
      }

      // Step 2: Check existing session
      try {
        const me = await fetchAuthMe();
        if (!cancelled) {
          if (me.authenticated && me.user) {
            setUser(me.user);
          }
        }
      } catch {
        // Session check failed
      }
      if (!cancelled) setLoading(false);
    }

    init();
    return () => { cancelled = true; };
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        authenticated: !!user,
        logout,
        redirectToLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
