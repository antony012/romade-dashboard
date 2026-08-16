"use client";

import { FormEvent, useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { formatDate } from "@/lib/format";
import type { Admin } from "@/lib/types";
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

export default function AdminsPage() {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);

  const [createForm, setCreateForm] = useState({
    username: "",
    password: "",
    displayName: "",
  });
  const [editForm, setEditForm] = useState({
    displayName: "",
    password: "",
    isActive: true,
  });

  async function load() {
    setLoading(true);
    setError(null);
    try {
      setAdmins(await api.listAdmins());
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Error al cargar administradores",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const created = await api.createAdmin({
        username: createForm.username.trim(),
        password: createForm.password,
        displayName: createForm.displayName.trim() || undefined,
      });
      setAdmins((prev) => [created, ...prev]);
      setCreateOpen(false);
      setCreateForm({ username: "", password: "", displayName: "" });
      toast("Administrador creado");
    } catch (err) {
      toast(err instanceof ApiError ? err.message : "Error al crear", "error");
    } finally {
      setSaving(false);
    }
  }

  function openEdit(admin: Admin) {
    setEditing(admin);
    setEditForm({
      displayName: admin.displayName ?? "",
      password: "",
      isActive: admin.isActive,
    });
  }

  async function onUpdate(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      const updated = await api.updateAdmin(editing.id, {
        displayName: editForm.displayName || undefined,
        password: editForm.password || undefined,
        isActive: editForm.isActive,
      });
      setAdmins((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      setEditing(null);
      toast("Administrador actualizado");
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Error al actualizar",
        "error",
      );
    } finally {
      setSaving(false);
    }
  }

  async function onDeactivate(admin: Admin) {
    if (!window.confirm(`¿Desactivar a ${admin.username}?`)) return;
    try {
      const updated = await api.deleteAdmin(admin.id);
      setAdmins((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      toast("Administrador desactivado");
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : "Error al desactivar",
        "error",
      );
    }
  }

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} />;

  return (
    <div>
      <PageHeader
        title="Administradores"
        description="CRUD de cuentas de administración"
        actions={
          <Button onClick={() => setCreateOpen(true)}>Nuevo admin</Button>
        }
      />

      {admins.length === 0 ? (
        <EmptyState message="No hay administradores" />
      ) : (
        <Table
          headers={[
            "Usuario",
            "Nombre",
            "Estado",
            "Creado",
            "Acciones",
          ]}
        >
          {admins.map((admin) => (
            <tr key={admin.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium text-slate-900">
                {admin.username}
              </td>
              <td className="px-4 py-3 text-slate-600">
                {admin.displayName ?? "—"}
              </td>
              <td className="px-4 py-3">
                <Badge tone={admin.isActive ? "success" : "danger"}>
                  {admin.isActive ? "Activo" : "Inactivo"}
                </Badge>
              </td>
              <td className="px-4 py-3 text-slate-600">
                {formatDate(admin.createdAt)}
              </td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Button variant="secondary" onClick={() => openEdit(admin)}>
                    Editar
                  </Button>
                  {admin.isActive ? (
                    <Button
                      variant="danger"
                      onClick={() => void onDeactivate(admin)}
                    >
                      Desactivar
                    </Button>
                  ) : null}
                </div>
              </td>
            </tr>
          ))}
        </Table>
      )}

      <Modal
        open={createOpen}
        title="Nuevo administrador"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={onCreate}
              disabled={
                saving ||
                !createForm.username.trim() ||
                createForm.password.length < 6
              }
            >
              {saving ? "Creando..." : "Crear"}
            </Button>
          </>
        }
      >
        <form onSubmit={onCreate} className="space-y-3">
          <Input
            label="Usuario"
            value={createForm.username}
            onChange={(e) =>
              setCreateForm({ ...createForm, username: e.target.value })
            }
            required
          />
          <Input
            label="Contraseña (mín. 6)"
            type="password"
            value={createForm.password}
            onChange={(e) =>
              setCreateForm({ ...createForm, password: e.target.value })
            }
            minLength={6}
            required
          />
          <Input
            label="Nombre para mostrar"
            value={createForm.displayName}
            onChange={(e) =>
              setCreateForm({ ...createForm, displayName: e.target.value })
            }
          />
        </form>
      </Modal>

      <Modal
        open={!!editing}
        title="Editar administrador"
        onClose={() => setEditing(null)}
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditing(null)}>
              Cancelar
            </Button>
            <Button onClick={onUpdate} disabled={saving}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </>
        }
      >
        <form onSubmit={onUpdate} className="space-y-3">
          <Input
            label="Nombre para mostrar"
            value={editForm.displayName}
            onChange={(e) =>
              setEditForm({ ...editForm, displayName: e.target.value })
            }
          />
          <Input
            label="Nueva contraseña (opcional)"
            type="password"
            value={editForm.password}
            onChange={(e) =>
              setEditForm({ ...editForm, password: e.target.value })
            }
            minLength={6}
          />
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={editForm.isActive}
              onChange={(e) =>
                setEditForm({ ...editForm, isActive: e.target.checked })
              }
            />
            Activo
          </label>
        </form>
      </Modal>
    </div>
  );
}
