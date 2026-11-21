-- =========================================================
-- AKUN DEMO SANIKES
-- Fasyankes demo (ditandai fasyankes.demo = true) diisi data contoh 90 hari terakhir
-- dan diisi ulang setiap malam. Akun demo dikembalikan sandi/emailnya setiap malam.
-- Data fasyankes sungguhan TIDAK disentuh: semua hapus/isi hanya untuk fasyankes.demo = true.
-- =========================================================

alter table public.fasyankes add column if not exists demo boolean not null default false;
alter table public.fasyankes add column if not exists demo_skenario int;
alter table public.wilayah add column if not exists demo boolean not null default false;

create table if not exists private.akun_demo (
  email text primary key,
  sandi text not null,
  id uuid
);
insert into private.akun_demo (email, sandi) values
  ('papkenz25+demoklinik@gmail.com', 'demosanikes'),
  ('papkenz25+demodinkes@gmail.com', 'demosanikes')
on conflict (email) do nothing;

-- 1. Wilayah dan fasyankes demo (dibuat sekali)
do $$
declare w uuid;
begin
  select id into w from public.wilayah where demo limit 1;
  if w is null then
    insert into public.wilayah (nama, kabupaten_kota, provinsi, demo)
    values ('Dinas Kesehatan Kabupaten Demo', 'Kabupaten Demo', 'Provinsi Demo', true) returning id into w;
  end if;
  if not exists (select 1 from public.fasyankes where demo and nama = 'Klinik Pratama Sehat Demo') then
    insert into public.fasyankes (nama, jenis, alamat, kabupaten_kota, provinsi, nama_pimpinan, aktif, wilayah_id, dibagikan_dinkes, demo, demo_skenario)
    values ('Klinik Pratama Sehat Demo', 'Klinik', 'Jl. Contoh No. 1', 'Kabupaten Demo', 'Provinsi Demo', 'dr. Pimpinan Demo', true, w, true, true, 1);
  end if;
  if not exists (select 1 from public.fasyankes where demo and nama = 'Puskesmas Demo Sejahtera') then
    insert into public.fasyankes (nama, jenis, alamat, kabupaten_kota, provinsi, nama_pimpinan, aktif, wilayah_id, demo, demo_skenario)
    values ('Puskesmas Demo Sejahtera', 'Puskesmas', 'Jl. Contoh No. 2', 'Kabupaten Demo', 'Provinsi Demo', 'Kepala Puskesmas Demo', true, w, true, 1);
  end if;
  if not exists (select 1 from public.fasyankes where demo and nama = 'Puskesmas Demo Makmur') then
    insert into public.fasyankes (nama, jenis, alamat, kabupaten_kota, provinsi, nama_pimpinan, aktif, wilayah_id, demo, demo_skenario)
    values ('Puskesmas Demo Makmur', 'Puskesmas', 'Jl. Contoh No. 3', 'Kabupaten Demo', 'Provinsi Demo', 'Kepala Puskesmas Demo', true, w, true, 2);
  end if;
  if not exists (select 1 from public.fasyankes where demo and nama = 'Puskesmas Demo Bahagia') then
    insert into public.fasyankes (nama, jenis, alamat, kabupaten_kota, provinsi, nama_pimpinan, aktif, wilayah_id, demo, demo_skenario)
    values ('Puskesmas Demo Bahagia', 'Puskesmas', 'Jl. Contoh No. 4', 'Kabupaten Demo', 'Provinsi Demo', 'Kepala Puskesmas Demo', true, w, true, 3);
  end if;
end $$;

