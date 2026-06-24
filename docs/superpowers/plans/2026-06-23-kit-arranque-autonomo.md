# Kit de Arranque Autónomo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convertir el repo en un kit de arranque autónomo donde el alumno pega el link, y Claude Code arma la base (Next.js + Supabase DB + Auth) y despliega a Vercel, con solo dos auths de un clic.

**Architecture:** El repo ya trae la app Next.js funcionando con Supabase Auth (email/contraseña) y RLS por usuario. Se agregan `.mcp.json` (MCP de Supabase y Vercel), un devcontainer, y comandos `/setup` y `/deploy` que orquestan la creación de la DB, la migración SQL, el `.env.local` y el deploy — sin pasos manuales más allá de pegar el token de Supabase y un OAuth de Vercel. `CLAUDE.md` instruye al agente para autoejecutar `/setup` al entrar a un repo recién clonado.

**Tech Stack:** Next.js 16 (App Router, TS), `@supabase/ssr` + `@supabase/supabase-js`, MCP de Supabase (`@supabase/mcp-server-supabase`), MCP de Vercel, GitHub Codespaces devcontainer.

## Global Constraints

- Next.js: `^16.2.9` (App Router, TypeScript). No bajar de versión.
- Supabase libs: `@supabase/ssr ^0.5.2`, `@supabase/supabase-js ^2.45.4`.
- Auth: **solo email + contraseña**; confirmación de email **desactivada en dev**. Sin OAuth de terceros, sin magic link.
- Idioma de toda la copia visible y comentarios: **español**.
- Variables públicas: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Variable de MCP: `SUPABASE_ACCESS_TOKEN`.
- Nunca commitear `.env.local` ni `.env` (ya está en `.gitignore`).
- Verificación por tarea: `npm run build` debe pasar sin errores de tipos. No hay suite de tests unitarios; el gate es build + typecheck + smoke manual documentado.

---

### Task 1: Migración con RLS por usuario

**Files:**
- Modify: `supabase/migrations/0001_init.sql`

**Interfaces:**
- Produces: tabla `public.messages` con columnas `id`, `content`, `user_id (uuid → auth.users)`, `created_at`; políticas RLS: lectura pública (`messages_select_public`) + insert/update/delete propios del usuario autenticado.

- [ ] **Step 1: Reescribir la migración con `user_id` + RLS por usuario**

Reemplazar el contenido completo de `supabase/migrations/0001_init.sql` por:

```sql
-- Tabla demo para la clase: mensajes con dueño (user_id) y RLS por usuario.
-- /setup aplica este SQL automáticamente vía el MCP de Supabase. No correr a mano.

create table if not exists public.messages (
  id          bigint generated always as identity primary key,
  content     text not null,
  user_id     uuid references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

alter table public.messages enable row level security;

-- Lectura pública (demo): cualquiera puede LEER los mensajes.
drop policy if exists "messages_select_public" on public.messages;
create policy "messages_select_public"
  on public.messages
  for select
  using (true);

-- Escritura: cada usuario autenticado gestiona SOLO sus propios mensajes.
drop policy if exists "messages_insert_own" on public.messages;
create policy "messages_insert_own"
  on public.messages
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "messages_update_own" on public.messages;
create policy "messages_update_own"
  on public.messages
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "messages_delete_own" on public.messages;
create policy "messages_delete_own"
  on public.messages
  for delete
  using (auth.uid() = user_id);

-- Datos de ejemplo (sin dueño) para que la home no aparezca vacía.
insert into public.messages (content)
select '¡Hola desde Supabase! 👋'
where not exists (select 1 from public.messages);
insert into public.messages (content)
select 'Este mensaje vino de la base de datos.'
where (select count(*) from public.messages) < 2;
insert into public.messages (content)
select 'Edita este proyecto con Claude Code y vuelve a desplegarlo.'
where (select count(*) from public.messages) < 3;
```

- [ ] **Step 2: Verificar que el SQL es idempotente (revisión)**

