"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/users", label: "Usuarios" },
  { href: "/memberships", label: "Suscripciones" },
  { href: "/admins", label: "Administradores" },
];

export function Sidebar() {
  const pathname = usePathname();
  const { admin, logout } = useAuth();

  return (
    <aside className="flex w-64 shrink-0 flex-col border-r border-white/10 bg-zinc-950 text-zinc-100">
      <div className="px-5 py-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-500 text-sm font-bold text-white shadow-lg shadow-orange-500/30">
          R
        </div>
        <p className="mt-4 text-[11px] font-medium uppercase tracking-[0.2em] text-zinc-500">
          RomaDe
        </p>
        <h1 className="mt-1 text-lg font-semibold tracking-tight text-white">
          Panel admin
        </h1>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-white text-zinc-950 shadow-sm"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-5">
        <div className="rounded-2xl bg-white/5 px-4 py-4">
          <p className="text-[11px] uppercase tracking-wider text-zinc-500">
            Sesión
          </p>
          <p className="mt-1 truncate text-sm font-medium text-zinc-100">
            {admin?.username ?? "Admin"}
          </p>
          <button
            type="button"
            onClick={logout}
            className="mt-3 w-full rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </aside>
  );
}
