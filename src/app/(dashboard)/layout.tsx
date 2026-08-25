"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Sidebar } from "@/components/layout/Sidebar";

const STORAGE_KEY = "romade-sidebar-collapsed";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, admin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  function toggleCollapsed() {
    setCollapsed((value) => {
      const next = !value;
      localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Cargando...
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  return (
    <div className="flex min-h-screen flex-col lg:flex-row">
      <Sidebar collapsed={collapsed} onToggleCollapsed={toggleCollapsed} />
      <main
        className={`relative min-w-0 flex-1 overflow-auto transition-[padding] duration-300 ${
          collapsed ? "lg:pl-4" : ""
        }`}
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-amber-100/40 to-transparent" />
        <div
          className={`relative w-full px-4 py-5 sm:px-6 lg:py-8 ${
            collapsed ? "lg:pl-16 lg:pr-10" : "lg:px-10"
          }`}
        >
          {children}
        </div>
      </main>
    </div>
  );
}
