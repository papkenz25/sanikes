-- ===== K3: tabel baru =====
create table if not exists public.k3_insiden (
  id uuid primary key default gen_random_uuid(),
  fasyankes_id uuid not null default private.fasyankes_saya(),
  petugas_id uuid default auth.uid(),
  dibuat timestamptz not null default now(),
  tanggal date not null,
  jenis text not null,
  lokasi text,
  jumlah integer default 0,
  uraian text,
  tindakan text,
  status text not null default 'terbuka',
  dihapus timestamptz,
  dihapus_oleh uuid
);
create table if not exists public.k3_semester (
  id uuid primary key default gen_random_uuid(),
  fasyankes_id uuid not null default private.fasyankes_saya(),
  petugas_id uuid default auth.uid(),
  dibuat timestamptz not null default now(),
  periode text not null,
  tahun integer not null,
  semester integer not null,
  isian jsonb,
  unique (fasyankes_id, periode)
);
create table if not exists public.k3_tahunan (
  id uuid primary key default gen_random_uuid(),
  fasyankes_id uuid not null default private.fasyankes_saya(),
  petugas_id uuid default auth.uid(),
  dibuat timestamptz not null default now(),
  tanggal date not null,
  lokasi text,
  jawaban jsonb,
  skor numeric,
  status text,
  batas_skor numeric,
  catatan text,
  temuan text,
  dihapus timestamptz,
  dihapus_oleh uuid
);
select private.pasang_rls('k3_insiden', array['admin_fasyankes','petugas_kesling','petugas_ruangan','pimpinan'], array['admin_fasyankes','petugas_kesling','petugas_ruangan']);
select private.pasang_rls('k3_semester', array['admin_fasyankes','petugas_kesling','petugas_ruangan','pimpinan'], array['admin_fasyankes','petugas_kesling']);
select private.pasang_rls('k3_tahunan', array['admin_fasyankes','petugas_kesling','petugas_ruangan','pimpinan'], array['admin_fasyankes','petugas_kesling']);

-- ===== Pangan: kolom tambahan =====
alter table tpm_inspeksi add column if not exists batas_skor numeric;
alter table tpm_inspeksi add column if not exists catatan text;
alter table tpm_inspeksi add column if not exists temuan text;
alter table tpm_inspeksi add column if not exists dihapus timestamptz;
alter table tpm_inspeksi add column if not exists dihapus_oleh uuid;

-- ===== Riwayat dan sinkron temuan =====
do $$
declare t text;
begin
  foreach t in array array['k3_insiden','k3_semester','k3_tahunan','tpm_inspeksi'] loop
    execute format('drop trigger if exists zz_riwayat on public.%I', t);
    execute format('create trigger zz_riwayat after update or delete on public.%I for each row execute function private.catat_riwayat()', t);
  end loop;
  foreach t in array array['k3_insiden','k3_tahunan','tpm_inspeksi'] loop
    execute format('drop trigger if exists zz_temuan on public.%I', t);
    execute format('create trigger zz_temuan after update on public.%I for each row execute function private.sinkron_temuan()', t);
  end loop;
end $$;

