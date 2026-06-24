import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <>
      <style>{`
        .login-input:focus {
          border-color: rgba(74,158,255,0.4) !important;
          background: rgba(74,158,255,0.03) !important;
          outline: none;
        }
        .login-btn:hover { background: #6AB4FF !important; transform: translateY(-1px); }
        .signup-link:hover { color: #6AB4FF !important; }
      `}</style>
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "radial-gradient(ellipse 90% 70% at 50% -10%, #0D2440 0%, #060D1A 65%)", position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(74,158,255,0.025) 1px,transparent 1px),linear-gradient(90deg,rgba(74,158,255,0.025) 1px,transparent 1px)", backgroundSize: "72px 72px", pointerEvents: "none" }} />
        <div style={{ position: "absolute", top: "-200px", right: "-200px", width: "600px", height: "600px", background: "radial-gradient(circle,rgba(74,158,255,0.05) 0%,transparent 68%)", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: "-200px", left: "-200px", width: "500px", height: "500px", background: "radial-gradient(circle,rgba(30,90,160,0.04) 0%,transparent 70%)", pointerEvents: "none" }} />

        <div style={{ position: "relative", zIndex: 1, width: "100%", maxWidth: "400px", padding: "0 28px", animation: "fadeUp 0.7s cubic-bezier(0.22,1,0.36,1) both" }}>
          {/* logo */}
          <div style={{ marginBottom: "52px", textAlign: "center" }}>
            <div style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: "48px", height: "48px", borderRadius: "10px", background: "rgba(74,158,255,0.1)", border: "1px solid rgba(74,158,255,0.18)", marginBottom: "20px" }}>
              <svg viewBox="0 0 24 24" style={{ width: "22px", height: "22px" }} fill="none">
                <path d="M4 5h16L12 19 4 5z" fill="#4A9EFF" opacity={0.9} />
              </svg>
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700, letterSpacing: "0.22em", color: "#E0EEFA", textTransform: "uppercase", marginBottom: "6px" }}>VERSATA</div>
            <div style={{ fontSize: "11px", letterSpacing: "0.14em", color: "#2A4A68", textTransform: "uppercase", fontWeight: 400 }}>Consultoría Estratégica</div>
          </div>

          <form style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
            <div>
              <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#2E5070", marginBottom: "8px", fontWeight: 500 }}>Correo electrónico</div>
              <input
                name="email"
                type="email"
                required
                placeholder="tu@versata.mx"
                className="login-input"
                style={{ width: "100%", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(74,158,255,0.1)", borderRadius: "9px", padding: "13px 16px", color: "#C4D9EE", fontSize: "14px", letterSpacing: "0.01em", transition: "border-color 0.2s, background 0.2s" }}
              />
            </div>
            <div>
              <div style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#2E5070", marginBottom: "8px", fontWeight: 500 }}>Contraseña</div>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                className="login-input"
                style={{ width: "100%", background: "rgba(255,255,255,0.025)", border: "1px solid rgba(74,158,255,0.1)", borderRadius: "9px", padding: "13px 16px", color: "#C4D9EE", fontSize: "14px", letterSpacing: "0.04em", transition: "border-color 0.2s, background 0.2s" }}
              />
            </div>

            {error && (
              <div style={{ color: "#FF6565", fontSize: "12px", textAlign: "center", letterSpacing: "0.02em" }}>
                {decodeURIComponent(error)}
              </div>
            )}

            <button
              formAction={login}
              style={{ width: "100%", background: "#4A9EFF", color: "#fff", fontSize: "13px", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", padding: "14px", borderRadius: "9px", cursor: "pointer", transition: "all 0.2s", border: "none", marginTop: "10px" }}
              className="login-btn"
            >
              Iniciar sesión
            </button>

            <div style={{ textAlign: "center", fontSize: "11px", color: "#1E3A55", letterSpacing: "0.02em" }}>
              ¿No tienes cuenta?{" "}
              <button
                formAction={signup}
                style={{ background: "none", border: "none", color: "#4A9EFF", cursor: "pointer", fontSize: "11px", letterSpacing: "0.02em", textDecoration: "underline", transition: "color 0.15s" }}
                className="signup-link"
              >
                Crear cuenta
              </button>
            </div>
          </form>

          <div style={{ textAlign: "center", marginTop: "28px", fontSize: "11px", color: "#18304A", letterSpacing: "0.04em" }}>
            Acceso seguro · Versata © 2026
          </div>
        </div>
      </div>
    </>
  );
}
