-- SANIKES: (1) foto untuk uji air, uji lab IPAL, udara; (2) status laporan bulanan "sudah dikirim ke Dinkes";
--          (3) catatan pembinaan dari Dinkes; (4) foto contoh di data demo.
-- Aman dijalankan ulang. Tidak menghapus data fasyankes sungguhan.

-- ===== 1. Foto boleh dilampirkan di uji air, uji lab IPAL, dan pengukuran udara =====
do $$
declare c record;
begin
  for c in select conname from pg_constraint
           where conrelid = 'public.foto'::regclass and contype = 'c' and conname <> 'foto_jalur_cocok'
             and pg_get_constraintdef(oid) like '%tabel%' loop
    execute format('alter table public.foto drop constraint %I', c.conname);
  end loop;
end $$;
alter table public.foto add constraint foto_tabel_check check (tabel in (
  'ikl_inspeksi', 'tpm_inspeksi', 'sanitasi_checklist', 'temuan', 'limbah_harian', 'limbah_angkut', 'vektor',
  'ipal_harian', 'k3_insiden', 'pengawasan', 'air_uji', 'ipal_lab', 'udara_skudr'));

create or replace function private.foto_boleh_unggah(p_nama text)
returns boolean language sql stable security definer set search_path = '' as $$
  select split_part(p_nama, '/', 1) = private.fasyankes_saya()::text
     and private.peran_saya() = any (array['admin_fasyankes','petugas_kesling','petugas_ruangan'])
     and split_part(p_nama, '/', 2) in ('ikl_inspeksi', 'tpm_inspeksi', 'sanitasi_checklist', 'temuan', 'limbah_harian', 'limbah_angkut',
                                        'vektor', 'ipal_harian', 'k3_insiden', 'pengawasan', 'air_uji', 'ipal_lab', 'udara_skudr')
     -- akun demo tidak boleh mengunggah (sandi demo publik)
     and not exists (select 1 from public.fasyankes f where f.id = private.fasyankes_saya() and f.demo);
$$;
revoke all on function private.foto_boleh_unggah(text) from public, anon;
grant execute on function private.foto_boleh_unggah(text) to authenticated;

-- ===== 2. Status laporan bulanan: sudah dikirim ke Dinkes =====
create table if not exists public.laporan_kirim (
  id uuid primary key default gen_random_uuid(),
  fasyankes_id uuid not null default private.fasyankes_saya() references public.fasyankes(id) on delete cascade,
  petugas_id uuid default auth.uid(),
  petugas_nama text,
  dibuat timestamptz not null default now(),
  periode text not null check (periode ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),   -- tahun-bulan, mis. 2026-11
  catatan text check (length(catatan) <= 1000),
  unique (fasyankes_id, periode)
);
-- baca: semua peran fasyankes + Dinkes wilayahnya; tandai: admin dan petugas kesling; batalkan (hapus): admin saja
select private.pasang_rls('laporan_kirim',
  array['admin_fasyankes','petugas_kesling','petugas_ruangan','pimpinan'],
  array['admin_fasyankes','petugas_kesling']);

create or replace function private.isi_penulis_kirim()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.petugas_id := auth.uid();
    new.petugas_nama := (select p.nama from public.profil p where p.id = auth.uid());
  end if;
  if tg_op = 'INSERT' then new.dibuat := now(); end if;
  return new;
end $$;
drop trigger if exists isi_penulis on public.laporan_kirim;
create trigger isi_penulis before insert or update on public.laporan_kirim for each row execute function private.isi_penulis_kirim();
drop trigger if exists zz_riwayat on public.laporan_kirim;
create trigger zz_riwayat after update or delete on public.laporan_kirim for each row execute function private.catat_riwayat();

-- ===== 3. Catatan pembinaan dari Dinkes =====
-- Dinkes boleh MENULIS catatan (bukan mengubah data fasyankes). Fasyankes membaca, menandai dibaca, dan menanggapi.
create table if not exists public.pembinaan (
  id uuid primary key default gen_random_uuid(),
  fasyankes_id uuid not null references public.fasyankes(id) on delete cascade,
  dibuat timestamptz not null default now(),
  penulis_id uuid default auth.uid(),
  penulis_nama text,
  tabel text not null check (tabel in ('laporan_bulanan', 'tpm_inspeksi', 'ikl_inspeksi', 'umum')),
  data_id uuid,                                   -- catatan inspeksi yang dimaksud (boleh kosong)
  periode text check (periode ~ '^[0-9]{4}-(0[1-9]|1[0-2])$'),
  judul text check (length(judul) <= 200),        -- mis. nama tempat yang diinspeksi
  isi text not null check (length(trim(isi)) between 1 and 2000),
  dibaca timestamptz,
  dibaca_oleh uuid,
  tanggapan text check (length(tanggapan) <= 2000),
  ditanggapi timestamptz
);
create index if not exists idx_pembinaan_fas on public.pembinaan (fasyankes_id, dibuat desc);
create index if not exists idx_pembinaan_data on public.pembinaan (tabel, data_id);

