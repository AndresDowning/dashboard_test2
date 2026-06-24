import { login, signup } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main>
      <span className="badge">Supabase Auth</span>
      <h1>Entrar o crear cuenta</h1>
      <p className="subtitle">
        Email y contraseña. La confirmación de email está desactivada en dev, así
        que entras al instante.
      </p>

      {error && <div className="warn">⚠️ {error}</div>}

      <form className="card">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />

        <label htmlFor="password">Contraseña</label>
        <input id="password" name="password" type="password" required minLength={6} />

        <div className="row">
          <button formAction={login}>Entrar</button>
          <button formAction={signup} className="secondary">
            Crear cuenta
          </button>
        </div>
      </form>
    </main>
  );
}