Revisar que todas las creaciones usan `if not exists` / `drop policy if exists` y que los inserts están guardados con `where not exists` / `count`. Releer el archivo y confirmar.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/0001_init.sql
git commit -m "feat: migración con user_id y RLS por usuario"
```

---

### Task 2: Middleware SSR + helper de sesión

**Files:**
- Create: `lib/supabase/middleware.ts`
- Create: `middleware.ts`

**Interfaces:**
- Consumes: variables `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- Produces: `updateSession(request: NextRequest): Promise<NextResponse>` en `lib/supabase/middleware.ts`; middleware raíz que la invoca y protege rutas que empiezan con `/dashboard`.

- [ ] **Step 1: Crear `lib/supabase/middleware.ts`**

```ts
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refresca la sesión de Supabase en cada request y protege rutas privadas.
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Rutas protegidas: redirigir a /login si no hay sesión.
  if (!user && request.nextUrl.pathname.startsWith("/dashboard")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return response;
}
```

- [ ] **Step 2: Crear `middleware.ts` en la raíz**

```ts
import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  // Excluye estáticos e imágenes; corre en todo lo demás.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
```

- [ ] **Step 3: Verificar el build**

Run: `cd /tmp/claude-code-clase-demo && npm install && npm run build`
Expected: build completa sin errores de tipos (puede advertir sobre env vars faltantes en runtime, pero compila).

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/middleware.ts middleware.ts
git commit -m "feat: middleware SSR para sesión Supabase y protección de rutas"
```

---

### Task 3: Página de login/registro + cierre de sesión

**Files:**
- Create: `app/login/page.tsx`
- Create: `app/login/actions.ts`
- Create: `app/auth/signout/route.ts`

**Interfaces:**
- Consumes: `createClient()` de `lib/supabase/server.ts`.
- Produces: server actions `login(formData)` y `signup(formData)`; ruta `POST /auth/signout`.

- [ ] **Step 1: Crear `app/login/actions.ts`**

```ts
"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function login(formData: FormData) {
  const supabase = await createClient();
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signInWithPassword(data);
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();
  const data = {
    email: formData.get("email") as string,
    password: formData.get("password") as string,
  };

  const { error } = await supabase.auth.signUp(data);
  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/dashboard");
}
```

- [ ] **Step 2: Crear `app/login/page.tsx`**

```tsx
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
```

- [ ] **Step 3: Crear `app/auth/signout/route.ts`**

```ts
import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
```

- [ ] **Step 4: Agregar estilos de formulario a `app/globals.css`**

Añadir al final de `app/globals.css`:

```css
.row {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

label {
  display: block;
  margin: 0.75rem 0 0.25rem;
  color: var(--muted);
  font-size: 0.9rem;
}

input {
  width: 100%;
  padding: 0.6rem 0.75rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--fg);
  font: inherit;
}

button {
  padding: 0.6rem 1rem;
  background: var(--accent);
  color: #fff;
  border: none;
  border-radius: 8px;
  font: inherit;
  cursor: pointer;
}

button.secondary {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--fg);
}