alter table public.pembinaan enable row level security;
revoke all on public.pembinaan from anon, authenticated;
grant select, insert, delete on public.pembinaan to authenticated;      -- tidak ada izin UPDATE langsung
drop policy if exists baca on public.pembinaan;
drop policy if exists tambah_dinkes on public.pembinaan;
drop policy if exists hapus_dinkes on public.pembinaan;
create policy baca on public.pembinaan for select to authenticated using (
  (fasyankes_id = private.fasyankes_saya() and private.peran_saya() = any (array['admin_fasyankes','petugas_kesling','pimpinan']))
  or fasyankes_id in (select private.fasyankes_wilayah()));
create policy tambah_dinkes on public.pembinaan for insert to authenticated with check (
  private.peran_saya() = 'dinkes' and fasyankes_id in (select private.fasyankes_wilayah()));
-- Dinkes hanya bisa menarik catatannya sendiri selama belum ditanggapi
create policy hapus_dinkes on public.pembinaan for delete to authenticated using (
  private.peran_saya() = 'dinkes' and penulis_id = auth.uid() and tanggapan is null);

create or replace function private.isi_penulis_pembinaan()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is not null then
    new.penulis_id := auth.uid();
    new.penulis_nama := (select p.nama from public.profil p where p.id = auth.uid());
    new.dibuat := now();
    new.dibaca := null; new.dibaca_oleh := null; new.tanggapan := null; new.ditanggapi := null;
  end if;
  return new;
end $$;
drop trigger if exists isi_penulis on public.pembinaan;
create trigger isi_penulis before insert on public.pembinaan for each row execute function private.isi_penulis_pembinaan();

-- Fasyankes menandai dibaca dan (boleh) menanggapi
create or replace function public.tanggapi_pembinaan(p_id uuid, p_tanggapan text default null)
returns void language plpgsql security definer set search_path = '' as $$
declare t text := nullif(trim(coalesce(p_tanggapan, '')), '');
begin
  if t is not null and length(t) > 2000 then raise exception 'Tanggapan terlalu panjang (maksimal 2000 huruf).'; end if;
  update public.pembinaan
     set dibaca = coalesce(dibaca, now()), dibaca_oleh = coalesce(dibaca_oleh, auth.uid()),
         tanggapan = coalesce(t, tanggapan), ditanggapi = case when t is not null then now() else ditanggapi end
   where id = p_id and fasyankes_id = private.fasyankes_saya()
     and private.peran_saya() = any (array['admin_fasyankes','petugas_kesling','pimpinan']);
  if not found then raise exception 'Catatan tidak ditemukan atau Anda tidak berhak.'; end if;
end $$;
revoke all on function public.tanggapi_pembinaan(uuid, text) from public, anon;
grant execute on function public.tanggapi_pembinaan(uuid, text) to authenticated;

-- ===== 4. Foto contoh dan isian tambahan di data demo =====
-- File foto contoh disimpan di situs (folder contoh-foto), bukan di penyimpanan. Jalur ".../contoh/..." dikenali aplikasi.
create or replace function private.isi_demo_tambahan()
returns text language plpgsql security definer set search_path = '' as $$
declare x record; r record; k text; n int := 0; sudah_bina boolean := false; periode_lalu text := to_char((now() at time zone 'Asia/Makassar') - interval '1 month', 'YYYY-MM');
  lat0 numeric; lng0 numeric;
