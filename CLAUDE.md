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

- `messages` — mensajes demo. Lectura pública; escritura solo del dueño
  (`user_id = auth.uid()`) vía RLS.

## Cómo correr (si ya está configurado)

```bash
npm install
npm run dev   # http://localhost:3000
```
