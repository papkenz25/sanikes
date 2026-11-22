// Halaman "Dasar aturan": daftar regulasi yang menjadi acuan aplikasi, dengan status yang sudah diperiksa.
(function () {
  var DIPERIKSA = '22 November 2026';
  var BPK = 'https://peraturan.bpk.go.id';
  // status: 'berlaku' | 'sebagian' | 'cek'
  var DAFTAR = [
    { gol: 'Dasar hukum umum', isi: [
      { nama: 'UU 17/2023 tentang Kesehatan', status: 'berlaku', pakai: 'Landasan seluruh pengaturan kesehatan, termasuk kesehatan lingkungan.', cat: '' },
      { nama: 'PP 28/2024 tentang Peraturan Pelaksanaan UU 17/2023', status: 'berlaku', pakai: 'Aturan pelaksana UU Kesehatan.', cat: 'Mencabut PP 66/2014 tentang Kesehatan Lingkungan. PP 66/2014 tidak lagi dipakai sebagai acuan di aplikasi ini.'  },
      { nama: 'Permenkes 3/2026 tentang Penanggulangan Penyakit', status: 'berlaku', pakai: 'Mengatur penanggulangan penyakit, termasuk kesehatan lingkungan dan penyakit tular vektor. Berlaku sejak 11 Maret 2026.', cat: 'Mencabut sebagian Permenkes 2/2023 (lihat di bawah), serta mencabut Permenkes 18/2020 (limbah medis berbasis wilayah) dan Permenkes 17/2020 (Pasar Sehat).', url: BPK + '/Details/350854' },
      { nama: 'UU 27/2022 tentang Pelindungan Data Pribadi', status: 'berlaku', pakai: 'Dasar kehati-hatian data: kode KK pada STBM, tanggal saja untuk pemeriksaan penjamah, tanpa nama korban pada insiden K3.', cat: '' }
    ] },
    { gol: 'Kesehatan lingkungan', isi: [
      { nama: 'Permenkes 2/2023 (pelaksanaan PP 66/2014)', status: 'sebagian', pakai: 'Baku mutu air, udara, pangan, sarana dan bangunan, dan vektor (Lampiran). Dipakai di uji air, udara, vektor, sanitasi, dan inspeksi pangan serta TFU/TTU.', cat: 'Dicabut sebagian oleh Permenkes 3/2026. Yang masih berlaku: Pasal 12, 21, 23, 29, 32, 39, 45 beserta Lampiran. Aplikasi memakai Lampiran. Rujukan pasal batang tubuh sebaiknya dicek ulang ke Permenkes 3/2026.', url: BPK + '/Details/245563' },
      { nama: 'Permenkes 11/2025 tentang Standar Kegiatan Usaha dan Standar Produk/Jasa (perizinan berusaha berbasis risiko, subsektor kesehatan)', status: 'berlaku', pakai: 'Rujukan standar inspeksi kesehatan lingkungan dan kelaikan (TPP dan TFU/TTU). Batas nilai laik di aplikasi bisa diatur di Pengaturan fasyankes.', cat: 'Angka batas laik yang dipakai aplikasi (80 untuk TPP, 70 untuk TFU/TTU) perlu dicocokkan dengan ketentuan dinas kesehatan setempat.', url: BPK + '/Details/335213' },
      { nama: 'Permenkes 3/2014 tentang Sanitasi Total Berbasis Masyarakat (STBM)', status: 'cek', pakai: 'Lima pilar STBM pada modul STBM puskesmas.', cat: 'Terdaftar berlaku di sumber yang saya baca, tetapi daftar pencabutan lengkap Permenkes 3/2026 tidak bisa saya buka. Mohon dipastikan di JDIH Kemenkes.', url: 'https://www.peraturan.go.id/files/bn193-2014.pdf' }
    ] },
    { gol: 'Limbah dan IPAL', isi: [
      { nama: 'PP 22/2021 tentang Penyelenggaraan Perlindungan dan Pengelolaan Lingkungan Hidup', status: 'berlaku', pakai: 'Dasar pengelolaan limbah B3 secara umum.', cat: 'Dicantumkan sebagai dasar umum. Rincian pasalnya tidak dikutip di aplikasi.' },
      { nama: 'Permen LHK 6/2021 tentang Tata Cara dan Persyaratan Pengelolaan Limbah B3', status: 'berlaku', pakai: 'Tata cara penyimpanan, pengangkutan, dan pengolahan limbah B3.', cat: 'Berlaku sejak 1 April 2021.', url: BPK + '/Details/211000' },
      { nama: 'Permen LHK P.56/2015 tentang Pengelolaan Limbah B3 dari Fasilitas Pelayanan Kesehatan', status: 'cek', pakai: 'Acuan khusus limbah B3 fasyankes (kode limbah, wadah, simbol, label, TPS).', cat: 'Status pencabutan belum tersedia di sumber yang saya baca, sebagian isinya bisa saja sudah diatur Permen LHK 6/2021. Mohon dipastikan di JDIH KLHK. Angka batas simpan limbah B3 sengaja tidak ditulis di panduan, dan mengikuti pengaturan kode limbah di aplikasi.', url: BPK + '/Details/322441' },
      { nama: 'Permen LH 11/2025 (baku mutu air limbah), Lampiran I', status: 'berlaku', pakai: 'Baku mutu air limbah IPAL fasyankes pada IPAL harian dan uji lab IPAL.', cat: 'Kelas baku mutu mengikuti volume dan tempat pembuangan air limbah.' },
      { nama: 'Permenkes 41/2019 tentang Penghapusan dan Penarikan Alat Kesehatan Bermerkuri', status: 'berlaku', pakai: 'Modul Alkes bermerkuri.', cat: 'Pengelolaan limbahnya diatur Permen LHK P.27/2020 yang diubah dengan Permen LH 13/2025.'  }
    ] },
    { gol: 'K3 dan pengendalian infeksi', isi: [
      { nama: 'Permenkes 52/2018 tentang K3 di Fasilitas Pelayanan Kesehatan', status: 'berlaku', pakai: 'Insiden K3, laporan semester, dan laporan tahunan K3.', cat: ''  },
      { nama: 'Permenkes 27/2017 tentang Pencegahan dan Pengendalian Infeksi (PPI) di Fasyankes', status: 'berlaku', pakai: 'Rujukan penatalaksanaan linen dan dekontaminasi pada modul Pengawasan.', cat: '', url: BPK + '/Details/112075' },
      { nama: 'Permenkes 6/2026, Pasal 36 ayat (1) huruf t', status: 'berlaku', pakai: 'Kawasan tanpa rokok di rumah sakit, pada modul Pengawasan.', cat: '' }
    ] }
  ];
  var LBL = { berlaku: ['✓ Berlaku', 'ok'], sebagian: ['◐ Dicabut sebagian', 'lewat'], cek: ['? Perlu dipastikan', 'lewat'] };

  App.tabs.aturan = function (el) {
    el.innerHTML = '<h3 style="margin-top:0">Dasar aturan</h3>' +
      '<div class="info">Daftar aturan yang menjadi acuan SANIKES. Status diperiksa pada <b>' + DIPERIKSA + '</b> lewat situs JDIH BPK dan sumber resmi. Ini ringkasan, bukan nasihat hukum. Yang berlaku adalah naskah resminya, dan aturan bisa berubah. Periksa pembaruan di <a href="' + BPK + '" target="_blank" rel="noopener">peraturan.bpk.go.id</a>.</div>' +
      DAFTAR.map(function (g) {
        return '<h3>' + g.gol + '</h3>' + g.isi.map(function (a) {
          var l = LBL[a.status];
          return '<div class="baris"><b>' + esc(a.nama) + '</b><br><span class="' + l[1] + '">' + l[0] + '</span>' +
            '<br>' + esc(a.pakai) + (a.cat ? '<br><span class="muted">' + esc(a.cat) + '</span>' : '') +
            (a.url ? '<br><a href="' + esc(a.url) + '" target="_blank" rel="noopener">Buka naskah / status</a>' : '') + '</div>';
        }).join('');
      }).join('') +
      '<p class="muted" style="font-size:12px">Aturan daerah (Perda, Perbup, Perwali) belum dimasukkan. Bila dinas kesehatan setempat punya ketentuan tambahan, ikuti ketentuan itu.</p>';
  };
})();
