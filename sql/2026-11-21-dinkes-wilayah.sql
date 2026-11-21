-- AKSES DINKES PER WILAYAH (hanya baca)
-- Cara kerja: aturan akses lama TIDAK diubah. Ditambah satu aturan "baca_wilayah" (hanya SELECT)
-- di tiap tabel data. Karena Dinkes tidak punya aturan tambah/ubah/hapus, Dinkes tidak bisa menulis apa pun.

-- 0. PERBAIKAN KEAMANAN PENTING: akun tanpa profil (daftar sendiri) dulu mendapat peran NULL,
-- sehingga pemeriksaan "peran <> 'admin_papkenz'" bernilai NULL dan lolos. Sekarang peran kosong = ''.
create or replace function private.peran_saya()
returns text language sql stable security definer set search_path = '' as $$
  select coalesce((select peran from public.profil where id = (select auth.uid()) and aktif), '')
$$;

-- 1. Tabel wilayah dan kolom baru
create table if not exists public.wilayah (
  id uuid primary key default gen_random_uuid(),
  nama text not null,
  kabupaten_kota text,
  provinsi text,
  aktif boolean not null default true,
  dibuat timestamptz not null default now()
);
alter table public.fasyankes add column if not exists wilayah_id uuid references public.wilayah(id);
alter table public.fasyankes add column if not exists dibagikan_dinkes boolean not null default false;
alter table public.profil add column if not exists wilayah_id uuid references public.wilayah(id);
create index if not exists idx_fasyankes_wilayah on public.fasyankes (wilayah_id);

