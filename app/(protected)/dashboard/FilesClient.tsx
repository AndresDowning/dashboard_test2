"use client";

import { useState, useRef, DragEvent, ChangeEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type FileRow = {
  id: string;
  name: string;
  size: number;
  type: string;
  storage_path: string;
  tag: string;
  created_at: string;
};

type Props = {
  user: { id: string; email: string };
  files: FileRow[];
  isAdmin: boolean;
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function typeInfo(ext: string) {
  const map: Record<string, { color: string; bg: string; label: string }> = {
    pdf:  { color: "#FF7070", bg: "rgba(255,112,112,0.1)",  label: "PDF" },
    xlsx: { color: "#4ECB71", bg: "rgba(78,203,113,0.1)",   label: "XLS" },
    xls:  { color: "#4ECB71", bg: "rgba(78,203,113,0.1)",   label: "XLS" },
    csv:  { color: "#4ECB71", bg: "rgba(78,203,113,0.1)",   label: "CSV" },
    pptx: { color: "#FF9F43", bg: "rgba(255,159,67,0.1)",   label: "PPT" },
    ppt:  { color: "#FF9F43", bg: "rgba(255,159,67,0.1)",   label: "PPT" },
    docx: { color: "#4A9EFF", bg: "rgba(74,158,255,0.1)",   label: "DOC" },
    doc:  { color: "#4A9EFF", bg: "rgba(74,158,255,0.1)",   label: "DOC" },
  };
  const lower = (ext || "").toLowerCase();
  return (
    map[lower] ?? {
      color: "#8DA3BE",
      bg: "rgba(141,163,190,0.1)",
      label: (lower || "???").toUpperCase().slice(0, 4),
    }
  );
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const NAV_ITEMS = [
  { id: "documentos",    label: "Documentos" },
  { id: "proyectos",     label: "Proyectos" },
  { id: "clientes",      label: "Clientes" },
  { id: "configuracion", label: "Configuración" },
];

function NavIcon({ id }: { id: string }) {
  if (id === "documentos")
    return (
      <>
        <path d="M3 2h6.5L13 5.5V14a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" />
        <path d="M9 2v4h4M5 8h6M5 11h4" />
      </>
    );
  if (id === "proyectos")
    return <path d="M1 4.5h6l1.5 2H15v7.5H1V4.5z" />;
  if (id === "clientes")
    return (
      <>
        <circle cx="8" cy="5" r="2.8" />
        <path d="M2 15c0-3.314 2.686-6 6-6s6 2.686 6 6" />
      </>
    );
  return (
    <>
      <circle cx="8" cy="8" r="2.2" />
      <path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.4 3.4l1.4 1.4M11.2 11.2l1.4 1.4M3.4 12.6l1.4-1.4M11.2 4.8l1.4-1.4" />
    </>
  );
}

export default function FilesClient({ user, files: initFiles, isAdmin }: Props) {
  const [files, setFiles] = useState<FileRow[]>(initFiles);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [activeNav, setActiveNav] = useState("documentos");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  const userName = (user.email || "Usuario").split("@")[0];
  const userInitial = userName[0]?.toUpperCase() ?? "U";
  const totalSize = files.reduce((acc, f) => acc + (f.size || 0), 0);

  async function uploadFiles(fileList: FileList) {
    if (!isAdmin || !fileList.length) return;
    setUploading(true);
    for (const file of Array.from(fileList)) {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: storageErr } = await supabase.storage
        .from("client-files")
        .upload(path, file);
      if (storageErr) { console.error(storageErr); continue; }
      const { data: newRow, error: dbErr } = await supabase
        .from("files")
        .insert({ name: file.name, size: file.size, type: ext, storage_path: path, uploaded_by: user.id, tag: "Nuevo" })
        .select()
        .single();
      if (!dbErr && newRow) setFiles((prev) => [newRow as FileRow, ...prev]);
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function downloadFile(file: FileRow) {
    const { data, error } = await supabase.storage
      .from("client-files")
      .createSignedUrl(file.storage_path, 3600);
    if (error || !data?.signedUrl) { alert("Error al generar enlace de descarga."); return; }
    const a = document.createElement("a");
    a.href = data.signedUrl;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function deleteFile(file: FileRow) {
    if (!isAdmin) return;
    await supabase.storage.from("client-files").remove([file.storage_path]);
    await supabase.from("files").delete().eq("id", file.id);
    setFiles((prev) => prev.filter((f) => f.id !== file.id));
  }

  function navStyle(id: string): React.CSSProperties {
    const active = activeNav === id;
    return {
      display: "flex", alignItems: "center", gap: "10px",
      padding: "9px 12px", borderRadius: "8px",
      background: active ? "rgba(74,158,255,0.1)" : "transparent",
      color: active ? "#4A9EFF" : "#2A4A68",
      fontSize: "13px", fontWeight: active ? 500 : 400,
      cursor: "pointer", width: "100%", textAlign: "left",
      border: "none", letterSpacing: "0.01em", transition: "all 0.15s",
    };
  }

  return (
    <div style={{ display: "flex", height: "100vh", background: "#060D1A", overflow: "hidden" }}>
      <style>{`
        .nav-btn:hover  { background: rgba(74,158,255,0.07) !important; color: #7AAEDD !important; }
        .upload-btn:hover { background: #6AB4FF !important; transform: translateY(-1px); }
        .file-row:hover { background: rgba(74,158,255,0.025) !important; }
        .del-btn:hover  { background: rgba(255,101,101,0.08) !important; color: #FF6565 !important; }
        .dl-btn:hover   { background: rgba(74,158,255,0.1) !important; color: #6AB4FF !important; }
        .logout-btn:hover { color: #4A6A88 !important; }
      `}</style>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={(e: ChangeEvent<HTMLInputElement>) => {
          if (e.target.files) uploadFiles(e.target.files);
        }}
      />

      {/* ── SIDEBAR ── */}
      <div style={{ width: "228px", minWidth: "228px", height: "100vh", background: "#09121F", display: "flex", flexDirection: "column", borderRight: "1px solid rgba(74,158,255,0.07)", padding: "24px 14px 20px" }}>
        {/* brand */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "0 8px", marginBottom: "40px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "32px", height: "32px", borderRadius: "7px", background: "rgba(74,158,255,0.1)", border: "1px solid rgba(74,158,255,0.14)", flexShrink: 0 }}>
            <svg viewBox="0 0 24 24" style={{ width: "16px", height: "16px" }} fill="none">
              <path d="M4 5h16L12 19 4 5z" fill="#4A9EFF" />
            </svg>
          </div>
          <div>
            <div style={{ fontSize: "14px", fontWeight: 700, letterSpacing: "0.18em", color: "#D8EEFF", textTransform: "uppercase", lineHeight: 1 }}>VERSATA</div>
            <div style={{ fontSize: "9px", letterSpacing: "0.1em", color: "#1E3A55", textTransform: "uppercase", marginTop: "2px" }}>Consultoría</div>
          </div>
        </div>

        <div style={{ fontSize: "9px", letterSpacing: "0.14em", textTransform: "uppercase", color: "#142840", fontWeight: 600, padding: "0 10px", marginBottom: "8px" }}>Menú principal</div>

        <nav style={{ display: "flex", flexDirection: "column", gap: "2px", flex: 1 }}>
          {NAV_ITEMS.map(({ id, label }) => (
            <button key={id} type="button" onClick={() => setActiveNav(id)} style={navStyle(id)} className="nav-btn">
              <svg viewBox="0 0 16 16" style={{ width: "15px", height: "15px", flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth={1.6}>
                <NavIcon id={id} />
              </svg>
              {label}
            </button>
          ))}
        </nav>

        {/* user */}
        <div style={{ paddingTop: "14px", borderTop: "1px solid rgba(74,158,255,0.06)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 10px", borderRadius: "8px", marginBottom: "6px", background: "rgba(255,255,255,0.015)" }}>
            <div style={{ width: "32px", height: "32px", borderRadius: "50%", background: "rgba(74,158,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 600, color: "#4A9EFF", flexShrink: 0 }}>
              {userInitial}
            </div>
            <div style={{ overflow: "hidden", minWidth: 0 }}>
              <div style={{ fontSize: "12px", fontWeight: 500, color: "#8AACC8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{userName}</div>
              <div style={{ fontSize: "10px", color: "#1E3A55", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: "1px" }}>{user.email}</div>
            </div>
          </div>
          <form action="/auth/signout" method="post">
            <button type="submit" className="logout-btn" style={{ display: "flex", alignItems: "center", gap: "8px", padding: "8px 10px", borderRadius: "8px", background: "transparent", color: "#1E3A55", fontSize: "12px", cursor: "pointer", width: "100%", border: "none", letterSpacing: "0.02em", transition: "color 0.15s" }}>
              <svg viewBox="0 0 16 16" style={{ width: "13px", height: "13px", flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth={1.6}>
                <path d="M6 2H2v12h4M10 11l3-3-3-3M13 8H6" />
              </svg>
              Cerrar sesión
            </button>
          </form>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", minWidth: 0 }}>
        {/* top bar */}
        <div style={{ padding: "28px 36px 0", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: "22px", fontWeight: 600, color: "#D8EEFF", letterSpacing: "-0.02em" }}>
              {NAV_ITEMS.find((n) => n.id === activeNav)?.label}
            </div>
            <div style={{ fontSize: "12px", color: "#2A4A68", marginTop: "4px", letterSpacing: "0.02em" }}>
              {files.length} archivos · {formatSize(totalSize)}
            </div>
          </div>
          {isAdmin && activeNav === "documentos" && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="upload-btn"
              style={{ display: "flex", alignItems: "center", gap: "8px", background: uploading ? "#2A4A68" : "#4A9EFF", color: "#fff", fontSize: "12px", fontWeight: 600, letterSpacing: "0.06em", textTransform: "uppercase", padding: "11px 20px", borderRadius: "9px", cursor: uploading ? "not-allowed" : "pointer", border: "none", transition: "all 0.2s", whiteSpace: "nowrap", flexShrink: 0 }}
            >
              <svg viewBox="0 0 16 16" style={{ width: "13px", height: "13px" }} fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M8 1v10M4 5l4-4 4 4M1 12v2a1 1 0 001 1h12a1 1 0 001-1v-2" />
              </svg>
              {uploading ? "Subiendo..." : "Subir archivo"}
            </button>
          )}
        </div>

        {/* content */}
        <div style={{ padding: "24px 36px 40px", flex: 1 }}>
          {activeNav === "documentos" ? (
            <>
              {/* drop zone (admin only) */}
              {isAdmin && (
                <div
                  onDragOver={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e: DragEvent<HTMLDivElement>) => { e.preventDefault(); setDragOver(false); if (e.dataTransfer.files) uploadFiles(e.dataTransfer.files); }}
                  onClick={() => fileInputRef.current?.click()}
                  style={{ border: `1px dashed ${dragOver ? "rgba(74,158,255,0.5)" : "rgba(74,158,255,0.12)"}`, borderRadius: "10px", padding: "36px 24px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", cursor: "pointer", background: dragOver ? "rgba(74,158,255,0.04)" : "rgba(74,158,255,0.01)", transition: "all 0.2s", marginBottom: "28px" }}
                >
                  <div style={{ width: "44px", height: "44px", borderRadius: "10px", background: "rgba(74,158,255,0.08)", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "12px" }}>
                    <svg viewBox="0 0 24 24" style={{ width: "22px", height: "22px" }} fill="none" stroke="#4A9EFF" strokeWidth={1.6} opacity={0.8}>
                      <path d="M12 4v14M6 10l6-6 6 6" />
                      <path d="M4 20h16" />
                    </svg>
                  </div>
                  <div style={{ fontSize: "13px", color: "#3D6080" }}>
                    <span style={{ color: "#4A9EFF", fontWeight: 500 }}>Haz clic</span> o arrastra tus archivos aquí
                  </div>
                  <div style={{ fontSize: "11px", color: "#1A3550", letterSpacing: "0.03em", marginTop: "4px" }}>
                    PDF · DOCX · XLSX · PPTX · Máx. 50 MB
                  </div>
                </div>
              )}

              {/* file list */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "12px" }}>
                  <div style={{ fontSize: "10px", letterSpacing: "0.12em", textTransform: "uppercase", color: "#1E3A55", fontWeight: 600 }}>Archivos recientes</div>
                  <div style={{ fontSize: "11px", color: "#1E3A55" }}>{files.length} en total</div>
                </div>

                {/* table header */}
                <div style={{ display: "grid", gridTemplateColumns: "40px 1fr 90px 140px 96px 68px", gap: 0, padding: "0 12px 8px", borderBottom: "1px solid rgba(74,158,255,0.06)" }}>
                  <div />
                  {["Nombre", "Tamaño", "Fecha", "Etiqueta"].map((h) => (
                    <div key={h} style={{ fontSize: "10px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#142840", fontWeight: 600 }}>{h}</div>
                  ))}
                  <div />
                </div>

                {/* rows */}
                {files.map((file) => {
                  const info = typeInfo(file.type);
                  return (
                    <div key={file.id} className="file-row" style={{ display: "grid", gridTemplateColumns: "40px 1fr 90px 140px 96px 68px", gap: 0, padding: "11px 12px", borderBottom: "1px solid rgba(74,158,255,0.04)", alignItems: "center", transition: "background 0.12s" }}>
                      <div style={{ width: "30px", height: "30px", borderRadius: "6px", background: info.bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        <span style={{ fontSize: "9px", fontWeight: 700, color: info.color, letterSpacing: "0.04em" }}>{info.label}</span>
                      </div>
                      <div style={{ fontSize: "13px", color: "#8AACC8", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", paddingRight: "20px" }}>{file.name}</div>
                      <div style={{ fontSize: "12px", color: "#2A4A68" }}>{formatSize(file.size)}</div>
                      <div style={{ fontSize: "12px", color: "#2A4A68" }}>{formatDate(file.created_at)}</div>
                      <div>
                        <span style={{ fontSize: "10px", padding: "3px 8px", borderRadius: "4px", background: "rgba(74,158,255,0.07)", color: "#2A4A68", letterSpacing: "0.04em", fontWeight: 500 }}>{file.tag}</span>
                      </div>
                      <div style={{ display: "flex", gap: "4px", alignItems: "center" }}>
                        <button type="button" onClick={() => downloadFile(file)} className="dl-btn" title="Descargar" style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#2A4A68", borderRadius: "6px", cursor: "pointer", border: "none", transition: "all 0.15s" }}>
                          <svg viewBox="0 0 14 14" style={{ width: "11px", height: "11px" }} fill="none" stroke="currentColor" strokeWidth={1.6}>
                            <path d="M7 1v8M4 7l3 3 3-3M1 12h12" />
                          </svg>
                        </button>
                        {isAdmin && (
                          <button type="button" onClick={() => deleteFile(file)} className="del-btn" title="Eliminar" style={{ width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", background: "transparent", color: "#142840", borderRadius: "6px", cursor: "pointer", border: "none", transition: "all 0.15s" }}>
                            <svg viewBox="0 0 14 14" style={{ width: "11px", height: "11px" }} fill="none" stroke="currentColor" strokeWidth={1.6}>
                              <path d="M2 3h10M5 3V2h4v1M4 3v8a1 1 0 001 1h4a1 1 0 001-1V3" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* empty state */}
                {files.length === 0 && (
                  <div style={{ textAlign: "center", padding: "56px 24px", color: "#142840", fontSize: "13px", letterSpacing: "0.02em" }}>
                    <svg viewBox="0 0 48 48" style={{ width: "40px", height: "40px", margin: "0 auto 14px", display: "block", opacity: 0.3 }} fill="none" stroke="#4A9EFF" strokeWidth={1.5}>
                      <path d="M8 8h20l8 8v28H8z" />
                      <path d="M28 8v10h10M18 26h12M18 33h8" />
                    </svg>
                    {isAdmin
                      ? "No hay archivos subidos aún. Usa el botón de arriba o arrastra archivos."
                      : "No hay archivos disponibles aún."}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "50vh", gap: "12px", color: "#1E3A55" }}>
              <svg viewBox="0 0 48 48" style={{ width: "36px", opacity: 0.25 }} fill="none" stroke="#4A9EFF" strokeWidth={1.5}>
                <circle cx="24" cy="24" r="20" />
                <path d="M24 14v10l6 6" />
              </svg>
              <div style={{ fontSize: "13px", letterSpacing: "0.04em" }}>Próximamente</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
