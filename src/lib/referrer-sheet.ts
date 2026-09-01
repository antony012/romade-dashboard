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
};

export type ReferrerSheet = {
  referrer: User;
  rows: ReferrerSheetRow[];
  activeCount: number;
};

export function buildReferrerSheet(users: User[], referrer: User): ReferrerSheet {
  const kids = childrenOf(users, referrer.id);
  const rows = kids.map((child) => ({
    name: userDisplayName(child),
    email: child.email?.trim() || "—",
    membership: membershipLabel(child),
  }));
  return {
    referrer,
    rows,
    activeCount: rows.filter((row) => row.membership === "Activa").length,
  };
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function sheetFileName(sheets: ReferrerSheet[]): string {
  const raw =
    sheets.length === 1
      ? `ROMADE-${userDisplayName(sheets[0].referrer)}`
      : "ROMADE-referidos";
  return `${raw.replace(/[<>:"/\\|?*]+/g, " ").replace(/\s+/g, "-").slice(0, 80)}.html`;
}

async function logoDataUrl(): Promise<string> {
  try {
    const response = await fetch("/logo-blue.png");
    if (!response.ok) return "";
    const blob = await response.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("logo"));
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

function sheetSection(sheet: ReferrerSheet, index: number): string {
  const rows =
    sheet.rows.length === 0
      ? `<tr><td colspan="4" class="empty">Sin usuarios asignados</td></tr>`
      : sheet.rows
          .map(
            (row, rowIndex) => `<tr class="person">
              <td>${escapeHtml(row.name)}</td>
              <td>${escapeHtml(row.email)}</td>
              <td class="${row.membership === "Activa" ? "yes" : "no"}">${row.membership}</td>
              <td class="marks" data-value="">
                <button type="button" data-mark="si" data-row="${index}-${rowIndex}">Sí, renueva</button>
                <button type="button" data-mark="no" data-row="${index}-${rowIndex}">No</button>
              </td>
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
      <div><b class="c-yes">0</b><span>Marcados: renuevan</span></div>
      <div><b class="c-no">0</b><span>Marcados: no</span></div>
      <div><b class="c-pending">${sheet.rows.length}</b><span>Sin marcar</span></div>
    </div>
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Correo</th>
          <th>Membresía</th>
          <th>¿Renueva? (márcalo tú)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
  </section>`;
}

function printDocument(title: string, fileName: string, logo: string, body: string): string {
  const brand = logo
    ? `<img class="logo" src="${logo}" alt="ROMADE" />`
    : `<div class="logo-fallback">R</div>`;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="referrer" content="no-referrer" />
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
      display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px;
      padding: 12px 16px;
      background: #fff; border-bottom: 1px solid #e4e4e7;
    }
    .bar button {
      min-height: 44px; padding: 0 16px; border-radius: 999px; cursor: pointer;
      font: 600 13px Arial, sans-serif;
    }
    .print, .save { background: #09090b; color: #fff; border: 0; }
    .close { background: #fff; color: #3f3f46; border: 1px solid #d4d4d8; }
    .page { max-width: 920px; margin: 24px auto 48px; padding: 0 16px; }
    .hero {
      background: #09090b; color: #fff; border-radius: 20px;
      padding: 22px 24px; margin-bottom: 20px;
      display: flex; align-items: center; gap: 16px;
    }
    .logo, .logo-fallback {
      width: 72px; height: 72px; border-radius: 50%;
      object-fit: cover; flex-shrink: 0;
      border: 2px solid #fcd34d; background: #18181b;
    }
    .logo-fallback {
      display: flex; align-items: center; justify-content: center;
      color: #fcd34d; font: 700 28px Georgia, serif;
    }
    .hero h1 { margin: 0; font-size: 22px; letter-spacing: .12em; }
    .hero p { margin: 6px 0 0; color: #a1a1aa; font-size: 13px; line-height: 1.45; }
    .note {
      background: #fffbeb; border: 1px solid #fde68a; color: #92400e;
      border-radius: 12px; padding: 12px 14px; font-size: 13px; margin-bottom: 16px;
    }
    .block {
      background: #fff; border: 1px solid #e4e4e7; border-radius: 16px;
      padding: 22px; margin-bottom: 18px;
    }
    .who h2 { margin: 2px 0 4px; font-size: 22px; }
    .kicker { margin: 0; font-size: 11px; letter-spacing: .18em; text-transform: uppercase; color: #a16207; font-weight: 700; }
    .meta { margin: 0; color: #71717a; font-size: 13px; }
    .stats { display: grid; grid-template-columns: repeat(5, 1fr); gap: 8px; margin: 16px 0; }
    .stats div { background: #fafafa; border: 1px solid #f4f4f5; border-radius: 12px; padding: 10px 12px; }
    .stats b { display: block; font-size: 20px; }
    .stats span { font-size: 11px; color: #71717a; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 10px 8px; font-size: 13px; border-bottom: 1px solid #f4f4f5; vertical-align: middle; }
    th { font-size: 11px; letter-spacing: .06em; text-transform: uppercase; color: #71717a; }
    td.empty { color: #71717a; text-align: center; padding: 18px; }
    .yes { color: #047857; font-weight: 700; }
    .no { color: #b45309; font-weight: 700; }
    .marks { white-space: nowrap; }
    .marks button {
      min-height: 40px; margin: 2px 4px 2px 0; padding: 0 12px;
      border-radius: 999px; border: 1px solid #d4d4d8; background: #fff;
      cursor: pointer; font: 600 12px Arial, sans-serif; color: #3f3f46;
    }
    .marks button.on[data-mark="si"] { background: #047857; border-color: #047857; color: #fff; }
    .marks button.on[data-mark="no"] { background: #b45309; border-color: #b45309; color: #fff; }
    @media (max-width: 700px) {
      .stats { grid-template-columns: repeat(2, 1fr); }
      table, thead, tbody, th, td, tr { display: block; }
      thead { display: none; }
      tr.person { border-bottom: 1px solid #e4e4e7; padding: 10px 0; }
      td { padding: 4px 0; }
    }
    @media print {
      body { background: #fff; }
      .bar, .note { display: none; }
      .page { margin: 0; max-width: none; padding: 0; }
      .hero { border-radius: 0; }
      .marks button { display: none; }
      .marks[data-value="si"]::after { content: "Sí, renueva"; color: #047857; font-weight: 700; }
      .marks[data-value="no"]::after { content: "No"; color: #b45309; font-weight: 700; }
      .marks[data-value=""]::after { content: "Sin marcar"; color: #71717a; }
    }
  </style>
</head>
<body>
  <div class="bar">
    <button class="close" type="button" onclick="window.close()">Cerrar</button>
    <button class="save" type="button" onclick="saveFicha()">Guardar ficha</button>
    <button class="print" type="button" onclick="window.print()">Imprimir o PDF</button>
  </div>
  <div class="page">
    <header class="hero">
      ${brand}
      <div>
        <h1>ROMADE</h1>
        <p>Ficha de referidos</p>
      </div>
    </header>
    <p class="note">
      Toca <strong>Sí, renueva</strong> o <strong>No</strong> en cada persona. Luego pulsa
      <strong>Guardar ficha</strong> y envía este archivo.
    </p>
    ${body}
  </div>
  <script>
    (function () {
      var fileName = ${JSON.stringify(fileName)};
      function recount() {
        var yes = document.querySelectorAll('[data-mark="si"].on').length;
        var no = document.querySelectorAll('[data-mark="no"].on').length;
        var people = document.querySelectorAll("tr.person").length;
        document.querySelectorAll(".c-yes").forEach(function (el) { el.textContent = String(yes); });
        document.querySelectorAll(".c-no").forEach(function (el) { el.textContent = String(no); });
        document.querySelectorAll(".c-pending").forEach(function (el) { el.textContent = String(people - yes - no); });
      }
      document.addEventListener("click", function (event) {
        var btn = event.target.closest("[data-mark]");
        if (!btn) return;
        var cell = btn.parentElement;
        cell.querySelectorAll("[data-mark]").forEach(function (other) { other.classList.remove("on"); });
        btn.classList.add("on");
        cell.setAttribute("data-value", btn.getAttribute("data-mark") || "");
        recount();
      });
      window.saveFicha = function () {
        var html = "<!DOCTYPE html>\\n" + document.documentElement.outerHTML;
        var blob = new Blob([html], { type: "text/html;charset=utf-8" });
        var a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
      };
      recount();
    })();
  </script>
</body>
</html>`;
}

function downloadHtml(url: string, fileName: string) {
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

export async function openReferrerSheets(
  sheets: ReferrerSheet[],
): Promise<"opened" | "downloaded" | false> {
  if (typeof window === "undefined" || sheets.length === 0) return false;
  const title =
    sheets.length === 1
      ? `ROMADE · ${userDisplayName(sheets[0].referrer)}`
      : "ROMADE · Referidos";
  const fileName = sheetFileName(sheets);
  const logo = await logoDataUrl();
  const html = printDocument(
    title,
    fileName,
    logo,
    sheets.map((sheet, index) => sheetSection(sheet, index)).join(""),
  );
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  downloadHtml(url, fileName);
  const popup = window.open(url, "_blank");
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
  if (popup) {
    popup.focus();
    return "opened";
  }
  return "downloaded";
}
