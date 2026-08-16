"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDate, userDisplayName } from "@/lib/format";
import type { User } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui/States";
import { Table } from "@/components/ui/Table";

function hasActiveMembership(user: User): boolean {
  return (user.memberships ?? []).some((m) => m.isCurrentlyActive);
}

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);
  const [membershipUser, setMembershipUser] = useState<User | null>(null);
  const [jwtUser, setJwtUser] = useState<User | null>(null);
  const [jwtToken, setJwtToken] = useState("");
  const [jwtLoading, setJwtLoading] = useState(false);
  const [membershipDays, setMembershipDays] = useState("7");
  const [membershipPrice, setMembershipPrice] = useState("80");
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    notes: "",
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await api.listUsers());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Error al cargar usuarios");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openEdit(user: User) {
    setEditing(user);
    setForm({
      firstName: user.firstName ?? "",
      lastName: user.lastName ?? "",
      phone: user.phone ?? "",
      email: user.email ?? "",
      notes: user.notes ?? "",
    });
  }

  function openMembership(user: User) {
    setMembershipUser(user);
    setMembershipDays("7");
    setMembershipPrice("80");
  }

  async function openJwt(user: User) {
    setJwtUser(user);
    setJwtToken("");
    setJwtLoading(true);
    try {
      const detail = await api.getUser(user.id);
      setJwtToken(detail.jwtToken ?? "");
    } catch (err) {
      setJwtUser(null);
      toast(
        err instanceof ApiError ? err.message : "Error al cargar el JWT",
        "error",
      );
    } finally {
      setJwtLoading(false);
    }
  }

  async function copyJwt() {
    if (!jwtToken) return;
    try {
      await navigator.clipboard.writeText(jwtToken);
      toast("JWT copiado");
    } catch {
      toast("No se pudo copiar", "error");
    }
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await api.updateUser(editing.id, {
        firstName: form.firstName || undefined,
        lastName: form.lastName || undefined,
        phone: form.phone || undefined,
        email: form.email || undefined,
        notes: form.notes || undefined,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditing(null);
      toast("Usuario actualizado");
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Error al actualizar",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onCreateMembership(e: FormEvent) {
    e.preventDefault();
    if (!membershipUser) return;

    if (hasActiveMembership(membershipUser)) {
      toast("El usuario ya tiene una membresía activa", "error");
      return;
    }

    const days = Number(membershipDays);
    const price = Number(membershipPrice);
    if (!Number.isFinite(price) || price <= 0) {
      toast("El precio debe ser mayor a 0", "error");
      return;
    }

    setSaving(true);
    try {
      await api.createMembership({
        userId: membershipUser.id,
        days: Number.isFinite(days) && days > 0 ? days : undefined,
        price,
      });
      const refreshed = await api.getUser(membershipUser.id);
      setUsers((prev) =>
        prev.map((u) => (u.id === refreshed.id ? refreshed : u)),
      );
      setMembershipUser(null);
      toast("Membresía agregada");
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Error al crear membresía",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="Usuarios"
        description="Listado, edición y membresías"
      />

      {users.length === 0 ? (
        <EmptyState message="No hay usuarios" />
      ) : (
        <Table
          headers={[
            "Nombre",
            "Email",
            "Teléfono",
            "Membresía",
            "Creado",
            "Acciones",
          ]}
        >
          {users.map((user) => {
            const active = hasActiveMembership(user);
            return (
              <tr key={user.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 font-medium text-slate-900">
                  {userDisplayName(user)}
                </td>
                <td className="px-4 py-3 text-slate-600">{user.email ?? "—"}</td>
                <td className="px-4 py-3 text-slate-600">{user.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  {active ? (
                    <Badge tone="success">Activa</Badge>
                  ) : (
                    <Badge tone="neutral">Sin activa</Badge>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="secondary" onClick={() => openEdit(user)}>
                      Editar
                    </Button>
                    <Button variant="secondary" onClick={() => void openJwt(user)}>
                      Ver JWT
                    </Button>
                    {!active ? (
                      <Button onClick={() => openMembership(user)}>
                        Agregar membresía
                      </Button>
                    ) : null}
                  </div>
                </td>
              </tr>
            );
          })}
        </Table>
      )}

      <Modal
        open={!!editing}
        title="Editar usuario"
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={onSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </>
        }
      >
        <form onSubmit={onSave} className="space-y-3">
          <Input
            label="Nombre"
            value={form.firstName}
            onChange={(e) => setForm({ ...form, firstName: e.target.value })}
          />
          <Input
            label="Apellido"
            value={form.lastName}
            onChange={(e) => setForm({ ...form, lastName: e.target.value })}
          />
          <Input
            label="Email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <Input
            label="Teléfono"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
          <Textarea
            label="Notas"
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </form>
      </Modal>

      <Modal
        open={!!membershipUser}
        title="Agregar membresía"
        onClose={() => setMembershipUser(null)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setMembershipUser(null)}
            >
              Cancelar
            </Button>
            <Button onClick={onCreateMembership} disabled={saving}>
              {saving ? "Creando..." : "Crear"}
            </Button>
          </>
        }
      >
        <form onSubmit={onCreateMembership} className="space-y-3">
          <p className="text-sm text-slate-600">
            Membresía para{" "}
            <strong>{userDisplayName(membershipUser)}</strong>
            {membershipUser?.email ? ` (${membershipUser.email})` : ""}.
          </p>
          <Input
            label="Días"
            type="number"
            min={1}
            value={membershipDays}
            onChange={(e) => setMembershipDays(e.target.value)}
            required
          />
          <Input
            label="Precio (USD)"
            type="number"
            min={0.01}
            step="0.01"
            value={membershipPrice}
            onChange={(e) => setMembershipPrice(e.target.value)}
            required
          />
        </form>
      </Modal>

      <Modal
        open={!!jwtUser}
        title="JWT del usuario"
        onClose={() => {
          setJwtUser(null);
          setJwtToken("");
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setJwtUser(null);
                setJwtToken("");
              }}
            >
              Cerrar
            </Button>
            <Button onClick={() => void copyJwt()} disabled={!jwtToken}>
              Copiar
            </Button>
          </>
        }
      >
        <p className="mb-3 text-sm text-slate-600">
          Token de{" "}
          <strong>{userDisplayName(jwtUser)}</strong>
          {jwtUser?.email ? ` (${jwtUser.email})` : ""}. Solo visible para
          admin; no se escribe en logs.
        </p>
        {jwtLoading ? (
          <p className="text-sm text-slate-500">Cargando...</p>
        ) : jwtToken ? (
          <Textarea
            label="jwt_token"
            rows={8}
            readOnly
            value={jwtToken}
            className="font-mono text-xs"
          />
        ) : (
          <p className="text-sm text-slate-500">Este usuario no tiene JWT guardado.</p>
        )}
      </Modal>
    </div>
  );
}
