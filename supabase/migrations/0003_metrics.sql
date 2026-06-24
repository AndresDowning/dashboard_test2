-- Métricas: el admin sube un Excel con métricas para un usuario; el usuario
-- (y el admin) las ven. Guardamos el contenido ya parseado como JSON para no
-- depender del archivo. Idempotente: se puede aplicar varias veces.

create table if not exists public.metrics (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references auth.users (id) on delete cascade,
  source_name  text not null,            -- nombre original del Excel
  headers      jsonb not null default '[]'::jsonb,  -- ["Métrica","Valor",...]
  rows         jsonb not null default '[]'::jsonb,  -- [["Ventas",1200], ...]
  created_at   timestamptz not null default now()
);

alter table public.metrics enable row level security;

-- El dueño ve sus métricas; el admin ve todas.
drop policy if exists "metrics_select_owner_or_admin" on public.metrics;
create policy "metrics_select_owner_or_admin"
  on public.metrics
  for select
  using (owner_id = auth.uid() or public.is_admin());

-- Solo el admin inserta/borra.
drop policy if exists "metrics_insert_admin" on public.metrics;
create policy "metrics_insert_admin"
  on public.metrics
  for insert
  with check (public.is_admin());

drop policy if exists "metrics_delete_admin" on public.metrics;
create policy "metrics_delete_admin"
  on public.metrics
  for delete
  using (public.is_admin());
