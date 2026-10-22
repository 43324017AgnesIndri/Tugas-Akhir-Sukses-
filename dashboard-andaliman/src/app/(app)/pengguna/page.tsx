"use client";

import { useState } from "react";
import AppShell from "@/components/AppShell";
import { useApi } from "@/hooks/useApi";
import { useProfile } from "@/hooks/useProfile";
import { sendJson } from "@/lib/client";
import type { Role, UserInfo } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

export default function PenggunaPage() {
  const { profile, loading: profileLoading } = useProfile();
  const isAdmin = profile?.role === "admin";

  const users = useApi<{ users: UserInfo[] }>(
    isAdmin ? "/api/users" : null
  );

  const [message, setMessage] = useState<{
    ok: boolean;
    text: string;
  } | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nama, setNama] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [busy, setBusy] = useState(false);

  const report = (ok: boolean, text: string) => {
    setMessage({ ok, text });
  };

  const addUser = async () => {
    if (!email.trim()) {
      report(false, "Email wajib diisi.");
      return;
    }

    if (!password || password.length < 8) {
      report(false, "Password minimal 8 karakter.");
      return;
    }

    if (!nama.trim()) {
      report(false, "Nama wajib diisi.");
      return;
    }

    setBusy(true);

    const r = await sendJson("POST", "/api/users", {
      email: email.trim(),
      password,
      nama: nama.trim(),
      role,
    });

    report(
      r.ok,
      r.ok ? "Pengguna berhasil dibuat." : (r.error ?? "Gagal.")
    );

    if (r.ok) {
      setEmail("");
      setPassword("");
      setNama("");
      setRole("viewer");
    }

    setBusy(false);
    users.reload();
  };

  const changeRole = async (id: string, next: Role) => {
    const r = await sendJson("PUT", "/api/users", {
      id,
      role: next,
    });

    report(
      r.ok,
      r.ok ? "Role diperbarui." : (r.error ?? "Gagal.")
    );

    users.reload();
  };

  const removeUser = async (u: UserInfo) => {
    if (
      !window.confirm(
        `Hapus pengguna ${u.email}? Tindakan ini tidak dapat dibatalkan.`
      )
    ) {
      return;
    }

    const r = await sendJson("DELETE", "/api/users", {
      id: u.id,
    });

    report(
      r.ok,
      r.ok ? "Pengguna dihapus." : (r.error ?? "Gagal.")
    );

    users.reload();
  };

  if (!profileLoading && !isAdmin) {
    return (
      <AppShell
        title="Pengguna"
        subtitle="Manajemen akun dashboard"
      >
        <div className="note tone-bd">
          Halaman ini hanya dapat dibuka oleh admin.
        </div>
      </AppShell>
    );
  }

  /*
   * INI PENTING.
   * Data pengguna disimpan di variabel list.
   */
  const list = users.data?.users ?? [];

  return (
    <AppShell
      title="Pengguna"
      subtitle="Manajemen akun dan role dashboard"
    >
      {users.error && (
        <div className="note tone-bd page-note">
          {users.error}
        </div>
      )}

      {message && (
        <div
          className={`note tone-${
            message.ok ? "ok" : "bd"
          } page-note`}
        >
          {message.text}
        </div>
      )}

      <div className="c" style={{ marginBottom: 12 }}>
        <h2>Daftar pengguna ({list.length})</h2>

        <div className="tw user-table-wrap">
          {/* ================= DESKTOP ================= */}
          <table className="user-table user-table-desktop">
            <thead>
              <tr>
                <th>Email</th>
                <th>Nama</th>
                <th>Role</th>
                <th>Dibuat</th>
                <th>Login terakhir</th>
                <th>Aksi</th>
              </tr>
            </thead>

            <tbody>
              {list.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="muted"
                    style={{
                      textAlign: "center",
                      padding: 20,
                    }}
                  >
                    {users.loading
                      ? "Memuat data..."
                      : "Belum ada pengguna."}
                  </td>
                </tr>
              )}

              {list.map((u) => {
                const self = u.id === profile?.id;

                return (
                  <tr key={u.id}>
                    <td>
                      {u.email}
                      {self && (
                        <span className="muted">
                          {" "}
                          (Anda)
                        </span>
                      )}
                    </td>

                    <td>{u.nama ?? "-"}</td>

                    <td>
                      <select
                        value={u.role}
                        disabled={self}
                        onChange={(e) =>
                          changeRole(
                            u.id,
                            e.target.value as Role
                          )
                        }
                      >
                        <option value="admin">
                          Admin
                        </option>
                        <option value="viewer">
                          Viewer
                        </option>
                      </select>
                    </td>

                    <td>
                      {formatDateTime(u.created_at)}
                    </td>

                    <td>
                      {u.last_sign_in_at
                        ? formatDateTime(
                            u.last_sign_in_at
                          )
                        : "Belum pernah"}
                    </td>

                    <td>
                      <button
                        type="button"
                        className="btn danger"
                        disabled={self}
                        onClick={() =>
                          removeUser(u)
                        }
                      >
                        Hapus
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* ================= HP ================= */}
          <div className="user-mobile-list">
            {list.length === 0 && (
              <div className="muted user-mobile-empty">
                {users.loading
                  ? "Memuat data..."
                  : "Belum ada pengguna."}
              </div>
            )}

            {list.map((u) => {
              const self = u.id === profile?.id;

              return (
                <div
                  className="user-mobile-card"
                  key={u.id}
                >
                  <div className="user-mobile-field">
                    <span>Email</span>
                    <strong>
                      {u.email}
                      {self && (
                        <small> (Anda)</small>
                      )}
                    </strong>
                  </div>

                  <div className="user-mobile-field">
                    <span>Nama</span>
                    <strong>
                      {u.nama ?? "-"}
                    </strong>
                  </div>

                  <div className="user-mobile-field">
                    <span>Role</span>

                    <select
                      value={u.role}
                      disabled={self}
                      onChange={(e) =>
                        changeRole(
                          u.id,
                          e.target.value as Role
                        )
                      }
                    >
                      <option value="admin">
                        Admin
                      </option>
                      <option value="viewer">
                        Viewer
                      </option>
                    </select>
                  </div>

                  <div className="user-mobile-field">
                    <span>Dibuat</span>
                    <strong>
                      {formatDateTime(
                        u.created_at
                      )}
                    </strong>
                  </div>

                  <div className="user-mobile-field">
                    <span>Login terakhir</span>
                    <strong>
                      {u.last_sign_in_at
                        ? formatDateTime(
                            u.last_sign_in_at
                          )
                        : "Belum pernah"}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="btn danger user-mobile-delete"
                    disabled={self}
                    onClick={() =>
                      removeUser(u)
                    }
                  >
                    Hapus
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        <div className="note tone-in">
          Admin dapat mengubah mode, threshold, dan
          aktuator. Viewer hanya dapat melihat data.
          Akun sendiri tidak dapat diubah atau dihapus
          dari sini.
        </div>
      </div>

      {/* ================= TAMBAH PENGGUNA ================= */}
      <div className="c">
        <h2>Tambah pengguna</h2>

        <div
          className="f"
          style={{
            gridTemplateColumns:
              "repeat(auto-fit, minmax(200px, 1fr))",
          }}
        >
          <div>
            <label htmlFor="uEmail">Email</label>
            <input
              id="uEmail"
              type="email"
              value={email}
              onChange={(e) =>
                setEmail(e.target.value)
              }
            />
          </div>

          <div>
            <label htmlFor="uPass">
              Password (min. 8 karakter)
            </label>
            <input
              id="uPass"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) =>
                setPassword(e.target.value)
              }
            />
          </div>

          <div>
            <label htmlFor="uNama">Nama</label>
            <input
              id="uNama"
              value={nama}
              onChange={(e) =>
                setNama(e.target.value)
              }
            />
          </div>

          <div>
            <label htmlFor="uRole">Role</label>
            <select
              id="uRole"
              value={role}
              onChange={(e) =>
                setRole(
                  e.target.value as Role
                )
              }
            >
              <option value="viewer">
                Viewer
              </option>
              <option value="admin">
                Admin
              </option>
            </select>
          </div>
        </div>


        <button
          type="button"
          className="apply"
          style={{ width: "auto", padding: "9px 20px" }}
          disabled={busy}
          onClick={addUser}
        >
          {busy ? "Memproses..." : "Buat pengguna"}
        </button>
      </div>
    </AppShell>
  );
}