"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  clearToken,
  getStoredAdmin,
  getToken,
  setStoredAdmin,
  setToken,
} from "@/lib/auth";

interface AuthContextValue {
  admin: { id: string; username: string; displayName?: string | null } | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [admin, setAdmin] = useState<AuthContextValue["admin"]>(null);
  const [loading, setLoading] = useState(true);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = getToken();
      if (!token) {
        if (!cancelled) {
          setAdmin(null);
          setLoading(false);
          setBootstrapped(true);
        }
        return;
      }

      const stored = getStoredAdmin();
      if (stored && !cancelled) setAdmin(stored);

      try {
        const me = await api.me();
        if (cancelled) return;
        const next = {
          id: me.id,
          username: me.username,
          displayName: stored?.displayName ?? null,
        };
        setAdmin(next);
        setStoredAdmin(next);
      } catch {
        if (cancelled) return;
        clearToken();
        setAdmin(null);
      } finally {
        if (!cancelled) {
          setLoading(false);
          setBootstrapped(true);
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!bootstrapped || loading) return;

    const token = getToken();
    if (!token && pathname !== "/login") {
      router.replace("/login");
      return;
    }
    if (token && pathname === "/login") {
      router.replace("/");
    }
  }, [bootstrapped, loading, pathname, router]);

  const login = useCallback(
    async (username: string, password: string) => {
      const data = await api.login(username, password);
      setToken(data.access_token);
      const next = {
        id: data.admin.id,
        username: data.admin.username,
        displayName: data.admin.displayName,
      };
      setStoredAdmin(next);
      setAdmin(next);
      router.replace("/");
    },
    [router],
  );

  const logout = useCallback(() => {
    clearToken();
    setAdmin(null);
    router.replace("/login");
  }, [router]);

  const value = useMemo(
    () => ({ admin, loading, login, logout }),
    [admin, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
