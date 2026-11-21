-- =====================================================================
-- SANIKES: daftar tempat yang diperiksa (objek inspeksi TPP dan TFU/TTU)
-- Jalankan sekali di Supabase SQL Editor. Aman dijalankan ulang.
-- =====================================================================

-- 1. Tabel daftar tempat
create table if not exists public.objek_inspeksi (
  id uuid primary key default gen_random_uuid(),
  fasyankes_id uuid not null default private.fasyankes_saya() references public.fasyankes(id),
  petugas_id uuid default auth.uid(),
  dibuat timestamptz not null default now(),
  kategori text not null check (kategori in ('tpm', 'ttu')),   -- tpm = tempat pengelolaan pangan, ttu = tempat dan fasilitas umum
  nama text not null check (length(trim(nama)) > 0),
  jenis text,
  alamat text,
  desa text,
  kecamatan text,
  penanggung_jawab text,
  kontak text,
  lat numeric check (lat between -90 and 90),
  lng numeric check (lng between -180 and 180),
  catatan text,
  aktif boolean not null default true
);
create unique index if not exists objek_inspeksi_unik on public.objek_inspeksi (fasyankes_id, kategori, lower(trim(nama)));

-- Hak akses sama dengan tabel lain: fasyankes sendiri baca/tulis, Dinkes hanya baca sesuai wilayah dan izin berbagi
select private.pasang_rls('objek_inspeksi',
  array['admin_fasyankes','petugas_kesling','petugas_ruangan','pimpinan'],
  array['admin_fasyankes','petugas_kesling']);

drop trigger if exists zz_riwayat on public.objek_inspeksi;
create trigger zz_riwayat after update or delete on public.objek_inspeksi for each row execute function private.catat_riwayat();

-- 2. Kolom baru di catatan inspeksi
alter table public.tpm_inspeksi add column if not exists objek_id uuid references public.objek_inspeksi(id) on delete set null;
alter table public.tpm_inspeksi add column if not exists pemeriksa text;
alter table public.tpm_inspeksi add column if not exists rekomendasi text;
alter table public.tpm_inspeksi add column if not exists batas_perbaikan date;
alter table public.ikl_inspeksi add column if not exists objek_id uuid references public.objek_inspeksi(id) on delete set null;
alter table public.ikl_inspeksi add column if not exists pemeriksa text;
alter table public.ikl_inspeksi add column if not exists rekomendasi text;
alter table public.ikl_inspeksi add column if not exists batas_perbaikan date;
create index if not exists idx_tpm_inspeksi_objek on public.tpm_inspeksi (objek_id);
create index if not exists idx_ikl_inspeksi_objek on public.ikl_inspeksi (objek_id);

-- 3. Penjaga: catatan inspeksi hanya boleh menunjuk tempat milik fasyankes yang sama dan kategori yang sama
create or replace function private.cek_objek()
returns trigger language plpgsql security definer set search_path = '' as $$
declare kat text := case tg_table_name when 'tpm_inspeksi' then 'tpm' else 'ttu' end;
begin
  if new.objek_id is not null and not exists (
    select 1 from public.objek_inspeksi o
    where o.id = new.objek_id and o.fasyankes_id = new.fasyankes_id and o.kategori = kat
  ) then
    raise exception 'Tempat tidak ditemukan di daftar tempat fasyankes ini.';
  end if;
  return new;
end $$;
revoke all on function private.cek_objek() from public, anon, authenticated;
drop trigger if exists aa_cek_objek on public.tpm_inspeksi;
create trigger aa_cek_objek before insert or update of objek_id, fasyankes_id on public.tpm_inspeksi for each row execute function private.cek_objek();
drop trigger if exists aa_cek_objek on public.ikl_inspeksi;
create trigger aa_cek_objek before insert or update of objek_id, fasyankes_id on public.ikl_inspeksi for each row execute function private.cek_objek();

-- 4. Catatan lama: buat daftar tempat dari nama tempat yang sudah pernah diinput, lalu tautkan
create or replace function private.tautkan_objek(p_hanya_demo boolean default false)
returns integer language plpgsql security definer set search_path = '' as $$
declare n int := 0; m int;
begin
  insert into public.objek_inspeksi (fasyankes_id, kategori, nama, jenis, alamat)
  select distinct on (i.fasyankes_id, lower(trim(coalesce(nullif(trim(i.nama_objek), ''), i.lokasi))))
         i.fasyankes_id, 'ttu', trim(coalesce(nullif(trim(i.nama_objek), ''), i.lokasi)), i.jenis_objek, i.alamat
  from public.ikl_inspeksi i join public.fasyankes f on f.id = i.fasyankes_id
  where i.objek_id is null and nullif(trim(coalesce(nullif(trim(i.nama_objek), ''), i.lokasi)), '') is not null
    and (not p_hanya_demo or f.demo)
  order by i.fasyankes_id, lower(trim(coalesce(nullif(trim(i.nama_objek), ''), i.lokasi))), i.tanggal desc
  on conflict do nothing;

  insert into public.objek_inspeksi (fasyankes_id, kategori, nama)
  select distinct i.fasyankes_id, 'tpm', trim(i.lokasi)
  from public.tpm_inspeksi i join public.fasyankes f on f.id = i.fasyankes_id
  where i.objek_id is null and nullif(trim(i.lokasi), '') is not null and (not p_hanya_demo or f.demo)
  on conflict do nothing;

  update public.ikl_inspeksi i set objek_id = o.id
  from public.objek_inspeksi o, public.fasyankes f
  where i.objek_id is null and f.id = i.fasyankes_id and (not p_hanya_demo or f.demo)
    and o.fasyankes_id = i.fasyankes_id and o.kategori = 'ttu'
    and lower(trim(o.nama)) = lower(trim(coalesce(nullif(trim(i.nama_objek), ''), i.lokasi)));
  get diagnostics m = row_count; n := n + m;

  update public.tpm_inspeksi i set objek_id = o.id
  from public.objek_inspeksi o, public.fasyankes f
  where i.objek_id is null and f.id = i.fasyankes_id and (not p_hanya_demo or f.demo)
    and o.fasyankes_id = i.fasyankes_id and o.kategori = 'tpm'
    and lower(trim(o.nama)) = lower(trim(i.lokasi));
  get diagnostics m = row_count; n := n + m;
  return n;
