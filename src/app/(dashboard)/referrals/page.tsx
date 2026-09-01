"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { userDisplayName } from "@/lib/format";
import { childrenOf, descendantIds, isReferrerOnly } from "@/lib/referrals";
import {
  buildReferrerSheet,
  hasActiveMembership,
  membershipLabel,
  openReferrerSheets,
  renewalLabel,
} from "@/lib/referrer-sheet";
import type { User } from "@/lib/types";
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
  const [creatingReferrer, setCreatingReferrer] = useState(false);
  const [newReferrer, setNewReferrer] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
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
      .filter(
        (user) => isReferrerOnly(user) || (user.referralCount ?? 0) > 0,
      )
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
    () =>
      users.filter((user) => !user.referredById && !isReferrerOnly(user)),
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
      if (isReferrerOnly(user)) return false;
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
    if (!assignChild) return;
    setSaving(true);
    try {
      let parentId = assignParentId;
      if (creatingReferrer) {
        if (!newReferrer.firstName.trim()) {
          toast("Escribe el nombre del referente", "error");
          setSaving(false);
          return;
        }
        const created = await api.createReferrer({
          firstName: newReferrer.firstName.trim(),
          lastName: newReferrer.lastName.trim() || undefined,
          phone: newReferrer.phone.trim() || undefined,
          email: newReferrer.email.trim() || undefined,
        });
        parentId = created.id;
      }
      if (!parentId) {
        toast("Elige o crea un referente", "error");
        setSaving(false);
        return;
      }
      await api.updateUser(assignChild.id, { referredById: parentId });
      setUsers(await api.listUsers());
      setOpenId(parentId);
      setAssignChild(null);
      setAssignParentId("");
      toast(
        creatingReferrer
          ? "Referente creado y asignado"
          : "Referente asignado",
      );
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

  function exportSheets(list: User[]) {
    const sheets = list.map((referrer) => buildReferrerSheet(users, referrer));
    const result = openReferrerSheets(sheets);
    if (result === "opened") {
      toast("Ficha lista. Usa Imprimir o guardar PDF");
      return;
    }
    if (result === "downloaded") {
      toast("Se descargó la ficha. Ábrela y guarda como PDF");
      return;
    }
    toast("No se pudo exportar la ficha", "error");
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  const referredCount = users.filter((user) => user.referredById).length;

  return (
    <div>
      <PageHeader
        title="Referidos"
        description="Cada responsable gestiona a los suyos: nombre, correo, membresía y si renuevan. Sin fechas."
        actions={
          referrers.length > 0 ? (
            <Button
              variant="secondary"
              onClick={() => exportSheets(referrers)}
            >
              Exportar todos
            </Button>
          ) : undefined
        }
      />

      <div className="mb-5 grid grid-cols-3 gap-2 sm:gap-3">
        <div className="rounded-2xl border border-zinc-200/80 bg-white/80 px-3 py-3 shadow-sm sm:rounded-3xl sm:px-4">
          <p className="text-xs text-zinc-500 sm:text-sm">Referentes</p>
          <p className="mt-1 text-xl font-semibold text-zinc-950 sm:text-2xl">
            {users.filter(
              (user) =>
                isReferrerOnly(user) || (user.referralCount ?? 0) > 0,
            ).length}
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

      {referrers.length === 0 && !query.trim() ? (
        <EmptyState message="Aún no hay referentes. Crea uno al asignar un referido." />
      ) : referrers.length === 0 ? (
        <EmptyState message="Ningún referente coincide con la búsqueda" />
      ) : (
        <div className="space-y-3">
          {referrers.map((referrer) => {
            const kids = childrenOf(users, referrer.id);
            const activeKids = kids.filter(hasActiveMembership).length;
            const renewedKids = kids.filter(
              (child) => renewalLabel(child) === "Sí",
            ).length;
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
                    {isReferrerOnly(referrer) ? (
                      <Badge tone="warning">Referente</Badge>
                    ) : null}
                    <Badge tone="neutral">
                      {referrer.referralCount} referido
                      {referrer.referralCount === 1 ? "" : "s"}
                    </Badge>
                    <Badge tone={activeKids > 0 ? "success" : "neutral"}>
                      {activeKids} activa{activeKids === 1 ? "" : "s"}
                    </Badge>
                    <Badge tone={renewedKids > 0 ? "success" : "neutral"}>
                      {renewedKids} renov
                      {renewedKids === 1 ? "ó" : "aron"}
                    </Badge>
                  </div>
                  <div className="grid w-full grid-cols-3 gap-2 sm:flex sm:w-auto sm:flex-wrap">
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
                      onClick={() => exportSheets([referrer])}
                    >
                      Exportar
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
                      <div className="overflow-x-auto">
                        <table className="w-full min-w-[32rem] text-left text-sm">
                          <thead>
                            <tr className="border-t border-zinc-100 text-[11px] uppercase tracking-wide text-zinc-400">
                              <th className="px-4 py-2 font-medium">Nombre</th>
                              <th className="px-4 py-2 font-medium">Correo</th>
                              <th className="px-4 py-2 font-medium">
                                Membresía
                              </th>
                              <th className="px-4 py-2 font-medium">Renueva</th>
                              <th className="px-4 py-2 font-medium" />
                            </tr>
                          </thead>
                          <tbody>
                            {kids.map((child) => {
                              const membership = membershipLabel(child);
                              const renewal = renewalLabel(child);
                              return (
                                <tr
                                  key={child.id}
                                  className="border-t border-zinc-50"
                                >
                                  <td className="px-4 py-3 font-medium text-zinc-900">
                                    {userDisplayName(child)}
                                  </td>
                                  <td className="break-all px-4 py-3 text-zinc-500">
                                    {child.email ?? "—"}
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge
                                      tone={
                                        membership === "Activa"
                                          ? "success"
                                          : "neutral"
                                      }
                                    >
                                      {membership}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3">
                                    <Badge
                                      tone={
                                        renewal === "Sí"
                                          ? "success"
                                          : renewal === "No"
                                            ? "warning"
                                            : "neutral"
                                      }
                                    >
                                      {renewal}
                                    </Badge>
                                  </td>
                                  <td className="px-4 py-3 text-right">
                                    <Button
                                      variant="ghost"
                                      onClick={() => void onRemove(child)}
                                      disabled={saving}
                                    >
                                      Quitar
                                    </Button>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
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
                    setCreatingReferrer(false);
                    setNewReferrer({
                      firstName: "",
                      lastName: "",
                      phone: "",
                      email: "",
                    });
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
              disabled={
                saving || (!creatingReferrer && !assignParentId)
              }
            >
              {saving ? "Guardando..." : creatingReferrer ? "Crear y asignar" : "Asignar"}
            </Button>
          </>
        }
      >
        <form onSubmit={onAssignUnassigned} className="space-y-3">
          <p className="text-sm text-slate-600">
            ¿Quién refirió a{" "}
            <strong>{userDisplayName(assignChild)}</strong>?
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium ${
                !creatingReferrer
                  ? "border-zinc-900 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-700"
              }`}
              onClick={() => setCreatingReferrer(false)}
            >
              De la lista
            </button>
            <button
              type="button"
              className={`min-h-11 rounded-xl border px-3 py-2 text-sm font-medium ${
                creatingReferrer
                  ? "border-zinc-900 bg-zinc-950 text-white"
                  : "border-zinc-200 bg-white text-zinc-700"
              }`}
              onClick={() => setCreatingReferrer(true)}
            >
              Crear nuevo
            </button>
          </div>
          {creatingReferrer ? (
            <>
              <Input
                label="Nombre"
                value={newReferrer.firstName}
                onChange={(e) =>
                  setNewReferrer({ ...newReferrer, firstName: e.target.value })
                }
                required
              />
              <Input
                label="Apellido"
                value={newReferrer.lastName}
                onChange={(e) =>
                  setNewReferrer({ ...newReferrer, lastName: e.target.value })
                }
              />
              <Input
                label="Teléfono"
                value={newReferrer.phone}
                onChange={(e) =>
                  setNewReferrer({ ...newReferrer, phone: e.target.value })
                }
              />
              <Input
                label="Email"
                type="email"
                value={newReferrer.email}
                onChange={(e) =>
                  setNewReferrer({ ...newReferrer, email: e.target.value })
                }
              />
            </>
          ) : (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-slate-700">
                Referente
              </span>
              <select
                className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                value={assignParentId}
                onChange={(e) => setAssignParentId(e.target.value)}
                required={!creatingReferrer}
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
                      {user.isReferrerProfile ? " · perfil" : ""}
                    </option>
                  ))}
              </select>
            </label>
          )}
        </form>
      </Modal>
    </div>
  );
}
