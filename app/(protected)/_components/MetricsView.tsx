import type { ReactNode } from "react";

export type MetricRecord = {
  id: string;
  source_name: string;
  headers: string[];
  rows: (string | number)[][];
  created_at: string;
};

function isNumeric(v: unknown): boolean {
  if (typeof v === "number") return Number.isFinite(v);
  if (typeof v === "string") {
    const cleaned = v.replace(/[$,%\s]/g, "");
    return cleaned !== "" && !Number.isNaN(Number(cleaned));
  }
  return false;
}

function toNumber(v: unknown): number {
  if (typeof v === "number") return v;
  return Number(String(v).replace(/[$,%\s]/g, ""));
}

function fmt(v: string | number): string {
  if (typeof v === "number") return v.toLocaleString("es");
  return String(v);
}

/**
 * Renderiza un conjunto de métricas (un Excel parseado).
 * - 2 columnas  → tarjetas KPI (+ mini gráfico de barras si todo es numérico).
 * - 3+ columnas → tabla.
 * `children` es un slot opcional para acciones (p. ej. botón de borrar).
 */
export function MetricsView({
  record,
  children,
}: {
  record: MetricRecord;
  children?: ReactNode;
}) {
  const { headers, rows } = record;
  const twoCol = headers.length === 2;
  const allNumeric =
    twoCol && rows.length > 0 && rows.every((r) => isNumeric(r[1]));
  const maxVal = allNumeric
    ? Math.max(...rows.map((r) => Math.abs(toNumber(r[1]))), 1)
    : 1;

  const date = new Date(record.created_at).toLocaleString("es", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="form-section">
      <div className="tbl-head-row">
        <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
          <span className="ext-badge">XLS</span>
          <div style={{ minWidth: 0 }}>
            <div className="tbl-title" style={{ fontSize: 16 }}>
              {record.source_name}
            </div>
            <div className="tbl-subtitle">
              {date} · {rows.length} fila{rows.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
        {children}
      </div>

      {twoCol ? (
        <>
          {/* Tarjetas KPI */}
          <div className="stats-row" style={{ marginBottom: allNumeric ? 16 : 0 }}>
            {rows.map((r, i) => (
              <div className="stat-card" key={i}>
                <div className="stat-lbl">{String(r[0] ?? "")}</div>
                <div className="stat-num">{fmt(r[1])}</div>
              </div>
            ))}
          </div>

          {/* Mini gráfico de barras (solo si todos los valores son numéricos) */}
          {allNumeric && (
            <div className="tbl" style={{ padding: "8px 4px" }}>
              {rows.map((r, i) => {
                const val = toNumber(r[1]);
                const pct = Math.max(2, Math.round((Math.abs(val) / maxVal) * 100));
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 16,
                      padding: "10px 18px",
                    }}
                  >
                    <div
                      style={{
                        width: 180,
                        fontSize: 12.5,
                        color: "#10203a",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {String(r[0] ?? "")}
                    </div>
                    <div
                      style={{
                        flex: 1,
                        height: 8,
                        background: "#eef0f3",
                        borderRadius: 5,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${pct}%`,
                          height: "100%",
                          background:
                            "linear-gradient(90deg,#0f1b2d,#c9a86a)",
                          borderRadius: 5,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        width: 90,
                        textAlign: "right",
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 12,
                        color: "#10203a",
                      }}
                    >
                      {fmt(r[1])}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* Tabla genérica para 1 o 3+ columnas */
        <div className="tbl" style={{ overflowX: "auto" }}>
          <div className="tbl-col-head">
            {headers.map((h, i) => (
              <div
                key={i}
                style={{
                  flex: 1,
                  minWidth: 120,
                  textAlign: i === 0 ? "left" : "right",
                }}
              >
                {h || `Col ${i + 1}`}
              </div>
            ))}
          </div>
          {rows.map((r, ri) => (
            <div className="tbl-row" key={ri}>
              {headers.map((_, ci) => {
                const cell = r[ci] ?? "";
                const num = isNumeric(cell);
                return (
                  <div
                    key={ci}
                    style={{
                      flex: 1,
                      minWidth: 120,
                      fontSize: 13,
                      color: ci === 0 ? "#10203a" : "#5b6b80",
                      fontWeight: ci === 0 ? 500 : 400,
                      textAlign: ci === 0 ? "left" : "right",
                      fontFamily: num
                        ? "'IBM Plex Mono', monospace"
                        : "'IBM Plex Sans', sans-serif",
                    }}
                  >
                    {fmt(cell)}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
