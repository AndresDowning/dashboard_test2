import { createClient } from "@supabase/supabase-js";

// Cliente con SERVICE ROLE: ignora RLS. SOLO usar en el servidor (Server
// Actions / Route Handlers), nunca en componentes de cliente. Se usa para
// crear usuarios, subir archivos y generar URLs firmadas de descarga.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
