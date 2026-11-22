// Kotak "Panduan" (bisa dibuka-tutup) di atas formulir pelaporan.
(function () {
  var P = {
    catat: {
      judul: 'Panduan: mencatat limbah B3',
      isi: '<p><b>Untuk apa:</b> setiap limbah B3 yang keluar dari ruangan dicatat di sini. Catatan ini menjadi dasar neraca limbah, pengangkutan, dan laporan bulanan.</p>' +
        '<p><b>Kapan diisi:</b> setiap kali limbah dipindahkan dari ruangan ke TPS, sebaiknya di hari yang sama.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li><b>Tanggal dan jam:</b> waktu limbah diserahkan ke TPS.</li>' +
        '<li><b>Ruangan asal:</b> ruangan yang menghasilkan limbah.</li>' +
        '<li><b>Kode limbah:</b> pilih jenis limbah. Keterangan jenisnya tampil di bawah pilihan.</li>' +
        '<li><b>Berat:</b> hasil timbangan kantong atau safety box. Satuan bisa kg atau ton.</li>' +
        '<li><b>Suhu penyimpanan:</b> memengaruhi batas simpan untuk jenis limbah tertentu.</li>' +
        '<li><b>ID kantong:</b> boleh dikosongkan. Berguna untuk menelusuri kantong dan untuk label.</li></ul>' +
        '<p><b>Setelah disimpan:</b> batas simpan dihitung otomatis dan tampil di Dasbor. Label kantong bisa dicetak lewat bagian Cetak label di halaman ini. Bila batas simpan sebuah kode belum ditetapkan, aplikasi memberi tanda dan catatan tetap tersimpan.</p>' +
        '<p class="muted">Batas simpan mengikuti pengaturan kode limbah di aplikasi. Cocokkan dengan ketentuan terbaru yang berlaku di fasyankes Anda. Dasar aturan: Permen LHK 6/2021 dan Permen LHK P.56/2015 (P.56/2015 tidak dicabut Permen LHK 6/2021, tetapi statusnya tetap perlu dipastikan; lihat Akun, Dasar aturan).</p>'
    },
    angkut: {
      judul: 'Panduan: pengangkutan limbah',
      isi: '<p><b>Untuk apa:</b> mencatat limbah B3 yang diserahkan ke pihak pengangkut berizin. Catatan ini mengurangi stok limbah di TPS dan masuk ke neraca limbah.</p>' +
        '<p><b>Kapan diisi:</b> setiap kali limbah diambil oleh pengangkut, sesuai nomor manifest.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li>Pilih limbah yang masih tersimpan di TPS yang ikut diangkut.</li>' +
        '<li>Pilih <b>vendor</b> pengangkut. Vendor yang izin atau MoU-nya sudah lewat diberi tanda, jadi perbarui datanya sebelum dipakai.</li>' +
        '<li>Isi <b>nomor manifest</b> persis seperti pada dokumen manifest.</li></ul>' +
        '<p><b>Salah catat?</b> Pengangkutan yang salah catat bisa dibatalkan dari daftar di bawah.</p>'
    },
    air_uji: {
      judul: 'Panduan: uji kualitas air',
      isi: '<p><b>Untuk apa:</b> mencatat hasil pemeriksaan air dan membandingkannya otomatis dengan baku mutu Permenkes 2/2023.</p>' +
        '<p><b>Kapan diisi:</b> setiap ada hasil pemeriksaan (dari laboratorium atau pemeriksaan sendiri).</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li><b>Tanggal:</b> tanggal pengambilan sampel.</li>' +
        '<li><b>Titik sampel:</b> tempat sampel diambil. Daftarkan titik tetap di Pengaturan supaya tren per titik bisa dilihat.</li>' +
        '<li><b>Jenis air:</b> air untuk higiene sanitasi, atau air minum. Daftar parameter dan batasnya mengikuti pilihan ini.</li>' +
        '<li><b>Parameter:</b> isi hanya yang benar-benar diperiksa, sisanya dikosongkan.</li></ul>' +
        '<p><b>Setelah disimpan:</b> tiap parameter diberi status memenuhi atau tidak memenuhi. Yang tidak memenuhi otomatis menjadi <b>temuan</b> beserta saran tindak lanjut, dan angkanya masuk ke Dasbor dan laporan bulanan.</p>'
    },
    ipal_harian: {
      judul: 'Panduan: IPAL harian',
      isi: '<p><b>Untuk apa:</b> catatan pemantauan harian pengolahan air limbah. Ini bukti bahwa IPAL dipantau setiap hari.</p>' +
        '<p><b>Kapan diisi:</b> setiap hari IPAL beroperasi.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li><b>Debit:</b> volume air limbah hari itu (m³/hari). Debit menentukan kelas baku mutu yang dipakai.</li>' +
        '<li><b>Inlet:</b> kondisi air sebelum diolah (pH, suhu, warna, bau). Inlet hanya dicatat sebagai pengamatan dan tidak dibandingkan dengan baku mutu.</li>' +
        '<li><b>Outlet:</b> kondisi air setelah diolah. Nilai pH outlet dibandingkan dengan batas pada kelas IPAL fasyankes.</li>' +
        '<li><b>Peralatan:</b> kondisi pompa dan blower.</li></ul>' +
        '<p><b>Setelah disimpan:</b> pH outlet di luar batas ditandai merah dan dicatat sebagai <b>temuan</b>. Bila nanti dikoreksi menjadi memenuhi, temuannya dibatalkan otomatis. Kelas IPAL diatur di Pengaturan, dan bila belum diatur dipakai kelas 3 sampai 50 m³/hari.</p>' +
        '<p class="muted">Dasar baku mutu air limbah: Permen LH 11/2025 Lampiran I.</p>'
    },
    ipal_lab: {
      judul: 'Panduan: uji lab IPAL',
      isi: '<p><b>Untuk apa:</b> mencatat hasil uji laboratorium air limbah dan membandingkannya otomatis dengan baku mutu Permen LH 11/2025 Lampiran I.</p>' +
        '<p><b>Kapan diisi:</b> setiap ada hasil uji laboratorium.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li><b>Titik:</b> Outlet atau Inlet. Hanya titik outlet yang dibandingkan dengan baku mutu.</li>' +
        '<li><b>Kelas baku mutu:</b> sesuai ke mana air limbah dibuang dan berapa volumenya (di atas 50, 3 sampai 50, atau sampai 3 m³/hari ke media air, atau ke drainase/irigasi). Biasanya sudah terisi dari Pengaturan.</li>' +
        '<li><b>Parameter:</b> isi hanya yang diperiksa. Suhu, warna, dan bau dicatat sebagai pengamatan.</li></ul>' +
        '<p><b>Setelah disimpan:</b> parameter yang tidak memenuhi otomatis menjadi <b>temuan</b>, dan persentase hasil memenuhi masuk ke Dasbor serta rekap Dinas Kesehatan.</p>'
    }
,
    vektor_catat: {
      judul: 'Panduan: pengamatan vektor',
      isi: '<p><b>Untuk apa:</b> mencatat pengamatan nyamuk, lalat, kecoa, dan tikus untuk memantau pengendalian vektor.</p>' +
        '<p><b>Kapan diisi:</b> setiap kali ada pengamatan atau pengendalian di lokasi.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li><b>Jenis pengamatan:</b> pilih sesuai yang diamati.</li>' +
        '<li><b>Lokasi:</b> ruangan atau area yang diamati.</li>' +
        '<li><b>Hasil (angka):</b> isi sesuai hasil hitung di lapangan.</li>' +
        '<li><b>Tindakan:</b> catat pengendalian yang dilakukan.</li>' +
        '</ul>' +
        '<p><b>Setelah disimpan:</b> hasil dibandingkan dengan batas pada Lampiran Permenkes 2/2023 bila tersedia, dan yang melewati batas menjadi temuan.</p>' +
        '<p class="muted">Dasar aturan: Permenkes 2/2023 Lampiran (sebagian dicabut Permenkes 3/2026, Lampiran tetap berlaku) dan Permenkes 3/2026 Pasal 30 tentang penyakit tular vektor. Daftar lengkap ada di Akun, bagian Dasar aturan.</p>'
    },
    udara_ukur: {
      judul: 'Panduan: pengukuran udara',
      isi: '<p><b>Untuk apa:</b> mencatat hasil ukur suhu, pencahayaan, kebisingan, dan angka kuman di ruangan.</p>' +
        '<p><b>Kapan diisi:</b> setiap ada hasil pengukuran, sesuai jadwal pemantauan fasyankes.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li><b>Ruangan:</b> pilih ruangan yang diukur.</li>' +
        '<li><b>Alat ukur:</b> boleh diisi supaya terlacak kalibrasinya.</li>' +
        '<li><b>Parameter:</b> isi hanya yang benar-benar diukur.</li>' +
        '</ul>' +
        '<p><b>Setelah disimpan:</b> tiap parameter diberi status memenuhi atau tidak memenuhi, dan yang tidak memenuhi menjadi temuan.</p>' +
        '<p class="muted">Dasar aturan: Permenkes 2/2023 Lampiran (baku mutu udara ruangan). Daftar lengkap ada di Akun, bagian Dasar aturan.</p>'
    },
    sanitasi_cek: {
      judul: 'Panduan: inspeksi sanitasi bangunan',
      isi: '<p><b>Untuk apa:</b> memeriksa kondisi sanitasi bangunan atau ruangan memakai daftar periksa.</p>' +
        '<p><b>Kapan diisi:</b> sesuai jadwal inspeksi, misalnya bulanan.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li><b>Yang diinspeksi:</b> pilih ruangan atau seluruh bangunan.</li>' +
        '<li>Jawab tiap butir dengan Ya atau Tidak.</li>' +
        '<li><b>Catatan:</b> boleh dikosongkan.</li>' +
        '</ul>' +
        '<p><b>Setelah disimpan:</b> skor dihitung otomatis, dan butir yang tidak terpenuhi menjadi temuan.</p>' +
        '<p class="muted">Dasar aturan: Permenkes 2/2023 Lampiran (persyaratan sarana dan bangunan). Daftar lengkap ada di Akun, bagian Dasar aturan.</p>'
    },
    tpm_cek: {
      judul: 'Panduan: inspeksi TPP',
      isi: '<p><b>Untuk apa:</b> memeriksa tempat pengelolaan pangan (dapur, instalasi gizi, kantin) memakai daftar periksa inspeksi kesehatan lingkungan.</p>' +
        '<p><b>Kapan diisi:</b> sesuai jadwal pembinaan atau saat ada permintaan sertifikat laik higiene sanitasi.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li>Pilih tempat dari Daftar tempat pangan.</li>' +
        '<li>Jawab tiap butir, ambil foto bukti dan titik lokasi bila perlu.</li>' +
        '<li>Isi nama pemeriksa untuk tanda tangan di cetakan.</li>' +
        '</ul>' +
        '<p><b>Setelah disimpan:</b> skor dan hasil laik atau tidak laik dihitung otomatis. Batas laik bisa disesuaikan di Pengaturan sesuai ketentuan dinas kesehatan setempat.</p>' +
        '<p class="muted">Dasar aturan: Permenkes 11/2025 (standar kegiatan usaha, subsektor kesehatan) dan Permenkes 2/2023 Lampiran. Daftar lengkap ada di Akun, bagian Dasar aturan.</p>'
    },
    ttu_cek: {
      judul: 'Panduan: inspeksi TFU / TTU',
      isi: '<p><b>Untuk apa:</b> memeriksa tempat dan fasilitas umum (sekolah, tempat ibadah, pasar, dan sejenisnya).</p>' +
        '<p><b>Kapan diisi:</b> sesuai jadwal pembinaan wilayah.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li>Pilih tempat dari Daftar TFU / TTU.</li>' +
        '<li>Jawab tiap butir, ambil foto bukti dan titik lokasi bila perlu.</li>' +
        '</ul>' +
        '<p><b>Setelah disimpan:</b> skor dihitung otomatis dan masuk ke rekap bulanan serta ke Dinas Kesehatan.</p>' +
        '<p class="muted">Dasar aturan: Permenkes 11/2025 dan Permenkes 2/2023 Lampiran. Permenkes 17/2020 tentang Pasar Sehat sudah dicabut Permenkes 3/2026. Daftar lengkap ada di Akun, bagian Dasar aturan.</p>'
    },
    tpm_penjamah: {
      judul: 'Panduan: penjamah pangan',
      isi: '<p><b>Untuk apa:</b> mendata penjamah pangan beserta sertifikat pelatihan dan tanggal pemeriksaan kesehatannya.</p>' +
        '<p><b>Kapan diisi:</b> saat ada penjamah baru atau saat sertifikat dan pemeriksaan diperbarui.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li>Isi nama, tempat bertugas, dan nomor sertifikat pelatihan.</li>' +
        '<li>Isi <b>tanggal</b> pemeriksaan kesehatan saja. Hasil dan diagnosis tidak dicatat, demi privasi.</li>' +
        '</ul>' +
        '<p><b>Setelah disimpan:</b> penjamah yang sertifikat atau pemeriksaannya sudah lewat diberi tanda.</p>' +
        '<p class="muted">Dasar aturan: Permenkes 2/2023 Lampiran (penjamah pangan) dan UU 27/2022 tentang Pelindungan Data Pribadi. Daftar lengkap ada di Akun, bagian Dasar aturan.</p>'
    },
    k3_insiden: {
      judul: 'Panduan: insiden K3',
      isi: '<p><b>Untuk apa:</b> mencatat kecelakaan kerja, tertusuk jarum, tumpahan, dan kejadian nyaris celaka.</p>' +
        '<p><b>Kapan diisi:</b> segera setelah kejadian, di hari yang sama bila bisa.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li>Isi jenis kejadian, lokasi, dan uraian singkat.</li>' +
        '<li><b>Jangan menulis nama korban atau diagnosis.</b> Cukup jenis kejadian dan tindakan.</li>' +
        '<li>Foto hanya untuk kondisi tempat, bukan wajah atau identitas orang.</li>' +
        '</ul>' +
        '<p><b>Setelah disimpan:</b> angka kejadian masuk ke laporan semester dan tahunan K3.</p>' +
        '<p class="muted">Dasar aturan: Permenkes 52/2018 tentang K3 di fasyankes dan UU 27/2022. Daftar lengkap ada di Akun, bagian Dasar aturan.</p>'
    },
    rs_pengawasan: {
      judul: 'Panduan: pengawasan dan pengaduan',
      isi: '<p><b>Untuk apa:</b> mencatat pengawasan rutin (linen, dekontaminasi, kawasan tanpa rokok) dan pengaduan.</p>' +
        '<p><b>Kapan diisi:</b> setiap kali ada pengawasan atau pengaduan masuk.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li>Pilih jenis pengawasan dan isi lokasi.</li>' +
        '<li>Isi temuan atau isi pengaduan, lalu tindakan.</li>' +
        '<li>Ubah status menjadi Selesai bila sudah ditangani.</li>' +
        '</ul>' +
        '<p><b>Setelah disimpan:</b> yang belum selesai menjadi temuan terbuka, dan otomatis ditutup saat status diubah selesai.</p>' +
        '<p class="muted">Dasar aturan: Permenkes 27/2017 (PPI di fasyankes) dan Permenkes 6/2026 Pasal 36 ayat (1) huruf t (kawasan tanpa rokok di rumah sakit). Daftar lengkap ada di Akun, bagian Dasar aturan.</p>'
    },
    pkm_stbm: {
      judul: 'Panduan: STBM per KK',
      isi: '<p><b>Untuk apa:</b> mencatat lima pilar sanitasi total berbasis masyarakat per kepala keluarga.</p>' +
        '<p><b>Kapan diisi:</b> saat verifikasi lapangan atau pemicuan di desa.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li>Isi desa, RT/RW, dan <b>kode KK</b>, bukan nama.</li>' +
        '<li>Jawab lima pilar dengan Ya atau Tidak.</li>' +
        '<li>Isi tanggal verifikasi.</li>' +
        '</ul>' +
        '<p><b>Setelah disimpan:</b> rekap persentase tiap pilar per desa tampil otomatis. Status desa tetap perlu verifikasi lapangan.</p>' +
        '<p class="muted">Dasar aturan: Permenkes 3/2014 tentang STBM (dicabut sebagian oleh Permenkes 3/2026; Pasal 4, 5, 14, 15 dan Lampiran masih berlaku). Daftar lengkap ada di Akun, bagian Dasar aturan.</p>'
    },
    kit_merkuri: {
      judul: 'Panduan: alat kesehatan bermerkuri',
      isi: '<p><b>Untuk apa:</b> mendata termometer, tensimeter, dan alat bermerkuri lain serta pemantauan penghapusannya.</p>' +
        '<p><b>Kapan diisi:</b> saat inventarisasi, saat alat diganti, dan bila ada alat pecah atau merkuri tumpah.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li>Isi nama alat, jumlah, lokasi, dan status.</li>' +
        '<li>Bila pecah atau tumpah, pilih status itu agar tercatat sebagai temuan.</li>' +
        '</ul>' +
        '<p><b>Setelah disimpan:</b> alat yang masih digunakan atau pecah otomatis menjadi temuan. Pecahan atau tumpahan dikelola sebagai limbah B3.</p>' +
        '<p class="muted">Dasar aturan: Permenkes 41/2019 dan Permen LHK 6/2021. Daftar lengkap ada di Akun, bagian Dasar aturan.</p>'
    },
    kit_alat: {
      judul: 'Panduan: alat dan kalibrasi',
      isi: '<p><b>Untuk apa:</b> mencatat alat ukur kesling dan jadwal kalibrasinya.</p>' +
        '<p><b>Kapan diisi:</b> saat alat baru, dikalibrasi, atau mendekati jatuh tempo.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li>Isi nama alat dan tanggal kalibrasi terakhir.</li>' +
        '<li>Isi tanggal jatuh tempo berikutnya.</li>' +
        '</ul>' +
        '<p><b>Setelah disimpan:</b> alat yang kalibrasinya lewat diberi tanda, supaya hasil ukur tetap bisa dipertanggungjawabkan.</p>' +
        '<p class="muted">Dasar aturan: ketentuan kalibrasi dari pabrikan dan dinas kesehatan setempat. Daftar lengkap ada di Akun, bagian Dasar aturan.</p>'
    }
  };

  function kotak(kunci) {
    var d = document.createElement('details');
    d.className = 'panduan noprint';
    d.setAttribute('data-panduan', kunci);
    d.innerHTML = '<summary>' + P[kunci].judul + '</summary><div class="panduan-isi">' + P[kunci].isi + '</div>';
    return d;
  }

  Object.keys(P).forEach(function (kunci) {
    var asli = App.tabs[kunci];
    if (!asli) return;
    App.tabs[kunci] = async function (el) {
      var hasil = await asli.apply(this, arguments);
      if (el && el.isConnected !== false && !el.querySelector('[data-panduan="' + kunci + '"]') && el.firstChild) {
        var h = el.querySelector('h3');
        var k = kotak(kunci);
        if (h && h.parentNode === el) h.insertAdjacentElement('afterend', k); else el.insertBefore(k, el.firstChild);
      }
      return hasil;
    };
  });
})();
