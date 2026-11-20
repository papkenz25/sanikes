-- Koreksi baku mutu sesuai PDF resmi Permenkes 2/2023 (dicocokkan 20 Nov 2026)
-- Aman dijalankan ulang. Hasil uji lama TIDAK berubah karena tiap hasil menyimpan salinan batasnya sendiri.

drop table if exists _ref;
create temp table _ref (modul text, pola text, nama text, satuan text, mn numeric, mk numeric, kel text, dasar text);

-- ===== AIR MINUM (Tabel 1) dan AIR HIGIENE SANITASI (Tabel 3) =====
insert into _ref values
('air_minum','^e\.? ?coli','E. coli','CFU/100ml',null,0,'Biologi','Permenkes 2/2023 Lamp. Tabel 1'),
('air_minum','^total coli','Total coliform','CFU/100ml',null,0,'Biologi','Permenkes 2/2023 Lamp. Tabel 1'),
('air_minum','^suhu','Suhu (selisih dari suhu udara)','°C',-3,3,'Fisik','Permenkes 2/2023 Lamp. Tabel 1: suhu udara ± 3'),
('air_minum','^(tds|total dissolved|zat padat)','TDS','mg/L',null,300,'Fisik','Permenkes 2/2023 Lamp. Tabel 1: < 300'),
('air_minum','^kekeruhan','Kekeruhan','NTU',null,3,'Fisik','Permenkes 2/2023 Lamp. Tabel 1: < 3'),
('air_minum','^warna','Warna','TCU',null,10,'Fisik','Permenkes 2/2023 Lamp. Tabel 1'),
('air_minum','^bau','Bau','kualitatif',null,null,'Fisik','Permenkes 2/2023 Lamp. Tabel 1: tidak berbau'),
('air_minum','^ph','pH','-',6.5,8.5,'Kimia','Permenkes 2/2023 Lamp. Tabel 1'),
('air_minum','^nitrat','Nitrat','mg/L',null,20,'Kimia','Permenkes 2/2023 Lamp. Tabel 1'),
('air_minum','^nitrit','Nitrit','mg/L',null,3,'Kimia','Permenkes 2/2023 Lamp. Tabel 1'),
('air_minum','^krom','Kromium valensi 6','mg/L',null,0.01,'Kimia','Permenkes 2/2023 Lamp. Tabel 1'),
('air_minum','^besi','Besi','mg/L',null,0.2,'Kimia','Permenkes 2/2023 Lamp. Tabel 1'),
('air_minum','^mangan','Mangan','mg/L',null,0.1,'Kimia','Permenkes 2/2023 Lamp. Tabel 1'),
('air_minum','^sisa kl','Sisa khlor','mg/L',0.2,0.5,'Kimia','Permenkes 2/2023 Lamp. Tabel 1: 0,2–0,5 (kontak 30 menit)'),
('air_minum','^arsen','Arsen','mg/L',null,0.01,'Kimia','Permenkes 2/2023 Lamp. Tabel 1'),
('air_minum','^kadmium','Kadmium','mg/L',null,0.003,'Kimia','Permenkes 2/2023 Lamp. Tabel 1'),
('air_minum','^timbal','Timbal','mg/L',null,0.01,'Kimia','Permenkes 2/2023 Lamp. Tabel 1'),
('air_minum','^fluor','Fluorida','mg/L',null,1.5,'Kimia','Permenkes 2/2023 Lamp. Tabel 1'),
('air_minum','^alumin','Aluminium','mg/L',null,0.2,'Kimia','Permenkes 2/2023 Lamp. Tabel 1');
insert into _ref
select 'air_higiene_sanitasi', pola, nama, satuan, mn, mk, kel, replace(dasar, 'Tabel 1', 'Tabel 3')
from _ref where modul = 'air_minum'
  and pola in ('^e\.? ?coli','^total coli','^suhu','^(tds|total dissolved|zat padat)','^kekeruhan','^warna','^bau','^ph','^nitrat','^nitrit','^krom','^besi','^mangan');

