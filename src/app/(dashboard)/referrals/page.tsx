"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDate, userDisplayName } from "@/lib/format";
import { childrenOf, descendantIds } from "@/lib/referrals";
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

function hasActiveMembership(user: User): boolean {
  return (user.memberships ?? []).some((m: Membership) => m.isCurrentlyActive);
}

export default function ReferralsPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [nestParent, setNestParent] = useState<User | null>(null);
  const [childId, setChildId] = useState("");
  const [childQuery, setChildQuery] = useState("");
  const [assignChild, setAssignChild] = useState<User | null>(null);
  const [assignParentId, setAssignParentId] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setUsers(await api.listUsers());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Error al cargar referidos",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const referrers = useMemo(() => {
    const list = users
      .filter((user) => (user.referralCount ?? 0) > 0)
      .sort((a, b) => (b.referralCount ?? 0) - (a.referralCount ?? 0));
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((user) =>
      [userDisplayName(user), user.email ?? "", user.phone ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(q),
    );
  }, [query, users]);

  const unassigned = useMemo(
    () => users.filter((user) => !user.referredById),
    [users],
  );

  const waiting = useMemo(
    () => unassigned.filter((user) => (user.referralCount ?? 0) === 0),
    [unassigned],
  );

  const childOptions = useMemo(() => {
    if (!nestParent) return [];
    const blocked = descendantIds(users, nestParent.id);
    blocked.add(nestParent.id);
    const query = childQuery.trim().toLowerCase();
    return users.filter((user) => {
      if (blocked.has(user.id)) return false;
      if (user.referredById === nestParent.id) return false;
      if (!query) return true;
      const haystack = [
        userDisplayName(user),
        user.email ?? "",
        user.phone ?? "",
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [childQuery, nestParent, users]);

  async function onNest(e: FormEvent) {
    e.preventDefault();
    if (!nestParent || !childId) return;
    setSaving(true);
    try {
      await api.updateUser(childId, { referredById: nestParent.id });
      setUsers(await api.listUsers());
      setOpenId(nestParent.id);
      setNestParent(null);
      setChildId("");
      toast("Usuario anidado como referido");
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "No se pudo anidar el usuario",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onAssignUnassigned(e: FormEvent) {
    e.preventDefault();
    if (!assignChild || !assignParentId) return;
    setSaving(true);
    try {
      await api.updateUser(assignChild.id, { referredById: assignParentId });
      setUsers(await api.listUsers());
      setOpenId(assignParentId);
      setAssignChild(null);
      setAssignParentId("");
      toast("Referente asignado");
    } catch (err) {
      toast(
        err instanceof ApiError
          ? err.message
          : "No se pudo asignar el referente",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onRemove(user: User) {
    setSaving(true);
    try {
      await api.updateUser(user.id, { referredById: null });
      setUsers(await api.listUsers());
      toast("Se quitó el referente");
    } catch (err) {
      toast(
        err instanceof ApiError
          ? err.message
          : "No se pudo quitar el referente",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const referredCount = users.filter((user) => user.referredById).length;

  return (
    <div>
      <PageHeader
        title="Referidos"
        description="Anida usuarios bajo quien los trajo y controla cuántos trajo cada persona"
      />

      <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-zinc-200/80 bg-white/80 px-3 py-3 shadow-sm sm:rounded-3xl sm:px-4">
          <p className="text-xs text-zinc-500 sm:text-sm">Referentes</p>
          <p className="mt-1 text-xl font-semibold text-zinc-950 sm:text-2xl">
            {users.filter((user) => (user.referralCount ?? 0) > 0).length}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-white/80 px-3 py-3 shadow-sm sm:rounded-3xl sm:px-4">
          <p className="text-xs text-zinc-500 sm:text-sm">Referidos</p>
          <p className="mt-1 text-xl font-semibold text-zinc-950 sm:text-2xl">
            {referredCount}
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-200/80 bg-white/80 px-3 py-3 shadow-sm sm:rounded-3xl sm:px-4">
          <p className="text-xs text-zinc-500 sm:text-sm">Sin referente</p>
          <p className="mt-1 text-xl font-semibold text-zinc-950 sm:text-2xl">
            {unassigned.length}
          </p>
        </div>
      </div>

      <div className="mb-4">
        <Input
          label="Buscar referente"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Nombre, email o teléfono"
        />
      </div>

      {users.filter((user) => (user.referralCount ?? 0) > 0).length === 0 ? (
        <EmptyState message="Aún no hay referidos. En Usuarios, Acciones → Asignar referente." />
      ) : referrers.length === 0 ? (
        <EmptyState message="Ningún referente coincide con la búsqueda" />
      ) : (
        <div className="space-y-3">
          {referrers.map((referrer) => {
            const kids = childrenOf(users, referrer.id);
            const activeKids = kids.filter(hasActiveMembership).length;
            const expanded = openId === referrer.id;
            return (
              <section
                key={referrer.id}
                className="overflow-hidden rounded-3xl border border-zinc-200/80 bg-white/80 shadow-sm shadow-zinc-950/5"
              >
                <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                  <button
                    type="button"
                    className="min-w-0 flex-1 text-left"
                    onClick={() =>
                      setOpenId((value) =>
                        value === referrer.id ? null : referrer.id,
                      )
                    }
                  >
                    <p className="break-words font-medium text-zinc-950">
                      {userDisplayName(referrer)}
                    </p>
                    <p className="break-all text-sm text-zinc-500">
                      {referrer.email ?? referrer.phone ?? "Sin contacto"}
                    </p>
                  </button>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge tone="neutral">
                      {referrer.referralCount} referido
                      {referrer.referralCount === 1 ? "" : "s"}
                    </Badge>
                    <Badge tone={activeKids > 0 ? "success" : "neutral"}>
                      {activeKids} activo{activeKids === 1 ? "" : "s"}
                    </Badge>
                  </div>
                  <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap">
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() =>
                        setOpenId((value) =>
                          value === referrer.id ? null : referrer.id,
                        )
                      }
                    >
                      {expanded ? "Ocultar" : "Ver"}
                    </Button>
                    <Button
                      variant="secondary"
                      className="w-full sm:w-auto"
                      onClick={() => {
                        setNestParent(referrer);
                        setChildId("");
                        setChildQuery("");
                      }}
                    >
                      Anidar
                    </Button>
                  </div>
                </div>
                {expanded ? (
                  <div className="border-t border-zinc-100">
                    {kids.length === 0 ? (
                      <p className="px-4 py-3 text-sm text-zinc-500">
                        Sin referidos directos.
                      </p>
                    ) : (
                      <ul>
                        {kids.map((child) => (
                          <li
                            key={child.id}
                            className="border-t border-zinc-50 px-4 py-3 first:border-t-0"
                          >
                            <div className="min-w-0">
                              <p className="break-words font-medium text-zinc-900">
                                {userDisplayName(child)}
                              </p>
                              <p className="break-all text-sm text-zinc-500">
                                {child.email ?? child.phone ?? "—"}
                              </p>
                              <p className="mt-0.5 text-xs text-zinc-400">
                                {formatDate(child.createdAt)}
                              </p>
                            </div>
                            <div className="mt-3 flex flex-wrap items-center gap-2">
                              {hasActiveMembership(child) ? (
                                <Badge tone="success">Activa</Badge>
                              ) : (
                                <Badge tone="neutral">Sin activa</Badge>
                              )}
                              {(child.referralCount ?? 0) > 0 ? (
                                <Badge tone="neutral">
                                  {child.referralCount} referido
                                  {child.referralCount === 1 ? "" : "s"}
                                </Badge>
                              ) : null}
                              <Button
                                variant="ghost"
                                className="ml-auto"
                                onClick={() => void onRemove(child)}
                                disabled={saving}
                              >
                                Quitar
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      {waiting.length > 0 ? (
        <section className="mt-6">
          <h2 className="mb-3 text-base font-semibold text-zinc-950">
            Sin referente
          </h2>
          <div className="space-y-2">
            {waiting.slice(0, 20).map((user) => (
              <div
                key={user.id}
                className="flex items-center justify-between gap-3 rounded-2xl border border-zinc-200/80 bg-white/80 px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-zinc-900">
                    {userDisplayName(user)}
                  </p>
                  <p className="truncate text-sm text-zinc-500">
                    {user.email ?? user.phone ?? "Sin contacto"}
                  </p>
                </div>
                <Button
                  variant="secondary"
                  className="shrink-0"
                  onClick={() => {
                    setAssignChild(user);
                    setAssignParentId("");
                  }}
                >
                  Asignar
                </Button>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <Modal
        open={!!nestParent}
        title="Anidar usuario"
        onClose={() => setNestParent(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNestParent(null)}>
              Cancelar
            </Button>
            <Button onClick={onNest} disabled={saving || !childId}>
              {saving ? "Guardando..." : "Anidar"}
            </Button>
          </>
        }
      >
        <form onSubmit={onNest} className="space-y-3">
          <p className="text-sm text-slate-600">
            Los usuarios que elijas quedarán como referidos de{" "}
            <strong>{userDisplayName(nestParent)}</strong>.
          </p>
          <Input
            label="Buscar usuario"
            value={childQuery}
            onChange={(e) => setChildQuery(e.target.value)}
            placeholder="Nombre, email o teléfono"
          />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">Usuario</span>
            <select
              className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              required
            >
              <option value="">Seleccionar usuario</option>
              {childOptions.map((user) => (
                <option key={user.id} value={user.id}>
                  {userDisplayName(user)}
                  {user.email ? ` (${user.email})` : ""}
                  {user.referredBy
                    ? ` · ahora: ${userDisplayName(user.referredBy)}`
                    : ""}
                </option>
              ))}
            </select>
          </label>
        </form>
      </Modal>

      <Modal
        open={!!assignChild}
        title="Asignar referente"
        onClose={() => setAssignChild(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setAssignChild(null)}>
              Cancelar
            </Button>
            <Button
              onClick={onAssignUnassigned}
              disabled={saving || !assignParentId}
            >
              {saving ? "Guardando..." : "Asignar"}
            </Button>
          </>
        }
      >
        <form onSubmit={onAssignUnassigned} className="space-y-3">
          <p className="text-sm text-slate-600">
            ¿Quién refirió a{" "}
            <strong>{userDisplayName(assignChild)}</strong>?
          </p>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-slate-700">
              Referente
            </span>
            <select
              className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              value={assignParentId}
              onChange={(e) => setAssignParentId(e.target.value)}
              required
            >
              <option value="">Seleccionar persona</option>
              {users
                .filter((user) => {
                  if (!assignChild) return false;
                  if (user.id === assignChild.id) return false;
                  return !descendantIds(users, assignChild.id).has(user.id);
                })
                .map((user) => (
                  <option key={user.id} value={user.id}>
                    {userDisplayName(user)}
                    {user.email ? ` (${user.email})` : ""}
                  </option>
                ))}
            </select>
          </label>
        </form>
      </Modal>
    </div>
  );
}