-- ===== Checklist Pangan (Permenkes 2/2023 Lampiran D.2) =====
insert into master_checklist (modul, kode, bagian, lingkup, pertanyaan, bobot, urutan, dasar_aturan, aktif)
select 'tpm', v.kode, v.bagian, 'tpp', v.tanya, 1, v.urut, 'Permenkes 2/2023 Lampiran D.2 ' || v.pasal, true
from (values
 ('P01','Bangunan','Bangunan jauh dari sumber pencemar (TPS sampah, SPALD, peternakan, area banjir) atau ada upaya mencegah cemarannya.',1,'a.1'),
 ('P02','Bangunan','Bangunan terpelihara, mudah dibersihkan dan disanitasi.',2,'a.1'),
 ('P03','Bangunan','Tata letak ruang mencegah kontaminasi silang (ada sekat atau pemisahan area).',3,'a.1'),
 ('P04','Bangunan','Pintu dan jendela/ventilasi rapat vektor, atau dipasang kasa serangga yang terpelihara.',4,'a.1'),
 ('P05','Bangunan','Dinding, langit-langit, dan lantai kuat, rata, kedap air, mudah dibersihkan, dan bersih.',5,'a.1'),
 ('P06','Bangunan','Lantai dapur landai ke arah saluran pembuangan air limbah.',6,'a.1'),
 ('P07','Bangunan','Pencahayaan cukup untuk bekerja dan lampu diberi pelindung.',7,'a.1'),
 ('P08','Bangunan','Asap dapur dibuang melalui cerobong dengan sungkup asap atau penyedot udara.',8,'a.1'),
 ('P09','Fasilitas sanitasi','Tersedia wastafel/sarana cuci tangan dengan air mengalir, sabun, dan pengering, mudah diakses penjamah.',9,'a.2'),
 ('P10','Fasilitas sanitasi','Toilet cukup, bersih, terpisah laki-laki dan perempuan, dengan air mengalir, sabun, dan tempat sampah.',10,'a.2'),
 ('P11','Fasilitas sanitasi','Pencucian peralatan melalui tiga tahap (cuci, bersihkan, sanitasi) dan terpisah dari pencucian bahan pangan.',11,'a.2'),
 ('P12','Fasilitas sanitasi','Tempat sampah kuat, tertutup, dibuka tanpa tangan, terpilah organik dan anorganik, dikosongkan minimal 1x24 jam.',12,'a.2'),
 ('P13','Fasilitas sanitasi','Saluran limbah dapur dilengkapi penangkap lemak (grease trap) dan pengelolaan air limbah berfungsi baik.',13,'a.2'),
 ('P14','Fasilitas sanitasi','Tidak dijumpai vektor atau tanda keberadaannya, dan ada jadwal pengendalian vektor.',14,'a.2'),
 ('P15','Fasilitas sanitasi','Bahan kimia pembersih diberi label dan disimpan terpisah dari bahan pangan dan area pengolahan.',15,'a.2'),
 ('P16','Peralatan','Peralatan kedap air, tahan karat, tara pangan (food grade), tidak retak, dan alat sekali pakai tidak dipakai ulang.',16,'b'),
 ('P17','Peralatan','Peralatan bersih disimpan kering di rak yang terlindung dari vektor.',17,'b'),
 ('P18','Peralatan','Peralatan untuk pangan mentah dan matang dibedakan (mis. talenan, pisau).',18,'b'),
 ('P19','Peralatan','Lemari pendingin dan freezer dijaga pada suhu yang benar dan ada jadwal pemeliharaan atau pengecekan suhu.',19,'b'),
 ('P20','Peralatan','Tersedia APAR yang tidak kedaluwarsa, perlengkapan P3K, dan petunjuk jalur evakuasi.',20,'b'),
 ('P21','Penjamah pangan','Penjamah sehat; penjamah yang sakit tidak mengolah pangan.',21,'c'),
 ('P22','Penjamah pangan','Penjamah memakai celemek, masker, penutup kepala, alas kaki tertutup, dan pakaian kerja khusus.',22,'c'),
 ('P23','Penjamah pangan','Penjamah berkuku pendek dan bersih, tidak memakai perhiasan, dan mencuci tangan dengan sabun sebelum dan selama mengolah.',23,'c'),
 ('P24','Penjamah pangan','Penjamah tidak merokok, bersin, meludah, atau mengunyah saat mengolah, dan mengambil pangan matang dengan sarung tangan atau alat.',24,'c'),
 ('P25','Penjamah pangan','Penjamah diperiksa kesehatannya minimal 1 kali setahun di fasilitas pelayanan kesehatan.',25,'c'),
 ('P26','Penjamah pangan','Penjamah dan penanggung jawab memiliki sertifikat pelatihan/penyuluhan keamanan pangan siap saji.',26,'c'),
 ('P27','Penerimaan bahan','Bahan pangan dari sumber jelas, utuh, kemasan berlabel, terdaftar, tidak kedaluwarsa, kaleng tidak rusak.',27,'d.1'),
 ('P28','Penerimaan bahan','Tidak menggunakan sisa makanan yang tidak habis terjual untuk diolah kembali.',28,'d.1'),
 ('P29','Penerimaan bahan','Es batu dibuat dari air berkualitas air minum.',29,'d.1'),
 ('P30','Penyimpanan bahan','Bahan mentah hewani disimpan pada suhu 4 °C atau kurang dan bahan beku pada -18 °C atau kurang.',30,'d.2'),
 ('P31','Penyimpanan bahan','Bahan disimpan terpisah per jenis di wadah tara pangan, di rak berjarak dari lantai, dinding, dan langit-langit.',31,'d.2'),
 ('P32','Penyimpanan bahan','Penyimpanan menerapkan prinsip FIFO dan FEFO.',32,'d.2'),
 ('P33','Pengolahan','Bahan dicuci dengan air mengalir, pengolahan mencegah kontaminasi silang, dan pangan dimasak sampai matang sempurna.',33,'d.3'),
 ('P34','Pengolahan','Bahan beku dicairkan dengan cara yang benar (lemari pendingin, microwave, atau air mengalir).',34,'d.3'),
 ('P35','Pengolahan','Buah dan sayur yang langsung dimakan dicuci dengan air berkualitas air minum.',35,'d.3'),
 ('P36','Penyimpanan pangan matang','Pangan matang disimpan terpisah dari bahan mentah, dalam wadah tertutup, terlindung dari vektor.',36,'d.4'),
 ('P37','Penyimpanan pangan matang','Pangan matang dingin disimpan di bawah 5 °C dan pangan berkuah panas di atas 60 °C.',37,'d.4'),
 ('P38','Penyimpanan pangan matang','Disimpan satu porsi sampel setiap menu selama 2x24 jam di lemari pendingin (bank sampel).',38,'d.4'),
 ('P39','Pengangkutan pangan matang','Alat angkut bersih, khusus pangan matang, dan suhu pangan panas atau dingin terjaga selama pengangkutan.',39,'d.5')
) as v(kode, bagian, tanya, urut, pasal)
on conflict (modul, kode) do nothing;

