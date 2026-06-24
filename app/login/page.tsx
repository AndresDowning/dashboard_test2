import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { login, signupAdmin } from "./actions";
import { ADMIN_EMAIL } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <div className="login-page">
      <div className="login-box">
        <div className="login-mark">VERSATA</div>
        <div className="login-tag">Portal de clientes</div>

        <div className="login-title">Acceso seguro</div>
        <p className="login-sub">
          Introduce tus credenciales para entrar al portal.
        </p>

        {error && (
          <div className="alert alert-warn" style={{ margin: "16px 0 4px" }}>
            {error}
          </div>
        )}

        <form>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
          />

          <label htmlFor="password">Contraseña</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={6}
            autoComplete="current-password"
          />

          <div className="btn-row" style={{ marginTop: 20 }}>
            <button
              formAction={login}
              className="btn-primary"
              style={{ flex: 1 }}
            >
              Entrar
            </button>
            <button formAction={signupAdmin} className="btn-ghost">
              Activar admin
            </button>
          </div>
        </form>

        <p className="login-note">
          Las cuentas de usuario las crea el administrador. "Activar admin"
          solo funciona con <code>{ADMIN_EMAIL}</code> y se usa una sola vez
          para el arranque.
        </p>
      </div>
    </div>
  );
}
