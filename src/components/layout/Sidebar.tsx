"use client";

import Image from "next/image";
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
    <aside className="relative flex w-72 shrink-0 flex-col overflow-hidden border-r border-white/10 bg-zinc-950 text-zinc-100">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.18),transparent_42%),radial-gradient(circle_at_100%_80%,rgba(59,130,246,0.12),transparent_40%)]" />

      <div className="relative px-5 py-6">
        <div className="flex items-center gap-3">
          <div className="relative h-14 w-14 overflow-hidden rounded-2xl ring-2 ring-amber-300/40 shadow-lg shadow-amber-500/20">
            <Image
              src="/logo-blue.png"
              alt="Blue"
              fill
              sizes="56px"
              className="object-cover"
              priority
            />
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-amber-200/80">
              RomaDe
            </p>
            <h1 className="text-lg font-semibold tracking-tight text-white">
              Panel Blue
            </h1>
          </div>
        </div>
      </div>

      <nav className="relative flex-1 space-y-1 px-3">
        {links.map((link) => {
          const active =
            link.href === "/"
              ? pathname === "/"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`block rounded-2xl px-3 py-2.5 text-sm transition ${
                active
                  ? "bg-gradient-to-r from-amber-300 to-orange-300 text-zinc-950 shadow-md shadow-amber-500/20"
                  : "text-zinc-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          );
        })}
      </nav>

      <div className="relative px-4 py-5">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur">
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
