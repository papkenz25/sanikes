(function () {
  var DAFTAR = [
    ['limbah', 'Limbah B3', true],
    ['air', 'Air & IPAL', true],
    ['vektor', 'Vektor & Sanitasi', true],
    ['udara', 'Udara ruangan', true],
    ['tpm', 'Pangan (TPM & Gizi)', true],
    ['k3', 'K3 Fasyankes', true],
    ['rs', 'Pengawasan fasyankes', true],
    ['pkm', 'Kesling Puskesmas', true],
    ['kit', 'Alat sanitarian & merkuri', true]
  ];

  var SUB = {
    limbah: { judul: 'Limbah B3', isi: [
      ['catat', 'Catat limbah', '+ cetak label'],
      ['angkut', 'Pengangkutan', ''],
      ['laporan', 'Neraca & ekspor', ''],
      ['data', 'Data', 'ruangan, TPS, vendor']
    ] },
    air: { judul: 'Air & IPAL', isi: [
      ['air_uji', 'Uji kualitas air', 'higiene sanitasi / minum'],
      ['ipal_harian', 'IPAL harian', 'debit, pH, pompa'],
      ['ipal_lab', 'Uji lab IPAL', 'inlet / outlet']
    ] },
    vektor: { judul: 'Vektor & Sanitasi', isi: [
      ['vektor_catat', 'Pengamatan vektor', 'nyamuk, lalat, kecoa, tikus'],
      ['sanitasi_cek', 'Inspeksi sanitasi bangunan', 'per ruangan / seluruh bangunan']
    ] },
    tpm: { judul: 'Pangan (TPM & Gizi)', isi: [
      ['tpm_cek', 'Inspeksi TPP', 'dapur, instalasi gizi, kantin'],
      ['objek_tpm', 'Daftar tempat pangan', 'dapur, kantin, katering'],
      ['tpm_penjamah', 'Penjamah pangan', 'sertifikat, pemeriksaan kesehatan']
    ] },
    k3: { judul: 'K3 Fasyankes', isi: [
      ['k3_insiden', 'Insiden K3', 'kecelakaan, tertusuk jarum, tumpahan'],
      ['k3_semester', 'Laporan semester K3', 'format Permenkes 52/2018'],
      ['k3_tahunan', 'Laporan tahunan K3', 'checklist Ada / Tidak']
    ] },
    rs: { judul: 'Pengawasan fasyankes', isi: [
      ['rs_pengawasan', 'Pengawasan dan pengaduan', 'linen, dekontaminasi, KTR, pengaduan']
    ] },
    pkm: { judul: 'Kesling Puskesmas', isi: [
      ['ttu_cek', 'Inspeksi TFU / TTU', 'sekolah, ibadah, pasar, hotel'],
      ['objek_ttu', 'Daftar TFU / TTU', 'sekolah, ibadah, pasar, hotel'],
      ['pkm_stbm', 'STBM 5 pilar', 'per KK, rekap per desa']
    ] },
    kit: { judul: 'Alat sanitarian & merkuri', isi: [
      ['kit_alat', 'Alat dan kalibrasi', 'jadwal kalibrasi'],
      ['kit_merkuri', 'Alkes bermerkuri', 'Permenkes 41/2019']
    ] },
    udara: { judul: 'Udara ruangan', isi: [
      ['udara_ukur', 'Pengukuran udara', 'suhu, cahaya, bising, kuman']
    ] }
  };

  var ICON_MODUL = { limbah: 'limbah', air: 'air', vektor: 'vektor', udara: 'udara', tpm: 'tpm', k3: 'k3', rs: 'rs', pkm: 'pkm', kit: 'kit' };

  // Buka layar kerja dari submenu, dengan tombol kembali ke submenu itu.
  function pindah(nama, sub, el) {
    var isi = document.getElementById('isi');
    if (!App.tabs[nama]) return;
    App.tabs[nama](isi);
    App.kembali(sub && SUB[sub] ? SUB[sub].judul : 'Modul', function () { tampil(el, sub); });
    window.scrollTo(0, 0);
  }

  function tampil(el, sub) {
    var h = '';
    var ruangan = App.profil && App.profil.peran === 'petugas_ruangan';
    if (sub && SUB[sub]) {
      h = '<h3 style="margin-top:0">' + SUB[sub].judul + '</h3><div class="ubin-grid">' +
        SUB[sub].isi.map(function (m) {
          return '<button type="button" class="ubin" data-go="' + m[0] + '"><span class="ik">' + ikon(ICON_MODUL[sub] || 'modul', 22) + '</span>' + m[1] + (m[2] ? '<small>' + m[2] + '</small>' : '') + '</button>';
        }).join('') + '</div>';
      if (ruangan && sub === 'limbah') App.kembali(null);
      else App.kembali('Semua modul', function () { tampil(el, null); });
    } else {
      h = '<h3 style="margin-top:0">Modul</h3><div class="ubin-grid">' +
        DAFTAR.map(function (m) {
          return '<button type="button" class="ubin" ' + (m[2] ? 'data-m="' + m[0] + '"' : 'disabled style="opacity:.45"') + '><span class="ik">' + ikon(ICON_MODUL[m[0]] || 'modul', 22) + '</span>' + m[1] + (m[2] ? '' : '<small>Segera</small>') + '</button>';
        }).join('') + '</div>';
      App.kembali(null);
    }
    el.innerHTML = '<div id="modul-root">' + h + '</div>';
    $('modul-root').onclick = function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.m) { tampil(el, b.dataset.m); window.scrollTo(0, 0); }
      else if (b.dataset.go) pindah(b.dataset.go, sub, el);
    };
  }

  App.tabs.modul = function (el) {
    el.onclick = null;
    // Petugas ruangan hanya mencatat limbah: langsung ke menu Limbah.
    tampil(el, App.profil && App.profil.peran === 'petugas_ruangan' ? 'limbah' : null);
  };
})();