-- ===== Checklist Laporan Tahunan K3 (Permenkes 52/2018 BAB III) =====
insert into master_checklist (modul, kode, bagian, lingkup, pertanyaan, bobot, urutan, dasar_aturan, aktif)
select 'k3_tahunan', v.kode, v.bagian, 'tahunan', v.tanya, 1, v.urut, 'Permenkes 52/2018 BAB III, Laporan Tahunan K3', true
from (values
 ('K01','1. SMK3 di Fasyankes','Ada komitmen/kebijakan K3',1),
 ('K02','1. SMK3 di Fasyankes','Dokumen rencana kegiatan K3',2),
 ('K03','1. SMK3 di Fasyankes','Ada Tim K3/Pengelola K3',3),
 ('K04','2. Pengenalan potensi bahaya dan pengendalian risiko','Identifikasi potensi bahaya',4),
 ('K05','2. Pengenalan potensi bahaya dan pengendalian risiko','Penilaian risiko',5),
 ('K06','2. Pengenalan potensi bahaya dan pengendalian risiko','Pengendalian risiko',6),
 ('K07','3. Penerapan kewaspadaan standar','Sarana dan prasarana kebersihan tangan',7),
 ('K08','3. Penerapan kewaspadaan standar','Penyediaan APD',8),
 ('K09','3. Penerapan kewaspadaan standar','Pengelolaan jarum dan alat tajam',9),
 ('K10','3. Penerapan kewaspadaan standar','Dekontaminasi peralatan',10),
 ('K11','4. Penerapan prinsip ergonomi','Angkat angkut (pasien, barang, dan lain-lain), postur kerja',11),
 ('K12','4. Penerapan prinsip ergonomi','Pengaturan shift kerja',12),
 ('K13','4. Penerapan prinsip ergonomi','Pengaturan tata ruang kerja',13),
 ('K14','5. Pelayanan kesehatan kerja dan imunisasi','Fasyankes melakukan pemeriksaan kesehatan berkala',14),
 ('K15','5. Pelayanan kesehatan kerja dan imunisasi','Fasyankes melakukan imunisasi pada SDM yang berisiko',15),
 ('K16','6. Pembudayaan PHBS di Fasyankes','Melakukan sosialisasi',16),
 ('K17','6. Pembudayaan PHBS di Fasyankes','Media KIE',17),
 ('K18','7. Aspek K3 pada pengelolaan B3 dan limbah domestik','Daftar inventaris B3',18),
 ('K19','7. Aspek K3 pada pengelolaan B3 dan limbah domestik','SPO penggunaan B3',19),
 ('K20','7. Aspek K3 pada pengelolaan B3 dan limbah domestik','Penyimpanan dan pembuangan limbah B3 dan domestik sesuai persyaratan',20),
 ('K21','8. Pengelolaan sarana dan prasarana dari aspek K3','Pengukuran pencahayaan, kualitas air, kualitas udara',21),
 ('K22','8. Pengelolaan sarana dan prasarana dari aspek K3','Pemeliharaan kebersihan bangunan',22),
 ('K23','8. Pengelolaan sarana dan prasarana dari aspek K3','Ketersediaan air dan listrik',23),
 ('K24','8. Pengelolaan sarana dan prasarana dari aspek K3','Ketersediaan toilet sesuai standar',24),
 ('K25','9. Pengelolaan peralatan medis dari aspek K3','Pemeliharaan pada peralatan medis',25),
 ('K26','10. Kesiapsiagaan menghadapi kondisi darurat/bencana','SPO penanganan kondisi darurat/bencana',26),
 ('K27','10. Kesiapsiagaan menghadapi kondisi darurat/bencana','Proteksi kebakaran aktif (APAR dan alat pemadam lainnya)',27),
 ('K28','10. Kesiapsiagaan menghadapi kondisi darurat/bencana','Proteksi kebakaran pasif (pintu dan tangga darurat, jalur evakuasi)',28),
 ('K29','10. Kesiapsiagaan menghadapi kondisi darurat/bencana','Simulasi darurat bencana',29),
 ('K30','10. Kesiapsiagaan menghadapi kondisi darurat/bencana','Simulasi penggunaan APAR',30),
 ('K31','11. Pelatihan','SDM Fasyankes terlatih K3',31)
) as v(kode, bagian, tanya, urut)
on conflict (modul, kode) do nothing;

