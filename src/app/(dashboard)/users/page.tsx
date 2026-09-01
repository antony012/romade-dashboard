"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDate, isNewUser, userDisplayName } from "@/lib/format";
import {
  descendantIds,
  flattenReferralTree,
  isReferrerOnly,
} from "@/lib/referrals";
import type { Membership, User } from "@/lib/types";
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

type UserFilter =
  | "all"
  | "new"
  | "active"
  | "inactive"
  | "notes"
  | "verified"
  | "blacklisted"
  | "referrals"
  | "referrers"
  | "referred";

function userRowTone(user: User, prueba: boolean): string {
  if (user.blacklisted) return "bg-red-50 hover:bg-red-100/80";
  if (isNewUser(user)) {
    return "bg-sky-100 ring-1 ring-inset ring-sky-300 hover:bg-sky-200/70";
  }
  if (prueba) return "bg-amber-100 hover:bg-amber-200/80";
  return "hover:bg-slate-50";
}

function userCardTone(user: User, prueba: boolean): string {
  if (user.blacklisted) return "bg-red-50";
  if (isNewUser(user)) return "bg-sky-100 ring-1 ring-sky-300";
  if (prueba) return "bg-amber-100";
  return "bg-white/80";
}

function activeMemberships(user: User): Membership[] {
  return (user.memberships ?? []).filter((m) => m.isCurrentlyActive);
}

function hasActiveMembership(user: User): boolean {
  return activeMemberships(user).length > 0;
}

function hasPendingMembership(user: User): boolean {
  return (user.memberships ?? []).some(
    (m) =>
      m.status === "pending" ||
      m.isPendingPayment === true ||
      m.canVerifyPayment === true,
  );
}

function isPruebaNote(notes?: string | null): boolean {
  return /\bprueba\b/i.test(notes?.trim() ?? "");
}

function SelectBox({
  checked,
  indeterminate = false,
  onChange,
  label,
}: {
  checked: boolean;
  indeterminate?: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  return (
    <input
      ref={ref}
      type="checkbox"
      aria-label={label}
      checked={checked}
      onChange={(event) => onChange(event.target.checked)}
      className="h-4 w-4 shrink-0 rounded border-zinc-300 accent-zinc-950"
    />
  );
}

function pruebaNotes(current: string, enable: boolean): string {
  if (enable) {
    return isPruebaNote(current)
      ? current
      : current
        ? `${current} · Prueba`
        : "Prueba";
  }
  return current
    .replace(/\bprueba\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[·\s]+|[·\s]+$/g, "")
    .trim();
}

function matchesName(user: User, query: string): boolean {
  if (!query) return true;
  return userDisplayName(user).toLowerCase().includes(query);
}

function SearchIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function CrownIcon({ className = "h-4 w-4" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M3.5 17.5 5 8l4.2 4.2L12 4.5l2.8 7.7L19 8l1.5 9.5H3.5Zm1.2 1.5h14.6v1.8H4.7V19Z" />
    </svg>
  );
}

function UserActionsMenu({
  user,
  active,
  isPrueba,
  isVerified,
  isBlacklisted,
  onEdit,
  onNotes,
  onPrueba,
  onVerify,
  onBlacklist,
  onRefer,
  onJwt,
  onMembership,
  onCancel,
  onDelete,
}: {
  user: User;
  active: boolean;
  isPrueba: boolean;
  isVerified: boolean;
  isBlacklisted: boolean;
  onEdit: (user: User) => void;
  onNotes: (user: User) => void;
  onPrueba: (user: User) => void;
  onVerify: (user: User) => void;
  onBlacklist: (user: User) => void;
  onRefer: (user: User) => void;
  onJwt: (user: User) => void;
  onMembership: (user: User) => void;
  onCancel: (user: User) => void;
  onDelete: (user: User) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDocClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const itemClass =
    "block w-full px-4 py-3 text-left text-sm text-zinc-700 hover:bg-zinc-100 md:px-3 md:py-2";

  return (
    <div ref={rootRef} className="relative inline-block w-full text-left md:w-auto">
      {open ? (
        <button
          type="button"
          aria-label="Cerrar acciones"
          className="fixed inset-0 z-40 bg-slate-900/40 md:hidden"
          onClick={() => setOpen(false)}
        />
      ) : null}
      <Button
        variant="secondary"
        className="w-full md:min-w-[7.5rem] md:w-auto"
        onClick={() => setOpen((value) => !value)}
      >
        Acciones ▾
      </Button>
      {open ? (
        <div className="fixed inset-x-0 bottom-0 z-50 max-h-[70vh] overflow-y-auto rounded-t-3xl border border-zinc-200 bg-white py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] shadow-xl shadow-zinc-950/10 md:absolute md:inset-auto md:right-0 md:mt-1 md:max-h-none md:w-56 md:rounded-2xl md:py-1">
          <p className="px-4 pb-1 pt-2 text-xs font-medium uppercase tracking-wider text-zinc-400 md:hidden">
            Acciones
          </p>
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              setOpen(false);
              onEdit(user);
            }}
          >
            Editar
          </button>
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              setOpen(false);
              onNotes(user);
            }}
          >
            Observaciones
          </button>
          <button
            type="button"
            className={`${itemClass} ${
              isVerified
                ? "bg-amber-50 font-medium text-amber-800 hover:bg-amber-100"
                : "text-amber-700 hover:bg-amber-50"
            }`}
            onClick={() => {
              setOpen(false);
              void onVerify(user);
            }}
          >
            <span className="inline-flex items-center gap-2">
              <CrownIcon className="h-3.5 w-3.5 text-amber-500" />
              {isVerified ? "Quitar corona" : "Verificar (corona)"}
            </span>
          </button>
          <button
            type="button"
            className={`${itemClass} ${
              isPrueba
                ? "bg-amber-50 font-medium text-amber-800 hover:bg-amber-100"
                : "text-amber-700 hover:bg-amber-50"
            }`}
            onClick={() => {
              setOpen(false);
              void onPrueba(user);
            }}
          >
            {isPrueba ? "Quitar Prueba" : "Marcar Prueba"}
          </button>
          <button
            type="button"
            className={`${itemClass} ${
              isBlacklisted
                ? "bg-red-50 font-medium text-red-800 hover:bg-red-100"
                : "text-red-700 hover:bg-red-50"
            }`}
            onClick={() => {
              setOpen(false);
              onBlacklist(user);
            }}
          >
            {isBlacklisted ? "Quitar de lista negra" : "Lista negra"}
          </button>
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              setOpen(false);
              onRefer(user);
            }}
          >
            Asignar referente
          </button>
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              setOpen(false);
              void onJwt(user);
            }}
          >
            Ver JWT
          </button>
          {!active && !isBlacklisted ? (
            <>
              <button
                type="button"
                className={itemClass}
                onClick={() => {
                  setOpen(false);
                  onMembership(user);
                }}
              >
                Agregar membresía
              </button>
              <button
                type="button"
                className={`${itemClass} text-red-600 hover:bg-red-50`}
                onClick={() => {
                  setOpen(false);
                  onDelete(user);
                }}
              >
                Eliminar
              </button>
            </>
          ) : active ? (
            <button
              type="button"
              className={`${itemClass} text-red-600 hover:bg-red-50`}
              onClick={() => {
                setOpen(false);
                onCancel(user);
              }}
            >
              Cancelar acceso
            </button>
          ) : (
            <button
              type="button"
              className={`${itemClass} text-red-600 hover:bg-red-50`}
              onClick={() => {
                setOpen(false);
                onDelete(user);
              }}
            >
              Eliminar
            </button>
          )}
        </div>
      ) : null}
    </div>
  );
}

