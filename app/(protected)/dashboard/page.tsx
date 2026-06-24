import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defensa extra además del middleware.
  if (!user) redirect("/login");

  return (
    <main>
      <span className="badge">Ruta protegida</span>
      <h1>Dashboard</h1>
      <p className="subtitle">
        Solo visible con sesión iniciada. Sesión de: <code>{user.email}</code>
      </p>

      <form action="/auth/signout" method="post">
        <button>Cerrar sesión</button>
      </form>
    </main>
  );
}