-- 2. Isi data contoh untuk satu fasyankes demo
-- skenario 1 = rajin & patuh, 2 = cukup, 3 = jarang mencatat dan banyak temuan
create or replace function private.isi_demo_satu(f uuid, sk int, puskes boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare
  q numeric := case sk when 1 then 0.95 when 2 then 0.8 else 0.45 end;   -- peluang mencatat
  gagal numeric := case sk when 1 then 0.04 when 2 then 0.12 else 0.3 end; -- peluang tidak memenuhi
  kodes text[];
  r_tindakan uuid; r_lab uuid; r_adm uuid; r_dapur uuid; r_bersalin uuid;
  v_tps uuid; v_vendor uuid;
  bln int; tgl date;
begin
  select array_agg(ml.kode order by ml.kode) into kodes from public.master_limbah ml
    where ml.aktif and ml.kode in ('A337-1','A337-2','A337-3','A337-4','A337-5','B337-1');
  if kodes is null then select array_agg(x.kode) into kodes from (select ml.kode from public.master_limbah ml where ml.aktif order by ml.kode limit 4) x; end if;

  -- data dasar
  insert into public.ruangan (fasyankes_id, nama, jenis, aktif, kategori_udara) values (f, 'Ruang Tindakan', 'Pelayanan', true, 'perawatan') returning id into r_tindakan;
  insert into public.ruangan (fasyankes_id, nama, jenis, aktif, kategori_udara) values (f, 'Laboratorium', 'Penunjang', true, 'lab') returning id into r_lab;
  insert into public.ruangan (fasyankes_id, nama, jenis, aktif, kategori_udara) values (f, 'Ruang Administrasi', 'Kantor', true, 'administrasi') returning id into r_adm;
  if puskes then
    insert into public.ruangan (fasyankes_id, nama, jenis, aktif, kategori_udara) values (f, 'Dapur Gizi', 'Penunjang', true, 'dapur') returning id into r_dapur;
    insert into public.ruangan (fasyankes_id, nama, jenis, aktif, kategori_udara) values (f, 'Ruang Bersalin', 'Pelayanan', true, 'bersalin') returning id into r_bersalin;
  end if;
  insert into public.tps (fasyankes_id, nama, suhu, aktif) values (f, 'TPS Limbah B3', 'ruang', true) returning id into v_tps;
  insert into public.vendor (fasyankes_id, nama, peran, no_izin, izin_berakhir, no_mou, mou_berakhir, kontak, aktif)
    values (f, 'PT Pengolah Limbah Contoh', 'Pengangkut dan pengolah', 'IZIN-DEMO-001', current_date + 20, 'MOU-DEMO-01', current_date + 200, '08xx-demo', true)
    returning id into v_vendor;
  insert into public.titik (fasyankes_id, jenis, nama, aktif) values
    (f, 'air', 'Kran dapur', true), (f, 'air', 'Wastafel ruang tindakan', true), (f, 'ipal', 'Outlet IPAL', true);
  insert into public.pengaturan (fasyankes_id, kunci, nilai) values (f, 'kelas_ipal', '3_50');
  insert into public.penjamah (fasyankes_id, nama, lokasi, sertifikat_pelatihan, sertifikat_berakhir, aktif, tgl_periksa_kesehatan) values
    (f, 'Penjamah Contoh 1', 'Dapur', 'Pelatihan higiene sanitasi pangan', current_date + 15, true, current_date - 120),
    (f, 'Penjamah Contoh 2', 'Dapur', 'Pelatihan higiene sanitasi pangan', current_date + 300, true, current_date - 400);
  insert into public.sanitarian_kit (fasyankes_id, nama_alat, kategori, kondisi, tgl_kalibrasi, kalibrasi_berikutnya) values
    (f, 'Termohigrometer', 'Udara', 'Baik', current_date - 355, current_date + 10),
    (f, 'Lux meter', 'Udara', 'Baik', current_date - 100, current_date + 265),
    (f, 'pH meter', 'Air', 'Baik', current_date - 60, current_date + 305),
    (f, 'Sound level meter', 'Udara', 'Baik', current_date - 30, current_date + 335);

  -- limbah B3 harian (90 hari) dan pengangkutan mingguan
  create temp table _lh on commit drop as
    select current_date - g.d as tanggal,
           kodes[1 + floor(random()::numeric * array_length(kodes, 1))::int] as kode_limbah,
           round((0.3 + random()::numeric * (case when puskes then 4 else 2.5 end))::numeric, 2) as berat_kg,
           (array[r_tindakan, r_lab, coalesce(r_bersalin, r_tindakan)])[1 + floor(random()::numeric * 3)::int] as ruangan_id
    from generate_series(0, 89) g(d), generate_series(1, case when puskes then 3 else 2 end) k
    where random()::numeric < q;
  create temp table _ang on commit drop as
    select gen_random_uuid() as id, (date_trunc('week', tanggal)::date + 6) as tgl_angkut, kode_limbah, sum(berat_kg) as berat
    from pg_temp._lh where date_trunc('week', tanggal)::date + 6 < current_date
    group by 2, 3;
  insert into public.limbah_angkut (id, fasyankes_id, tanggal, vendor_id, kode_limbah, berat_kg, no_manifest, perlakuan)
    select id, f, tgl_angkut, v_vendor, kode_limbah, berat, 'MNF-DEMO-' || to_char(tgl_angkut, 'YYMMDD') || '-' || left(kode_limbah, 6), 'Insinerasi oleh pihak ketiga' from pg_temp._ang;
  insert into public.limbah_harian (fasyankes_id, tanggal, jam, ruangan_id, kode_limbah, nama_limbah, berat_kg, tps_id, suhu, batas_simpan, status, tgl_keluar, angkut_id)
    select f, l.tanggal, time '09:00' + (random() * interval '7 hours'), l.ruangan_id, l.kode_limbah,
           (select nama from public.master_limbah m where m.kode = l.kode_limbah), l.berat_kg, v_tps, 'ruang',
           (l.tanggal + 2)::timestamptz + interval '9 hours',
           case when a.id is null then 'disimpan' else 'diangkut' end, a.tgl_angkut, a.id
    from pg_temp._lh l left join pg_temp._ang a on a.kode_limbah = l.kode_limbah and a.tgl_angkut = date_trunc('week', l.tanggal)::date + 6;
  drop table pg_temp._lh; drop table pg_temp._ang;

  -- IPAL harian
  insert into public.ipal_harian (fasyankes_id, tanggal, debit, ph_inlet, ph, suhu_inlet, suhu_outlet, warna_inlet, warna_outlet, bau_inlet, bau_outlet,
                                  kondisi_pompa, kondisi_blower, kelas_ipal, ph_batas_min, ph_batas_maks)
    select f, current_date - g.d, round((2 + random()::numeric * 6)::numeric, 1), round((6.6 + random()::numeric * 1.2)::numeric, 1),
           case when random()::numeric < gagal / 2 then 9.3 else round((6.8 + random()::numeric * 1.5)::numeric, 1) end,
           round((28 + random()::numeric * 3)::numeric, 1), round((27.5 + random()::numeric * 3)::numeric, 1),
           'Keruh', 'Jernih', 'Berbau', 'Tidak berbau', 'Baik', case when random()::numeric < 0.05 then 'Perlu perbaikan' else 'Baik' end, '3_50', 6, 9
    from generate_series(0, 89) g(d)
    where random()::numeric < q or (sk = 1 and g.d < 2);

  -- uji bulanan: air minum, IPAL lab, udara, vektor, inspeksi
  for bln in 0..2 loop
    tgl := (date_trunc('month', current_date) - make_interval(months => bln))::date + 9;
    continue when tgl > current_date;
    continue when sk = 3 and bln = 0 and random()::numeric < 0.5;

    insert into public.air_uji (fasyankes_id, tanggal, titik_sampel, jenis_uji, parameter, hasil, satuan, status, lab, batas_min, batas_maks, dasar_aturan)
      select f, tgl, 'Kran dapur', 'air_minum', b.parameter, v.h, b.satuan,
             case when (b.min is not null and v.h < b.min) or (b.maks is not null and v.h > b.maks) then 'tidak_memenuhi' else 'memenuhi' end,
             'Labkesda Demo', b.min, b.maks, b.dasar_aturan
      from public.master_bakumutu b,
           lateral (select case
             when random()::numeric < gagal then (case when b.maks = 0 then 3 else round(coalesce(b.maks, b.min, 1) * 1.6 + 0.01, 3) end)
             when b.min is not null and b.maks is not null then round(b.min + random()::numeric * (b.maks - b.min), 2)
             when b.maks = 0 then 0
             else round(coalesce(b.maks, 1) * (0.1 + random()::numeric * 0.6), 3) end as h) v
      where b.modul = 'air_minum' and b.aktif and b.satuan <> 'kualitatif' and b.parameter !~* '^suhu' and (b.min is not null or b.maks is not null);

    insert into public.ipal_lab (fasyankes_id, tanggal, titik, parameter, hasil, satuan, status, lab, catatan, batas_min, batas_maks, dasar_aturan)
      select f, tgl + 1, 'Outlet IPAL', b.parameter, v.h, b.satuan,
             case when b.satuan = 'kualitatif' then 'memenuhi'
                  when (b.min is not null and v.h < b.min) or (b.maks is not null and v.h > b.maks) then 'tidak_memenuhi' else 'memenuhi' end,
             'Labkesda Demo', case when b.satuan = 'kualitatif' then 'Negatif' end, b.min, b.maks, b.dasar_aturan
      from public.master_bakumutu b,
           lateral (select case
             when b.satuan = 'kualitatif' then null
             when random()::numeric < gagal then round(coalesce(b.maks, 9) * 1.3, 1)
             when b.min is not null and b.maks is not null then round(b.min + 0.5 + random()::numeric * (b.maks - b.min - 1), 1)
             else round(coalesce(b.maks, 1) * (0.25 + random()::numeric * 0.6), 1) end as h) v
      where b.modul = 'ipal_media_air_3_50' and b.aktif and b.parameter !~* 'deterjen|mbas';

    insert into public.udara_skudr (fasyankes_id, tanggal, lokasi, parameter, hasil, satuan, status, alat, ruangan_id, kategori, batas_min, batas_maks, dasar_aturan)
      select f, tgl + 2, r.nama, b.parameter, v.h, b.satuan,
             case when (b.min is not null and v.h < b.min) or (b.maks is not null and v.h > b.maks) then 'tidak_memenuhi' else 'memenuhi' end,
             'Alat ukur demo', r.id, r.kategori_udara, b.min, b.maks, b.dasar_aturan
      from public.ruangan r
      join public.master_bakumutu b on b.modul = 'udara_' || r.kategori_udara and b.aktif and b.parameter ~* '^(suhu|kelembab|pencahaya|kebising)'
      cross join lateral (select case
             when random()::numeric < gagal then round(coalesce(b.maks, b.min * 0.6) * 1.15, 1)
             when b.min is not null and b.maks is not null then round(b.min + random()::numeric * (b.maks - b.min), 1)
             when b.min is not null then round(b.min * (1.05 + random()::numeric * 0.6), 0)
             else round(b.maks * (0.7 + random()::numeric * 0.25), 0) end as h) v
      where r.fasyankes_id = f and r.kategori_udara is not null;

    insert into public.sanitasi_checklist (fasyankes_id, tanggal, lingkup, jawaban, skor, status, batas_skor, temuan, status_tindak_lanjut)
      select f, tgl + 3, 'bangunan', '{}'::jsonb, s, case when s >= 80 then 'memenuhi' else 'tidak_memenuhi' end, 80,
             case when s < 80 then '• Contoh: tempat sampah tidak bertutup di beberapa ruangan' end,
             case when s < 80 then 'terbuka' else 'tidak_perlu' end
      from (select case when random()::numeric < gagal * 1.5 then 72 + floor(random()::numeric * 7) else 82 + floor(random()::numeric * 15) end as s) x;

    if puskes then
      insert into public.tpm_inspeksi (fasyankes_id, tanggal, lokasi, jawaban, skor, status, batas_skor, temuan)
        select f, tgl + 4, 'Dapur Gizi', '{}'::jsonb, s, case when s >= 80 then 'memenuhi' else 'tidak_memenuhi' end, 80,
               case when s < 80 then '• Contoh: penjamah tidak memakai celemek dan penutup kepala' end
        from (select case when random()::numeric < gagal * 1.5 then 70 + floor(random()::numeric * 9) else 81 + floor(random()::numeric * 16) end as s) x;
      insert into public.ikl_inspeksi (fasyankes_id, tanggal, jenis_objek, nama_objek, lokasi, jawaban, skor, status, batas_skor, temuan)
        select f, tgl + 5 + k, (array['Sekolah / madrasah','Tempat ibadah','Pasar'])[k], 'Objek TFU Contoh ' || k, 'Desa Contoh', '{}'::jsonb, s,
               case when s >= 70 then 'memenuhi' else 'tidak_memenuhi' end, 70,
               case when s < 70 then '• Contoh: sarana cuci tangan tidak tersedia' end
        from generate_series(1, 2) k, lateral (select case when random()::numeric < gagal * 2 then 55 + floor(random()::numeric * 14) else 72 + floor(random()::numeric * 25) end + k * 0 as s) x;
    end if;
  end loop;

  -- vektor: ABJ mingguan, kecoa dan lalat bulanan
  insert into public.vektor (fasyankes_id, tanggal, lokasi, jenis_vektor, jumlah_temuan, jumlah_diperiksa, jumlah_positif, rincian, status, batas_min, batas_maks, dasar_aturan)
    select f, current_date - w * 7 - 1, 'Lingkungan gedung', b.parameter, round(floor((50 - p) * 1000 / 50.0) / 10, 1), 50, p,
           jsonb_build_object('data', jsonb_build_object('per', '50', 'pos', p::text), 'ket', (50 - p) || ' dari 50 bebas jentik'),
           case when floor((50 - p) * 1000 / 50.0) / 10 >= 95 then 'memenuhi' else 'tidak_memenuhi' end, b.min, b.maks, b.dasar_aturan
    from generate_series(0, 12) w
    join public.master_bakumutu b on b.modul = 'vektor' and b.aktif and b.parameter ~* 'abj'
    cross join lateral (select case when random()::numeric < gagal then 3 + floor(random()::numeric * 3)::int else floor(random()::numeric * 3)::int end as p) x
    where random()::numeric < q;
  insert into public.vektor (fasyankes_id, tanggal, lokasi, jenis_vektor, jumlah_temuan, status, batas_min, batas_maks, dasar_aturan)
    select f, (date_trunc('month', current_date) - make_interval(months => m2))::date + 14, 'Dapur dan gudang', b.parameter, v.h,
           case when v.h < b.maks then 'memenuhi' else 'tidak_memenuhi' end, b.min, b.maks, b.dasar_aturan
    from generate_series(0, 2) m2
    join public.master_bakumutu b on b.modul = 'vektor' and b.aktif and b.parameter ~* '^(kecoa|lalat)'
    cross join lateral (select case when random()::numeric < gagal then round((2 + random()::numeric * 2)::numeric, 1) else round((random()::numeric * 1.8)::numeric, 1) end as h) v
    where (date_trunc('month', current_date) - make_interval(months => m2))::date + 14 <= current_date;

  -- K3
  insert into public.k3_insiden (fasyankes_id, tanggal, jenis, lokasi, jumlah, uraian, tindakan, status) values
    (f, current_date - 40, 'Tertusuk jarum / benda tajam', 'Ruang Tindakan', 1, 'Contoh: petugas tertusuk jarum bekas saat membuang ke safety box', 'Penanganan pasca pajanan sesuai SOP PPI', 'selesai'),
    (f, current_date - 6, 'Kejadian hampir celaka (near miss)', 'Laboratorium', 0, 'Contoh: lantai licin di depan laboratorium', null, 'terbuka');

  -- temuan dari hasil yang tidak memenuhi (yang lama sudah selesai, yang baru masih terbuka)
  insert into public.temuan (fasyankes_id, tanggal, kategori, sumber, sumber_id, lokasi, parameter, hasil, uraian, tindakan, status, tanggal_selesai)
    select f, x.tanggal, x.kategori, x.sumber, x.id::text, x.lokasi, x.parameter, x.hasil, 'tidak memenuhi baku mutu',
           case when x.tanggal < current_date - 21 then 'Sudah ditindaklanjuti dan diperiksa ulang (contoh)' end,
           case when x.tanggal < current_date - 21 then 'selesai' else 'terbuka' end,
           case when x.tanggal < current_date - 21 then x.tanggal + 7 end
    from (
      select id, tanggal, 'air' as kategori, 'air_uji' as sumber, titik_sampel as lokasi, parameter, hasil::text as hasil from public.air_uji where fasyankes_id = f and status = 'tidak_memenuhi'
      union all select id, tanggal, 'ipal', 'ipal_lab', titik, parameter, hasil::text from public.ipal_lab where fasyankes_id = f and status = 'tidak_memenuhi'
      union all select id, tanggal, 'ipal', 'ipal_harian', 'Outlet IPAL', 'pH', ph::text from public.ipal_harian where fasyankes_id = f and (ph > ph_batas_maks or ph < ph_batas_min)
      union all select id, tanggal, 'udara', 'udara_skudr', lokasi, parameter, hasil::text from public.udara_skudr where fasyankes_id = f and status = 'tidak_memenuhi'
      union all select id, tanggal, 'vektor', 'vektor', lokasi, jenis_vektor, jumlah_temuan::text from public.vektor where fasyankes_id = f and status = 'tidak_memenuhi'
      union all select id, tanggal, 'sanitasi', 'sanitasi_checklist', 'Seluruh bangunan', 'Skor inspeksi sanitasi', skor::text from public.sanitasi_checklist where fasyankes_id = f and status = 'tidak_memenuhi'
      union all select id, tanggal, 'tpm', 'tpm_inspeksi', lokasi, 'Skor inspeksi pangan', skor::text from public.tpm_inspeksi where fasyankes_id = f and status = 'tidak_memenuhi'
      union all select id, tanggal, 'ttu', 'ikl_inspeksi', nama_objek, 'Skor inspeksi TFU', skor::text from public.ikl_inspeksi where fasyankes_id = f and status = 'tidak_memenuhi'
      union all select id, tanggal, 'k3', 'k3_insiden', lokasi, jenis, jumlah || ' orang terdampak' from public.k3_insiden where fasyankes_id = f
    ) x;
  update public.temuan set status = 'selesai', tanggal_selesai = tanggal + 3, tindakan = 'Penanganan pasca pajanan sesuai SOP PPI'
    where fasyankes_id = f and sumber = 'k3_insiden' and tanggal < current_date - 21;
end $$;

-- 3. Hapus lalu isi ulang SEMUA fasyankes demo, dan kembalikan akun demo
create or replace function private.isi_demo()
returns text language plpgsql security definer set search_path = '' as $$
declare
  t text; daftar text[]; sisa text[]; putaran int := 0; x record; n int := 0;
  ids_demo uuid[] := array(select f.id from public.fasyankes f where f.demo);
  simpan text[] := array['profil', 'riwayat'];
begin
  if array_length(ids_demo, 1) is null then return 'Tidak ada fasyankes demo.'; end if;
  select array_agg(c.table_name::text) into daftar from information_schema.columns c
    join information_schema.tables y on y.table_schema = c.table_schema and y.table_name = c.table_name and y.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and c.column_name = 'fasyankes_id' and c.table_name <> all (simpan);
  foreach t in array daftar loop execute format('alter table public.%I disable trigger user', t); end loop;
  sisa := daftar;
  while array_length(sisa, 1) > 0 and putaran < 10 loop
    daftar := sisa; sisa := '{}'; putaran := putaran + 1;
    foreach t in array daftar loop
      begin
        execute format('delete from public.%I where fasyankes_id = any ($1)', t) using ids_demo;
      exception when foreign_key_violation then sisa := sisa || t;
      end;
    end loop;
  end loop;
  select array_agg(c.table_name::text) into daftar from information_schema.columns c
    join information_schema.tables y on y.table_schema = c.table_schema and y.table_name = c.table_name and y.table_type = 'BASE TABLE'
    where c.table_schema = 'public' and c.column_name = 'fasyankes_id' and c.table_name <> all (simpan);
  foreach t in array daftar loop execute format('alter table public.%I enable trigger user', t); end loop;
  if array_length(sisa, 1) > 0 then raise exception 'Gagal menghapus data demo: %', sisa; end if;
  delete from public.riwayat where fasyankes_id = any (ids_demo);

  for x in select id, coalesce(demo_skenario, 1) as sk, jenis ilike 'puskesmas%' as puskes from public.fasyankes fz where fz.demo loop
    perform private.isi_demo_satu(x.id, x.sk, x.puskes);
    n := n + 1;
  end loop;

  -- akun demo: kembalikan email, sandi, status aktif
  update private.akun_demo a set id = u.id from auth.users u where a.id is null and lower(u.email) = lower(a.email);
  update auth.users u set email = a.email, encrypted_password = extensions.crypt(a.sandi, extensions.gen_salt('bf')),
         banned_until = null, email_change = '', email_change_token_new = '', email_confirmed_at = coalesce(u.email_confirmed_at, now()), updated_at = now()
    from private.akun_demo a where a.id = u.id;
  update public.profil p set aktif = true, versi_privasi = '1.0', setuju_privasi = coalesce(p.setuju_privasi, now())
    from private.akun_demo a where a.id = p.id;
  return 'Data demo diisi ulang untuk ' || n || ' fasyankes.';
end $$;
revoke all on function private.isi_demo() from public, anon, authenticated;
revoke all on function private.isi_demo_satu(uuid, int, boolean) from public, anon, authenticated;

-- 4. Jadwal: isi ulang setiap hari pukul 02.00 WITA (18.00 UTC)
create extension if not exists pg_cron with schema pg_catalog;
select cron.unschedule(jobid) from cron.job where jobname = 'sanikes-reset-demo';
select cron.schedule('sanikes-reset-demo', '0 18 * * *', 'select private.isi_demo()');

-- 5. Isi sekarang
select private.isi_demo() as hasil;