-- ===== Saran tindak lanjut =====
insert into master_tindaklanjut (kategori, parameter, saran, dasar_aturan, perlu_verifikasi)
select 'tpm', pertanyaan, 'Perbaiki agar sesuai persyaratan: ' || pertanyaan || ' Lakukan pembinaan penjamah/pengelola dan inspeksi ulang.', dasar_aturan, false
from master_checklist where modul = 'tpm'
on conflict (kategori, parameter) do nothing;

insert into master_tindaklanjut (kategori, parameter, saran, dasar_aturan, perlu_verifikasi)
select 'k3', pertanyaan, 'Lengkapi atau laksanakan: ' || pertanyaan || '. Masukkan ke rencana kegiatan K3 tahun berikutnya.', dasar_aturan, false
from master_checklist where modul = 'k3_tahunan'
on conflict (kategori, parameter) do nothing;

insert into master_tindaklanjut (kategori, parameter, saran, dasar_aturan, perlu_verifikasi) values
('k3','Kecelakaan akibat kerja','Berikan pertolongan pertama dan rujuk bila perlu, laporkan ke tim K3, lakukan investigasi penyebab, lalu terapkan pengendalian risiko (eliminasi, substitusi, rekayasa teknis, administratif, APD). Catat di laporan semester K3.','Permenkes 52/2018 Lampiran (pengendalian risiko, pencatatan dan pelaporan)',false),
('k3','Kejadian hampir celaka (near miss)','Telusuri penyebab dan lakukan pengendalian risiko sebelum menjadi kecelakaan. Catat di laporan semester K3.','Permenkes 52/2018 BAB III',false),
('k3','Tertusuk jarum / benda tajam','Segera cuci luka dengan air mengalir dan sabun, laporkan ke tim PPI/K3, dan rujuk untuk penilaian pajanan serta profilaksis pasca pajanan sesuai prosedur fasyankes. Evaluasi pengelolaan jarum dan alat tajam (tanpa menutup kembali jarum, safety box tersedia).','Permenkes 52/2018 (kewaspadaan standar, pengelolaan jarum dan alat tajam)',true),
('k3','Tumpahan bahan berbahaya (B3)','Isolasi area, gunakan APD dan spill kit, bersihkan sesuai SPO tumpahan dan lembar data keselamatan (SDS), tangani bahan bekas pembersihan sebagai limbah B3, lalu evaluasi penyimpanan B3.','Permenkes 52/2018 (aspek K3 pengelolaan B3)',true),
('k3','Tumpahan / pecahan merkuri','Jangan disapu atau divakum. Kumpulkan merkuri dan pecahan ke wadah tertutup, simpan di tempat penyimpanan sementara limbah B3 terpisah dari limbah B3 lain, dan jangan diolah dengan insinerator. Ganti alat dengan alat tidak bermerkuri.','Permenkes 41/2019 Pasal 6',false),
('k3','Dugaan penyakit akibat kerja','Rujuk SDM untuk pemeriksaan dan penegakan diagnosis penyakit akibat kerja, identifikasi faktor risiko di tempat kerja, lalu lakukan pengendalian. Catat di laporan semester K3.','Permenkes 52/2018 (pelayanan kesehatan kerja)',true)
on conflict (kategori, parameter) do nothing;

select modul, count(*) from master_checklist where modul in ('tpm','k3_tahunan') group by modul order by modul;