a {
  color: var(--accent);
}
```

- [ ] **Step 5: Verificar el build**

Run: `cd /tmp/claude-code-clase-demo && npm run build`
Expected: compila sin errores de tipos.

- [ ] **Step 6: Commit**

```bash
git add app/login/actions.ts app/login/page.tsx app/auth/signout/route.ts app/globals.css
git commit -m "feat: login/registro con Supabase Auth y cierre de sesión"
```

---

### Task 4: Ruta protegida + home con estado de sesión

**Files:**
- Create: `app/(protected)/dashboard/page.tsx`
- Modify: `app/page.tsx`

**Interfaces:**
- Consumes: `createClient()` de `lib/supabase/server.ts`; protección por `middleware.ts` (Task 2); ruta `POST /auth/signout` (Task 3).

- [ ] **Step 1: Crear `app/(protected)/dashboard/page.tsx`**

```tsx
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
```

- [ ] **Step 2: Actualizar `app/page.tsx` para mostrar estado de sesión**

Reemplazar el contenido completo de `app/page.tsx` por:

```tsx
import Link from "next/link";
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
  let userEmail: string | null = null;

  if (hasEnv) {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;

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

      <div className="row">
        {userEmail ? (
          <Link href="/dashboard">Ir al dashboard ({userEmail})</Link>
        ) : (
          <Link href="/login">Entrar / crear cuenta</Link>
        )}
      </div>

      {!hasEnv && (
        <div className="warn">
          ⚠️ Falta configurar Supabase. Ejecuta <code>/setup</code> en Claude
          Code para crear la base de datos y escribir <code>.env.local</code>{" "}
          automáticamente.
        </div>
      )}

      {hasEnv && error && (
        <div className="warn">
          ⚠️ Error al consultar Supabase: {error}
          <br />
          ¿Ya corrió la migración? Ejecuta <code>/setup</code> de nuevo.
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
```

- [ ] **Step 3: Verificar el build**

Run: `cd /tmp/claude-code-clase-demo && npm run build`
Expected: compila sin errores; aparecen rutas `/`, `/login`, `/dashboard`, `/auth/signout`.

- [ ] **Step 4: Commit**

```bash
git add "app/(protected)/dashboard/page.tsx" app/page.tsx
git commit -m "feat: ruta protegida /dashboard y home con estado de sesión"
```

---

### Task 5: `.mcp.json` (Supabase + Vercel) y `.env.example`

**Files:**
- Create: `.mcp.json`
- Modify: `.env.example`

**Interfaces:**
- Produces: configuración de MCP que Claude Code carga al abrir el repo; variable `SUPABASE_ACCESS_TOKEN` documentada.

- [ ] **Step 1: Crear `.mcp.json`**

```json
{
  "mcpServers": {
    "supabase": {
      "command": "npx",
      "args": ["-y", "@supabase/mcp-server-supabase@latest"],
      "env": {
        "SUPABASE_ACCESS_TOKEN": "${SUPABASE_ACCESS_TOKEN}"
      }
    },
    "vercel": {
      "type": "http",
      "url": "https://mcp.vercel.com"
    }
  }
}
```

- [ ] **Step 2: Ampliar `.env.example`**

Reemplazar el contenido de `.env.example` por:

```bash
# ── Supabase (app) ───────────────────────────────────────
# Las escribe /setup automáticamente. Project Settings → API en el dashboard.
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key

# ── Supabase (MCP / agente) ──────────────────────────────
# Token personal para que Claude Code cree el proyecto y corra la migración.
# Genéralo en: https://supabase.com/dashboard/account/tokens
# Pégalo aquí (o en tu shell) ANTES de correr /setup. NO se commitea.
SUPABASE_ACCESS_TOKEN=tu-access-token
```

- [ ] **Step 3: Verificar que `.gitignore` ya ignora `.env*.local`**

Run: `cd /tmp/claude-code-clase-demo && grep -n "env" .gitignore`
Expected: aparece `.env` y `.env*.local`. (Ya presente — no editar.)

- [ ] **Step 4: Commit**

```bash
git add .mcp.json .env.example
git commit -m "feat: configuración MCP de Supabase y Vercel + token en .env.example"
```

---

### Task 6: Devcontainer para Codespaces

**Files:**
- Create: `.devcontainer/devcontainer.json`

**Interfaces:**
- Produces: entorno Codespaces con Node 20, Claude Code y `npm install` automático.

- [ ] **Step 1: Crear `.devcontainer/devcontainer.json`**

```json
{
  "name": "Claude Code · Clase Demo",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:20",
  "features": {
    "ghcr.io/devcontainers/features/github-cli:1": {}
  },
  "postCreateCommand": "npm install && curl -fsSL https://claude.ai/install.sh | bash",
  "remoteEnv": {
    "PATH": "${containerEnv:PATH}:/home/node/.local/bin"
  },
  "customizations": {
    "vscode": {
      "extensions": ["esbenp.prettier-vscode"]
    }
  }
}
```

- [ ] **Step 2: Validar el JSON**

Run: `cd /tmp/claude-code-clase-demo && node -e "JSON.parse(require('fs').readFileSync('.devcontainer/devcontainer.json','utf8')); console.log('JSON válido')"`
Expected: `JSON válido`

- [ ] **Step 3: Commit**

```bash
git add .devcontainer/devcontainer.json
git commit -m "feat: devcontainer Codespaces con Node 20 y Claude Code"
```

---

### Task 7: Comando `/setup`

**Files:**
- Create: `.claude/commands/setup.md`

**Interfaces:**
- Consumes: MCP de Supabase (Task 5), migración (Task 1), `SUPABASE_ACCESS_TOKEN`.
- Produces: instrucciones del slash command `/setup` que crea/enlaza el proyecto Supabase, aplica la migración, configura auth, escribe `.env.local`, instala deps y levanta dev.

- [ ] **Step 1: Crear `.claude/commands/setup.md`**

```markdown
---
description: Crea la base de datos en Supabase, aplica la migración, configura auth y deja la app corriendo.
---

Eres el orquestador del arranque de este proyecto. Ejecuta estos pasos en orden,
informando al alumno en español de forma breve en cada paso. Es idempotente:
si algo ya existe, enlázalo en vez de recrearlo.

## 1. Verificar el token de Supabase
- Lee `SUPABASE_ACCESS_TOKEN` del entorno (o de `.env.local`).
- Si falta, pide al alumno generarlo en
  https://supabase.com/dashboard/account/tokens y pegarlo. Guárdalo en
  `.env.local` (que está en `.gitignore`). NO continúes sin token.

## 2. Crear o enlazar el proyecto Supabase (MCP de Supabase)
- Lista las organizaciones del alumno con el MCP de Supabase.
- Busca un proyecto llamado `claude-code-clase-demo`. Si existe, úsalo.
- Si no existe, créalo (región más cercana, p. ej. `us-east-1`) y espera a que
  esté ACTIVE antes de seguir.

## 3. Aplicar la migración (MCP de Supabase)
- Aplica el SQL de `supabase/migrations/0001_init.sql` con la herramienta de
  migración del MCP. Confirma que la tabla `public.messages` y sus políticas RLS
  quedaron creadas. No le pidas al alumno correr SQL a mano.

## 4. Configurar auth
- Asegura que el proveedor email/password esté habilitado y que la
  **confirmación de email esté desactivada** (autoconfirm) para dev, usando el
  MCP/management de Supabase. Si no se puede vía MCP, indica el toggle exacto en
  Authentication → Providers → Email.

## 5. Escribir `.env.local`
- Obtén `Project URL` y `anon key` del proyecto vía el MCP.
- Escribe/actualiza `.env.local` con:
  - `NEXT_PUBLIC_SUPABASE_URL=...`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY=...`
  - Conserva `SUPABASE_ACCESS_TOKEN` si ya estaba.

## 6. Instalar y levantar
- Corre `npm install` si `node_modules` no existe.
- Levanta `npm run dev` y dile al alumno que abra http://localhost:3000.
- Sugiere: crear una cuenta en /login y entrar al /dashboard para probar la auth.

Al terminar, muestra un resumen: proyecto Supabase, estado de la migración,
`.env.local` escrito y URL local.
```

- [ ] **Step 2: Verificar frontmatter y existencia**

Run: `cd /tmp/claude-code-clase-demo && head -3 .claude/commands/setup.md`
Expected: muestra el bloque `---` con `description:`.

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/setup.md
git commit -m "feat: comando /setup que arma la base del proyecto"
```

---

### Task 8: Comando `/deploy`

**Files:**
- Create: `.claude/commands/deploy.md`

**Interfaces:**
- Consumes: MCP de Vercel (Task 5), `.env.local` (Task 7).
- Produces: instrucciones del slash command `/deploy` que crea el proyecto en Vercel, sube env vars y despliega.

- [ ] **Step 1: Crear `.claude/commands/deploy.md`**

```markdown
---
description: Despliega la app a Vercel vía MCP — crea el proyecto, sube env vars y publica a producción.
---

Eres el orquestador del despliegue. Ejecuta en orden, en español y breve.
Requiere que `/setup` ya haya escrito `.env.local`.

## 1. Autenticar Vercel
- Usa el MCP de Vercel. Si pide autenticación, guía al alumno por el OAuth
  (un clic). No continúes hasta que esté autenticado.

## 2. Crear o enlazar el proyecto en Vercel
- Busca un proyecto `claude-code-clase-demo`. Si existe, enlázalo; si no, créalo
  con framework Next.js, conectado a este repo.

## 3. Subir variables de entorno
- Sube a Vercel (entornos Production y Preview) las variables públicas de
  `.env.local`:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- NO subas `SUPABASE_ACCESS_TOKEN` (es solo para el agente en local).

## 4. Desplegar a producción
- Lanza el deploy a producción vía el MCP de Vercel.
- Espera a que termine y muestra al alumno la **URL pública** en vivo.

Si el MCP de Vercel no está disponible, indica el fallback: el botón
"Deploy with Vercel" del README, agregando las dos variables públicas cuando
Vercel las pida.
```

- [ ] **Step 2: Verificar frontmatter**

Run: `cd /tmp/claude-code-clase-demo && head -3 .claude/commands/deploy.md`
Expected: muestra `---` con `description:`.

- [ ] **Step 3: Commit**

```bash
git add .claude/commands/deploy.md
git commit -m "feat: comando /deploy a Vercel vía MCP"
```

---

### Task 9: `CLAUDE.md` de onboarding + `README.md` reescrito

**Files:**
- Modify: `CLAUDE.md`
- Modify: `README.md`

**Interfaces:**
- Consumes: comandos `/setup` (Task 7) y `/deploy` (Task 8).
- Produces: `CLAUDE.md` que autodispara `/setup` en repo recién clonado; `README.md` con el flujo "pega el link".

- [ ] **Step 1: Reescribir `CLAUDE.md`**

Reemplazar el contenido completo de `CLAUDE.md` por:

```markdown
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

## Convenciones

- `lib/supabase/server.ts` → Server Components / Route Handlers / Server Actions.
- `lib/supabase/client.ts` → componentes con `"use client"`.
- `lib/supabase/middleware.ts` + `middleware.ts` → refrescan sesión y protegen
  rutas que empiezan con `/dashboard`.
- Auth: **email + contraseña**, confirmación de email desactivada en dev.
- Variables en `.env.local` (nunca commitear). MCP usa `SUPABASE_ACCESS_TOKEN`.
- Esquema en `supabase/migrations/`.

## Tablas

- `messages` — mensajes demo. Lectura pública; escritura solo del dueño
  (`user_id = auth.uid()`) vía RLS.

## Cómo correr (si ya está configurado)

```bash
npm install
npm run dev   # http://localhost:3000
```
```

- [ ] **Step 2: Reescribir `README.md`**

Reemplazar el contenido completo de `README.md` por:

```markdown
# Claude Code · Clase Demo

Kit de arranque autónomo: **Next.js 16 + Supabase (DB + Auth) + Vercel**.
Con Claude Code instalado, pegas el link del repo y el agente arma toda la base
del proyecto por ti. Sin SQL manual, sin copiar llaves a mano.

---

## 🚀 La forma fácil (un solo prompt)

1. Instala Claude Code:

   ```bash
   curl -fsSL https://claude.ai/install.sh | bash    # Mac/Linux
   # irm https://claude.ai/install.ps1 | iex          # Windows (PowerShell)
   ```

2. En una carpeta vacía, corre `claude` y pega este prompt:

   > Clona y configura este proyecto: https://github.com/adowningtiptap/claude-code-clase-demo

3. Claude clona el repo, lee `CLAUDE.md` y arranca el `/setup` solo. Te pedirá
   **una sola cosa**: tu *Access Token* de Supabase
   (genéralo en https://supabase.com/dashboard/account/tokens y pégalo).

4. Listo: Claude crea la base de datos, corre la migración, configura la auth,
   escribe `.env.local` y levanta la app en http://localhost:3000.

5. Para publicar, dile a Claude **"despliega"** (comando `/deploy`): hará el
   deploy en Vercel (un OAuth de un clic) y te dará la URL en vivo.

---

## 💻 En GitHub Codespaces (cero instalación)

Abre el repo en Codespaces (botón **Code → Codespaces**). Node, git y Claude Code
ya vienen listos. Luego corre `claude` y escribe `/setup`.

---

## 🛠️ Comandos del kit

- `/setup` — crea la DB en Supabase, corre la migración, configura auth y escribe
  `.env.local`.
- `/deploy` — despliega a Vercel (crea proyecto, sube env vars, publica).

## 🤖 Ideas para la clase (pídeselas a Claude Code)

- "Agrega un formulario para insertar un mensaje nuevo (ligado a mi usuario)."
- "Crea una tabla `tareas` y una página `/tareas` protegida que la liste."
- "Cambia el diseño de la página de inicio."

## 📁 Estructura

```
app/                  # Next.js App Router (home, login, dashboard protegido)
lib/supabase/         # clientes Supabase (server, browser, middleware)
middleware.ts         # refresca sesión y protege rutas
supabase/migrations/  # esquema SQL (lo aplica /setup automáticamente)
.claude/commands/     # comandos /setup y /deploy
.mcp.json             # MCP de Supabase y Vercel
.devcontainer/        # entorno Codespaces (cero instalación)
CLAUDE.md             # contexto + onboarding automático
```

## 🚀 Fallback: deploy manual con botón

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fadowningtiptap%2Fclaude-code-clase-demo&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY)
```

- [ ] **Step 3: Verificar el build final completo**

Run: `cd /tmp/claude-code-clase-demo && npm run build`
Expected: compila sin errores.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md README.md
git commit -m "docs: onboarding automático en CLAUDE.md y README con flujo pega-el-link"
```

---

### Task 10: Marcar repo como Template y publicar

**Files:** (ninguno — operaciones de git/GitHub)

**Interfaces:**
- Consumes: todos los commits anteriores.
- Produces: repo en GitHub con todos los cambios pusheados y marcado como Template.

- [ ] **Step 1: Smoke test manual documentado (sin Supabase real)**

Run: `cd /tmp/claude-code-clase-demo && npm run dev`
Expected: arranca; `/` muestra el aviso "Falta configurar Supabase / ejecuta /setup". `/login` renderiza el formulario. Detener con Ctrl+C. (La prueba con DB real ocurre cuando un alumno corre `/setup`.)

- [ ] **Step 2: Push de todos los commits**

```bash
cd /tmp/claude-code-clase-demo && git push origin HEAD
```
Expected: push exitoso a `main` (confirmar con el usuario antes, por ser acción saliente).

- [ ] **Step 3: Marcar el repo como GitHub Template**

```bash
gh repo edit adowningtiptap/claude-code-clase-demo --template
```
Expected: el repo queda con "Use this template" habilitado.

- [ ] **Step 4: Verificar**

Run: `gh repo view adowningtiptap/claude-code-clase-demo --json isTemplate`
Expected: `{"isTemplate":true}`

---

## Self-Review

**Cobertura del spec:**
- Kit autónomo / onboarding "pega el link" → Task 9 (CLAUDE.md + README).
- Supabase DB + migración sin SQL manual → Task 1 + Task 7 (`/setup`).
- Supabase Auth email/contraseña → Task 2, 3, 4.
- RLS por usuario → Task 1.
- `.env.local` automático → Task 7.
- MCP Supabase + Vercel → Task 5.
- Deploy Vercel vía MCP → Task 8 (`/deploy`).
- Cero instalación en Codespaces → Task 6 (devcontainer).
- GitHub Template → Task 10.

**Consistencia de tipos/nombres:** `updateSession` (Task 2) usado por `middleware.ts`; `login`/`signup` (Task 3) usados por `app/login/page.tsx`; ruta `/auth/signout` (Task 3) usada por dashboard (Task 4); variables `NEXT_PUBLIC_SUPABASE_URL/ANON_KEY` y `SUPABASE_ACCESS_TOKEN` consistentes en Tasks 5, 7, 8, 9. Proyecto `claude-code-clase-demo` consistente en `/setup` y `/deploy`.

**Placeholders:** ninguno — todo el código y la copia están completos.
