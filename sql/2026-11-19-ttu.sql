alter table ikl_inspeksi add column if not exists lokasi text;
alter table ikl_inspeksi add column if not exists batas_skor numeric;
alter table ikl_inspeksi add column if not exists catatan text;
alter table ikl_inspeksi add column if not exists temuan text;
alter table ikl_inspeksi add column if not exists dihapus timestamptz;
alter table ikl_inspeksi add column if not exists dihapus_oleh uuid;
drop trigger if exists zz_riwayat on ikl_inspeksi;
create trigger zz_riwayat after update or delete on ikl_inspeksi for each row execute function private.catat_riwayat();
drop trigger if exists zz_temuan on ikl_inspeksi;
create trigger zz_temuan after update on ikl_inspeksi for each row execute function private.sinkron_temuan();

insert into master_checklist (modul, kode, bagian, lingkup, pertanyaan, bobot, urutan, dasar_aturan, aktif)
select 'ttu', v.kode, v.bagian, 'ttu', v.tanya, 1, v.urut, 'Permenkes 2/2023 Lampiran ' || v.pasal, true
from (values
 ('T01','Air','Air bersih tersedia cukup dan mengalir selama jam operasional.',1,'A (media air), E.2 huruf i.1'),
 ('T02','Air','Air secara fisik tidak berbau, tidak berasa, dan tidak berwarna.',2,'A (media air)'),
 ('T03','Air','Penampungan air (tandon, bak) tertutup dan bersih.',3,'A (media air)'),
 ('T04','Air','Air minum yang disediakan berasal dari sumber yang layak.',4,'A (media air), E.2 huruf i.1'),
 ('T05','Udara','Ventilasi alami atau mekanik cukup dan udara terasa segar.',5,'B (media udara), E.2 huruf l'),
 ('T06','Udara','Pencahayaan cukup untuk aktivitas.',6,'B (media udara), E.2 huruf m'),
 ('T07','Udara','Tidak berbau tidak sedap dan terhindar dari asap (termasuk asap rokok).',7,'B (persyaratan kesehatan udara dalam ruang)'),
 ('T08','Bangunan','Lokasi aman: tidak di daerah rawan longsor, bekas TPA, atau di bawah jalur tegangan tinggi.',8,'E.2 huruf a'),
 ('T09','Bangunan','Lantai kedap air, rata, tidak licin, tidak retak, dan bersih.',9,'E.2 huruf f'),
 ('T10','Bangunan','Dinding dan langit-langit kuat, bersih, dan tidak bocor.',10,'E.2 huruf c, g, h'),
 ('T11','Bangunan','Tangga aman: ada pegangan, pencahayaan, dan bersih.',11,'E.2 huruf e'),
 ('T12','Sanitasi','Toilet cukup, terpisah laki-laki dan perempuan, bersih, dan tidak ada genangan.',12,'E.2 huruf i.2'),
 ('T13','Sanitasi','Toilet dilengkapi air mengalir, sabun, tempat sampah, ventilasi, dan pencahayaan.',13,'E.2 huruf i.2'),
 ('T14','Sanitasi','Toilet mudah dijangkau semua orang termasuk penyandang disabilitas.',14,'E.2 huruf i.2'),
 ('T15','Sanitasi','Sarana cuci tangan dengan sabun dan air mengalir tersedia dan mudah dijangkau.',15,'E.2 huruf i.3'),
 ('T16','Sanitasi','Tersedia tempat sampah di ruangan dan di luar gedung, serta tempat penampungan sampah sementara.',16,'E.2 huruf i.4'),
 ('T17','Sanitasi','Air limbah dikelola sesuai ketentuan, saluran tertutup dan tidak menggenang.',17,'E.2 huruf i.5'),
 ('T18','Sanitasi','Air hujan disalurkan ke drainase atau sumur resapan dan tidak menggenang.',18,'E.2 huruf i.6'),
 ('T19','Vektor','Tidak ditemukan jentik nyamuk di tempat penampungan air.',19,'F (media vektor dan binatang pembawa penyakit)'),
 ('T20','Vektor','Tidak ditemukan tanda keberadaan tikus, kecoa, atau lalat dalam jumlah berlebih.',20,'F (media vektor dan binatang pembawa penyakit)'),
 ('T21','Vektor','Ada upaya atau jadwal pengendalian vektor dan binatang pembawa penyakit.',21,'F (pengendalian vektor)'),
 ('T22','Pangan','Bila ada kantin atau penjual pangan, tempat pengelolaan pangan bersih dan pangan terlindung dari pencemaran.',22,'D (media pangan)'),
 ('T23','Manajemen kebersihan','Ada penanggung jawab kebersihan dan pembersihan dilakukan rutin.',23,'E.2 huruf p'),
 ('T24','Keselamatan','Tersedia APAR, jalur evakuasi, dan perlengkapan P3K.',24,'E.2 huruf e, k')
) as v(kode, bagian, tanya, urut, pasal)
on conflict (modul, kode) do nothing;

insert into master_tindaklanjut (kategori, parameter, saran, dasar_aturan, perlu_verifikasi)
select 'ttu', pertanyaan, 'Sampaikan rekomendasi perbaikan kepada pengelola: ' || pertanyaan || ' Lakukan pembinaan dan inspeksi ulang.', dasar_aturan, false
from master_checklist where modul = 'ttu'
on conflict (kategori, parameter) do nothing;

select count(*) from master_checklist where modul = 'ttu';
