"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatMoney, userDisplayName } from "@/lib/format";
import type { Membership, User } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import {
  Badge,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui/States";
import { Table } from "@/components/ui/Table";

function parsePositivePrice(value: string): number | null {
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) return null;
  return price;
}

function parsePositiveDays(value: string): number | undefined {
  const days = Number(value);
  if (!Number.isFinite(days) || days <= 0) return undefined;
  return days;
}

export default function MembershipsPage() {
  const { toast } = useToast();
  const [memberships, setMemberships] = useState<Membership[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Membership | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Membership | null>(null);
  const [reactivateTarget, setReactivateTarget] = useState<Membership | null>(
    null,
  );
  const [verifyTarget, setVerifyTarget] = useState<Membership | null>(null);
  const [saving, setSaving] = useState(false);

  const [createForm, setCreateForm] = useState({
    userId: "",
    days: "7",
    price: "80",
  });
  const [editForm, setEditForm] = useState({ days: "", price: "80" });
  const [cancelReason, setCancelReason] = useState("");
  const [reactivateForm, setReactivateForm] = useState({
    days: "7",
    price: "80",
  });
  const [verifyForm, setVerifyForm] = useState({
    days: "7",
    price: "80",
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const [m, u] = await Promise.all([
        api.listMemberships(),
        api.listUsers(),
      ]);
      setMemberships(m);
      setUsers(u);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Error al cargar suscripciones",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function openEdit(m: Membership) {
    setEditTarget(m);
    setEditForm({
      price: String(m.price ?? 80),
      days: "",
    });
  }

  function openReactivate(m: Membership) {
    setReactivateTarget(m);
    setReactivateForm({
      days: "7",
      price: String(m.price ?? 80),
    });
  }

  function openVerify(m: Membership) {
    setVerifyTarget(m);
    setVerifyForm({
      days: "7",
      price: String(m.price ?? 80),
    });
  }

  function isPending(m: Membership) {
    return (
      m.status === "pending" ||
      m.isPendingPayment === true ||
      m.canVerifyPayment === true
    );
  }

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    const price = parsePositivePrice(createForm.price);
    if (price == null) {
      toast("El precio debe ser mayor a 0", "error");
      return;
    }

    setSaving(true);
    try {
      const created = await api.createMembership({
        userId: createForm.userId,
        days: parsePositiveDays(createForm.days),
        price,
      });
      setMemberships((prev) => [created, ...prev]);
      setCreateOpen(false);
      setCreateForm({ userId: "", days: "7", price: "80" });
      toast("Suscripción creada");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Error al crear", "error");
    } finally {
      setSaving(false);
    }
  }

  async function onUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editTarget) return;

    const price = parsePositivePrice(editForm.price);
    if (price == null) {
      toast("El precio debe ser mayor a 0", "error");
      return;
    }

    const days = editForm.days.trim()
      ? parsePositiveDays(editForm.days)
      : undefined;
    if (editForm.days.trim() && days == null) {
      toast("Los días deben ser mayores a 0", "error");
      return;
    }

    setSaving(true);
    try {
      const updated = await api.updateMembership(editTarget.id, {
        price,
        days,
      });
      setMemberships((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      setEditTarget(null);
      toast("Suscripción actualizada");
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Error al actualizar",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onCancel(e: FormEvent) {
    e.preventDefault();
    if (!cancelTarget) return;
    setSaving(true);
    try {
      const updated = await api.cancelMembership(cancelTarget.id, {
        reason: cancelReason || undefined,
      });
      setMemberships((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      setCancelTarget(null);
      setCancelReason("");
      toast("Suscripción cancelada");
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Error al cancelar",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onReactivate(e: FormEvent) {
    e.preventDefault();
    if (!reactivateTarget) return;

    const price = parsePositivePrice(reactivateForm.price);
    if (price == null) {
      toast("El precio debe ser mayor a 0", "error");
      return;
    }

    setSaving(true);
    try {
      const updated = await api.reactivateMembership(reactivateTarget.id, {
        days: parsePositiveDays(reactivateForm.days),
        price,
      });
      setMemberships((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      setReactivateTarget(null);
      setReactivateForm({ days: "7", price: "80" });
      toast("Suscripción reactivada");
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Error al reactivar",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onVerify(e: FormEvent) {
    e.preventDefault();
    if (!verifyTarget) return;

    const price = parsePositivePrice(verifyForm.price);
    if (price == null) {
      toast("El precio debe ser mayor a 0", "error");
      return;
    }

    setSaving(true);
    try {
      const updated = await api.verifyPayment(verifyTarget.id, {
        days: parsePositiveDays(verifyForm.days),
        price,
      });
      setMemberships((prev) =>
        prev.map((m) => (m.id === updated.id ? updated : m)),
      );
      setVerifyTarget(null);
      setVerifyForm({ days: "7", price: "80" });
      toast("Pago verificado. Suscripción activa.");
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Error al verificar el pago",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  function statusBadge(m: Membership) {
    if (m.isCurrentlyActive) return <Badge tone="success">Activa</Badge>;
    if (isPending(m)) return <Badge tone="warning">Pendiente de pago</Badge>;
    if (m.cancelledAt) return <Badge tone="danger">Cancelada</Badge>;
    return <Badge tone="warning">Expirada</Badge>;
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="Suscripciones"
        description="Las cuentas nuevas quedan pendientes hasta verificar el pago"
        actions={
          <Button onClick={() => setCreateOpen(true)}>Nueva suscripción</Button>
        }
      />

      {memberships.length === 0 ? (
        <EmptyState message="No hay suscripciones" />
      ) : (
        <Table
          headers={[
            "Usuario",
            "Estado",
            "Precio",
            "Inicio",
            "Expira",
            "Cancelada",
            "Acciones",
          ]}
        >
          {memberships.map((m) => (
            <tr key={m.id} className="hover:bg-slate-50">
              <td className="px-4 py-3">
                <div className="font-medium text-slate-900">
                  {userDisplayName(m.user)}
                </div>
                <div className="text-xs text-slate-500">
                  {m.user?.email ?? m.userId}
                </div>
              </td>
              <td className="px-4 py-3">{statusBadge(m)}</td>
              <td className="px-4 py-3 text-slate-600">
                {formatMoney(m.price, m.currency)}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {formatDate(m.startsAt)}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {formatDate(m.expiresAt)}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {m.cancelledAt ? (
                  <div>
                    <div>{formatDate(m.cancelledAt)}</div>
                    {m.cancelReason ? (
                      <div className="text-xs text-slate-400">
                        {m.cancelReason}
                      </div>
                    ) : null}
                  </div>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => openEdit(m)}>
                    Editar
                  </Button>
                  {m.isCurrentlyActive ? (
                    <Button
                      variant="danger"
                      onClick={() => setCancelTarget(m)}
                    >
                      Cancelar
                    </Button>
                  ) : isPending(m) ? (
                    <Button onClick={() => openVerify(m)}>
                      Verificar pago
                    </Button>
                  ) : (
                    <Button
                      variant="secondary"
                      onClick={() => openReactivate(m)}
                    >
                      Reactivar
                    </Button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Modal
        open={createOpen}
        title="Nueva suscripción"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={onCreate} disabled={saving || !createForm.userId}>
              {saving ? "Creando..." : "Crear"}
            </Button>
          </>
        }
      >
        <form onSubmit={onCreate} className="space-y-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Usuario</span>
            <select
              className="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-slate-400"
              value={createForm.userId}
              onChange={(e) =>
                setCreateForm({ ...createForm, userId: e.target.value })
              }
              required
            >
              <option value="">Seleccionar usuario</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {userDisplayName(u)} {u.email ? `(${u.email})` : ""}
                </option>
              ))}
            </select>
          </label>
          <Input
            label="Días"
            type="number"
            min={1}
            value={createForm.days}
            onChange={(e) =>
              setCreateForm({ ...createForm, days: e.target.value })
            }
          />
          <Input
            label="Precio (USD)"
            type="number"
            min={0.01}
            step="0.01"
            value={createForm.price}
            onChange={(e) =>
              setCreateForm({ ...createForm, price: e.target.value })
            }
            required
          />
        </form>
      </Modal>

      <Modal
        open={!!editTarget}
        title="Editar suscripción"
        onClose={() => setEditTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={onUpdate} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </>
        }
      >
        <form onSubmit={onUpdate} className="space-y-3">
          <p className="text-sm text-slate-600">
            {userDisplayName(editTarget?.user)}
            {editTarget?.user?.email ? ` (${editTarget.user.email})` : ""}
          </p>
          <Input
            label="Precio (USD)"
            type="number"
            min={0.01}
            step="0.01"
            value={editForm.price}
            onChange={(e) =>
              setEditForm({ ...editForm, price: e.target.value })
            }
            required
          />
          <Input
            label="Días (opcional — extiende desde ahora)"
            type="number"
            min={1}
            value={editForm.days}
            onChange={(e) =>
              setEditForm({ ...editForm, days: e.target.value })
            }
            placeholder="Dejar vacío para no cambiar"
          />
        </form>
      </Modal>

      <Modal
        open={!!cancelTarget}
        title="Cancelar suscripción"
        onClose={() => setCancelTarget(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelTarget(null)}>
              Volver
            </Button>
            <Button variant="danger" onClick={onCancel} disabled={saving}>
              {saving ? "Cancelando..." : "Confirmar"}
            </Button>
          </>
        }
      >
        <form onSubmit={onCancel} className="space-y-3">
          <p className="text-sm text-slate-600">
            Se cancelará la suscripción de{" "}
            <strong>{userDisplayName(cancelTarget?.user)}</strong>.
          </p>
          <Input
            label="Motivo (opcional)"
            value={cancelReason}
            onChange={(e) => setCancelReason(e.target.value)}
          />
        </form>
      </Modal>

      <Modal
        open={!!reactivateTarget}
        title="Reactivar suscripción"
        onClose={() => setReactivateTarget(null)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setReactivateTarget(null)}
            >
              Volver
            </Button>
            <Button onClick={onReactivate} disabled={saving}>
              {saving ? "Reactivando..." : "Reactivar"}
            </Button>
          </>
        }
      >
        <form onSubmit={onReactivate} className="space-y-3">
          <p className="text-sm text-slate-600">
            Reactivar suscripción de{" "}
            <strong>{userDisplayName(reactivateTarget?.user)}</strong>.
          </p>
          <Input
            label="Días"
            type="number"
            min={1}
            value={reactivateForm.days}
            onChange={(e) =>
              setReactivateForm({ ...reactivateForm, days: e.target.value })
            }
          />
          <Input
            label="Precio (USD)"
            type="number"
            min={0.01}
            step="0.01"
            value={reactivateForm.price}
            onChange={(e) =>
              setReactivateForm({ ...reactivateForm, price: e.target.value })
            }
            required
          />
        </form>
      </Modal>

      <Modal
        open={!!verifyTarget}
        title="Verificar pago"
        onClose={() => setVerifyTarget(null)}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setVerifyTarget(null)}
            >
              Volver
            </Button>
            <Button onClick={onVerify} disabled={saving}>
              {saving ? "Habilitando..." : "Verificar y habilitar"}
            </Button>
          </>
        }
      >
        <form onSubmit={onVerify} className="space-y-3">
          <p className="text-sm text-slate-600">
            Confirma el pago y activa la suscripción de{" "}
            <strong>{userDisplayName(verifyTarget?.user)}</strong>. El
            periodo de días empieza ahora.
          </p>
          <Input
            label="Días"
            type="number"
            min={1}
            value={verifyForm.days}
            onChange={(e) =>
              setVerifyForm({ ...verifyForm, days: e.target.value })
            }
          />
          <Input
            label="Precio (USD)"
            type="number"
            min={0.01}
            step="0.01"
            value={verifyForm.price}
            onChange={(e) =>
              setVerifyForm({ ...verifyForm, price: e.target.value })
            }
            required
          />
        </form>
      </Modal>
    </div>
  );
}
