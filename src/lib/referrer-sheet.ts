import { userDisplayName } from "./format";
import { childrenOf } from "./referrals";
import type { Membership, User } from "./types";

export type MembershipLabel = "Activa" | "No";
export type RenewalLabel = "Sí" | "No" | "Primera";

function countedMemberships(user: User): Membership[] {
  return (user.memberships ?? []).filter(
    (membership) =>
      membership.cancelReason !== "duplicate_same_user" &&
      membership.countsTowardRevenue !== false &&
      membership.status !== "pending",
  );
}

export function hasActiveMembership(user: User): boolean {
  return (user.memberships ?? []).some((membership) => membership.isCurrentlyActive);
}

export function membershipLabel(user: User): MembershipLabel {
  return hasActiveMembership(user) ? "Activa" : "No";
}

export function renewalLabel(user: User): RenewalLabel {
  const paid = countedMemberships(user);
  const active = hasActiveMembership(user);
  if (paid.length >= 2) return active ? "Sí" : "No";
  if (paid.length === 1) return active ? "Primera" : "No";
  return "No";
}

export function referrerContact(user: User): string {
  return user.email ?? user.phone ?? "Sin contacto";
}

export type ReferrerSheetRow = {
  name: string;
  email: string;
  membership: MembershipLabel;
  renewal: RenewalLabel;
};

export type ReferrerSheet = {
  referrer: User;
  rows: ReferrerSheetRow[];
  activeCount: number;
  renewedCount: number;
  notRenewedCount: number;
};

export function buildReferrerSheet(users: User[], referrer: User): ReferrerSheet {
  const kids = childrenOf(users, referrer.id);
  const rows = kids.map((child) => ({
    name: userDisplayName(child),
    email: child.email?.trim() || "—",
    membership: membershipLabel(child),
    renewal: renewalLabel(child),
  }));
  return {
    referrer,
    rows,
    activeCount: rows.filter((row) => row.membership === "Activa").length,
    renewedCount: rows.filter((row) => row.renewal === "Sí").length,
    notRenewedCount: rows.filter((row) => row.renewal === "No").length,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const ROMADE_MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 64" width="220" height="50" fill="none" aria-label="ROMADE">
  <rect width="64" height="64" rx="16" fill="#fcd34d"/>
  <text x="32" y="44" text-anchor="middle" fill="#09090b" font-family="Georgia, Times New Roman, serif" font-size="30" font-weight="700">R</text>
  <text x="80" y="42" fill="#ffffff" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" letter-spacing="3.5">ROMADE</text>
</svg>`;

function sheetSection(sheet: ReferrerSheet): string {
  const rows =
    sheet.rows.length === 0
      ? `<tr><td colspan="4" class="empty">Sin usuarios asignados</td></tr>`
      : sheet.rows
          .map(
            (row) => `<tr>
              <td>${escapeHtml(row.name)}</td>
              <td>${escapeHtml(row.email)}</td>
              <td class="${row.membership === "Activa" ? "yes" : "no"}">${row.membership}</td>
              <td class="${row.renewal === "Sí" ? "yes" : row.renewal === "No" ? "no" : "first"}">${row.renewal}</td>
            </tr>`,
          )
          .join("");

  return `<section class="block">
    <div class="who">
      <p class="kicker">Responsable</p>
      <h2>${escapeHtml(userDisplayName(sheet.referrer))}</h2>
      <p class="meta">${escapeHtml(referrerContact(sheet.referrer))}</p>
    </div>
    <div class="stats">
      <div><b>${sheet.rows.length}</b><span>Usuarios</span></div>
      <div><b>${sheet.activeCount}</b><span>Membresía activa</span></div>
      <div><b>${sheet.renewedCount}</b><span>Renuevan</span></div>
      <div><b>${sheet.notRenewedCount}</b><span>No renuevan</span></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Correo</th>
          <th>Membresía</th>
          <th>Renueva</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function printDocument(title: string, body: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root { color-scheme: light; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      background: #f4f4f5;
      color: #09090b;
      font-family: Arial, Helvetica, sans-serif;
    }
    .bar {
      position: sticky; top: 0; z-index: 2;
      display: flex; justify-content: flex-end; gap: 8px;
      padding: 12px 20px;
      background: #fff; border-bottom: 1px solid #e4e4e7;
    }
    .bar button {
      min-height: 40px; padding: 0 16px; border-radius: 999px; cursor: pointer;
      font: 600 13px Arial, sans-serif;
    }
    .print { background: #09090b; color: #fff; border: 0; }
    .close { background: #fff; color: #3f3f46; border: 1px solid #d4d4d8; }
    .page { max-width: 900px; margin: 24px auto 48px; padding: 0 16px; }
    .hero {
      background: #09090b; color: #fff; border-radius: 20px;
      padding: 28px 32px 24px; margin-bottom: 20px;
    }
    .hero p { margin: 10px 0 0; color: #a1a1aa; font-size: 13px; }
    .block {
      background: #fff; border: 1px solid #e4e4e7; border-radius: 16px;
      padding: 22px; margin-bottom: 18px; page-break-inside: avoid;
    }
    .who h2 { margin: 2px 0 4px; font-size: 22px; }
    .kicker { margin: 0; font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: #a16207; font-weight: 700; }
    .meta { margin: 0; color: #71717a; font-size: 13px; }
    .stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin: 16px 0; }
    .stats div { background: #fafafa; border: 1px solid #f4f4f5; border-radius: 12px; padding: 10px 12px; }
    .stats b { display: block; font-size: 20px; }
    .stats span { font-size: 11px; color: #71717a; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 8px; font-size: 13px; border-bottom: 1px solid #f4f4f5; }
    th { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #71717a; }
    td.empty { color: #71717a; text-align: center; padding: 18px; }
    .yes { color: #047857; font-weight: 700; }
    .no { color: #b45309; font-weight: 700; }
    .first { color: #52525b; font-weight: 700; }
    @media print {
      body { background: #fff; }
      .bar { display: none; }
      .page { margin: 0; max-width: none; padding: 0; }
      .hero { border-radius: 0; }
      .block { break-inside: avoid; border: 0; padding: 12px 0; }
    }
  </style>
</head>
<body>
  <div class="bar">
    <button class="close" onclick="window.close()">Cerrar</button>
    <button class="print" onclick="window.print()">Imprimir o guardar PDF</button>
  </div>
  <div class="page">
    <header class="hero">
      ${ROMADE_MARK}
      <p>Lista de referidos · nombre, correo, membresía y si renuevan</p>
      <p>Membresía: Activa o No. Renueva: Sí (ya renovó y sigue), Primera (primera vez) o No.</p>
    </header>
    ${body}
  </div>
</body>
</html>`;
}

export function openReferrerSheets(sheets: ReferrerSheet[]): boolean {
  if (typeof window === "undefined" || sheets.length === 0) return false;
  const popup = window.open("", "_blank", "noopener,noreferrer,width=980,height=800");
  if (!popup) return false;
  const title =
    sheets.length === 1
      ? `ROMADE · ${userDisplayName(sheets[0].referrer)}`
      : "ROMADE · Referidos";
  popup.document.write(printDocument(title, sheets.map(sheetSection).join("")));
  popup.document.close();
  popup.focus();
  return true;
}
