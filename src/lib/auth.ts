const TOKEN_KEY = "admin_access_token";
const ADMIN_KEY = "admin_user";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(ADMIN_KEY);
}

export function getStoredAdmin(): { id: string; username: string; displayName?: string | null } | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(ADMIN_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { id: string; username: string; displayName?: string | null };
  } catch {
    return null;
  }
}

export function setStoredAdmin(admin: {
  id: string;
  username: string;
  displayName?: string | null;
}): void {
  localStorage.setItem(ADMIN_KEY, JSON.stringify(admin));
}