-- ===== VEKTOR (Tabel 24) dan BINATANG PEMBAWA PENYAKIT (Tabel 25): hanya koreksi, tidak menambah baris =====
insert into _ref values
('vektor','abj',null,null,95,null,null,'Permenkes 2/2023 Lamp. Tabel 24: ABJ ≥ 95'),
('vektor','resting',null,null,null,0.025,null,'Permenkes 2/2023 Lamp. Tabel 24: < 0,025'),
('vektor','mbr|biting',null,null,null,0.025,null,'Permenkes 2/2023 Lamp. Tabel 24: < 0,025'),
('vektor','anopheles.*habitat',null,null,null,1,null,'Permenkes 2/2023 Lamp. Tabel 24: < 1'),
('vektor','culex.*habitat',null,null,null,5,null,'Permenkes 2/2023 Lamp. Tabel 24: < 5'),
('vektor','culex.*mhd',null,null,null,1,null,'Permenkes 2/2023 Lamp. Tabel 24: < 1'),
('vektor','mansonia',null,null,null,5,null,'Permenkes 2/2023 Lamp. Tabel 24: < 5'),
('vektor','pinjal.*khusus',null,null,null,1,null,'Permenkes 2/2023 Lamp. Tabel 24: < 1'),
('vektor','pinjal.*umum',null,null,null,2,null,'Permenkes 2/2023 Lamp. Tabel 24: < 2'),
('vektor','lalat',null,null,null,2,null,'Permenkes 2/2023 Lamp. Tabel 24: < 2'),
('vektor','kecoa',null,null,null,2,null,'Permenkes 2/2023 Lamp. Tabel 24: < 2'),
('vektor','infektif',null,null,null,0,null,'Permenkes 2/2023 Lamp. Tabel 24/25: 0'),
('vektor','success',null,null,null,1,null,'Permenkes 2/2023 Lamp. Tabel 25: < 1'),
('vektor','keong',null,null,null,0,null,'Permenkes 2/2023 Lamp. Tabel 25: 0');

-- terapkan koreksi
update public.master_bakumutu b set
  min = r.mn, maks = r.mk, dasar_aturan = r.dasar,
  satuan = coalesce(r.satuan, b.satuan), kelompok = coalesce(r.kel, b.kelompok)
from _ref r
where b.modul = r.modul and b.parameter ~* r.pola;

-- tambah parameter air yang belum ada
insert into public.master_bakumutu (modul, parameter, satuan, min, maks, dasar_aturan, berlaku_mulai, aktif, kelompok, rentang_min, rentang_maks)
select r.modul, r.nama, r.satuan, r.mn, r.mk, r.dasar, date '2023-01-12', true, r.kel,
  case when r.pola = '^suhu' then -30 else 0 end,
  case when r.pola = '^ph' then 14 when r.pola = '^suhu' then 30 else null end
from _ref r
where r.modul like 'air_%'
  and not exists (select 1 from public.master_bakumutu b where b.modul = r.modul and b.parameter ~* r.pola);

-- ===== UDARA RUANG FASYANKES (Tabel 15–20) =====
-- Suhu (Tabel 15), kelembaban 40–60 semua ruang
update public.master_bakumutu b set min = v.mn, maks = v.mk, dasar_aturan = 'Permenkes 2/2023 Lamp. Tabel 15'
from (values ('udara_operasi',22,27),('udara_bersalin',24,26),('udara_perawatan',22,23),('udara_bayi',24,26),('udara_icu',22,23),
  ('udara_jenazah',21,24),('udara_penginderaan',21,24),('udara_lab',20,22),('udara_radiologi',17,22),('udara_sterilisasi',21,30),
  ('udara_dapur',22,30),('udara_igd',20,24),('udara_administrasi',20,28),('udara_luka_bakar',24,26)) v(modul, mn, mk)
where b.modul = v.modul and b.parameter ~* '^suhu';
update public.master_bakumutu set min = 40, maks = 60, dasar_aturan = 'Permenkes 2/2023 Lamp. Tabel 15'
where modul like 'udara\_%' and modul <> 'udara_umum' and parameter ~* '^kelembab';

