(function () {
  var NAMA_KAT = { air: 'Air', ipal: 'IPAL', vektor: 'Vektor', udara: 'Udara ruangan', sanitasi: 'Sanitasi', tpm: 'Pangan', k3: 'K3' };
  var MODUL_KAT = { air: 'air_uji', ipal: 'ipal_lab', vektor: 'vektor_catat', udara: 'udara_ukur', sanitasi: 'sanitasi_cek', tpm: 'tpm_cek', k3: 'k3_insiden' };

  function hariIni() { return tglLokal(new Date()); }
  function tambahHari(n) { var d = new Date(); d.setDate(d.getDate() + n); return tglLokal(d); }
  function sisaHari(tgl) {
    return Math.ceil((new Date(tgl + 'T00:00:00') - new Date(hariIni() + 'T00:00:00')) / 86400000);
  }
  function labelSisa(tgl) {
    var s = sisaHari(tgl);
    if (s < 0) return '<span class="lewat">sudah lewat ' + (-s) + ' hari</span>';
    if (s === 0) return '<span class="lewat">hari ini</span>';
    return '<span class="lewat">' + s + ' hari lagi</span>';
  }
  function kartu(judul, isi) { return '<h3>' + judul + '</h3>' + isi; }
  function aman(q) { return q.then(function (r) { return r; }, function () { return { data: [] }; }); }

  App.tabs.dasbor = async function (el) {
    var p = App.profil;
    var html = '<h3 style="margin-top:0">Halo, ' + esc(p.nama) + '</h3><p class="muted">' + esc(p.peran) + '</p>';
    if (p.peran === 'admin_papkenz') {
      el.innerHTML = html + '<div class="info">Anda masuk sebagai admin Papkenz. Data harian klien tidak ditampilkan di sini.</div>';
      return;
    }
    el.innerHTML = html + '<p class="muted">Memuat...</p>';
    var hari = hariIni(), batas30 = tambahHari(30);

    var r = await Promise.all([
      aman(App.db.from('limbah_harian').select('berat_kg').eq('tanggal', hari)),
      aman(App.db.from('limbah_harian').select('kode_limbah, berat_kg, batas_simpan').eq('status', 'disimpan')
        .not('batas_simpan', 'is', null).order('batas_simpan', { ascending: true }).limit(5)),
      aman(App.db.from('temuan').select('kategori').eq('status', 'terbuka')),
      aman(App.db.from('vendor').select('nama, izin_berakhir, mou_berakhir').eq('aktif', true)),
      aman(App.db.from('penjamah').select('nama, sertifikat_berakhir').eq('aktif', true).not('sertifikat_berakhir', 'is', null).lte('sertifikat_berakhir', batas30)),
      aman(App.db.from('sanitarian_kit').select('nama_alat, kalibrasi_berikutnya').not('kalibrasi_berikutnya', 'is', null).lte('kalibrasi_berikutnya', batas30)),
      aman(App.db.from('ipal_harian').select('tanggal').is('dihapus', null).order('tanggal', { ascending: false }).limit(1)),
      aman(App.db.from('pengaturan').select('kunci, nilai').eq('kunci', 'kelas_ipal'))
    ]);

    // Limbah
    var total = 0;
    (r[0].data || []).forEach(function (x) { total += Number(x.berat_kg); });
    html += '<div class="info">Limbah B3 tercatat hari ini: <b>' + fmtBerat(total) + '</b> (' + (r[0].data || []).length + ' catatan)</div>';

    // Perlu perhatian
    var perhatian = [];
    var adaIpal = !((r[7].data || [])[0] && r[7].data[0].nilai === 'tidak_ada');
    var ipalAkhir = (r[6].data || [])[0];
    if (adaIpal && (!ipalAkhir || ipalAkhir.tanggal < hari)) {
      perhatian.push('<div class="baris">IPAL harian belum dicatat hari ini' +
        (ipalAkhir ? ' <span class="muted">(terakhir ' + esc(ipalAkhir.tanggal) + ')</span>' : '') +
        '<br><button type="button" class="chip" data-buka="ipal_harian">Catat sekarang</button></div>');
    }
    (r[3].data || []).forEach(function (v) {
      [['izin_berakhir', 'Izin'], ['mou_berakhir', 'MoU']].forEach(function (k) {
        var d = v[k[0]];
        if (d && d <= batas30) perhatian.push('<div class="baris">' + k[1] + ' vendor <b>' + esc(v.nama) + '</b> berakhir ' + esc(d) + ' · ' + labelSisa(d) + '</div>');
      });
    });
    (r[4].data || []).forEach(function (x) {
      perhatian.push('<div class="baris">Sertifikat penjamah <b>' + esc(x.nama) + '</b> berakhir ' + esc(x.sertifikat_berakhir) + ' · ' + labelSisa(x.sertifikat_berakhir) + '</div>');
    });
    (r[5].data || []).forEach(function (x) {
      perhatian.push('<div class="baris">Kalibrasi <b>' + esc(x.nama_alat) + '</b> jatuh tempo ' + esc(x.kalibrasi_berikutnya) + ' · ' + labelSisa(x.kalibrasi_berikutnya) + '</div>');
    });
    html += kartu('Perlu perhatian', perhatian.length ? perhatian.join('') : '<p class="ok">Tidak ada yang perlu ditindaklanjuti segera.</p>');

    // Temuan terbuka
    var hitung = {}, jml = 0;
    (r[2].data || []).forEach(function (t) { hitung[t.kategori] = (hitung[t.kategori] || 0) + 1; jml++; });
    var isiTemuan = jml
      ? Object.keys(hitung).sort().map(function (k) {
          return '<div class="baris"><b>' + esc(NAMA_KAT[k] || k) + '</b>: <span class="lewat">' + hitung[k] + ' temuan terbuka</span>' +
            (MODUL_KAT[k] ? '<br><button type="button" class="chip" data-buka="' + MODUL_KAT[k] + '">Lihat dan tindak lanjuti</button>' : '') + '</div>';
        }).join('')
      : '<p class="ok">Tidak ada temuan terbuka.</p>';
    html += kartu('Temuan belum ditindaklanjuti (' + jml + ')', isiTemuan);

    // Batas simpan limbah
    var b = r[1].data || [];
    var isiBatas = '';
    if (!b.length) {
      isiBatas = '<p class="muted">Belum ada limbah yang disimpan.</p>';
    } else {
      var sekarang = Date.now();
      b.forEach(function (x) {
        var t = new Date(x.batas_simpan).getTime();
        var ket = t < sekarang ? '<span class="lewat">LEWAT BATAS</span>'
          : (t - sekarang < 86400000 ? '<span class="lewat">H-1</span>' : '<span class="ok">Aman</span>');
        isiBatas += '<div class="baris"><b>' + esc(x.kode_limbah) + '</b> · ' + fmtBerat(x.berat_kg) + '<br>Batas: ' + fmtWaktu(x.batas_simpan) + ' · ' + ket + '</div>';
      });
    }
    html += kartu('Batas simpan limbah terdekat', isiBatas);

    el.innerHTML = '<div id="dasbor-root">' + html + '</div>';
    $('dasbor-root').onclick = function (e) {
      var t = e.target.closest ? e.target.closest('[data-buka]') : null;
      if (t && App.tabs[t.dataset.buka]) App.tabs[t.dataset.buka](el);
    };
  };
})();
