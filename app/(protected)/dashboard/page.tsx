import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ADMIN_EMAIL } from "@/lib/constants";
import { MetricsView, type MetricRecord } from "../_components/MetricsView";

export const dynamic = "force-dynamic";

type Doc = {
  id: string;
  file_path: string;
  file_name: string;
  created_at: string;
};

function getExt(name: string) {
  const e = name.split(".").pop()?.toUpperCase() ?? "";
  if (e === "XLSX") return "XLS";
  if (e === "PPTX") return "PPT";
  if (e === "DOCX") return "DOC";
  return e || "FILE";
}

function getInitials(email: string) {
  return email.slice(0, 2).toUpperCase();
}

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");
  if (user.email === ADMIN_EMAIL) redirect("/admin");

  const { data, error } = await supabase
    .from("documents")
    .select("id, file_path, file_name, created_at")
    .order("created_at", { ascending: false });

  const docs = (data ?? []) as Doc[];

  // RLS garantiza que solo vengan las métricas de este usuario.
  const { data: metricsData } = await supabase
    .from("metrics")
    .select("id, source_name, headers, rows, created_at")
    .order("created_at", { ascending: false });
  const metrics = (metricsData ?? []) as MetricRecord[];

  const admin = createAdminClient();
  const links = new Map<string, string>();
  for (const d of docs) {
    const { data: signed } = await admin.storage
      .from("documents")
      .createSignedUrl(d.file_path, 60 * 60);
    if (signed?.signedUrl) links.set(d.id, signed.signedUrl);
  }

  const initials = getInitials(user.email ?? "U");

  return (
    <div className="portal">
      {/* ── Sidebar ── */}
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="sidebar-wordmark">VERSATA</div>
          <div className="sidebar-tagline">Portal de clientes</div>
        </div>
        <nav className="sidebar-nav">
          <div className="sidebar-nav-head">Portal</div>
          <a href="#documentos" className="nav-link active">
            <span className="nav-bar" />
            <span style={{ flex: 1 }}>Mis documentos</span>
            {docs.length > 0 && (
              <span className="nav-badge">{docs.length}</span>
            )}
          </a>
          <a href="#metricas" className="nav-link">
            <span className="nav-bar" />
            <span style={{ flex: 1 }}>Mis métricas</span>
            {metrics.length > 0 && (
              <span className="nav-badge">{metrics.length}</span>
            )}
          </a>
        </nav>
        <div className="sidebar-foot">
          <div className="engagement">
            <div className="engagement-lbl">Cuenta</div>
            <div className="engagement-name">{user.email}</div>
            <div className="engagement-sub">Cliente · Portal privado</div>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="main-area">
        <header className="topbar">
          <div>
            <div className="topbar-crumb">Portal · Documentos</div>
            <div className="topbar-title">Mis documentos</div>
          </div>
          <div className="user-chip">
            <div>
              <div className="user-name-lbl">{user.email}</div>
              <div className="user-role-lbl">Cliente</div>
            </div>
            <div className="avatar">{initials}</div>
          </div>
        </header>

        <div className="page-content">
          <div className="page-inner">
            {/* Stats */}
            <div className="stats-row">
              <div className="stat-card">
                <div className="stat-lbl">Recibidos</div>
                <div className="stat-num">
                  {docs.length}
                  <span className="stat-unit">docs</span>
                </div>
              </div>
              <div className="stat-card dark">
                <div className="stat-lbl">Estado</div>
                <div
                  className="stat-num light"
                  style={{
                    fontSize: 18,
                    fontFamily: "'IBM Plex Sans', sans-serif",
                    fontWeight: 500,
                    marginTop: 8,
                  }}
                >
                  {docs.length > 0
                    ? "Documentos disponibles"
                    : "Sin documentos aún"}
                </div>
              </div>
            </div>

            {error && (
              <div className="alert alert-warn">Error: {error.message}</div>
            )}

            {/* Table */}
            <div className="tbl-head-row" id="documentos">
              <div>
                <div className="tbl-title">Documentos recibidos</div>
                <div className="tbl-subtitle">
                  Archivos que el administrador te ha enviado
                </div>
              </div>
            </div>

            {docs.length === 0 ? (
              <div className="empty">
                El administrador aún no te ha subido ningún documento.
              </div>
            ) : (
              <div className="tbl">
                <div className="tbl-col-head">
                  <div style={{ flex: 1 }}>Archivo</div>
                  <div style={{ width: 180 }}>Fecha</div>
                  <div style={{ width: 120, textAlign: "right" }}>Acción</div>
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
                            fontSize: 13.5,
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
                    <div style={{ width: 180, fontSize: 11.5, color: "#5b6b80" }}>
                      {new Date(d.created_at).toLocaleString("es", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </div>
                    <div
                      style={{
                        width: 120,
                        display: "flex",
                        justifyContent: "flex-end",
                      }}
                    >
                      {links.has(d.id) ? (
                        <a
                          href={links.get(d.id)}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-sm btn-secondary"
                          style={{
                            textDecoration: "none",
                            fontSize: 11.5,
                            padding: "6px 14px",
                            borderRadius: 9,
                            border: "1px solid var(--border)",
                            color: "var(--navy-text)",
                            background: "var(--surface)",
                            fontFamily: "'IBM Plex Sans', sans-serif",
                            fontWeight: 500,
                          }}
                        >
                          Descargar
                        </a>
                      ) : (
                        <span style={{ fontSize: 11, color: "#8a98ab" }}>
                          No disponible
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Métricas */}
            <div id="metricas" style={{ marginTop: 40 }}>
              <div className="tbl-head-row">
                <div>
                  <div className="tbl-title">Mis métricas</div>
                  <div className="tbl-subtitle">
                    Indicadores que el administrador compartió contigo
                  </div>
                </div>
              </div>
              {metrics.length === 0 ? (
                <div className="empty">
                  El administrador aún no te ha compartido métricas.
                </div>
              ) : (
                metrics.map((m) => <MetricsView key={m.id} record={m} />)
              )}
            </div>

            <form
              action="/auth/signout"
              method="post"
              style={{ marginTop: 32 }}
            >
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