-- Pencahayaan (Tabel 16; ruang di luar tabel minimal 100 lux)
update public.master_bakumutu set min = 100, maks = null, dasar_aturan = 'Permenkes 2/2023 Lamp. Tabel 16 (ruang di luar tabel minimal 100 lux)'
where modul like 'udara\_%' and modul <> 'udara_umum' and parameter ~* '^pencahaya';
update public.master_bakumutu b set min = v.mn, maks = v.mk, dasar_aturan = 'Permenkes 2/2023 Lamp. Tabel 16'
from (values ('udara_operasi',300,500),('udara_lab',75,100),('udara_radiologi',60,null),('udara_dapur',200,null),
  ('udara_luka_bakar',100,200),('udara_perawatan',100,null),('udara_igd',100,null),('udara_administrasi',100,null)) v(modul, mn, mk)
where b.modul = v.modul and b.parameter ~* '^pencahaya';

-- Kebisingan (Tabel 17): 65 dBA, dapur 70 dBA
update public.master_bakumutu set min = null, maks = case when modul = 'udara_dapur' then 70 else 65 end,
  dasar_aturan = 'Permenkes 2/2023 Lamp. Tabel 17' || case when modul = 'udara_perawatan' then ' (saat pasien tidur 55 dBA)' else '' end
where modul like 'udara\_%' and modul <> 'udara_umum' and parameter ~* '^kebising';

-- Partikulat (Tabel 18)
update public.master_bakumutu set min = null, maks = 150, dasar_aturan = 'Permenkes 2/2023 Lamp. Tabel 18: rata-rata 8 jam 150 µg/m³ (24 jam ≤ 70 µg/m³)'
where modul like 'udara\_%' and modul <> 'udara_umum' and parameter ~* '^pm ?10';
update public.master_bakumutu set min = null, maks = 25, dasar_aturan = 'Permenkes 2/2023 Lamp. Tabel 18: rata-rata 24 jam'
where modul like 'udara\_%' and modul <> 'udara_umum' and parameter ~* '^pm ?2';

-- CO2 (Tabel 19 tertulis "1 ppm", diduga salah ketik; Tabel 13 menulis 1.000 ppm)
update public.master_bakumutu set min = null, maks = 1000,
  dasar_aturan = 'Permenkes 2/2023 Lamp. Tabel 13: 1.000 ppm (Tabel 19 tertulis 1 ppm, diduga salah ketik)'
where modul like 'udara\_%' and parameter ~* 'co2|dioksida \(co';

-- Angka kuman (Tabel 20 hanya mengatur ruang operasi; 700 CFU/m³ di Tabel 13 untuk permukiman/TFU)
update public.master_bakumutu set min = null, maks = 35,
  dasar_aturan = 'Permenkes 2/2023 Lamp. Tabel 20: ruang operasi kosong 35 CFU/m³ (saat ada aktivitas 180; ultraclean 10)'
where modul = 'udara_operasi' and parameter ~* 'kuman|mikro';
update public.master_bakumutu set min = null, maks = null,
  dasar_aturan = 'Permenkes 2/2023 Lamp. Tabel 20 tidak menetapkan baku mutu untuk ruang ini; isi batas internal bila ada'
where modul like 'udara\_%' and modul not in ('udara_operasi','udara_umum') and parameter ~* 'kuman|mikro';
update public.master_bakumutu set min = null, maks = 700, dasar_aturan = 'Permenkes 2/2023 Lamp. Tabel 13 (udara dalam ruang permukiman/TFU)'
where modul = 'udara_umum' and parameter ~* 'kuman|mikro';

-- ===== HASIL =====
select modul, count(*) as jumlah,
  count(*) filter (where dasar_aturan ~* 'cek ulang|perlu verifikasi|ocr') as masih_perlu_cek
from public.master_bakumutu where aktif group by modul order by modul;
