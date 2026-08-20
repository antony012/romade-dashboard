"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatMoney, userDisplayName } from "@/lib/format";
import type { HomeResponse } from "@/lib/types";
import { useToast } from "@/context/ToastContext";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  LoadingState,
  PageHeader,
} from "@/components/ui/States";
import { Table } from "@/components/ui/Table";

export default function HomePage() {
  const { toast } = useToast();
  const [data, setData] = useState<HomeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [resetOpen, setResetOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  function load() {
    setLoading(true);
    setError(null);
    api
      .getHome()
      .then(setData)
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : "Error al cargar el inicio",
        );
      })
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function onResetEarnings() {
    setSaving(true);
    try {
      await api.resetEarnings();
      setResetOpen(false);
      toast("El total ganado quedó en $0.00");
      load();
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "No se pudo borrar el total",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;
  if (!data) return <EmptyState message="Sin datos" />;

  const {
    stats,
    earnings,
    activeSubscriptions,
    recentUsers,
    recentMemberships,
  } = data;
  const currency = earnings?.currency ?? "USD";

  return (
    <div>
      <PageHeader
        title="Inicio"
        description="Resumen de usuarios, suscripciones e ingresos. El total solo suma los montos que marques como cobro."
        actions={
          <Button variant="secondary" onClick={() => setResetOpen(true)}>
            Borrar total ganado
          </Button>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card
          title="Ganado última semana"
          value={formatMoney(earnings?.lastWeek, currency)}
        />
        <Card
          title="Ganado último mes"
          value={formatMoney(earnings?.lastMonth, currency)}
        />
        <Card
          title="Total ganado"
          value={formatMoney(earnings?.total, currency)}
        />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Card title="Usuarios" value={stats.usersTotal} />
        <Card title="Membresías" value={stats.membershipsTotal} />
        <Card title="Activas" value={stats.activeMemberships} />
        <Card title="Canceladas" value={stats.cancelledMemberships} />
        <Card title="Expiradas" value={stats.expiredMemberships} />
      </div>

      <section className="mb-8">
        <h2 className="mb-3 text-base font-semibold text-slate-900">
          Suscripciones activas
        </h2>
        {activeSubscriptions.length === 0 ? (
          <EmptyState message="No hay suscripciones activas" />
        ) : (
          <Table
            headers={[
              "Usuario",
              "Email",
              "Precio",
              "Estado",
              "Inicio",
              "Expira",
            ]}
          >
            {activeSubscriptions.map((m) => (
              <tr key={m.id} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-slate-900">
                  {userDisplayName(m.user)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {m.user?.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatMoney(m.price, m.currency)}
                </td>
                <td className="px-4 py-3">
                  <Badge tone="success">Activa</Badge>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDate(m.startsAt)}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDate(m.expiresAt)}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            Usuarios recientes
          </h2>
          {recentUsers.length === 0 ? (
            <EmptyState message="Sin usuarios recientes" />
          ) : (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {recentUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {userDisplayName(user)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {user.email ?? user.sub ?? "—"}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 text-base font-semibold text-slate-900">
            Membresías recientes
          </h2>
          {recentMemberships.length === 0 ? (
            <EmptyState message="Sin membresías recientes" />
          ) : (
            <div className="space-y-2 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              {recentMemberships.map((m) => (
                <div
                  key={m.id}
                  className="flex items-center justify-between border-b border-slate-100 py-2 last:border-0"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {userDisplayName(m.user)}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatMoney(m.price, m.currency)} · Expira{" "}
                      {formatDate(m.expiresAt)}
                    </p>
                  </div>
                  <Badge
                    tone={
                      m.isCurrentlyActive
                        ? "success"
                        : m.status === "pending" || m.isPendingPayment
                          ? "warning"
                          : m.cancelledAt
                            ? "danger"
                            : "warning"
                    }
                  >
                    {m.isCurrentlyActive
                      ? "Activa"
                      : m.status === "pending" || m.isPendingPayment
                        ? "Pendiente de pago"
                        : m.cancelledAt
                          ? "Cancelada"
                          : "Expirada"}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <Modal
        open={resetOpen}
        title="Borrar total ganado"
        onClose={() => setResetOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setResetOpen(false)}>
              Volver
            </Button>
            <Button variant="danger" onClick={onResetEarnings} disabled={saving}>
              {saving ? "Borrando..." : "Dejar en $0.00"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-zinc-600">
          El total, la semana y el mes quedan en cero. Las membresías no se
          cancelan. Si después editas el monto de un cliente, ese cobro vuelve a
          contar.
        </p>
      </Modal>
    </div>
  );
}
