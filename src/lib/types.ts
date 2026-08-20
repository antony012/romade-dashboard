export interface Admin {
  id: string;
  username: string;
  displayName: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthAdmin {
  id: string;
  username: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  expires_in: string;
  admin: Admin;
}

export interface MembershipUser {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName?: string | null;
  dasherId?: string | null;
  sub: string | null;
}

export type MembershipStatus = "pending" | "active" | "cancelled" | "expired";

export interface Membership {
  id: string;
  userId: string;
  status?: MembershipStatus;
  isActive: boolean;
  isCurrentlyActive: boolean;
  isPendingPayment?: boolean;
  canVerifyPayment?: boolean;
  canCancel?: boolean;
  canReactivate?: boolean;
  countsTowardRevenue?: boolean;
  price: number;
  currency: string;
  startsAt: string | null;
  expiresAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  paymentVerifiedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  user?: MembershipUser;
}

export interface User {
  id: string;
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  displayName?: string | null;
  phone: string | null;
  notes: string | null;
  dasherId?: string | null;
  sub: string | null;
  iss: string | null;
  aud: string | null;
  iat: string | null;
  exp: string | null;
  jti: string | null;
  jwtPayload: Record<string, unknown> | null;
  jwtTokenPreview: string | null;
  jwtToken?: string;
  memberships: Membership[];
  createdAt: string;
  updatedAt: string;
}

export interface HomeStats {
  usersTotal: number;
  membershipsTotal: number;
  activeMemberships: number;
  cancelledMemberships: number;
  expiredMemberships: number;
}

export interface Earnings {
  currency: string;
  lastWeek: number;
  lastMonth: number;
  total: number;
}

export interface HomeResponse {
  stats: HomeStats;
  earnings: Earnings;
  activeSubscriptions: Membership[];
  recentUsers: User[];
  recentMemberships: Membership[];
}

export interface CreateAdminPayload {
  username: string;
  password: string;
  displayName?: string;
}

export interface UpdateAdminPayload {
  displayName?: string;
  password?: string;
  isActive?: boolean;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  notes?: string;
}

export interface CreateMembershipPayload {
  userId: string;
  days?: number;
  price?: number;
}

export interface UpdateMembershipPayload {
  price?: number;
  days?: number;
}

export interface CancelMembershipPayload {
  reason?: string;
}
