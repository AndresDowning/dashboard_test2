---
description: Crea la base de datos en Supabase, aplica la migración, configura auth y deja la app corriendo.
---

Eres el orquestador del arranque de este proyecto. Ejecuta estos pasos en orden,
informando al alumno en español de forma breve en cada paso. Es idempotente:
si algo ya existe, enlázalo en vez de recrearlo.

## 1. Autenticar Supabase (OAuth, sin token)
- Usa el MCP de Supabase (HTTP, hospedado). La primera vez abrirá el navegador
  para un OAuth de Supabase (un clic). No necesitas Personal Access Token.
- No continúes hasta que el MCP esté autenticado.

## 2. Crear o enlazar el proyecto Supabase (MCP de Supabase)
- Lista las organizaciones del alumno con el MCP de Supabase.
- Busca un proyecto llamado `claude-code-clase-demo`. Si existe, úsalo.
- Si no existe, créalo (`create_project`, región más cercana, p. ej. `us-east-1`)
  y espera a que esté ACTIVE antes de seguir.

## 3. Aplicar las migraciones (MCP de Supabase)
- Aplica **en orden** todos los archivos de `supabase/migrations/` con
  `apply_migration`:
  - `0001_init.sql` → tabla `messages` (demo).
  - `0002_documents.sql` → tablas `profiles` y `documents`, función `is_admin()`,
    el bucket privado `documents` en Storage y sus políticas RLS.
  - `0003_metrics.sql` → tabla `metrics` (Excel de métricas por usuario) con su
    RLS (dueño ve las suyas; solo el admin inserta/borra).
  Confirma que las tablas y el bucket `documents` quedaron creados. No le pidas
  al alumno correr SQL a mano.

## 4. Configurar auth
- Asegura que el proveedor email/password esté habilitado y que la
  **confirmación de email esté desactivada** (autoconfirm) para dev. Si no se
  puede vía MCP, indica el toggle exacto en Authentication → Providers → Email.

## 5. Escribir `.env.local`
- Obtén la URL del proyecto (`get_project_url`) y la anon key
  (`get_publishable_keys`) vía el MCP.
- Obtén también la **service role key** (key secreta). Si el MCP no la expone,
  pídesela al alumno desde el dashboard de Supabase
  (Settings → API → `service_role`). Esta key es del lado servidor: crea
  usuarios, sube archivos y firma descargas. Nunca va con prefijo `NEXT_PUBLIC`.
- Escribe/actualiza `.env.local` con:
  - `NEXT_PUBLIC_SUPABASE_URL=...`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
  - `SUPABASE_SERVICE_ROLE_KEY=...`

## 5b. Crear la cuenta del admin
- El admin del panel es `adowning@paytiptap.com` (definido en `lib/constants.ts`
  y en la función `is_admin()` del SQL).
- Para arrancar, el admin entra a `/login` y usa el botón
  **"Crear cuenta de admin"** una sola vez (solo funciona con ese email).
  A partir de ahí, el admin crea las demás cuentas desde `/admin`.

## 6. Instalar y levantar
- Corre `npm install` si `node_modules` no existe.
- Levanta `npm run dev` y dile al alumno que abra http://localhost:3000.
- Sugiere: crear una cuenta en /login y entrar al /dashboard para probar la auth.

Al terminar, muestra un resumen: proyecto Supabase, estado de la migración,
`.env.local` escrito y URL local.
