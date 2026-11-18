(function () {
  var TULIS = ['admin_fasyankes', 'petugas_kesling', 'petugas_ruangan'];
  var YT = [['', '- pilih -'], ['true', 'Ya'], ['false', 'Tidak']];

  function hariIni() { return tglLokal(new Date()); }
  function bisaTulis() { return TULIS.indexOf(App.profil.peran) > -1; }
  function sisaHari(tgl) { return Math.ceil((new Date(tgl + 'T00:00:00') - new Date(hariIni() + 'T00:00:00')) / 86400000); }
  function tandaTanggal(tgl, label) {
    if (!tgl) return '';
    var s = sisaHari(tgl);
    var t = s < 0 ? '<span class="lewat">sudah lewat ' + (-s) + ' hari</span>' : (s <= 30 ? '<span class="lewat">' + s + ' hari lagi</span>' : '');
    return '<br>' + esc(label) + ': ' + esc(tgl) + ' ' + t;
  }
  function opsiHtml(list) {
    return list.map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '">' + esc(t) + '</option>'; }).join('');
  }
  function ubahNilai(b, v) {
    if (b.tipe === 'angka') return v === '' ? null : Number(v);
    if (b.tipe === 'tanggal') return v || null;
    if (b.tipe === 'yatidak') return v === '' ? null : v === 'true';
    return (v || '').trim() || null;
  }
  function periksa(bidang, data) {
    for (var i = 0; i < bidang.length; i++) {
      var b = bidang[i], v = data[b.k];
      if (b.wajib && (v === null || v === undefined || v === '')) return b.l + ' wajib diisi.';
      if (b.tipe === 'angka' && v !== null && (isNaN(v) || v < 0)) return b.l + ' harus angka 0 atau lebih.';
    }
    return '';
  }

  // Formulir sederhana: isi, daftar, ubah, hapus, pulihkan
  function crud(cfg) {
    App.tabs[cfg.tab] = async function (el) {
      if (App.profil.peran === 'admin_papkenz') { el.innerHTML = '<div class="info">Data ini milik fasyankes. Gunakan akun fasyankes.</div>'; return; }
      var rows = [];
      var form = bisaTulis()
        ? cfg.bidang.map(function (b) {
            var lbl = '<label>' + esc(b.l) + (b.wajib ? '' : ' (opsional)') + '</label>';
            if (b.tipe === 'pilih') return lbl + '<select id="cr-' + b.k + '">' + opsiHtml(b.opsi) + '</select>';
            if (b.tipe === 'yatidak') return lbl + '<select id="cr-' + b.k + '">' + opsiHtml(YT) + '</select>';
            var t = b.tipe === 'tanggal' ? 'date' : (b.tipe === 'angka' ? 'number' : 'text');
            return lbl + '<input id="cr-' + b.k + '" type="' + t + '"' + (t === 'number' ? ' min="0" step="any" inputmode="decimal"' : '') +
              (b.awal ? ' value="' + esc(b.awal === 'hari' ? hariIni() : b.awal) + '"' : '') + (b.contoh ? ' placeholder="' + esc(b.contoh) + '"' : '') + '>';
          }).join('') + '<button type="button" id="cr-simpan">Simpan</button><div class="pesan" id="cr-pesan"></div>'
        : '';
      el.innerHTML = '<h3 style="margin-top:0">' + esc(cfg.judul) + '</h3>' + (cfg.info ? '<div class="info">' + cfg.info + '</div>' : '') +
        '<div id="cr-rekap"></div>' + form + (cfg.kategori ? '<div id="tl-box"></div>' : '') + '<h3>Daftar</h3><div id="cr-daftar"></div>';

      async function daftar(pesan) {
        var q = App.db.from(cfg.tabel).select('*');
        if (window.KL) q = KL.filter(q, cfg.tabel);
        var r = await q.order(cfg.urut || 'dibuat', { ascending: !!cfg.naik }).limit(cfg.batas || 200);
        if (r.error) { $('cr-daftar').innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
        rows = r.data;
        if (cfg.rekap) $('cr-rekap').innerHTML = cfg.rekap(rows.filter(function (x) { return !x.dihapus; }));
        $('cr-daftar').innerHTML = (pesan ? '<div class="pesan">' + esc(pesan) + '</div>' : '') + (window.KL ? KL.saklar(cfg.tabel) : '') +
          (rows.length ? rows.map(function (x) {
            return '<div class="baris"' + (x.dihapus ? ' style="opacity:.6"' : '') + '>' + cfg.ringkas(x) + (window.KL ? KL.tombol(x) : '') + '</div>';
          }).join('') : '<p class="muted">Belum ada data.</p>');
      }

      if (window.KL) KL.pasang($('cr-daftar'), {
        tabel: cfg.tabel,
        cari: function (id) { return rows.filter(function (x) { return x.id === id; })[0]; },
        bidang: function (x) {
          return cfg.bidang.map(function (b) {
            if (b.tipe === 'yatidak') return { k: b.k, l: b.l, tipe: 'pilih', opsi: YT, nilai: x[b.k] == null ? '' : String(x[b.k]) };
            return { k: b.k, l: b.l, tipe: b.tipe === 'pilih' ? 'pilih' : b.tipe, opsi: b.opsi, nilai: x[b.k] };
          });
        },
        simpan: async function (x, is) {
          var data = {};
          cfg.bidang.forEach(function (b) { data[b.k] = ubahNilai(b, is[b.k]); });
          var g = periksa(cfg.bidang, data);
          if (g) return { galat: g };
          return { ubah: data, setelah: cfg.setelah ? function () { return cfg.setelah(Object.assign({}, x, data), x.id, true); } : null };
        },
        selesai: function (m) { daftar(m); if (cfg.kategori && window.TL && $('tl-box')) TL.panel($('tl-box'), cfg.kategori); }
      });

      if (bisaTulis()) {
        $('cr-simpan').addEventListener('click', async function () {
          var data = {};
          cfg.bidang.forEach(function (b) { data[b.k] = ubahNilai(b, $('cr-' + b.k).value); });
          var g = periksa(cfg.bidang, data);
          if (g) { $('cr-pesan').textContent = g; return; }
          $('cr-pesan').textContent = 'Menyimpan...';
          var r = await App.db.from(cfg.tabel).insert(data).select('id');
          if (r.error) { $('cr-pesan').textContent = 'Gagal menyimpan: ' + (r.error.message || 'coba lagi'); return; }
          var catatan = cfg.setelah ? await cfg.setelah(data, r.data && r.data[0] && r.data[0].id, false) : '';
          await App.tabs[cfg.tab](el);
          $('cr-pesan').textContent = 'Tersimpan.' + (catatan || '');
        });
      }
      daftar();
      if (cfg.kategori && window.TL && $('tl-box')) TL.panel($('tl-box'), cfg.kategori);
    };
  }

  async function temuanSekali(kategori, sumber, id, data) {
    if (!window.TL || !id) return '';
    var ada = await App.db.from('temuan').select('id').eq('sumber', sumber).eq('sumber_id', id).eq('status', 'terbuka');
    if (ada.data && ada.data.length) return '';
    var e = await TL.catat([Object.assign({ tanggal: hariIni(), kategori: kategori, sumber: sumber, sumber_id: id }, data)]);
    return e ? '' : ' Dicatat sebagai temuan, lihat saran di bawah.';
  }

  // ===== ALAT SANITARIAN (KALIBRASI) =====
  crud({
    tab: 'kit_alat', judul: 'Alat sanitarian dan kalibrasi', tabel: 'sanitarian_kit', urut: 'nama_alat', naik: true,
    info: 'Hasil pengukuran dari alat yang tidak terkalibrasi dapat dipertanyakan. Tanggal kalibrasi berikutnya muncul sebagai pengingat di Dasbor 30 hari sebelumnya.',
    bidang: [
      { k: 'nama_alat', l: 'Nama alat', tipe: 'teks', wajib: true, contoh: 'mis. pH meter, lux meter, sound level meter' },
      { k: 'kategori', l: 'Kategori', tipe: 'pilih', opsi: ['Kualitas air', 'Udara dan fisik ruangan', 'Pangan', 'Vektor', 'Lainnya'], wajib: true },
      { k: 'kondisi', l: 'Kondisi', tipe: 'pilih', opsi: ['Baik', 'Rusak ringan', 'Rusak berat'], wajib: true },
      { k: 'tgl_kalibrasi', l: 'Tanggal kalibrasi terakhir', tipe: 'tanggal' },
      { k: 'kalibrasi_berikutnya', l: 'Jadwal kalibrasi berikutnya', tipe: 'tanggal' },
      { k: 'catatan', l: 'Catatan', tipe: 'teks' }
    ],
    ringkas: function (x) {
      return '<b>' + esc(x.nama_alat) + '</b> · ' + esc(x.kategori || '-') + ' · ' + (x.kondisi === 'Baik' ? '<span class="ok">Baik</span>' : '<span class="lewat">' + esc(x.kondisi || '-') + '</span>') +
        (x.tgl_kalibrasi ? '<br><span class="muted">Kalibrasi terakhir: ' + esc(x.tgl_kalibrasi) + '</span>' : '') +
        tandaTanggal(x.kalibrasi_berikutnya, 'Kalibrasi berikutnya') + (x.catatan ? '<br><span class="muted">' + esc(x.catatan) + '</span>' : '');
    }
  });

  // ===== ALKES BERMERKURI (Permenkes 41/2019) =====
  var ST_MERKURI = ['Masih digunakan', 'Sudah diganti, disimpan sementara (utuh)', 'Pecah / merkuri tumpah', 'Sudah ditarik ke depo penyimpanan'];
  crud({
    tab: 'kit_merkuri', judul: 'Alat kesehatan bermerkuri', tabel: 'alkes_merkuri', urut: 'nama_alat', naik: true, kategori: 'merkuri',
    info: 'Sesuai Permenkes 41/2019, termometer, tensimeter, dan dental amalgam bermerkuri wajib dihapuskan (batas 31 Desember 2020). Alat yang sudah diganti disimpan sementara dalam wadah tertutup dan utuh sampai ditarik. Alat yang pecah ditangani sebagai limbah B3, terpisah, dan tidak diinsinerasi.',
    bidang: [
      { k: 'nama_alat', l: 'Jenis alat', tipe: 'pilih', opsi: ['Termometer', 'Tensimeter / sfigmomanometer', 'Dental amalgam', 'Lainnya'], wajib: true },
      { k: 'jumlah', l: 'Jumlah', tipe: 'angka', wajib: true },
      { k: 'lokasi', l: 'Lokasi', tipe: 'teks', wajib: true, contoh: 'mis. Poli umum, gudang' },
      { k: 'status', l: 'Status', tipe: 'pilih', opsi: ST_MERKURI, wajib: true },
      { k: 'tgl_status', l: 'Tanggal status', tipe: 'tanggal', awal: 'hari' },
      { k: 'catatan', l: 'Catatan', tipe: 'teks' }
    ],
    rekap: function (rows) {
      var per = {};
      rows.forEach(function (x) { per[x.status] = (per[x.status] || 0) + (Number(x.jumlah) || 0); });
      return '<div class="info">' + ST_MERKURI.map(function (s) { return esc(s) + ': <b>' + (per[s] || 0) + '</b>'; }).join('<br>') + '</div>';
    },
    ringkas: function (x) {
      var buruk = x.status === 'Masih digunakan' || x.status === 'Pecah / merkuri tumpah';
      return '<b>' + esc(x.nama_alat) + '</b> · ' + (x.jumlah || 0) + ' unit · ' + esc(x.lokasi || '-') +
        '<br>' + (buruk ? '<span class="lewat">' : '<span class="ok">') + esc(x.status || '-') + '</span>' +
        (x.tgl_status ? ' <span class="muted">(' + esc(x.tgl_status) + ')</span>' : '') + (x.catatan ? '<br><span class="muted">' + esc(x.catatan) + '</span>' : '');
    },
    setelah: async function (d, id) {
      if (d.status === 'Masih digunakan' || d.status === 'Pecah / merkuri tumpah') {
        return temuanSekali('merkuri', 'alkes_merkuri', id, { lokasi: d.lokasi, parameter: d.status === 'Masih digunakan' ? 'Alkes bermerkuri masih digunakan' : 'Alkes bermerkuri pecah / tumpah', hasil: d.nama_alat + ', ' + (d.jumlah || 0) + ' unit', uraian: 'belum sesuai Permenkes 41/2019' });
      }
      if (window.TL && id) await App.db.from('temuan').update({ status: 'selesai', tindakan: d.status, tanggal_selesai: hariIni() }).eq('sumber', 'alkes_merkuri').eq('sumber_id', id).eq('status', 'terbuka');
      return '';
    }
  });

  // ===== PENJAMAH PANGAN =====
  crud({
    tab: 'tpm_penjamah', judul: 'Penjamah pangan', tabel: 'penjamah', urut: 'nama', naik: true,
    info: 'Penjamah wajib memiliki sertifikat pelatihan keamanan pangan siap saji dan diperiksa kesehatannya minimal 1 kali setahun (Permenkes 2/2023 Lampiran D.2.c). Yang dicatat hanya <b>tanggal</b> pemeriksaan, tanpa hasil atau diagnosis.',
    bidang: [
      { k: 'nama', l: 'Nama penjamah', tipe: 'teks', wajib: true },
      { k: 'lokasi', l: 'Tempat bertugas', tipe: 'teks', wajib: true, contoh: 'mis. Instalasi gizi' },
      { k: 'sertifikat_pelatihan', l: 'Nomor sertifikat pelatihan', tipe: 'teks' },
      { k: 'sertifikat_berakhir', l: 'Sertifikat berlaku sampai', tipe: 'tanggal' },
      { k: 'tgl_periksa_kesehatan', l: 'Tanggal pemeriksaan kesehatan terakhir', tipe: 'tanggal' }
    ],
    ringkas: function (x) {
      var periksaLama = !x.tgl_periksa_kesehatan || sisaHari(x.tgl_periksa_kesehatan) < -365;
      return '<b>' + esc(x.nama) + '</b> · ' + esc(x.lokasi || '-') +
        '<br>Sertifikat: ' + (x.sertifikat_pelatihan ? esc(x.sertifikat_pelatihan) : '<span class="lewat">belum ada</span>') +
        tandaTanggal(x.sertifikat_berakhir, 'Berlaku sampai') +
        '<br>Pemeriksaan kesehatan: ' + (x.tgl_periksa_kesehatan ? esc(x.tgl_periksa_kesehatan) : '-') +
        (periksaLama ? ' <span class="lewat">perlu diperiksa (lebih dari 1 tahun atau belum ada)</span>' : ' <span class="ok">masih berlaku</span>');
    }
  });

  // ===== STBM (Permenkes 3/2014) =====
  var PILAR = [['pilar1_jamban', 'Stop BABS (jamban sehat)'], ['pilar2_ctps', 'Cuci tangan pakai sabun'], ['pilar3_air', 'Pengelolaan air minum dan makanan RT'], ['pilar4_sampah', 'Pengamanan sampah RT'], ['pilar5_limbah_cair', 'Pengamanan limbah cair RT']];
  crud({
    tab: 'pkm_stbm', judul: 'STBM per kepala keluarga', tabel: 'stbm_kk', urut: 'desa', naik: true, batas: 2000,
    info: 'Lima pilar STBM sesuai Permenkes 3/2014. Isi kode KK, bukan nama, untuk menjaga data pribadi. Rekap per desa dihitung otomatis.',
    bidang: [
      { k: 'desa', l: 'Desa/kelurahan', tipe: 'teks', wajib: true },
      { k: 'rt_rw', l: 'RT/RW', tipe: 'teks' },
      { k: 'kode_kk', l: 'Kode KK', tipe: 'teks', wajib: true, contoh: 'mis. RT01-015' },
      { k: 'pilar1_jamban', l: 'Pilar 1: BAB di jamban sehat', tipe: 'yatidak', wajib: true },
      { k: 'pilar2_ctps', l: 'Pilar 2: Cuci tangan pakai sabun', tipe: 'yatidak', wajib: true },
      { k: 'pilar3_air', l: 'Pilar 3: Pengelolaan air minum dan makanan RT', tipe: 'yatidak', wajib: true },
      { k: 'pilar4_sampah', l: 'Pilar 4: Pengamanan sampah RT', tipe: 'yatidak', wajib: true },
      { k: 'pilar5_limbah_cair', l: 'Pilar 5: Pengamanan limbah cair RT', tipe: 'yatidak', wajib: true },
      { k: 'tanggal_verifikasi', l: 'Tanggal verifikasi', tipe: 'tanggal', awal: 'hari' }
    ],
    rekap: function (rows) {
      var desa = {};
      rows.forEach(function (x) {
        var d = desa[x.desa] || (desa[x.desa] = { n: 0, p: [0, 0, 0, 0, 0] });
        d.n++;
        PILAR.forEach(function (p, i) { if (x[p[0]] === true) d.p[i]++; });
      });
      var nama = Object.keys(desa).sort();
      if (!nama.length) return '';
      return '<h3>Rekap per desa</h3>' + nama.map(function (k) {
        var d = desa[k], persen = d.p.map(function (v) { return Math.round(v / d.n * 1000) / 10; });
        var sbs = persen[0] === 100, stbm = persen.every(function (v) { return v === 100; });
        return '<div class="baris"><b>' + esc(k) + '</b> · ' + d.n + ' KK' +
          PILAR.map(function (p, i) { return '<br>' + esc(p[1]) + ': <b>' + persen[i].toLocaleString('id-ID') + '%</b>'; }).join('') +
          '<br>' + (stbm ? '<span class="ok">5 pilar 100%: memenuhi syarat Desa STBM</span>' : (sbs ? '<span class="ok">Pilar 1 100%: menuju Desa SBS</span>' : '<span class="lewat">Belum 100% pilar 1</span>')) +
          '<br><span class="muted">Status SBS/STBM tetap perlu verifikasi indikator lapangan sesuai Permenkes 3/2014.</span></div>';
      }).join('');
    },
    ringkas: function (x) {
      var ok = PILAR.filter(function (p) { return x[p[0]] === true; }).length;
      return '<b>' + esc(x.kode_kk) + '</b> · ' + esc(x.desa) + (x.rt_rw ? ' ' + esc(x.rt_rw) : '') +
        '<br>' + ok + ' dari 5 pilar terpenuhi' + (x.tanggal_verifikasi ? ' <span class="muted">(' + esc(x.tanggal_verifikasi) + ')</span>' : '') +
        '<br><span class="muted">' + PILAR.map(function (p, i) { return 'P' + (i + 1) + (x[p[0]] === true ? '✓' : (x[p[0]] === false ? '✗' : '-')); }).join(' ') + '</span>';
    }
  });
  // ===== PENGAWASAN FASYANKES (linen, dekontaminasi, KTR, pengaduan) =====
  var ST_AWAS = [['terbuka', 'Belum selesai'], ['selesai', 'Selesai']];
  crud({
    tab: 'rs_pengawasan', judul: 'Pengawasan kesehatan lingkungan fasyankes', tabel: 'pengawasan', urut: 'tanggal', naik: false, kategori: 'rs',
    info: 'Catat hasil pengawasan rutin dan pengaduan. Rumah sakit wajib memberlakukan seluruh lingkungannya sebagai kawasan tanpa rokok (Permenkes 6/2026 Pasal 36 ayat (1) huruf t). Penatalaksanaan linen dan dekontaminasi mengacu pada Permenkes 27/2017 tentang PPI. Temuan yang belum selesai otomatis masuk daftar temuan.',
    bidang: [
      { k: 'tanggal', l: 'Tanggal', tipe: 'tanggal', wajib: true, awal: 'hari' },
      { k: 'jenis', l: 'Jenis pengawasan', tipe: 'pilih', wajib: true, opsi: ['Penatalaksanaan linen', 'Dekontaminasi / desinfeksi ruangan', 'Kawasan tanpa rokok', 'Pengaduan masyarakat', 'Kebersihan lingkungan', 'Lainnya'] },
      { k: 'lokasi', l: 'Lokasi', tipe: 'teks', wajib: true, contoh: 'mis. Laundry, ruang rawat inap' },
      { k: 'temuan', l: 'Temuan / isi pengaduan', tipe: 'teks', wajib: true },
      { k: 'tindakan', l: 'Tindakan', tipe: 'teks' },
      { k: 'status', l: 'Status', tipe: 'pilih', wajib: true, opsi: ST_AWAS }
    ],
    ringkas: function (x) {
      return '<b>' + esc(x.jenis || '-') + '</b> · ' + esc(x.lokasi || '-') + ' · ' + (x.status === 'selesai' ? '<span class="ok">selesai</span>' : '<span class="lewat">belum selesai</span>') +
        '<br><span class="muted">' + esc(x.tanggal || '') + '</span><br>' + esc(x.temuan || '') + (x.tindakan ? '<br><span class="muted">Tindakan: ' + esc(x.tindakan) + '</span>' : '');
    },
    setelah: async function (d, id) {
      if (!id || !window.TL) return '';
      if (d.status === 'selesai') {
        await App.db.from('temuan').update({ status: 'selesai', tindakan: d.tindakan || 'Selesai', tanggal_selesai: hariIni() }).eq('sumber', 'pengawasan').eq('sumber_id', id).eq('status', 'terbuka');
        return '';
      }
      return temuanSekali('rs', 'pengawasan', id, { lokasi: d.lokasi, parameter: d.jenis, hasil: d.temuan, uraian: 'perlu ditindaklanjuti' });
    }
  });
})();
