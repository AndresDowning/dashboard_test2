import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL } from "@/lib/constants";
import { createUser, uploadDocument } from "./actions";

export const dynamic = "force-dynamic";

type Profile = { id: string; email: string | null; full_name: string | null };
type Doc = { id: string; file_name: string; owner_id: string; created_at: string };

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>;
}) {
  const { error, ok } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  if (user.email !== ADMIN_EMAIL) redirect("/dashboard");

  // Service role: vemos todos los perfiles y documentos.
  const admin = createAdminClient();
  const { data: profilesData } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .order("created_at", { ascending: true });
  const { data: docsData } = await admin
    .from("documents")
    .select("id, file_name, owner_id, created_at")
    .order("created_at", { ascending: false });

  // Usuarios = todos menos el admin.
  const users = (profilesData ?? []).filter(
    (p: Profile) => p.email !== ADMIN_EMAIL
  ) as Profile[];
  const docs = (docsData ?? []) as Doc[];

  const nameFor = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u ? u.full_name || u.email || id : id;
  };

  return (
    <main>
      <span className="badge">Panel del admin</span>
      <h1>Administración</h1>
      <p className="subtitle">Crea usuarios y súbeles documentos privados.</p>

      {error && <div className="warn">⚠️ {error}</div>}
      {ok && (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          ✅ {ok}
        </div>
      )}

      {/* Crear usuario */}
      <h2 style={{ margin: "1.5rem 0 0.5rem" }}>Crear usuario</h2>
      <form className="card" action={createUser}>
        <label htmlFor="full_name">Nombre</label>
        <input id="full_name" name="full_name" type="text" />

        <label htmlFor="cu_email">Email</label>
        <input id="cu_email" name="email" type="email" required />

        <label htmlFor="cu_password">Contraseña temporal</label>
        <input
          id="cu_password"
          name="password"
          type="text"
          required
          minLength={6}
        />

        <div className="row">
          <button type="submit">Crear usuario</button>
        </div>
      </form>

      {/* Subir documento */}
      <h2 style={{ margin: "2rem 0 0.5rem" }}>Subir documento</h2>
      {users.length === 0 ? (
        <div className="card">Primero crea un usuario.</div>
      ) : (
        <form className="card" action={uploadDocument}>
          <label htmlFor="owner_id">Para el usuario</label>
          <select
            id="owner_id"
            name="owner_id"
            required
            style={{
              width: "100%",
              padding: "0.6rem 0.75rem",
              background: "var(--bg)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--fg)",
            }}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name ? `${u.full_name} — ${u.email}` : u.email}
              </option>
            ))}
          </select>

          <label htmlFor="file">Archivo</label>
          <input id="file" name="file" type="file" required />

          <div className="row">
            <button type="submit">Subir documento</button>
          </div>
        </form>
      )}

      {/* Usuarios y sus documentos */}
      <h2 style={{ margin: "2rem 0 0.5rem" }}>Usuarios ({users.length})</h2>
      {users.map((u) => {
        const count = docs.filter((d) => d.owner_id === u.id).length;
        return (
          <div key={u.id} className="card">
            <strong>{u.full_name || u.email}</strong>
            <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
              {u.email} · {count} documento{count === 1 ? "" : "s"}
            </div>
          </div>
        );
      })}

      {docs.length > 0 && (
        <>
          <h2 style={{ margin: "2rem 0 0.5rem" }}>
            Documentos subidos ({docs.length})
          </h2>
          {docs.map((d) => (
            <div key={d.id} className="card">
              <strong>{d.file_name}</strong>
              <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
                {nameFor(d.owner_id)} · {new Date(d.created_at).toLocaleString("es")}
              </div>
            </div>
          ))}
        </>
      )}

      <form action="/auth/signout" method="post" style={{ marginTop: "2rem" }}>
        <button className="secondary">Cerrar sesión</button>
      </form>
    </main>
  );
}
