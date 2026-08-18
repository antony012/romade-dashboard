export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatMoney(
  amount: number | null | undefined,
  currency = "USD",
): string {
  const value = Number(amount ?? 0);
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
  return `${formatted} ${currency}`;
}

export function userDisplayName(user?: {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  displayName?: string | null;
  dasherId?: string | null;
  sub?: string | null;
} | null): string {
  if (!user) return "—";
  const name = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (user.displayName) return user.displayName;
  if (user.email) return user.email;
  if (user.dasherId) return `Dasher ${user.dasherId}`;
  if (user.sub) return user.sub.slice(0, 18);
  return "Sin nombre";
}
