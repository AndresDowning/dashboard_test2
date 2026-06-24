# Contexto del proyecto (para Claude Code)

Proyecto de **clase / demo**. Stack: **Next.js 16** (App Router, TS) +
**Supabase** (DB + Auth) + **Vercel**.

## ⚡ Onboarding automático (LEER PRIMERO)

Si acabas de clonar/abrir este repo y **NO existe `.env.local`** (o falta
`NEXT_PUBLIC_SUPABASE_URL`), el proyecto aún no está configurado. En ese caso,
**ejecuta el flujo del comando `/setup`** (ver `.claude/commands/setup.md`) para
crear la base de datos en Supabase, aplicar la migración, configurar la auth y
escribir `.env.local`. No le pidas al alumno correr SQL ni copiar llaves a mano.

Para desplegar, usa el flujo de `/deploy` (`.claude/commands/deploy.md`).

## MCP

- Supabase y Vercel están configurados como MCP **HTTP** en `.mcp.json`
  (`https://mcp.supabase.com/mcp` y `https://mcp.vercel.com`). Ambos se
  autentican con **OAuth de navegador** — sin tokens. Funcionan igual en
  Windows, macOS, Linux y Codespaces.

## Convenciones

- `lib/supabase/server.ts` → Server Components / Route Handlers / Server Actions.
- `lib/supabase/client.ts` → componentes con `"use client"`.
- `lib/supabase/middleware.ts` + `proxy.ts` → refrescan sesión y protegen
  rutas que empiezan con `/dashboard` (convención `proxy` de Next 16).
- Auth: **email + contraseña**, confirmación de email desactivada en dev.
- Variables en `.env.local` (nunca commitear). Las escribe `/setup`.
- Esquema en `supabase/migrations/`.

## Tablas

- `messages` — mensajes demo (del kit original). Lectura pública; escritura
  solo del dueño (`user_id = auth.uid()`) vía RLS.
- `profiles` — un perfil por usuario (`id` = `auth.users.id`). Se crea solo con
  un trigger al registrar. Cada quien ve el suyo; el admin ve todos.
- `documents` — metadatos de archivos: `owner_id`, `file_path`, `file_name`.
  El dueño ve los suyos; solo el admin inserta/borra (RLS vía `is_admin()`).

## Panel de documentos

- Admin = `adowning@paytiptap.com` (en `lib/constants.ts` y en `is_admin()`).
- El admin (en `/admin`) crea usuarios y les sube documentos; cada usuario ve
  los suyos en `/dashboard`. Archivos en el bucket privado `documents`,
  guardados como `{user_id}/{archivo}`.
- `SUPABASE_SERVICE_ROLE_KEY` (solo servidor, en `.env.local`) habilita crear
  usuarios, subir archivos y firmar descargas. Nunca exponer al cliente.

## Cómo correr (si ya está configurado)

```bash
npm install
npm run dev   # http://localhost:3000
```
