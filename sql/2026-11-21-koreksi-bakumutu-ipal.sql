-- Baku mutu air limbah domestik fasyankes, Permen LH/BPLH 11/2025 Lampiran I (dicocokkan dengan PDF resmi 21 Nov 2026)
drop table if exists _ipal;
create temp table _ipal (modul text, pola text, nama text, satuan text, mn numeric, mk numeric, kel text, dasar text);
insert into _ipal values
-- A.2 dibuang ke media air, volume > 50 m3/hari
('ipal_media_air_gt50','^ph','pH','-',6,9,'Kimia','Permen LH 11/2025 Lamp. I A.2 (> 50 m³/hari)'),
('ipal_media_air_gt50','^bod','BOD','mg/l',null,30,'Kimia','Permen LH 11/2025 Lamp. I A.2 (> 50 m³/hari)'),
('ipal_media_air_gt50','^cod','COD','mg/l',null,100,'Kimia','Permen LH 11/2025 Lamp. I A.2 (> 50 m³/hari)'),
('ipal_media_air_gt50','^tss','TSS','mg/l',null,30,'Fisik','Permen LH 11/2025 Lamp. I A.2 (> 50 m³/hari)'),
('ipal_media_air_gt50','^amon','Amoniak (NH3-N)','mg/l',null,10,'Kimia','Permen LH 11/2025 Lamp. I A.2 (> 50 m³/hari)'),
('ipal_media_air_gt50','^(deterjen|mbas)','Deterjen total (MBAS)','mg/l',null,5,'Kimia','Permen LH 11/2025 Lamp. I A.2: khusus bila ada kegiatan pencucian/laundry'),
('ipal_media_air_gt50','^minyak','Minyak & Lemak','mg/l',null,5,'Kimia','Permen LH 11/2025 Lamp. I A.2 (> 50 m³/hari)'),
('ipal_media_air_gt50','^sisa kl','Sisa klorin','mg/l',null,1,'Kimia','Permen LH 11/2025 Lamp. I A.2 (> 50 m³/hari)'),
('ipal_media_air_gt50','^fecal','Fecal coliform','MPN/100ml',null,1000,'Biologi','Permen LH 11/2025 Lamp. I A.2 (> 50 m³/hari)'),
-- A.2 volume 3 < x <= 50 m3/hari
('ipal_media_air_3_50','^ph','pH','-',6,9,'Kimia','Permen LH 11/2025 Lamp. I A.2 (3–50 m³/hari)'),
('ipal_media_air_3_50','^bod','BOD','mg/l',null,50,'Kimia','Permen LH 11/2025 Lamp. I A.2 (3–50 m³/hari)'),
('ipal_media_air_3_50','^cod','COD','mg/l',null,100,'Kimia','Permen LH 11/2025 Lamp. I A.2 (3–50 m³/hari)'),
('ipal_media_air_3_50','^tss','TSS','mg/l',null,50,'Fisik','Permen LH 11/2025 Lamp. I A.2 (3–50 m³/hari)'),
('ipal_media_air_3_50','^amon','Amoniak (NH3-N)','mg/l',null,20,'Kimia','Permen LH 11/2025 Lamp. I A.2 (3–50 m³/hari)'),
('ipal_media_air_3_50','^(deterjen|mbas)','Deterjen total (MBAS)','mg/l',null,10,'Kimia','Permen LH 11/2025 Lamp. I A.2: khusus bila ada kegiatan pencucian/laundry'),
('ipal_media_air_3_50','^minyak','Minyak & Lemak','mg/l',null,10,'Kimia','Permen LH 11/2025 Lamp. I A.2 (3–50 m³/hari)'),
('ipal_media_air_3_50','^sisa kl','Sisa klorin','mg/l',null,1,'Kimia','Permen LH 11/2025 Lamp. I A.2 (3–50 m³/hari), bila memakai klorinasi'),
('ipal_media_air_3_50','^fecal','Fecal coliform','MPN/100ml',null,1000,'Biologi','Permen LH 11/2025 Lamp. I A.2 (3–50 m³/hari)'),
-- A.2 volume <= 3 m3/hari
('ipal_media_air_le3','^ph','pH','-',6,9,'Kimia','Permen LH 11/2025 Lamp. I A.2 (≤ 3 m³/hari)'),
('ipal_media_air_le3','^bod','BOD','mg/l',null,75,'Kimia','Permen LH 11/2025 Lamp. I A.2 (≤ 3 m³/hari)'),
('ipal_media_air_le3','^minyak','Minyak & Lemak','mg/l',null,10,'Kimia','Permen LH 11/2025 Lamp. I A.2 (≤ 3 m³/hari)'),
('ipal_media_air_le3','^sisa kl','Sisa klorin','mg/l',null,1,'Kimia','Permen LH 11/2025 Lamp. I A.2 (≤ 3 m³/hari), bila memakai klorinasi'),
('ipal_media_air_le3','^fecal','Fecal coliform','MPN/100ml',null,1000,'Biologi','Permen LH 11/2025 Lamp. I A.2 (≤ 3 m³/hari)'),
-- A.3 dibuang ke drainase/irigasi, khusus fasyankes
('ipal_drainase','^ph','pH','-',6,9,'Kimia','Permen LH 11/2025 Lamp. I A.3 fasyankes'),
('ipal_drainase','^bod','BOD','mg/l',null,12,'Kimia','Permen LH 11/2025 Lamp. I A.3 fasyankes'),
('ipal_drainase','^cod','COD','mg/l',null,80,'Kimia','Permen LH 11/2025 Lamp. I A.3 fasyankes'),
('ipal_drainase','^tss','TSS','mg/l',null,30,'Fisik','Permen LH 11/2025 Lamp. I A.3 fasyankes'),
('ipal_drainase','^sisa kl|^residual','Sisa klorin','mg/l',null,1,'Kimia','Permen LH 11/2025 Lamp. I A.3 fasyankes, bila memakai klorinasi'),
('ipal_drainase','^fecal','Fecal coliform','MPN/100ml',null,200,'Biologi','Permen LH 11/2025 Lamp. I A.3 fasyankes');
-- patogen: negatif (A.2 untuk > 3 m³/hari, A.3 drainase)
insert into _ipal
select m, p, n, 'kualitatif', null, null, 'Biologi', 'Permen LH 11/2025 Lamp. I: negatif (fasyankes yang tidak mengolah limbah B3 di IPAL)'
from unnest(array['ipal_media_air_gt50','ipal_media_air_3_50','ipal_drainase']) m,
  (values ('^salmon','Salmonela'),('^shig','Shigela'),('^vibrio','Vibrio cholera'),('^strept','Streptococus')) v(p, n);

update public.master_bakumutu b set min = r.mn, maks = r.mk, dasar_aturan = r.dasar, satuan = r.satuan, kelompok = r.kel
from _ipal r where b.modul = r.modul and b.parameter ~* r.pola;

insert into public.master_bakumutu (modul, parameter, satuan, min, maks, dasar_aturan, berlaku_mulai, aktif, kelompok, rentang_min, rentang_maks)
select r.modul, r.nama, r.satuan, r.mn, r.mk, r.dasar, date '2025-09-04', true, r.kel, 0, case when r.pola = '^ph' then 14 else null end
from _ipal r
where not exists (select 1 from public.master_bakumutu b where b.modul = r.modul and b.parameter ~* r.pola);

select modul, count(*) as jumlah from public.master_bakumutu where modul like 'ipal%' and aktif group by modul order by modul;