end $$;
revoke all on function private.tautkan_objek(boolean) from public, anon, authenticated;

-- 5. Data demo: tempat contoh yang lengkap (nama, alamat, desa, kecamatan, penanggung jawab, titik lokasi)
create or replace function private.isi_demo_objek()
returns text language plpgsql security definer set search_path = '' as $$
declare x record; k int; desa text; nama_sek text; nama_ibd text; lat0 numeric; lng0 numeric;
begin
  for x in select f.id, f.nama, row_number() over (order by f.nama) as urut from public.fasyankes f where f.demo and f.jenis ilike 'puskesmas%' loop
    desa := 'Desa ' || coalesce(nullif(trim(replace(x.nama, 'Puskesmas Demo', '')), ''), 'Contoh');
    nama_sek := 'SD Negeri ' || x.urut || ' ' || replace(desa, 'Desa ', '');
    nama_ibd := 'Masjid Nurul Huda ' || replace(desa, 'Desa ', '');
    lat0 := -5.135 - x.urut * 0.02; lng0 := 119.42 + x.urut * 0.02;

    insert into public.objek_inspeksi (fasyankes_id, kategori, nama, jenis, alamat, desa, kecamatan, penanggung_jawab, kontak, lat, lng)
    values
      (x.id, 'ttu', nama_sek, 'Sekolah / madrasah', 'Jl. Pendidikan No. 1', desa, 'Kecamatan Demo', 'Kepala sekolah (contoh)', '0800-0000-0001', lat0, lng0),
      (x.id, 'ttu', nama_ibd, 'Tempat ibadah', 'Jl. Masjid No. 7', desa, 'Kecamatan Demo', 'Ketua takmir (contoh)', '0800-0000-0002', lat0 + 0.004, lng0 + 0.003),
      (x.id, 'tpm', 'Dapur Gizi', 'Instalasi gizi', 'Lingkungan puskesmas', desa, 'Kecamatan Demo', 'Penanggung jawab gizi (contoh)', null, lat0 - 0.002, lng0 - 0.002)
    on conflict do nothing;

    -- catatan inspeksi demo memakai nama tempat yang sama dengan daftar
    for k in 1..2 loop
      update public.ikl_inspeksi set nama_objek = case k when 1 then nama_sek else nama_ibd end,
             lokasi = case k when 1 then nama_sek else nama_ibd end, alamat = desa,
             pemeriksa = coalesce(pemeriksa, 'Petugas kesling demo'),
             rekomendasi = case when status = 'tidak_memenuhi' then 'Sediakan sarana cuci tangan dengan sabun dan air mengalir, lalu inspeksi ulang.' end,
             batas_perbaikan = case when status = 'tidak_memenuhi' then tanggal + 30 end
      where fasyankes_id = x.id and nama_objek = 'Objek TFU Contoh ' || k;
    end loop;
    update public.tpm_inspeksi set pemeriksa = coalesce(pemeriksa, 'Petugas kesling demo'),
           rekomendasi = case when status = 'tidak_memenuhi' then 'Penjamah wajib memakai celemek dan penutup kepala saat mengolah pangan.' end,
           batas_perbaikan = case when status = 'tidak_memenuhi' then tanggal + 14 end
    where fasyankes_id = x.id;
    update public.temuan set lokasi = case lokasi when 'Objek TFU Contoh 1' then nama_sek when 'Objek TFU Contoh 2' then nama_ibd else lokasi end
    where fasyankes_id = x.id and kategori = 'ttu';
  end loop;
  return 'Tempat demo ditautkan: ' || private.tautkan_objek(true) || ' catatan.';
end $$;
revoke all on function private.isi_demo_objek() from public, anon, authenticated;

-- Jadwal isi ulang demo tiap malam (02.00 WITA) sekarang juga mengisi daftar tempat demo
select cron.unschedule(jobid) from cron.job where jobname = 'sanikes-reset-demo';
select cron.schedule('sanikes-reset-demo', '0 18 * * *', 'select private.isi_demo(); select private.isi_demo_objek();');

-- 6. Jalankan sekarang
select private.isi_demo_objek() as demo,
       private.tautkan_objek(false) as catatan_lama_ditautkan,
       (select count(*) from public.objek_inspeksi) as jumlah_tempat;