begin
  for x in select f.id, f.jenis ilike 'puskesmas%' as puskes, row_number() over (order by f.nama) as urut from public.fasyankes f where f.demo loop
    lat0 := -5.135 - x.urut * 0.02; lng0 := 119.42 + x.urut * 0.02;
    -- inspeksi TFU/TTU: foto tempat + foto butir yang tidak memenuhi (maks 2)
    for r in select i.id, i.tanggal, i.jenis_objek, i.jawaban, o.lat, o.lng from public.ikl_inspeksi i left join public.objek_inspeksi o on o.id = i.objek_id where i.fasyankes_id = x.id loop
      insert into public.foto (fasyankes_id, tabel, data_id, butir, path, lat, lng, akurasi, diambil, sumber, ukuran)
      values (x.id, 'ikl_inspeksi', r.id, '_tempat', x.id || '/ikl_inspeksi/contoh/' || r.id || '_tempat__' || case when r.jenis_objek ilike 'tempat ibadah%' then 'masjid' else 'sekolah' end || '.jpg',
              coalesce(r.lat, lat0), coalesce(r.lng, lng0), 9, (r.tanggal + time '09:20') at time zone 'Asia/Makassar', 'kamera', 60000)
      on conflict (path) do nothing;
      for k in select e.key from jsonb_each_text(coalesce(r.jawaban, '{}'::jsonb)) e where e.value = 'tidak' order by e.key limit 2 loop
        insert into public.foto (fasyankes_id, tabel, data_id, butir, path, lat, lng, akurasi, diambil, sumber, ukuran)
        values (x.id, 'ikl_inspeksi', r.id, k, x.id || '/ikl_inspeksi/contoh/' || r.id || '_' || k || '__cuci-tangan.jpg',
                coalesce(r.lat, lat0), coalesce(r.lng, lng0), 11, (r.tanggal + time '09:35') at time zone 'Asia/Makassar', 'kamera', 60000)
        on conflict (path) do nothing;
        n := n + 1;
      end loop;
      n := n + 1;
    end loop;
    -- inspeksi TPP: foto dapur
    for r in select i.id, i.tanggal, o.lat, o.lng from public.tpm_inspeksi i left join public.objek_inspeksi o on o.id = i.objek_id where i.fasyankes_id = x.id loop
      insert into public.foto (fasyankes_id, tabel, data_id, butir, path, lat, lng, akurasi, diambil, sumber, ukuran)
      values (x.id, 'tpm_inspeksi', r.id, '_tempat', x.id || '/tpm_inspeksi/contoh/' || r.id || '_tempat__dapur.jpg',
              coalesce(r.lat, lat0), coalesce(r.lng, lng0), 8, (r.tanggal + time '10:05') at time zone 'Asia/Makassar', 'kamera', 60000)
      on conflict (path) do nothing;
      n := n + 1;
    end loop;
    -- dokumentasi formulir lain: beberapa catatan terbaru
    for r in (select 'limbah_harian'::text t, id, tanggal, 'tps'::text nm from public.limbah_harian where fasyankes_id = x.id order by tanggal desc limit 4)
             union all (select 'k3_insiden', id, tanggal, 'k3' from public.k3_insiden where fasyankes_id = x.id order by tanggal desc limit 3)
             union all (select 'vektor', id, tanggal, 'vektor' from public.vektor where fasyankes_id = x.id order by tanggal desc limit 3)
             union all (select 'ipal_harian', id, tanggal, 'ipal' from public.ipal_harian where fasyankes_id = x.id order by tanggal desc limit 3)
             union all (select distinct on (tanggal) 'air_uji', id, tanggal, 'air' from public.air_uji where fasyankes_id = x.id order by tanggal desc, id limit 2) loop
      insert into public.foto (fasyankes_id, tabel, data_id, butir, path, lat, lng, akurasi, diambil, sumber, ukuran)
      values (x.id, r.t, r.id, '_dok', x.id || '/' || r.t || '/contoh/' || r.id || '_dok__' || r.nm || '.jpg',
              lat0 + 0.001, lng0 + 0.001, 12, (r.tanggal + time '08:45') at time zone 'Asia/Makassar', 'kamera', 60000)
      on conflict (path) do nothing;
      n := n + 1;
    end loop;
    -- laporan bulan lalu: dua fasyankes demo pertama sudah menandai dikirim
    if x.urut <= 2 then
      insert into public.laporan_kirim (fasyankes_id, periode, petugas_nama, catatan)
      values (x.id, periode_lalu, 'Petugas kesling demo', 'Laporan bulanan sudah lengkap (contoh).')
      on conflict (fasyankes_id, periode) do nothing;
    end if;
    -- satu catatan pembinaan contoh untuk puskesmas demo pertama
    if x.puskes and not sudah_bina then
      sudah_bina := true;
      insert into public.pembinaan (fasyankes_id, penulis_nama, tabel, data_id, judul, isi)
      select x.id, 'Seksi Kesling Dinkes (contoh)', 'ikl_inspeksi', i.id, i.lokasi,
             'Mohon sarana cuci tangan di tempat ini dilengkapi sabun, lalu lakukan inspeksi ulang sebelum batas perbaikan.'
      from public.ikl_inspeksi i where i.fasyankes_id = x.id and i.status = 'tidak_memenuhi'
        and not exists (select 1 from public.pembinaan b where b.fasyankes_id = x.id)
      order by i.tanggal desc limit 1;
    end if;
  end loop;
  return 'Foto contoh: ' || n;
end $$;
revoke all on function private.isi_demo_tambahan() from public, anon, authenticated;

-- Jadwal isi ulang demo tiap malam (02.00 WITA) sekarang juga mengisi foto contoh, status kirim, dan pembinaan contoh
select cron.unschedule(jobid) from cron.job where jobname = 'sanikes-reset-demo';
select cron.schedule('sanikes-reset-demo', '0 18 * * *', 'select private.isi_demo(); select private.isi_demo_objek(); select private.isi_demo_tambahan();');

-- ===== 5. Jalankan sekarang dan cek =====
select private.isi_demo_tambahan() as demo,
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'laporan_kirim') as aturan_kirim,
       (select count(*) from pg_policies where schemaname = 'public' and tablename = 'pembinaan') as aturan_pembinaan,
       (select has_table_privilege('authenticated', 'public.pembinaan', 'UPDATE')) as pembinaan_bisa_diubah_langsung;