-- izinkan peran 'dinkes' (lepas batasan peran lama bila ada, pasang ulang lengkap)
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.profil'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%peran%' loop
    execute format('alter table public.profil drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.profil add constraint profil_peran_cek
  check (peran in ('admin_papkenz','admin_fasyankes','petugas_kesling','petugas_ruangan','pimpinan','dinkes'));
alter table public.profil alter column fasyankes_id drop not null;

-- 2. Fungsi pembantu
create or replace function private.wilayah_saya()
returns uuid language sql stable security definer set search_path = '' as $$
  select wilayah_id from public.profil where id = (select auth.uid()) and aktif and peran = 'dinkes'
$$;

-- daftar fasyankes yang boleh dilihat Dinkes: satu wilayah, aktif, dan puskesmas atau sudah setuju berbagi
create or replace function private.fasyankes_wilayah()
returns setof uuid language sql stable security definer set search_path = '' as $$
  select f.id from public.fasyankes f
  where f.wilayah_id is not null
    and f.wilayah_id = (select private.wilayah_saya())
    and f.aktif is not false
    and (f.jenis ilike 'puskesmas%' or f.dibagikan_dinkes)
$$;

-- 3. Aturan baca untuk Dinkes di semua tabel data (kecuali profil dan riwayat)
do $$
declare t text;
begin
  for t in select c.table_name from information_schema.columns c
           join information_schema.tables x on x.table_schema = c.table_schema and x.table_name = c.table_name and x.table_type = 'BASE TABLE'
           where c.table_schema = 'public' and c.column_name = 'fasyankes_id' and c.table_name not in ('profil', 'riwayat') loop
    execute format('drop policy if exists baca_wilayah on public.%I', t);
    execute format('create policy baca_wilayah on public.%I for select to authenticated using (fasyankes_id in (select private.fasyankes_wilayah()))', t);
  end loop;
end $$;
drop policy if exists baca_wilayah on public.fasyankes;
create policy baca_wilayah on public.fasyankes for select to authenticated using (id in (select private.fasyankes_wilayah()));

alter table public.wilayah enable row level security;
grant select on public.wilayah to authenticated;
drop policy if exists baca on public.wilayah;
create policy baca on public.wilayah for select to authenticated
  using (id = (select private.wilayah_saya()) or private.peran_saya() = 'admin_papkenz');
drop policy if exists kelola on public.wilayah;
create policy kelola on public.wilayah for all to authenticated
  using (private.peran_saya() = 'admin_papkenz') with check (private.peran_saya() = 'admin_papkenz');

-- 4. Fungsi untuk admin Papkenz dan admin fasyankes
create or replace function public.buat_wilayah(p_nama text, p_kab text, p_prov text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  if private.peran_saya() <> 'admin_papkenz' then raise exception 'Hanya admin Papkenz.'; end if;
  if coalesce(trim(p_nama), '') = '' then raise exception 'Nama wilayah wajib diisi.'; end if;
  insert into public.wilayah (nama, kabupaten_kota, provinsi) values (trim(p_nama), p_kab, p_prov) returning id into v;
  return v;
end $$;

create or replace function public.atur_wilayah_fasyankes(p_fasyankes uuid, p_wilayah uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.peran_saya() <> 'admin_papkenz' then raise exception 'Hanya admin Papkenz.'; end if;
  update public.fasyankes set wilayah_id = p_wilayah where id = p_fasyankes;
end $$;

create or replace function public.tambah_pengguna_dinkes(p_user uuid, p_nama text, p_wilayah uuid, p_nip text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.peran_saya() <> 'admin_papkenz' then raise exception 'Hanya admin Papkenz.'; end if;
  if not exists (select 1 from public.wilayah where id = p_wilayah) then raise exception 'Wilayah tidak ditemukan.'; end if;
  if coalesce(trim(p_nama), '') = '' then raise exception 'Nama wajib diisi.'; end if;
  if not exists (select 1 from auth.users u where u.id = p_user and u.created_at > now() - interval '30 minutes') then
    raise exception 'Akun tidak ditemukan atau sudah lama dibuat.';
  end if;
  if exists (select 1 from public.profil where id = p_user and (fasyankes_id is not null or wilayah_id is not null)) then
    raise exception 'Akun ini sudah terdaftar.';
  end if;
  insert into public.profil (id, fasyankes_id, wilayah_id, nama, peran, nip_nik, aktif)
  values (p_user, null, p_wilayah, trim(p_nama), 'dinkes', p_nip, true)
  on conflict (id) do update set fasyankes_id = null, wilayah_id = excluded.wilayah_id, nama = excluded.nama,
    peran = 'dinkes', nip_nik = excluded.nip_nik, aktif = true;
end $$;

create or replace function public.daftar_pengguna_dinkes(p_wilayah uuid)
returns table (id uuid, nama text, aktif boolean, nip_nik text, email text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if private.peran_saya() <> 'admin_papkenz' then raise exception 'Hanya admin Papkenz.'; end if;
  return query select p.id, p.nama::text, coalesce(p.aktif, true), p.nip_nik::text, u.email::text
    from public.profil p left join auth.users u on u.id = p.id
    where p.peran = 'dinkes' and p.wilayah_id = p_wilayah order by p.nama;
end $$;

create or replace function public.ubah_pengguna_dinkes(p_id uuid, p_aktif boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.peran_saya() <> 'admin_papkenz' then raise exception 'Hanya admin Papkenz.'; end if;
  update public.profil set aktif = p_aktif where id = p_id and peran = 'dinkes';
  update auth.users set banned_until = case when p_aktif then null else 'infinity'::timestamptz end
  where id = p_id and exists (select 1 from public.profil where id = p_id and peran = 'dinkes');
end $$;

create or replace function public.atur_berbagi_dinkes(p_boleh boolean)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.peran_saya() <> 'admin_fasyankes' then raise exception 'Hanya admin fasyankes.'; end if;
  update public.fasyankes set dibagikan_dinkes = coalesce(p_boleh, false) where id = private.fasyankes_saya();
end $$;

-- daftar_fasyankes untuk admin Papkenz kini ikut menampilkan wilayah
drop function if exists public.daftar_fasyankes();
create or replace function public.daftar_fasyankes()
returns table (id uuid, nama text, jenis text, wilayah_id uuid, dibagikan_dinkes boolean)
language plpgsql stable security definer set search_path = '' as $$
begin
  if private.peran_saya() <> 'admin_papkenz' then raise exception 'Hanya admin Papkenz.'; end if;
  return query select f.id, f.nama::text, f.jenis::text, f.wilayah_id, f.dibagikan_dinkes from public.fasyankes f order by f.nama;
end $$;

do $$
declare f text;
begin
  foreach f in array array['daftar_fasyankes()','buat_wilayah(text,text,text)','atur_wilayah_fasyankes(uuid,uuid)',
    'tambah_pengguna_dinkes(uuid,text,uuid,text)','daftar_pengguna_dinkes(uuid)','ubah_pengguna_dinkes(uuid,boolean)',
    'atur_berbagi_dinkes(boolean)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- pasang_rls: tabel baru nanti otomatis ikut aturan baca_wilayah
create or replace function private.pasang_rls(t text, baca text[], tulis text[])
returns void language plpgsql as $function$
begin
  execute format('alter table public.%I enable row level security', t);
  execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  execute format('create index if not exists %I on public.%I (fasyankes_id)', 'idx_' || t || '_fas', t);
  execute format('drop policy if exists baca on public.%I', t);
  execute format('drop policy if exists tambah on public.%I', t);
  execute format('drop policy if exists ubah on public.%I', t);
  execute format('drop policy if exists hapus on public.%I', t);
  execute format('drop policy if exists baca_wilayah on public.%I', t);
  execute format('create policy baca on public.%I for select to authenticated using (fasyankes_id = private.fasyankes_saya() and private.peran_saya() = any (%L::text[]))', t, baca);
  execute format('create policy tambah on public.%I for insert to authenticated with check (fasyankes_id = private.fasyankes_saya() and private.peran_saya() = any (%L::text[]))', t, tulis);
  execute format('create policy ubah on public.%I for update to authenticated using (fasyankes_id = private.fasyankes_saya() and private.peran_saya() = any (%L::text[])) with check (fasyankes_id = private.fasyankes_saya() and private.peran_saya() = any (%L::text[]))', t, tulis, tulis);
  execute format('create policy hapus on public.%I for delete to authenticated using (fasyankes_id = private.fasyankes_saya() and private.peran_saya() = ''admin_fasyankes'')', t);
  execute format('create policy baca_wilayah on public.%I for select to authenticated using (fasyankes_id in (select private.fasyankes_wilayah()))', t);
end
$function$;

-- tambah_pengguna: akun Dinkes tidak bisa diambil alih fasyankes
create or replace function public.tambah_pengguna(p_user uuid, p_nama text, p_peran text, p_nip text, p_fasyankes uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare r text := private.peran_saya()::text; f uuid; lama uuid; ada boolean;
begin
  if r = 'admin_papkenz' then f := p_fasyankes;
  elsif r = 'admin_fasyankes' then f := private.fasyankes_saya();
  else raise exception 'Hanya admin.'; end if;
  if f is null then raise exception 'Fasyankes belum dipilih.'; end if;
  if p_peran not in ('admin_fasyankes','petugas_kesling','petugas_ruangan','pimpinan') then raise exception 'Peran tidak valid.'; end if;
  if coalesce(trim(p_nama), '') = '' then raise exception 'Nama wajib diisi.'; end if;
  -- hanya akun yang baru saja dibuat (cegah mengambil akun orang lain)
  if not exists (select 1 from auth.users u where u.id = p_user and u.created_at > now() - interval '30 minutes') then
    raise exception 'Akun tidak ditemukan atau sudah lama dibuat.';
  end if;
  select true, p.fasyankes_id into ada, lama from public.profil p where p.id = p_user;
  if ada and (lama is not null or exists (select 1 from public.profil x where x.id = p_user and x.wilayah_id is not null)) then raise exception 'Akun ini sudah terdaftar.'; end if;
  if ada then
    execute format('update public.profil set fasyankes_id = $1, nama = $2, peran = %L, nip_nik = $3, aktif = true where id = $4', p_peran)
      using f, trim(p_nama), p_nip, p_user;
  else
    execute format('insert into public.profil (id, fasyankes_id, nama, peran, nip_nik, aktif) values ($1, $2, $3, %L, $4, true)', p_peran)
      using p_user, f, trim(p_nama), p_nip;
  end if;
end $$;


-- 5. Cek: jumlah tabel yang punya aturan baca_wilayah (harus sama dengan jumlah tabel data + 1)
select (select count(*) from pg_policies where schemaname = 'public' and policyname = 'baca_wilayah') as tabel_baca_wilayah,
  (select private.peran_saya()) as peran_editor_sql;
