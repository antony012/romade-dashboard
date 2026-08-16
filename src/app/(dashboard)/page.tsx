"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDate, formatMoney, userDisplayName } from "@/lib/format";
import type { HomeResponse } from "@/lib/types";
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
  const [data, setData] = useState<HomeResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getHome()
      .then(setData)
      .catch((err) => {
        setError(
          err instanceof ApiError ? err.message : "Error al cargar el inicio",
        );
      })
      .finally(() => setLoading(false));
  }, []);

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
        description="Resumen general de usuarios, suscripciones e ingresos"
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
                        : m.cancelledAt
                          ? "danger"
                          : "warning"
                    }
                  >
                    {m.isCurrentlyActive
                      ? "Activa"
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
    </div>
  );
}
