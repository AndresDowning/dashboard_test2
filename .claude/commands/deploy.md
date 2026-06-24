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
- Solo esas dos variables públicas; no hay tokens que subir.

## 4. Desplegar a producción
- Lanza el deploy a producción vía el MCP de Vercel.
- Espera a que termine y muestra al alumno la **URL pública** en vivo.

Si el MCP de Vercel no está disponible, indica el fallback: el botón
"Deploy with Vercel" del README, agregando las dos variables públicas cuando
Vercel las pida.
