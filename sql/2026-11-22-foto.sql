-- =====================================================================
-- SANIKES: penyimpanan foto bukti (per butir pemeriksaan, temuan, dll.)
-- Jalankan sekali di Supabase SQL Editor. Aman dijalankan ulang.
-- Letak file: bucket "foto" (privat), jalur: <fasyankes_id>/<tabel>/<tahun-bulan>/<acak>.jpg
-- =====================================================================

-- 1. Bucket privat, maksimal 1 MB per foto, hanya gambar
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('foto', 'foto', false, 1048576, array['image/jpeg', 'image/webp', 'image/png'])
on conflict (id) do update set public = false, file_size_limit = 1048576, allowed_mime_types = array['image/jpeg', 'image/webp', 'image/png'];

-- 2. Catatan tiap foto (siapa, untuk catatan apa, butir mana, lokasi dan jam diambil)
create table if not exists public.foto (
  id uuid primary key default gen_random_uuid(),
  fasyankes_id uuid not null default private.fasyankes_saya() references public.fasyankes(id),
  petugas_id uuid default auth.uid(),
  dibuat timestamptz not null default now(),
  tabel text not null check (tabel in ('ikl_inspeksi', 'tpm_inspeksi', 'sanitasi_checklist', 'temuan', 'limbah_harian', 'limbah_angkut', 'vektor', 'ipal_harian', 'k3_insiden', 'pengawasan')),
  data_id uuid not null,
  butir text,                      -- kode butir pemeriksaan (boleh kosong untuk foto umum)
  path text not null unique,
  lat numeric check (lat between -90 and 90),
  lng numeric check (lng between -180 and 180),
  akurasi numeric,
  diambil timestamptz,
  sumber text check (sumber in ('kamera', 'galeri')),
  ukuran integer,
  keterangan text,
  dihapus timestamptz,
  dihapus_oleh uuid,
  constraint foto_jalur_cocok check (split_part(path, '/', 1) = fasyankes_id::text and split_part(path, '/', 2) = tabel)
);
create index if not exists idx_foto_data on public.foto (tabel, data_id);

select private.pasang_rls('foto',
  array['admin_fasyankes','petugas_kesling','petugas_ruangan','pimpinan'],
  array['admin_fasyankes','petugas_kesling','petugas_ruangan']);
drop trigger if exists zz_riwayat on public.foto;
create trigger zz_riwayat after update or delete on public.foto for each row execute function private.catat_riwayat();

-- 3. Aturan akses file foto (sama dengan aturan data lain)
create or replace function private.foto_boleh_baca(p_nama text)
returns boolean language sql stable security definer set search_path = '' as $$
  select (split_part(p_nama, '/', 1) = private.fasyankes_saya()::text
          and private.peran_saya() = any (array['admin_fasyankes','petugas_kesling','petugas_ruangan','pimpinan']))
      or exists (select 1 from private.fasyankes_wilayah() w where w::text = split_part(p_nama, '/', 1));
$$;
create or replace function private.foto_boleh_unggah(p_nama text)
returns boolean language sql stable security definer set search_path = '' as $$
  select split_part(p_nama, '/', 1) = private.fasyankes_saya()::text
     and private.peran_saya() = any (array['admin_fasyankes','petugas_kesling','petugas_ruangan'])
     and split_part(p_nama, '/', 2) in ('ikl_inspeksi', 'tpm_inspeksi', 'sanitasi_checklist', 'temuan', 'limbah_harian', 'limbah_angkut', 'vektor', 'ipal_harian', 'k3_insiden', 'pengawasan')
     -- akun demo tidak boleh mengunggah (sandi demo publik, file tidak ikut terhapus saat demo diisi ulang)
     and not exists (select 1 from public.fasyankes f where f.id = private.fasyankes_saya() and f.demo);
$$;
revoke all on function private.foto_boleh_baca(text) from public, anon;
revoke all on function private.foto_boleh_unggah(text) from public, anon;
grant execute on function private.foto_boleh_baca(text) to authenticated;
grant execute on function private.foto_boleh_unggah(text) to authenticated;

drop policy if exists "sanikes foto baca" on storage.objects;
drop policy if exists "sanikes foto unggah" on storage.objects;
drop policy if exists "sanikes foto hapus" on storage.objects;
create policy "sanikes foto baca" on storage.objects for select to authenticated
  using (bucket_id = 'foto' and private.foto_boleh_baca(name));
create policy "sanikes foto unggah" on storage.objects for insert to authenticated
  with check (bucket_id = 'foto' and private.foto_boleh_unggah(name));
-- hapus file: pengunggahnya sendiri (mis. simpan gagal) atau admin fasyankes. Tidak ada izin mengubah file.
create policy "sanikes foto hapus" on storage.objects for delete to authenticated
  using (bucket_id = 'foto' and split_part(name, '/', 1) = private.fasyankes_saya()::text
         and (owner_id = auth.uid()::text or private.peran_saya() = 'admin_fasyankes'));

-- 4. Cek hasil
select (select public from storage.buckets where id = 'foto') as bucket_publik,
       (select file_size_limit from storage.buckets where id = 'foto') as batas_byte,
       (select count(*) from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like 'sanikes foto%') as aturan_file,
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'foto') as aturan_tabel;
