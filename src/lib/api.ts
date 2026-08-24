import { clearToken, getToken } from "./auth";
import type {
  Admin,
  AuthAdmin,
  CancelMembershipPayload,
  CreateAdminPayload,
  CreateMembershipPayload,
  HomeResponse,
  LoginResponse,
  Membership,
  UpdateAdminPayload,
  UpdateMembershipPayload,
  UpdateUserPayload,
  User,
} from "./types";

const API_URL = "/backend";

export class ApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  auth = true,
): Promise<T> {
  const headers = new Headers(options.headers);
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  if (auth) {
    const token = getToken();
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401 && auth) {
    clearToken();
    if (
      typeof window !== "undefined" &&
      !window.location.pathname.startsWith("/login")
    ) {
      window.location.href = "/login";
    }
    throw new ApiError("No autorizado", 401);
  }

  if (!response.ok) {
    let message = `Error ${response.status}`;
    try {
      const data = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(data.message)) {
        message = data.message.join(", ");
      } else if (typeof data.message === "string") {
        message = data.message;
      }
    } catch {
      /* ignore */
    }
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export const api = {
  login(username: string, password: string) {
    return request<LoginResponse>(
      "/api/v1/admin/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ username, password }),
      },
      false,
    );
  },

  me() {
    return request<AuthAdmin>("/api/v1/admin/me");
  },

  getHome() {
    return request<HomeResponse>("/api/v1/admin/home");
  },

  listUsers() {
    return request<User[]>("/api/v1/admin/users");
  },

  getUser(id: string) {
    return request<User>(`/api/v1/admin/users/${id}`);
  },

  updateUser(id: string, payload: UpdateUserPayload) {
    return request<User>(`/api/v1/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteUser(id: string) {
    return request<{ deleted: true; id: string }>(`/api/v1/admin/users/${id}`, {
      method: "DELETE",
    });
  },

  listMemberships() {
    return request<Membership[]>("/api/v1/admin/memberships");
  },

  getMembership(id: string) {
    return request<Membership>(`/api/v1/admin/memberships/${id}`);
  },

  createMembership(payload: CreateMembershipPayload) {
    return request<Membership>("/api/v1/admin/memberships", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateMembership(id: string, payload: UpdateMembershipPayload) {
    return request<Membership>(`/api/v1/admin/memberships/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  cancelMembership(id: string, payload: CancelMembershipPayload = {}) {
    return request<Membership>(`/api/v1/admin/memberships/${id}/cancel`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  reactivateMembership(
    id: string,
    options?: { days?: number; price?: number },
  ) {
    const params = new URLSearchParams();
    if (options?.days != null) params.set("days", String(options.days));
    if (options?.price != null) params.set("price", String(options.price));
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<Membership>(
      `/api/v1/admin/memberships/${id}/reactivate${query}`,
      { method: "PATCH" },
    );
  },

  verifyPayment(id: string, options?: { days?: number; price?: number }) {
    const params = new URLSearchParams();
    if (options?.days != null) params.set("days", String(options.days));
    if (options?.price != null) params.set("price", String(options.price));
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<Membership>(
      `/api/v1/admin/memberships/${id}/verify-payment${query}`,
      { method: "PATCH" },
    );
  },

  purgeCancelledMemberships() {
    return request<{ deleted: number }>("/api/v1/admin/memberships/cancelled", {
      method: "DELETE",
    });
  },

  resetEarnings() {
    return request<{ cleared: number }>("/api/v1/admin/earnings/reset", {
      method: "POST",
    });
  },

  listAdmins() {
    return request<Admin[]>("/api/v1/admin/admins");
  },

  getAdmin(id: string) {
    return request<Admin>(`/api/v1/admin/admins/${id}`);
  },

  createAdmin(payload: CreateAdminPayload) {
    return request<Admin>("/api/v1/admin/admins", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  updateAdmin(id: string, payload: UpdateAdminPayload) {
    return request<Admin>(`/api/v1/admin/admins/${id}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
  },

  deleteAdmin(id: string) {
    return request<Admin>(`/api/v1/admin/admins/${id}`, {
      method: "DELETE",
    });
  },
};
