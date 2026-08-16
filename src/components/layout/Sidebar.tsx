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
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-slate-900 text-slate-100">
      <div className="border-b border-slate-700 px-5 py-5">
        <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
          Admin
        </p>
        <h1 className="mt-1 text-lg font-semibold text-white">DoorDash</h1>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-md px-3 py-2 text-sm transition ${
                active
                  ? "bg-slate-700 font-medium text-white"
                  : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-700 px-4 py-4">
        <p className="text-xs text-slate-500">Sesión</p>
        <p className="mt-0.5 truncate text-sm font-medium text-slate-200">
          {admin?.username ?? "Admin"}
        </p>
        <button
          type="button"
          onClick={logout}
          className="mt-3 w-full rounded-md border border-slate-600 px-3 py-1.5 text-sm text-slate-200 transition hover:bg-slate-800"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}
