-- Files metadata table + Supabase Storage bucket for client file sharing.
-- Admin (adowning@paytiptap.com) can upload/delete; all authenticated users can download.

create table if not exists public.files (
  id           uuid        default gen_random_uuid() primary key,
  name         text        not null,
  size         bigint      not null default 0,
  type         text        not null default '',
  storage_path text        not null,
  uploaded_by  uuid        references auth.users(id) on delete set null,
  tag          text        not null default 'Nuevo',
  created_at   timestamptz not null default now()
);

alter table public.files enable row level security;

drop policy if exists "files_select_authenticated" on public.files;
create policy "files_select_authenticated" on public.files
  for select using (auth.role() = 'authenticated');

drop policy if exists "files_insert_admin" on public.files;
create policy "files_insert_admin" on public.files
  for insert with check (auth.email() = 'adowning@paytiptap.com');

drop policy if exists "files_delete_admin" on public.files;
create policy "files_delete_admin" on public.files
  for delete using (auth.email() = 'adowning@paytiptap.com');

-- Storage bucket (50 MB max per file, private)
insert into storage.buckets (id, name, public, file_size_limit)
values ('client-files', 'client-files', false, 52428800)
on conflict (id) do nothing;

drop policy if exists "client_files_select" on storage.objects;
create policy "client_files_select" on storage.objects
  for select using (bucket_id = 'client-files' and auth.role() = 'authenticated');

drop policy if exists "client_files_insert" on storage.objects;
create policy "client_files_insert" on storage.objects
  for insert with check (bucket_id = 'client-files' and auth.email() = 'adowning@paytiptap.com');

drop policy if exists "client_files_delete" on storage.objects;
create policy "client_files_delete" on storage.objects
  for delete using (bucket_id = 'client-files' and auth.email() = 'adowning@paytiptap.com');
