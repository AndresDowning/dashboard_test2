import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL } from "@/lib/constants";

export const dynamic = "force-dynamic";

type Doc = {
  id: string;
  file_path: string;
  file_name: string;
  created_at: string;
};

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  // El admin no tiene documentos propios: va a su panel.
  if (user.email === ADMIN_EMAIL) redirect("/admin");

  // RLS garantiza que solo vengan los documentos de este usuario.
  const { data, error } = await supabase
    .from("documents")
    .select("id, file_path, file_name, created_at")
    .order("created_at", { ascending: false });

  const docs = (data ?? []) as Doc[];

  // URLs firmadas (1 h) para descargar desde el bucket privado.
  const admin = createAdminClient();
  const links = new Map<string, string>();
  for (const d of docs) {
    const { data: signed } = await admin.storage
      .from("documents")
      .createSignedUrl(d.file_path, 60 * 60);
    if (signed?.signedUrl) links.set(d.id, signed.signedUrl);
  }

  return (
    <main>
      <span className="badge">Mis documentos</span>
      <h1>Hola, {user.email}</h1>
      <p className="subtitle">
        Aquí aparecen los documentos que el administrador subió para ti.
      </p>

      {error && <div className="warn">⚠️ {error.message}</div>}

      {!error && docs.length === 0 && (
        <div className="card">Todavía no tienes documentos.</div>
      )}

      {docs.map((d) => (
        <div key={d.id} className="card">
          <strong>{d.file_name}</strong>
          <div style={{ color: "var(--muted)", fontSize: "0.85rem" }}>
            {new Date(d.created_at).toLocaleString("es")}
          </div>
          {links.has(d.id) && (
            <a href={links.get(d.id)} target="_blank" rel="noreferrer">
              Descargar
            </a>
          )}
        </div>
      ))}

      <form action="/auth/signout" method="post" style={{ marginTop: "2rem" }}>
        <button className="secondary">Cerrar sesión</button>
      </form>
    </main>
  );
}
