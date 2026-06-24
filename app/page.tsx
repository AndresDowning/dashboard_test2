import { createClient } from "@/lib/supabase/server";

// Forzamos render dinámico: leemos datos frescos de Supabase en cada request.
export const dynamic = "force-dynamic";

type Message = { id: number; content: string; created_at: string };

export default async function Home() {
  const hasEnv =
    !!process.env.NEXT_PUBLIC_SUPABASE_URL &&
    !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  let messages: Message[] = [];
  let error: string | null = null;

  if (hasEnv) {
    const supabase = await createClient();
    const { data, error: dbError } = await supabase
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true });
    if (dbError) error = dbError.message;
    else messages = data ?? [];
  }

  return (
    <main>
      <span className="badge">Next.js + Supabase + Vercel</span>
      <h1>Claude Code · Clase Demo</h1>
      <p className="subtitle">
        Esta página lee mensajes en vivo desde Supabase. Edítala con Claude Code
        y vuelve a desplegar en Vercel.
      </p>

      {!hasEnv && (
        <div className="warn">
          ⚠️ Falta configurar Supabase. Copia <code>.env.example</code> a{" "}
          <code>.env.local</code> y rellena tus llaves. En Vercel, agrégalas en
          Project Settings → Environment Variables.
        </div>
      )}

      {hasEnv && error && (
        <div className="warn">
          ⚠️ Error al consultar Supabase: {error}
          <br />
          ¿Corriste el SQL de <code>supabase/migrations/0001_init.sql</code>?
        </div>
      )}

      {hasEnv &&
        !error &&
        messages.map((m) => (
          <div key={m.id} className="card">
            {m.content}
          </div>
        ))}

      {hasEnv && !error && messages.length === 0 && (
        <div className="card">
          No hay mensajes todavía. Inserta algunos en la tabla{" "}
          <code>messages</code>.
        </div>
      )}
    </main>
  );
}