export default function UsersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<UserFilter>("all");
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<User | null>(null);
  const [notesUser, setNotesUser] = useState<User | null>(null);
  const [notesDraft, setNotesDraft] = useState("");
  const [membershipUser, setMembershipUser] = useState<User | null>(null);
  const [cancelUser, setCancelUser] = useState<User | null>(null);
  const [deleteUser, setDeleteUser] = useState<User | null>(null);
  const [blacklistUser, setBlacklistUser] = useState<User | null>(null);
  const [referUser, setReferUser] = useState<User | null>(null);
  const [referrerId, setReferrerId] = useState("");
  const [referrerQuery, setReferrerQuery] = useState("");
  const [creatingReferrer, setCreatingReferrer] = useState(false);
  const [newReferrer, setNewReferrer] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
  });
  const [jwtUser, setJwtUser] = useState<User | null>(null);
  const [jwtToken, setJwtToken] = useState("");
  const [jwtLoading, setJwtLoading] = useState(false);
  const [membershipDays, setMembershipDays] = useState("7");
  const [membershipPrice, setMembershipPrice] = useState("80");
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulk, setBulk] = useState<
    null | "membership" | "referrer" | "blacklist" | "unblacklist" | "cancel" | "delete"
  >(null);
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
      setError(
        err instanceof ApiError ? err.message : "Error al cargar usuarios",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const modalOpen = Boolean(
    editing ||
      notesUser ||
      membershipUser ||
      cancelUser ||
      deleteUser ||
      blacklistUser ||
      referUser ||
      jwtUser ||
      bulk,
  );

  useEffect(() => {
    const timer = window.setInterval(() => {
      if (modalOpen) return;
      api
        .listUsers()
        .then(setUsers)
        .catch(() => undefined);
    }, 20_000);
    return () => window.clearInterval(timer);
  }, [modalOpen]);

  const appUsers = useMemo(
    () => users.filter((user) => !isReferrerOnly(user)),
    [users],
  );
  const newUserCount = useMemo(
    () => appUsers.filter(isNewUser).length,
    [appUsers],
  );

  const visibleUsers = useMemo(() => {
    const q = query.trim().toLowerCase();
    return appUsers.filter((user) => {
      if (!matchesName(user, q)) return false;
      const active = hasActiveMembership(user);
      if (filter === "new") return isNewUser(user);
      if (filter === "active") return active;
      if (filter === "inactive") return !active;
      if (filter === "notes") return Boolean(user.notes?.trim());
      if (filter === "verified") return user.verified === true;
      if (filter === "blacklisted") return user.blacklisted === true;
      if (filter === "referrals") return true;
      if (filter === "referrers") return (user.referralCount ?? 0) > 0;
      if (filter === "referred") return Boolean(user.referredById);
      return true;
    });
  }, [appUsers, filter, query]);

  const tableRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (filter === "referrals") {
      const tree = flattenReferralTree(appUsers);
      if (!q) return tree;
      const keep = new Set<string>();
      const byId = new Map(appUsers.map((user) => [user.id, user]));
      for (const row of tree) {
        if (!matchesName(row.user, q)) continue;
        keep.add(row.user.id);
        let parentId = row.user.referredById ?? null;
        while (parentId) {
          keep.add(parentId);
          parentId = byId.get(parentId)?.referredById ?? null;
        }
      }
      return tree.filter((row) => keep.has(row.user.id));
    }
    return visibleUsers
      .slice()
      .sort((a, b) => {
        const newA = isNewUser(a) ? 1 : 0;
        const newB = isNewUser(b) ? 1 : 0;
        if (newA !== newB) return newB - newA;
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      })
      .map((user) => ({ user, depth: 0 }));
  }, [filter, appUsers, query, visibleUsers]);

  const visibleIds = useMemo(
    () => tableRows.map((row) => row.user.id),
    [tableRows],
  );
  const selectedUsers = useMemo(
    () => users.filter((user) => selected.has(user.id)),
    [selected, users],
  );
  const allVisibleSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selected.has(id));
  const someVisibleSelected = visibleIds.some((id) => selected.has(id));

  function toggleSelected(id: string, checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  function toggleAllVisible(checked: boolean) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) {
        for (const id of visibleIds) next.add(id);
      } else {
        for (const id of visibleIds) next.delete(id);
      }
      return next;
    });
  }

  const referrerOptions = useMemo(() => {
    const anchor = referUser;
    const blocked = new Set<string>();
    if (anchor) {
      for (const id of descendantIds(users, anchor.id)) blocked.add(id);
      blocked.add(anchor.id);
    } else if (bulk === "referrer") {
      for (const user of selectedUsers) {
        blocked.add(user.id);
        for (const id of descendantIds(users, user.id)) blocked.add(id);
      }
    } else {
      return [];
    }
    const query = referrerQuery.trim().toLowerCase();
    return users.filter((user) => {
      if (blocked.has(user.id)) return false;
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
  }, [bulk, referUser, referrerQuery, selectedUsers, users]);

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

  function openNotes(user: User) {
    setNotesUser(user);
    setNotesDraft(user.notes ?? "");
  }

  function openRefer(user: User) {
    setReferUser(user);
    setReferrerId(user.referredById ?? "");
    setReferrerQuery("");
    setCreatingReferrer(false);
    setNewReferrer({ firstName: "", lastName: "", phone: "", email: "" });
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
        notes: form.notes,
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

  async function onSaveNotes(e: FormEvent) {
    e.preventDefault();
    if (!notesUser) return;
    setSaving(true);
    try {
      const updated = await api.updateUser(notesUser.id, {
        notes: notesDraft,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setNotesUser(null);
      toast("Observaciones guardadas");
    } catch (err) {
      toast(
        err instanceof ApiError
          ? err.message
          : "No se pudieron guardar las observaciones",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onAssignReferrer(e: FormEvent) {
    e.preventDefault();
    const targets = bulk === "referrer" ? selectedUsers : referUser ? [referUser] : [];
    if (!targets.length) return;
    setSaving(true);
    try {
      let nextReferrerId = referrerId || null;
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
        nextReferrerId = created.id;
      }
      let ok = 0;
      for (const target of targets) {
        if (nextReferrerId && target.id === nextReferrerId) continue;
        await api.updateUser(target.id, { referredById: nextReferrerId });
        ok += 1;
      }
      setUsers(await api.listUsers());
      setReferUser(null);
      setBulk(null);
      setSelected(new Set());
      toast(
        nextReferrerId
          ? creatingReferrer
            ? `Referente creado y asignado a ${ok}`
            : `Referente asignado a ${ok}`
          : `Se quitó el referente de ${ok}`,
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

  async function onTogglePrueba(user: User) {
    const current = user.notes?.trim() ?? "";
    const nextNotes = pruebaNotes(current, !isPruebaNote(current));

    setSaving(true);
    try {
      const updated = await api.updateUser(user.id, { notes: nextNotes });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast(
        isPruebaNote(nextNotes)
          ? "Marcado como Prueba"
          : "Se quitó la marca Prueba",
      );
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "No se pudo actualizar Prueba",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onToggleVerified(user: User) {
    const next = !(user.verified === true);
    setSaving(true);
    try {
      const updated = await api.updateUser(user.id, { verified: next });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      toast(next ? "Usuario verificado con corona" : "Corona quitada");
    } catch (err) {
      toast(
        err instanceof ApiError
          ? err.message
          : "No se pudo actualizar la verificación",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onToggleBlacklist() {
    if (!blacklistUser) return;
    const next = !(blacklistUser.blacklisted === true);
    setSaving(true);
    try {
      const updated = await api.updateUser(blacklistUser.id, {
        blacklisted: next,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setBlacklistUser(null);
      toast(
        next
          ? "Usuario en lista negra. Quedó inactivo y no podrá entrar."
          : "Usuario quitado de la lista negra",
      );
    } catch (err) {
      toast(
        err instanceof ApiError
          ? err.message
          : "No se pudo actualizar la lista negra",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onCreateMembership(e: FormEvent) {
    e.preventDefault();
    const targets =
      bulk === "membership"
        ? selectedUsers
        : membershipUser
          ? [membershipUser]
          : [];
    if (!targets.length) return;

    const eligible = targets.filter(
      (user) => !hasActiveMembership(user) && !user.blacklisted,
    );
    if (!eligible.length) {
      toast("Ninguno de los seleccionados puede recibir membresía", "error");
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
      let ok = 0;
      let fail = 0;
      for (const user of eligible) {
        try {
          await api.createMembership({
            userId: user.id,
            days: Number.isFinite(days) && days > 0 ? days : undefined,
            price,
          });
          ok += 1;
        } catch {
          fail += 1;
        }
      }
      setUsers(await api.listUsers());
      setMembershipUser(null);
      setBulk(null);
      setSelected(new Set());
      const skipped = targets.length - eligible.length;
      toast(
        fail
          ? `${ok} membresías, ${fail} fallaron${skipped ? `, ${skipped} omitidos` : ""}`
          : skipped
            ? `${ok} membresías. ${skipped} se omitieron`
            : ok === 1
              ? "Membresía agregada"
              : `${ok} membresías agregadas`,
      );
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Error al crear membresía",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onCancelAccess() {
    if (!cancelUser) return;

    const memberships = activeMemberships(cancelUser);
    if (!memberships.length) {
      setCancelUser(null);
      return;
    }

    setSaving(true);
    try {
      await Promise.all(
        memberships.map((membership) =>
          api.cancelMembership(membership.id, {
            reason: "cancelled_for_non_payment",
          }),
        ),
      );
      const refreshed = await api.getUser(cancelUser.id);
      setUsers((prev) =>
        prev.map((user) => (user.id === refreshed.id ? refreshed : user)),
      );
      setCancelUser(null);
      toast("Acceso cancelado");
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "No se pudo cancelar el acceso",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onDeleteUser() {
    if (!deleteUser) return;
    if (hasActiveMembership(deleteUser)) {
      toast("Cancela el acceso antes de eliminar al usuario", "error");
      return;
    }

    setSaving(true);
    try {
      await api.deleteUser(deleteUser.id);
      setUsers((prev) => prev.filter((user) => user.id !== deleteUser.id));
      setDeleteUser(null);
      toast("Usuario eliminado");
    } catch (err) {
      toast(
        err instanceof ApiError
          ? err.message
          : "No se pudo eliminar el usuario",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function runBulk(
    work: (user: User) => Promise<unknown>,
    done: string,
  ) {
    if (!selectedUsers.length) return;
    setSaving(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const user of selectedUsers) {
        try {
          await work(user);
          ok += 1;
        } catch {
          fail += 1;
        }
      }
      setUsers(await api.listUsers());
      setSelected(new Set());
      setBulk(null);
      toast(fail ? `${ok} listos, ${fail} no se pudieron` : done);
    } finally {
      setSaving(false);
    }
  }

  async function onBulkBlacklist(next: boolean) {
    await runBulk(
      (user) => api.updateUser(user.id, { blacklisted: next }),
      next ? "Usuarios en lista negra" : "Quitados de lista negra",
    );
  }

  async function onBulkCancel() {
    await runBulk(async (user) => {
      const memberships = activeMemberships(user);
      await Promise.all(
        memberships.map((membership) =>
          api.cancelMembership(membership.id, {
            reason: "cancelled_for_non_payment",
          }),
        ),
      );
    }, "Acceso cancelado");
  }

  async function onBulkDelete() {
    const removable = selectedUsers.filter((user) => !hasActiveMembership(user));
    if (!removable.length) {
      toast("Cancela el acceso antes de eliminar", "error");
      return;
    }
    setSaving(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const user of removable) {
        try {
          await api.deleteUser(user.id);
          ok += 1;
        } catch {
          fail += 1;
        }
      }
      setUsers(await api.listUsers());
      setSelected(new Set());
      setBulk(null);
      const skipped = selectedUsers.length - removable.length;
      toast(
        fail
          ? `${ok} eliminados, ${fail} no`
          : skipped
            ? `${ok} eliminados. ${skipped} tenían membresía activa`
            : `${ok} eliminados`,
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
        description="Observaciones, referidos, lista negra y membresías en un solo lugar"
      />

      <div className="mb-5 flex flex-col gap-3 rounded-3xl border border-zinc-200/80 bg-white/70 p-4 shadow-sm shadow-zinc-950/5 backdrop-blur sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="flex w-full flex-col gap-3 sm:max-w-xl sm:flex-row">
          <label className="block w-full space-y-1.5 sm:max-w-xs">
            <span className="text-sm font-medium text-slate-700">Buscar</span>
            <span className="relative block">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Nombre"
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none placeholder:text-zinc-400 focus:ring-2 focus:ring-amber-400"
              />
            </span>
          </label>
          <label className="block w-full space-y-1.5 sm:max-w-xs">
            <span className="text-sm font-medium text-slate-700">Filtrar</span>
            <select
              className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400"
              value={filter}
              onChange={(e) => setFilter(e.target.value as UserFilter)}
            >
              <option value="all">Todos</option>
              <option value="new">Nuevos usuarios</option>
              <option value="active">Con membresía activa</option>
              <option value="inactive">Sin membresía activa</option>
              <option value="notes">Con observaciones</option>
              <option value="verified">Verificados (corona)</option>
              <option value="blacklisted">Lista negra</option>
              <option value="referrals">Árbol de referidos</option>
              <option value="referrers">Referentes</option>
              <option value="referred">Referidos</option>
            </select>
          </label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {newUserCount > 0 ? (
            <div className="rounded-full bg-sky-100 px-3 py-1.5 text-sm font-medium text-sky-900 ring-1 ring-sky-300">
              {newUserCount} nuevo{newUserCount === 1 ? "" : "s"}
            </div>
          ) : null}
          <div className="rounded-full bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 ring-1 ring-amber-200">
            {visibleUsers.length} de {appUsers.length} usuarios
          </div>
          <div className="rounded-full bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700 ring-1 ring-zinc-200">
            {appUsers.filter((user) => (user.referralCount ?? 0) > 0).length}{" "}
            referentes · {appUsers.filter((user) => user.referredById).length}{" "}
            referidos
          </div>
        </div>
      </div>

      {selected.size > 0 ? (
        <div className="sticky bottom-3 z-20 mb-4 rounded-3xl border border-zinc-900 bg-zinc-950 px-4 py-3 text-white shadow-lg shadow-zinc-950/20">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <p className="text-sm font-medium">
              {selected.size} seleccionado{selected.size === 1 ? "" : "s"}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() =>
                  void runBulk(
                    (user) => api.updateUser(user.id, { verified: true }),
                    "Corona puesta",
                  )
                }
              >
                Corona
              </Button>
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() =>
                  void runBulk(
                    (user) =>
                      api.updateUser(user.id, {
                        notes: pruebaNotes(user.notes?.trim() ?? "", true),
                      }),
                    "Marcados como Prueba",
                  )
                }
              >
                Prueba
              </Button>
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  setMembershipDays("7");
                  setMembershipPrice("80");
                  setBulk("membership");
                }}
              >
                Membresía
              </Button>
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => {
                  setReferrerId("");
                  setReferrerQuery("");
                  setCreatingReferrer(false);
                  setNewReferrer({
                    firstName: "",
                    lastName: "",
                    phone: "",
                    email: "",
                  });
                  setBulk("referrer");
                }}
              >
                Referente
              </Button>
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => setBulk("blacklist")}
              >
                Lista negra
              </Button>
              <Button
                variant="secondary"
                disabled={saving}
                onClick={() => setBulk("cancel")}
              >
                Cancelar acceso
              </Button>
              <Button
                variant="danger"
                disabled={saving}
                onClick={() => setBulk("delete")}
              >
                Eliminar
              </Button>
              <Button
                variant="ghost"
                className="text-zinc-200 hover:bg-white/10"
                onClick={() => setSelected(new Set())}
              >
                Quitar selección
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {tableRows.length === 0 ? (
        <EmptyState
          message={
            query.trim()
              ? "Ningún usuario coincide con ese nombre"
              : "No hay usuarios en este filtro"
          }
        />
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            <label className="flex items-center gap-2 px-1 text-sm text-zinc-600">
              <SelectBox
                checked={allVisibleSelected}
                indeterminate={someVisibleSelected && !allVisibleSelected}
                onChange={toggleAllVisible}
                label="Seleccionar todos"
              />
              Seleccionar todos
            </label>
            {tableRows.map(({ user, depth }) => {
              const active = hasActiveMembership(user);
              const pending = hasPendingMembership(user);
              const prueba = isPruebaNote(user.notes);
              const verified = user.verified === true;
              const blacklisted = user.blacklisted === true;
              const isNew = isNewUser(user);
              const referrer =
                user.referredBy ??
                users.find((item) => item.id === user.referredById) ??
                null;
              return (
                <article
                  key={user.id}
                  className={`rounded-3xl border border-zinc-200/80 p-4 shadow-sm ${userCardTone(user, prueba)}`}
                  style={{ marginLeft: `${Math.min(depth, 3) * 0.75}rem` }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <label className="flex min-w-0 flex-1 items-start gap-3">
                      <SelectBox
                        checked={selected.has(user.id)}
                        onChange={(checked) => toggleSelected(user.id, checked)}
                        label={`Seleccionar ${userDisplayName(user)}`}
                      />
                      <div className="min-w-0">
                      <p className="flex flex-wrap items-center gap-2 font-medium text-slate-900">
                        {depth > 0 ? (
                          <span className="text-slate-300" aria-hidden>
                            └
                          </span>
                        ) : null}
                        {verified ? (
                          <CrownIcon className="h-4 w-4 text-amber-500" />
                        ) : null}
                        <span className="break-words">
                          {userDisplayName(user)}
                        </span>
                        {isNew ? (
                          <Badge tone="info">Nuevo usuario</Badge>
                        ) : null}
                      </p>
                      <p className="mt-1 break-all text-sm text-slate-500">
                        {user.email ?? user.phone ?? "Sin contacto"}
                      </p>
                      </div>
                    </label>
                    </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {active ? (
                      <Badge tone="success">Activa</Badge>
                    ) : pending ? (
                      <Badge tone="warning">Pendiente de pago</Badge>
                    ) : (
                      <Badge tone="neutral">Sin activa</Badge>
                    )}
                    {prueba ? <Badge tone="warning">Prueba</Badge> : null}
                    {blacklisted ? (
                      <Badge tone="danger">Lista negra</Badge>
                    ) : null}
                    {user.isReferrerProfile ? (
                      <Badge tone="warning">Referente</Badge>
                    ) : null}
                    {(user.referralCount ?? 0) > 0 ? (
                      <Badge tone="neutral">
                        {user.referralCount} referido
                        {user.referralCount === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="mt-3 text-sm text-slate-600">
                    Referente:{" "}
                    <button
                      type="button"
                      className="font-medium text-slate-800 underline-offset-2 hover:underline"
                      onClick={() => openRefer(user)}
                    >
                      {referrer ? userDisplayName(referrer) : "Asignar"}
                    </button>
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDate(user.createdAt)}
                  </p>
                  <div className="mt-3">
                    <UserActionsMenu
                      user={user}
                      active={active}
                      isPrueba={prueba}
                      isVerified={verified}
                      isBlacklisted={blacklisted}
                      onEdit={openEdit}
                      onNotes={openNotes}
                      onPrueba={onTogglePrueba}
                      onVerify={onToggleVerified}
                      onBlacklist={setBlacklistUser}
                      onRefer={openRefer}
                      onJwt={openJwt}
                      onMembership={openMembership}
                      onCancel={setCancelUser}
                      onDelete={setDeleteUser}
                    />
                  </div>
                </article>
              );
            })}
          </div>

          <div className="hidden md:block">
        <Table
          headers={[
            <SelectBox
              key="all"
              checked={allVisibleSelected}
              indeterminate={someVisibleSelected && !allVisibleSelected}
              onChange={toggleAllVisible}
              label="Seleccionar todos"
            />,
            "Nombre",
            "Email",
            "Teléfono",
            "Membresía",
            "Referente",
            "Observaciones",
            "Creado",
            "Acciones",
          ]}
        >
          {tableRows.map(({ user, depth }) => {
            const active = hasActiveMembership(user);
            const pending = hasPendingMembership(user);
            const prueba = isPruebaNote(user.notes);
            const verified = user.verified === true;
            const blacklisted = user.blacklisted === true;
            const isNew = isNewUser(user);
            const referrer =
              user.referredBy ??
              users.find((item) => item.id === user.referredById) ??
              null;
            return (
              <tr
                key={user.id}
                className={userRowTone(user, prueba)}
              >
                <td className="px-4 py-3">
                  <SelectBox
                    checked={selected.has(user.id)}
                    onChange={(checked) => toggleSelected(user.id, checked)}
                    label={`Seleccionar ${userDisplayName(user)}`}
                  />
                </td>
                <td className="px-4 py-3 font-medium text-slate-900">
                  <span
                    className="inline-flex items-center gap-2"
                    style={{ paddingLeft: `${depth * 1.25}rem` }}
                  >
                    {depth > 0 ? (
                      <span className="text-slate-300" aria-hidden>
                        └
                      </span>
                    ) : null}
                    {verified ? (
                      <span
                        className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-amber-100 text-amber-500 ring-1 ring-amber-300"
                        title="Usuario verificado"
                      >
                        <CrownIcon className="h-4 w-4" />
                      </span>
                    ) : null}
                    <span>{userDisplayName(user)}</span>
                    {isNew ? (
                      <Badge tone="info">Nuevo usuario</Badge>
                    ) : null}
                    {(user.referralCount ?? 0) > 0 ? (
                      <Badge tone="neutral">
                        {user.referralCount} referido
                        {user.referralCount === 1 ? "" : "s"}
                      </Badge>
                    ) : null}
                    {user.isReferrerProfile ? (
                      <Badge tone="warning">Referente</Badge>
                    ) : null}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {user.email ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {user.phone ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {active ? (
                      <Badge tone="success">Activa</Badge>
                    ) : pending ? (
                      <Badge tone="warning">Pendiente de pago</Badge>
                    ) : (
                      <Badge tone="neutral">Sin activa</Badge>
                    )}
                    {prueba ? <Badge tone="warning">Prueba</Badge> : null}
                    {blacklisted ? <Badge tone="danger">Lista negra</Badge> : null}
                    {user.isReferrerProfile ? (
                      <Badge tone="warning">Referente</Badge>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {referrer ? (
                    <button
                      type="button"
                      className="text-left text-sm text-slate-700 hover:text-zinc-950"
                      onClick={() => openRefer(user)}
                    >
                      {userDisplayName(referrer)}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-sm text-slate-400 hover:text-zinc-700"
                      onClick={() => openRefer(user)}
                    >
                      Asignar
                    </button>
                  )}
                </td>
                <td className="max-w-[16rem] px-4 py-3 text-slate-600">
                  {user.notes?.trim() ? (
                    <button
                      type="button"
                      className="line-clamp-2 text-left text-sm hover:text-zinc-950"
                      onClick={() => openNotes(user)}
                      title={user.notes}
                    >
                      {user.notes}
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="text-sm text-slate-400 hover:text-zinc-700"
                      onClick={() => openNotes(user)}
                    >
                      Añadir
                    </button>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  {formatDate(user.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <UserActionsMenu
                    user={user}
                    active={active}
                    isPrueba={prueba}
                    isVerified={verified}
                    isBlacklisted={blacklisted}
                    onEdit={openEdit}
                    onNotes={openNotes}
                    onPrueba={onTogglePrueba}
                    onVerify={onToggleVerified}
                    onBlacklist={setBlacklistUser}
                    onRefer={openRefer}
                    onJwt={openJwt}
                    onMembership={openMembership}
                    onCancel={setCancelUser}
                    onDelete={setDeleteUser}
                  />
                </td>
              </tr>
            );
          })}
        </Table>
          </div>
        </>
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
            label="Observaciones"
            rows={4}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Pago pendiente, WhatsApp, etc."
          />
        </form>
      </Modal>

      <Modal
        open={!!notesUser}
        title="Observaciones"
        onClose={() => setNotesUser(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setNotesUser(null)}>
              Cancelar
            </Button>
            <Button onClick={onSaveNotes} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </>
        }
      >
        <form onSubmit={onSaveNotes} className="space-y-3">
          <p className="text-sm text-slate-600">
            Notas internas de <strong>{userDisplayName(notesUser)}</strong>
            {notesUser?.email ? ` (${notesUser.email})` : ""}.
          </p>
          <Textarea
            label="Observaciones"
            rows={5}
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
            placeholder="Ej.: pagó por Zelle, renovar el viernes…"
          />
        </form>
      </Modal>

      <Modal
        open={!!referUser || bulk === "referrer"}
        title={
          bulk === "referrer"
            ? `Asignar referente (${selected.size})`
            : "Asignar referente"
        }
        onClose={() => {
          setReferUser(null);
          if (bulk === "referrer") setBulk(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setReferUser(null);
                if (bulk === "referrer") setBulk(null);
              }}
            >
              Cancelar
            </Button>
            <Button onClick={onAssignReferrer} disabled={saving}>
              {saving
                ? "Guardando..."
                : creatingReferrer
                  ? "Crear y asignar"
                  : "Guardar"}
            </Button>
          </>
        }
      >
        <form onSubmit={onAssignReferrer} className="space-y-3">
          <p className="text-sm text-slate-600">
            {bulk === "referrer"
              ? `Anida a ${selected.size} usuarios bajo la persona que los refirió.`
              : `Anida a ${userDisplayName(referUser)}${referUser?.email ? ` (${referUser.email})` : ""} bajo la persona que lo refirió.`}
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
            <>
              <Input
                label="Buscar referente"
                value={referrerQuery}
                onChange={(e) => setReferrerQuery(e.target.value)}
                placeholder="Nombre, email o teléfono"
              />
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-slate-700">
                  Referido por
                </span>
                <select
                  className="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-amber-400"
                  value={referrerId}
                  onChange={(e) => setReferrerId(e.target.value)}
                >
                  <option value="">Sin referente</option>
                  {referrerOptions.map((user) => (
                    <option key={user.id} value={user.id}>
                      {userDisplayName(user)}
                      {user.email ? ` (${user.email})` : ""}
                      {user.isReferrerProfile ? " · perfil" : ""}
                      {(user.referralCount ?? 0) > 0
                        ? ` · ${user.referralCount} referidos`
                        : ""}
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
        </form>
      </Modal>

      <Modal
        open={!!membershipUser || bulk === "membership"}
        title={
          bulk === "membership"
            ? `Agregar membresía (${selected.size})`
            : "Agregar membresía"
        }
        onClose={() => {
          setMembershipUser(null);
          if (bulk === "membership") setBulk(null);
        }}
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => {
                setMembershipUser(null);
                if (bulk === "membership") setBulk(null);
              }}
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
            {bulk === "membership"
              ? "Misma cantidad de días y precio para los seleccionados. Se omiten lista negra y los que ya tienen membresía activa."
              : `Membresía para ${userDisplayName(membershipUser)}${membershipUser?.email ? ` (${membershipUser.email})` : ""}.`}
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
        open={!!blacklistUser}
        title={
          blacklistUser?.blacklisted
            ? "Quitar de lista negra"
            : "Agregar a lista negra"
        }
        onClose={() => setBlacklistUser(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBlacklistUser(null)}>
              Volver
            </Button>
            <Button
              variant={blacklistUser?.blacklisted ? "primary" : "danger"}
              onClick={() => void onToggleBlacklist()}
              disabled={saving}
            >
              {saving
                ? "Guardando..."
                : blacklistUser?.blacklisted
                  ? "Quitar de lista negra"
                  : "Bloquear usuario"}
            </Button>
          </>
        }
      >
        {blacklistUser?.blacklisted ? (
          <p className="text-sm text-slate-600">
            <strong>{userDisplayName(blacklistUser)}</strong> podrá volver a
            recibir membresía. No se reactiva solo: hay que agregársela o
            reactivar la suscripción.
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            <strong>{userDisplayName(blacklistUser)}</strong>
            {blacklistUser?.email ? ` (${blacklistUser.email})` : ""} quedará
            inactivo de inmediato. Si intenta entrar, el sistema lo bloqueará
            hasta que lo quites de la lista negra.
          </p>
        )}
      </Modal>

      <Modal
        open={!!cancelUser}
        title="Cancelar acceso"
        onClose={() => setCancelUser(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCancelUser(null)}>
              Volver
            </Button>
            <Button
              variant="danger"
              onClick={() => void onCancelAccess()}
              disabled={saving}
            >
              {saving ? "Cancelando..." : "Cancelar acceso"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Se cancelarán todas las membresías activas de{" "}
          <strong>{userDisplayName(cancelUser)}</strong>. Úsalo cuando el
          repartidor no realice el pago.
        </p>
      </Modal>

      <Modal
        open={!!deleteUser}
        title="Eliminar usuario"
        onClose={() => setDeleteUser(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteUser(null)}>
              Volver
            </Button>
            <Button
              variant="danger"
              onClick={() => void onDeleteUser()}
              disabled={saving}
            >
              {saving ? "Eliminando..." : "Eliminar"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Se eliminará permanentemente a{" "}
          <strong>{userDisplayName(deleteUser)}</strong>
          {deleteUser?.email ? ` (${deleteUser.email})` : ""}. Solo disponible
          si no tiene membresía activa.
        </p>
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
          Token de <strong>{userDisplayName(jwtUser)}</strong>
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
          <p className="text-sm text-slate-500">
            Este usuario no tiene JWT guardado.
          </p>
        )}
      </Modal>

      <Modal
        open={bulk === "blacklist"}
        title={`Lista negra (${selected.size})`}
        onClose={() => setBulk(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBulk(null)}>
              Volver
            </Button>
            <Button
              variant="danger"
              onClick={() => void onBulkBlacklist(true)}
              disabled={saving}
            >
              {saving ? "Guardando..." : "Bloquear seleccionados"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Quedarán inactivos de inmediato y no podrán entrar hasta que los
          quites de la lista negra.
        </p>
      </Modal>

      <Modal
        open={bulk === "cancel"}
        title={`Cancelar acceso (${selected.size})`}
        onClose={() => setBulk(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBulk(null)}>
              Volver
            </Button>
            <Button
              variant="danger"
              onClick={() => void onBulkCancel()}
              disabled={saving}
            >
              {saving ? "Cancelando..." : "Cancelar acceso"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Se cancelan las membresías activas de los seleccionados.
        </p>
      </Modal>

      <Modal
        open={bulk === "delete"}
        title={`Eliminar (${selected.size})`}
        onClose={() => setBulk(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setBulk(null)}>
              Volver
            </Button>
            <Button
              variant="danger"
              onClick={() => void onBulkDelete()}
              disabled={saving}
            >
              {saving ? "Eliminando..." : "Eliminar"}
            </Button>
          </>
        }
      >
        <p className="text-sm text-slate-600">
          Se borran los que no tengan membresía activa. Los demás se omiten.
        </p>
      </Modal>
    </div>
  );
}
