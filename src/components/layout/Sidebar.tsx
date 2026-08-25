"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const links = [
  { href: "/", label: "Inicio" },
  { href: "/users", label: "Usuarios" },
  { href: "/referrals", label: "Referidos" },
  { href: "/memberships", label: "Suscripciones" },
  { href: "/admins", label: "Administradores" },
];

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
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
            onClick={onNavigate}
            className={`block rounded-2xl px-3 py-3 text-sm transition lg:py-2.5 ${
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
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { admin, logout } = useAuth();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const brand = (
    <div className="flex items-center gap-3">
      <div className="relative h-10 w-10 overflow-hidden rounded-2xl ring-2 ring-amber-300/40 shadow-lg shadow-amber-500/20 lg:h-14 lg:w-14">
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
        <h1 className="text-base font-semibold tracking-tight text-white lg:text-lg">
          Panel Blue
        </h1>
      </div>
    </div>
  );

  const session = (
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
          className="mt-3 min-h-11 w-full rounded-xl border border-white/10 px-3 py-2 text-sm text-zinc-300 transition hover:bg-white/10 hover:text-white"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );

  return (
    <>
      <header className="sticky top-0 z-30 flex items-center justify-between gap-3 border-b border-white/10 bg-zinc-950 px-4 py-3 text-white lg:hidden">
        {brand}
        <button
          type="button"
          className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-lg"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((value) => !value)}
        >
          {open ? "✕" : "☰"}
        </button>
      </header>

      {open ? (
        <button
          type="button"
          aria-label="Cerrar menú"
          className="fixed inset-0 z-40 bg-zinc-950/50 lg:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(18rem,88vw)] shrink-0 flex-col overflow-hidden border-r border-white/10 bg-zinc-950 text-zinc-100 transition-transform duration-200 lg:static lg:z-auto lg:w-72 lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_0%,rgba(251,191,36,0.18),transparent_42%),radial-gradient(circle_at_100%_80%,rgba(59,130,246,0.12),transparent_40%)]" />

        <div className="relative hidden px-5 py-6 lg:block">{brand}</div>
        <div className="relative flex items-center justify-between px-4 py-4 lg:hidden">
          {brand}
          <button
            type="button"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl border border-white/15 text-white"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          >
            ✕
          </button>
        </div>

        <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
        {session}
      </aside>
    </>
  );
}
