"use client";

import { FormEvent, useState } from "react";
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
      <div className="w-full max-w-md rounded-3xl border border-zinc-200/80 bg-white/90 p-8 shadow-xl shadow-zinc-950/5 backdrop-blur">
        <div className="mb-6">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500 text-sm font-bold text-white">
            R
          </div>
          <p className="mt-4 text-xs font-medium uppercase tracking-[0.2em] text-zinc-400">
            RomaDe
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-950">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            Accede al panel de administración
          </p>
        </div>

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
  );
}
