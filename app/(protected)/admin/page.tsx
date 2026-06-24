import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL } from "@/lib/constants";
import { createUser, uploadDocument, uploadMetrics, deleteMetrics } from "./actions";
import { MetricsView, type MetricRecord } from "../_components/MetricsView";

export const dynamic = "force-dynamic";

type Profile = { id: string; email: string | null; full_name: string | null };
type Doc = {
  id: string;
  file_name: string;
  owner_id: string;
  created_at: string;
};

function getExt(name: string) {
  const e = name.split(".").pop()?.toUpperCase() ?? "";
  if (e === "XLSX") return "XLS";
  if (e === "PPTX") return "PPT";
  if (e === "DOCX") return "DOC";
  return e || "FILE";
}

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

  const admin = createAdminClient();
  const { data: profilesData } = await admin
    .from("profiles")
    .select("id, email, full_name")
    .order("created_at", { ascending: true });
  const { data: docsData } = await admin
    .from("documents")
    .select("id, file_name, owner_id, created_at")
    .order("created_at", { ascending: false });
  const { data: metricsData } = await admin
    .from("metrics")
    .select("id, source_name, headers, rows, owner_id, created_at")
    .order("created_at", { ascending: false });

  const users = (profilesData ?? []).filter(
    (p: Profile) => p.email !== ADMIN_EMAIL
  ) as Profile[];
  const docs = (docsData ?? []) as Doc[];
  const metrics = (metricsData ?? []) as (MetricRecord & {
    owner_id: string;
  })[];

  const nameFor = (id: string) => {
    const u = users.find((x) => x.id === id);
    return u ? u.full_name || u.email || id : id;
  };

  return (
    <div className="portal">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-wordmark">VERSATA</div>
          <div className="sidebar-tagline">Admin Console</div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-nav-head">Administración</div>
          <a href="/admin" className="nav-link active">
            <span className="nav-bar" />
            <span style={{ flex: 1 }}>Panel</span>
            {docs.length > 0 && (
              <span className="nav-badge">{docs.length}</span>
            )}
          </a>
        </nav>
        <div className="sidebar-foot">
          <div className="engagement">
            <div className="engagement-lbl">Sesión</div>
            <div className="engagement-name">Administrador</div>
            <div className="engagement-sub">{user.email}</div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-area">
        <header className="topbar">
          <div>
            <div className="topbar-crumb">Admin · Consola</div>
            <div className="topbar-title">Administración</div>
          </div>
          <div className="user-chip">
            <div>
              <div className="user-name-lbl">Administrador</div>
              <div className="user-role-lbl">Admin Console</div>
            </div>
            <div className="avatar">AD</div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-inner">
            {/* Stats */}
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-lbl">Usuarios activos</div>
                <div className="stat-num">{users.length}</div>
              </div>
              <div className="stat-card">
                <div className="stat-lbl">Documentos subidos</div>
                <div className="stat-num amber">{docs.length}</div>
              </div>
              <div className="stat-card dark">
                <div className="stat-lbl">Consola</div>
                <div
                  className="stat-num light"
                  style={{
                    fontSize: 16,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: 400,
                    marginTop: 10,
                  }}
                >
                  Crea usuarios y sube documentos privados
                </div>
              </div>
            </div>

            {error && <div className="alert alert-warn">{error}</div>}
            {ok && <div className="alert alert-ok">{ok}</div>}

            {/* Forms side by side */}
            <div
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 32 }}
            >
              {/* Crear usuario */}
              <div className="form-section">
                <div className="section-title">Crear usuario</div>
                <form className="form-card" action={createUser}>
                  <label htmlFor="full_name">Nombre completo</label>
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

                  <div className="btn-row">
                    <button type="submit" className="btn-primary btn-sm">
                      Crear usuario
                    </button>
                  </div>
                </form>
              </div>

              {/* Subir documento */}
              <div className="form-section">
                <div className="section-title">Subir documento</div>
                {users.length === 0 ? (
                  <div className="empty">
                    Primero crea un usuario para poder subir documentos.
                  </div>
                ) : (
                  <form className="form-card" action={uploadDocument}>
                    <label htmlFor="owner_id">Para el usuario</label>
                    <select id="owner_id" name="owner_id" required>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.full_name
                            ? `${u.full_name} — ${u.email}`
                            : u.email}
                        </option>
                      ))}
                    </select>

                    <label htmlFor="file">Archivo</label>
                    <input id="file" name="file" type="file" required />

                    <div className="btn-row">
                      <button type="submit" className="btn-primary btn-sm">
                        Subir documento
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>

            {/* Subir métricas (Excel) */}
            <div className="form-section">
              <div className="section-title">Subir métricas (Excel)</div>
              {users.length === 0 ? (
                <div className="empty">
                  Primero crea un usuario para subirle métricas.
                </div>
              ) : (
                <form className="form-card" action={uploadMetrics}>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: 16,
                    }}
                  >
                    <div>
                      <label htmlFor="m_owner_id">Para el usuario</label>
                      <select id="m_owner_id" name="owner_id" required>
                        {users.map((u) => (
                          <option key={u.id} value={u.id}>
                            {u.full_name
                              ? `${u.full_name} — ${u.email}`
                              : u.email}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label htmlFor="m_file">Archivo (.xlsx, .xls, .csv)</label>
                      <input
                        id="m_file"
                        name="file"
                        type="file"
                        accept=".xlsx,.xls,.csv"
                        required
                      />
                    </div>
                  </div>
                  <div className="btn-row">
                    <button type="submit" className="btn-primary btn-sm">
                      Subir métricas
                    </button>
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "var(--muted)",
                      marginTop: 10,
                      lineHeight: 1.6,
                    }}
                  >
                    La primera fila se usa como encabezados. Si hay 2 columnas
                    (métrica · valor) se muestran como tarjetas y gráfico de
                    barras; con más columnas, como tabla.
                  </div>
                </form>
              )}
            </div>

            {/* Users table */}
            <div className="form-section">
              <div className="tbl-head-row">
                <div className="tbl-title">
                  Usuarios ({users.length})
                </div>
              </div>
              {users.length === 0 ? (
                <div className="empty">No hay usuarios todavía.</div>
              ) : (
                <div className="tbl">
                  <div className="tbl-col-head">
                    <div style={{ flex: 1 }}>Nombre / Email</div>
                    <div style={{ width: 130, textAlign: "right" }}>
                      Documentos
                    </div>
                  </div>
                  {users.map((u) => {
                    const count = docs.filter(
                      (d) => d.owner_id === u.id
                    ).length;
                    return (
                      <div key={u.id} className="tbl-row">
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 500,
                              color: "#10203a",
                            }}
                          >
                            {u.full_name || u.email}
                          </div>
                          {u.full_name && (
                            <div
                              style={{
                                fontSize: 11,
                                color: "#8a98ab",
                                marginTop: 2,
                              }}
                            >
                              {u.email}
                            </div>
                          )}
                        </div>
                        <div
                          style={{
                            width: 130,
                            display: "flex",
                            justifyContent: "flex-end",
                          }}
                        >
                          <span
                            className={`chip ${count > 0 ? "chip-green" : "chip-amber"}`}
                          >
                            <span className="chip-dot" />
                            {count} doc{count !== 1 ? "s" : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Docs table */}
            {docs.length > 0 && (
              <div className="form-section">
                <div className="tbl-head-row">
                  <div className="tbl-title">
                    Documentos subidos ({docs.length})
                  </div>
                </div>
                <div className="tbl">
                  <div className="tbl-col-head">
                    <div style={{ flex: 1 }}>Archivo</div>
                    <div style={{ width: 200 }}>Usuario</div>
                    <div style={{ width: 170, textAlign: "right" }}>Fecha</div>
                  </div>
                  {docs.map((d) => (
                    <div key={d.id} className="tbl-row">
                      <div
                        style={{
                          flex: 1,
                          display: "flex",
                          alignItems: "center",
                          gap: 11,
                          minWidth: 0,
                          paddingRight: 14,
                        }}
                      >
                        <span className="ext-badge">{getExt(d.file_name)}</span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontSize: 13,
                              fontWeight: 500,
                              color: "#10203a",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {d.file_name}
                          </div>
                        </div>
                      </div>
                      <div style={{ width: 200, fontSize: 12, color: "#10203a" }}>
                        {nameFor(d.owner_id)}
                      </div>
                      <div
                        style={{
                          width: 170,
                          textAlign: "right",
                          fontSize: 11.5,
                          color: "#5b6b80",
                        }}
                      >
                        {new Date(d.created_at).toLocaleString("es", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Métricas subidas */}
            {metrics.length > 0 && (
              <div className="form-section">
                <div className="tbl-head-row">
                  <div className="tbl-title">
                    Métricas subidas ({metrics.length})
                  </div>
                </div>
                {metrics.map((m) => (
                  <div key={m.id}>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 9,
                        letterSpacing: "0.16em",
                        color: "var(--muted)",
                        margin: "0 2px 8px",
                        textTransform: "uppercase",
                      }}
                    >
                      Usuario · {nameFor(m.owner_id)}
                    </div>
                    <MetricsView record={m}>
                      <form action={deleteMetrics}>
                        <input type="hidden" name="id" value={m.id} />
                        <button type="submit" className="btn-ghost btn-sm">
                          Borrar
                        </button>
                      </form>
                    </MetricsView>
                  </div>
                ))}
              </div>
            )}

            <form action="/auth/signout" method="post" style={{ marginTop: 32 }}>
              <button className="btn-ghost" style={{ fontSize: 12 }}>
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
