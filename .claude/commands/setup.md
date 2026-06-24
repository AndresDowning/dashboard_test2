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

## 3. Aplicar la migración (MCP de Supabase)
- Aplica el SQL de `supabase/migrations/0001_init.sql` con `apply_migration`.
  Confirma que la tabla `public.messages` y sus políticas RLS quedaron creadas.
  No le pidas al alumno correr SQL a mano.

## 4. Configurar auth
- Asegura que el proveedor email/password esté habilitado y que la
  **confirmación de email esté desactivada** (autoconfirm) para dev. Si no se
  puede vía MCP, indica el toggle exacto en Authentication → Providers → Email.

## 5. Escribir `.env.local`
- Obtén la URL del proyecto (`get_project_url`) y la anon key
  (`get_publishable_keys`) vía el MCP.
- Escribe/actualiza `.env.local` con:
  - `NEXT_PUBLIC_SUPABASE_URL=...`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`

## 6. Instalar y levantar
- Corre `npm install` si `node_modules` no existe.
- Levanta `npm run dev` y dile al alumno que abra http://localhost:3000.
- Sugiere: crear una cuenta en /login y entrar al /dashboard para probar la auth.

Al terminar, muestra un resumen: proyecto Supabase, estado de la migración,
`.env.local` escrito y URL local.
