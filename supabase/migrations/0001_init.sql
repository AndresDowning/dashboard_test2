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
