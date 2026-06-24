# Claude Code · Clase Demo

Kit de arranque autónomo: **Next.js 16 + Supabase (DB + Auth) + Vercel**.
Con Claude Code instalado, pegas el link del repo y el agente arma toda la base
del proyecto por ti. Sin SQL manual, sin copiar llaves a mano, sin tokens.

---

## 🚀 La forma fácil (un solo prompt)

1. Instala Claude Code:

   ```bash
   curl -fsSL https://claude.ai/install.sh | bash    # Mac/Linux
   ```
   ```powershell
   irm https://claude.ai/install.ps1 | iex            # Windows (PowerShell)
   ```

2. En una carpeta vacía, corre `claude` y pega este prompt:

   > Clona y configura este proyecto: https://github.com/adowningtiptap/claude-code-clase-demo

3. Claude clona el repo, lee `CLAUDE.md` y arranca el `/setup` solo. Solo te pide
   **un OAuth de Supabase** (se abre el navegador, un clic — sin tokens).

4. Listo: Claude crea la base de datos, corre la migración, configura la auth,
   escribe `.env.local` y levanta la app en http://localhost:3000.

5. Para publicar, dile a Claude **"despliega"** (comando `/deploy`): hará el
   deploy en Vercel (otro OAuth de un clic) y te dará la URL en vivo.

> Requisitos para correr local: **Node 20+** y **Git**. Si no quieres instalar
> nada, usa Codespaces (siguiente sección).

---

## 🪟 En Windows

Funciona en Windows nativo: los MCP de Supabase y Vercel son **HTTP** (no usan
`npx`), así que no hay líos de `cmd`/`npx`. Solo necesitas **Claude Code, Node 20+
y Git** instalados, y luego sigues los mismos pasos de arriba.

**Lo más fácil en Windows: GitHub Codespaces** (siguiente sección) — cero
instalación, todo en el navegador.

---

## 💻 En GitHub Codespaces (cero instalación)

Botón **Code → Codespaces → Create codespace**. Node, Git y Claude Code ya vienen
listos (lo prepara `.devcontainer/`). Luego corre `claude` y escribe `/setup`.
Igual en cualquier sistema operativo.

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
proxy.ts              # refresca sesión y protege rutas (Next 16)
supabase/migrations/  # esquema SQL (lo aplica /setup automáticamente)
.claude/commands/     # comandos /setup y /deploy
.mcp.json             # MCP HTTP de Supabase y Vercel (OAuth, sin tokens)
.devcontainer/        # entorno Codespaces (cero instalación)
CLAUDE.md             # contexto + onboarding automático
```

## 🚀 Fallback: deploy manual con botón

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fadowningtiptap%2Fclaude-code-clase-demo&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_ANON_KEY)
