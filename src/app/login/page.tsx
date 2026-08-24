"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { ApiError } from "@/lib/api";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function LoginPage() {
  const { login, loading, admin } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-slate-500">
        Cargando...
      </div>
    );
  }

  if (admin) {
    return null;
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      toast("Sesión iniciada");
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : "No se pudo iniciar sesión";
      toast(message, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-md overflow-hidden rounded-[2rem] border border-zinc-200/80 bg-white/90 shadow-2xl shadow-amber-900/10 backdrop-blur">
        <div className="relative h-40 overflow-hidden bg-zinc-900">
          <Image
            src="/logo-blue.png"
            alt="Blue"
            fill
            sizes="28rem"
            className="object-cover opacity-90"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950/80 via-zinc-950/20 to-transparent" />
          <div className="absolute bottom-4 left-5">
            <p className="text-xs font-medium uppercase tracking-[0.22em] text-amber-200/90">
              RomaDe
            </p>
            <h1 className="text-2xl font-semibold tracking-tight text-white">
              Panel Blue
            </h1>
          </div>
        </div>

        <div className="p-8">
          <p className="mb-5 text-sm text-zinc-500">
            Accede al panel de administración
          </p>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Usuario"
              name="username"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <Input
              label="Contraseña"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <Button
              type="submit"
              className="w-full"
              disabled={submitting}
              variant="primary"
            >
              {submitting ? "Entrando..." : "Entrar"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
