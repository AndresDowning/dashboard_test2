-- Panel de documentos: perfiles de usuario + documentos por dueño + Storage.
-- El admin (email fijo) sube documentos para cualquier usuario; cada usuario
-- solo ve los suyos. Idempotente: se puede aplicar varias veces.

-- ── Helper: ¿el usuario actual es el admin? ───────────────────────────────
-- Usa el email del JWT (evita recursión en políticas RLS).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((auth.jwt() ->> 'email') = 'adowning@paytiptap.com', false);
$$;

-- ── Perfiles ──────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text,
  full_name   text,
  created_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Cada usuario ve su perfil; el admin ve todos (para el desplegable).
drop policy if exists "profiles_select_self_or_admin" on public.profiles;
create policy "profiles_select_self_or_admin"
  on public.profiles
  for select
  using (id = auth.uid() or public.is_admin());

-- Trigger: crear el perfil automáticamente al registrar un usuario.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data ->> 'full_name')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill: perfiles para usuarios que ya existían antes del trigger.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ── Documentos ────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references auth.users (id) on delete cascade,
  file_path   text not null,   -- ruta en el bucket: {owner_id}/{archivo}
  file_name   text not null,   -- nombre original para mostrar
  created_at  timestamptz not null default now()
);

alter table public.documents enable row level security;

-- El dueño ve sus documentos; el admin ve todos.
drop policy if exists "documents_select_owner_or_admin" on public.documents;
create policy "documents_select_owner_or_admin"
  on public.documents
  for select
  using (owner_id = auth.uid() or public.is_admin());

-- Solo el admin inserta/borra registros de documentos.
drop policy if exists "documents_insert_admin" on public.documents;
create policy "documents_insert_admin"
  on public.documents
  for insert
  with check (public.is_admin());

drop policy if exists "documents_delete_admin" on public.documents;
create policy "documents_delete_admin"
  on public.documents
  for delete
  using (public.is_admin());

-- ── Storage: bucket privado para los archivos ─────────────────────────────
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

-- Defensa en profundidad sobre los archivos. La carpeta raíz de cada archivo
-- es el id del dueño ({owner_id}/...), así el usuario solo lee lo suyo.
drop policy if exists "docs_select_owner_or_admin" on storage.objects;
create policy "docs_select_owner_or_admin"
  on storage.objects
  for select
  using (
    bucket_id = 'documents'
    and (public.is_admin() or (storage.foldername(name))[1] = auth.uid()::text)
  );

drop policy if exists "docs_admin_insert" on storage.objects;
create policy "docs_admin_insert"
  on storage.objects
  for insert
  with check (bucket_id = 'documents' and public.is_admin());

drop policy if exists "docs_admin_delete" on storage.objects;
create policy "docs_admin_delete"
  on storage.objects
  for delete
  using (bucket_id = 'documents' and public.is_admin());
