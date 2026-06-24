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

  // Si ya hay sesión, no mostramos el login.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  return (
    <main>
      <span className="badge">Acceso</span>
      <h1>Entrar</h1>
      <p className="subtitle">
        Email y contraseña. Si eres usuario y no tienes cuenta, el administrador
        debe crearla por ti.
      </p>

      {error && <div className="warn">⚠️ {error}</div>}

      <form className="card">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />

        <label htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required minLength={6} />

        <div className="row">
          <button formAction={login}>Entrar</button>
          <button formAction={signupAdmin} className="secondary">
            Crear cuenta de admin
          </button>
        </div>
      </form>

      <p className="subtitle" style={{ marginTop: "1rem", fontSize: "0.85rem" }}>
        “Crear cuenta de admin” solo funciona con <code>{ADMIN_EMAIL}</code> y se
        usa una sola vez para el arranque.
      </p>
    </main>
  );
}
