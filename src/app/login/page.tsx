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
    <div className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-400">
            Admin
          </p>
          <h1 className="mt-1 text-2xl font-semibold text-slate-900">
            Iniciar sesión
          </h1>
          <p className="mt-1 text-sm text-slate-500">
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
