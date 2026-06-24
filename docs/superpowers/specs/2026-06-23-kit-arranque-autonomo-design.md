# Spec: Kit de arranque autónomo para clase de Claude Code

**Fecha:** 2026-06-23
**Repo:** `adowningtiptap/claude-code-clase-demo`
**Stack:** Next.js 15 (App Router, TS) + Supabase (DB + Auth) + Vercel

## Objetivo

Convertir el repo de "starter para clonar y configurar a mano" en un **kit de
arranque autónomo**: el alumno, con Claude Code instalado, pega el link del repo
y el agente arma toda la base del proyecto automáticamente — crea la base de
datos en Supabase, deja la autenticación lista, escribe las llaves y despliega a
Vercel. Sin SQL manual, sin copiar llaves a mano, sin pasos en dashboards más
allá de dos autenticaciones de un clic.

## Principios de diseño

- **Un solo secreto manual por servicio.** Supabase: un Access Token (pegar una
  vez). Vercel: un OAuth (un clic). Todo lo demás lo hace el agente.
- **El repo es autodescriptivo.** `CLAUDE.md` instruye al agente para que, al
  entrar a un repo recién clonado sin `.env.local`, ejecute el flujo de `/setup`.
- **Confiable en clase en vivo.** El starter ya viene funcionando (home + auth);
  Claude solo conecta infraestructura y luego extiende features bajo pedido.
- **Idempotente.** `/setup` y `/deploy` se pueden correr varias veces sin romper.
- **Funciona local y en Codespaces.** El devcontainer hace cero-instalación en
  Codespaces; en local solo se asume Node 20+ y Claude Code.

## Experiencia del alumno (meta)

1. Instala Claude Code (único install; es el tema de la clase).
2. Corre `claude` en una carpeta vacía y pega el prompt que da el README:
   > "Clona y configura este proyecto: `https://github.com/adowningtiptap/claude-code-clase-demo`"
3. Claude clona el repo, entra, lee `CLAUDE.md` y arranca el flujo solo.
4. Claude pide lo único manual: el **Access Token de Supabase** (un clic en el
   dashboard, se pega una vez).
5. Claude ejecuta `/setup`: crea la DB, corre la migración, configura auth,
   escribe `.env.local`, instala dependencias y levanta la app.
6. (Opcional) el alumno dice "despliega" → Claude ejecuta `/deploy` (un OAuth de
   Vercel) y devuelve la URL en vivo.

## Arquitectura / componentes

### Componentes nuevos en el repo

| Archivo | Propósito |
|---|---|
| `.devcontainer/devcontainer.json` | Node 20 + Claude Code preinstalados + `npm install` en `postCreateCommand`. Cero-instalación en Codespaces; inofensivo en local. |
| `.mcp.json` | Declara los MCP de **Supabase** y **Vercel**, con tokens/OAuth leídos de entorno. Claude Code los carga al entrar al repo. |
| `.claude/commands/setup.md` | Comando `/setup`: orquesta el arranque completo. |
| `.claude/commands/deploy.md` | Comando `/deploy`: despliegue a Vercel vía MCP. |
| `CLAUDE.md` (ampliado) | Onboarding: si el repo está recién clonado y falta `.env.local`, ejecutar `/setup`. Convenciones de auth y proyecto. |
| `README.md` (reescrito) | Flujo "pega el link" + prompt listo para copiar. |
| `.env.example` (ampliado) | Agrega `SUPABASE_ACCESS_TOKEN` (para el MCP). |

### Starter con Supabase Auth (cambios en la app)

| Archivo | Propósito |
|---|---|
| `app/login/page.tsx` | Registro + inicio de sesión (email + contraseña). |
| `app/(protected)/dashboard/page.tsx` | Ruta protegida; solo usuarios logueados. |
| `app/auth/signout/route.ts` | Cierre de sesión. |
| `middleware.ts` | Refresca la sesión SSR y protege rutas `(protected)`. |
| `lib/supabase/middleware.ts` | Helper de sesión para el middleware. |
| `app/page.tsx` (ajustado) | Muestra estado de sesión y enlaza a login/dashboard. |
| `supabase/migrations/0001_init.sql` (ampliado) | `messages` con `user_id` ligado a `auth.uid()` + RLS por usuario, conservando la lectura pública demo. |

### Autenticación

- **Email + contraseña**, con **confirmación de email desactivada en dev** para
  que el alumno se registre y entre al instante sin configurar SMTP.
- La configuración de auth se aplica vía el MCP/Management API de Supabase dentro
  de `/setup` (no a mano en el dashboard).

## Flujo de `/setup` (idempotente)

1. Verifica `SUPABASE_ACCESS_TOKEN`; si falta, pide al alumno pegarlo y lo guarda
   en el entorno local (no se commitea).
2. Vía MCP de Supabase: crea el proyecto (o enlaza uno existente del alumno).
3. Aplica la migración SQL (`supabase/migrations/`) — tablas + RLS. Cero SQL manual.
4. Configura auth: email/password, confirmación de email off en dev.
5. Obtiene `Project URL` + `anon key` y escribe `.env.local`.
6. `npm install` si hace falta y levanta `npm run dev` (http://localhost:3000).

## Flujo de `/deploy` (Vercel vía MCP)

1. El alumno autentica el MCP de Vercel (un OAuth, un clic).
2. Vía MCP de Vercel: crea el proyecto en Vercel (enlazado al repo).
3. Sube las variables de entorno (las mismas de `.env.local`).
4. Despliega a producción y devuelve la URL en vivo.
5. Fallback documentado: botón "Deploy with Vercel" del README.

## Manejo de errores

- **Falta el token de Supabase:** `/setup` lo detecta y da instrucciones exactas
  (con el link al dashboard) para generarlo y pegarlo.
- **MCP no disponible (sin Node/npx):** documentar que el devcontainer lo cubre;
  en local, fallback a la CLI de Supabase o pasos manuales en el README.
- **Migración ya aplicada:** `/setup` es idempotente (usa `create ... if not
  exists` y políticas con guardas).
- **Proyecto Supabase ya existe:** `/setup` ofrece enlazar en vez de recrear.
- **Deploy sin OAuth de Vercel:** `/deploy` detecta y guía el OAuth, o remite al
  botón 1-clic.

## Fuera de alcance (YAGNI)

- OAuth de terceros (Google, GitHub) en el starter — solo email/password.
- Magic link / configuración de SMTP.
- CI/CD más allá del deploy de Vercel.
- Migraciones múltiples / versionado de esquema complejo.

## Criterios de éxito

1. Un alumno con solo Claude Code instalado, pegando el link del repo, llega a una
   app corriendo con DB + auth funcionando, aportando únicamente el token de Supabase.
2. No se ejecuta SQL a mano en ningún momento.
3. No se copian llaves a mano: `.env.local` lo escribe el agente.
4. `/deploy` deja una URL pública de Vercel funcionando.
5. Funciona igual en Codespaces (cero install) y en local (Node 20+ + Claude Code).
