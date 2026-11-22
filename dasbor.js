(function () {
  var NAMA_KAT = { air: 'Air', ipal: 'IPAL', vektor: 'Vektor', udara: 'Udara ruangan', sanitasi: 'Sanitasi', tpm: 'Pangan', k3: 'K3', merkuri: 'Alkes merkuri', ttu: 'TFU / TTU', rs: 'Pengawasan fasyankes' };
  var MODUL_KAT = { air: 'air_uji', ipal: 'ipal_lab', vektor: 'vektor_catat', udara: 'udara_ukur', sanitasi: 'sanitasi_cek', tpm: 'tpm_cek', k3: 'k3_insiden', merkuri: 'kit_merkuri', ttu: 'ttu_cek', rs: 'rs_pengawasan' };

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

  var BLN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var KEGIATAN = [
    ['ipal_harian', 'Pencatatan IPAL harian', 'harian', 'ipal_harian'],
    ['ipal_lab', 'Uji laboratorium IPAL', 1, 'ipal_lab'],
    ['air_uji', 'Uji kualitas air', 1, 'air_uji'],
    ['vektor', 'Pengamatan vektor', 4, 'vektor_catat'],
    ['udara_skudr', 'Pengukuran udara ruangan', 1, 'udara_ukur'],
    ['sanitasi_checklist', 'Inspeksi sanitasi bangunan', 1, 'sanitasi_cek'],
    ['tpm_inspeksi', 'Inspeksi tempat pengelolaan pangan', 1, 'tpm_cek'],
    ['ikl_inspeksi', 'Inspeksi TFU / TTU', 0, 'ttu_cek']
  ];
  var BIDANG_UJI = [['air_uji', 'Air'], ['ipal_lab', 'IPAL'], ['vektor', 'Vektor'], ['udara_skudr', 'Udara']];

  function angka(n, d) { return Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: d == null ? 1 : d }); }
  function kg(n) { return angka(n, n >= 100 ? 0 : 1) + ' kg'; }
  function persen(a, b) { return b ? Math.round(a / b * 100) : null; }
  function bulanKe(n) { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + n); return d; }
  function kunciBulan(d) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
  function bersih(q) { return q.is('dihapus', null); }
  function cobaBersih(t, kol, dari) {
    var q = function () { return App.db.from(t).select(kol).gte('tanggal', dari); };
    return bersih(q()).then(function (r) { return r.error ? q() : r; }).then(function (r) { return r.error ? { data: [] } : r; }, function () { return { data: [] }; });
  }
  async function semuaLimbah(dari) {
    var out = [];
    for (var i = 0; i < 10; i++) {
      var r = await App.db.from('limbah_harian').select('tanggal, berat_kg, kode_limbah').gte('tanggal', dari).order('id').range(i * 1000, i * 1000 + 999);
      if (r.error || !r.data) break;
      out = out.concat(r.data);
      if (r.data.length < 1000) break;
    }
    return out;
  }
  function ambilTarget(nilai, jenisFas) {
    var t = {};
    try { t = nilai ? (typeof nilai === 'string' ? JSON.parse(nilai) : nilai) : {}; } catch (e) { t = {}; }
    var out = {};
    KEGIATAN.forEach(function (k) {
      var awal = k[0] === 'ikl_inspeksi' ? (/puskesmas/i.test(jenisFas || '') ? 2 : 0) : k[2];
      out[k[0]] = t[k[0]] != null ? t[k[0]] : awal;
    });
    return out;
  }

  // ---------- komponen tampilan ----------
  function kpi(label, nilai, sub, nada) {
    return '<div class="kpi' + (nada ? ' ' + nada : '') + '"><div class="kpi-l">' + label + '</div><div class="kpi-n">' + nilai + '</div><div class="kpi-s">' + sub + '</div></div>';
  }
  function panel(judul, isi, ket) {
    return '<section class="panel"><div class="panel-h"><h3>' + judul + '</h3>' + (ket ? '<span class="muted">' + ket + '</span>' : '') + '</div>' + isi + '</section>';
  }
  function grafikBatang(data, fmt) {
    var W = 340, H = 170, kiri = 8, bawah = 24, atas = 22;
    var maks = Math.max.apply(null, data.map(function (d) { return d.v; }).concat([1]));
    var lebar = (W - kiri * 2) / data.length, bar = Math.min(34, lebar * 0.56);
    var g = '<line x1="' + kiri + '" x2="' + (W - kiri) + '" y1="' + (H - bawah) + '" y2="' + (H - bawah) + '" stroke="#D5E2DF"/>';
    data.forEach(function (d, i) {
      var h = (H - bawah - atas) * d.v / maks, x = kiri + lebar * i + (lebar - bar) / 2, y = H - bawah - h;
      var warna = d.kini ? '#0F6E5C' : '#8CC4B7';
      if (h > 0) g += '<path d="M' + x + ',' + (H - bawah) + 'V' + (y + 4) + 'Q' + x + ',' + y + ' ' + (x + 4) + ',' + y + 'H' + (x + bar - 4) + 'Q' + (x + bar) + ',' + y + ' ' + (x + bar) + ',' + (y + 4) + 'V' + (H - bawah) + 'Z" fill="' + warna + '"><title>' + esc(d.l + ': ' + fmt(d.v)) + '</title></path>';
      g += '<text x="' + (x + bar / 2) + '" y="' + (y - 6) + '" text-anchor="middle" font-size="10" fill="#17302B" font-weight="' + (d.kini ? 700 : 400) + '">' + (d.v ? esc(fmt(d.v)) : '0') + '</text>';
      g += '<text x="' + (x + bar / 2) + '" y="' + (H - 7) + '" text-anchor="middle" font-size="11" fill="#6B7C78">' + esc(d.l) + '</text>';
    });
    return '<svg viewBox="0 0 ' + W + ' ' + H + '" class="grafik" role="img">' + g + '</svg>';
  }
  function grafikGanda(data, nama1, nama2) {
    var W = 340, H = 170, kiri = 8, bawah = 24, atas = 22;
    var maks = Math.max.apply(null, data.map(function (d) { return Math.max(d.a, d.b); }).concat([1]));
    var lebar = (W - kiri * 2) / data.length, bar = Math.min(14, lebar * 0.3);
    var g = '<line x1="' + kiri + '" x2="' + (W - kiri) + '" y1="' + (H - bawah) + '" y2="' + (H - bawah) + '" stroke="#D5E2DF"/>';
    data.forEach(function (d, i) {
      var tengah = kiri + lebar * i + lebar / 2;
      [[d.a, '#B26A00', -bar - 1, nama1], [d.b, '#0F6E5C', 1, nama2]].forEach(function (s) {
        var h = (H - bawah - atas) * s[0] / maks, x = tengah + s[2], y = H - bawah - h;
        if (h > 0) g += '<rect x="' + x + '" y="' + y + '" width="' + bar + '" height="' + h + '" rx="3" fill="' + s[1] + '"><title>' + esc(d.l + ', ' + s[3] + ': ' + s[0]) + '</title></rect>';
        if (s[0]) g += '<text x="' + (x + bar / 2) + '" y="' + (y - 5) + '" text-anchor="middle" font-size="10" fill="#17302B">' + s[0] + '</text>';
      });
      g += '<text x="' + tengah + '" y="' + (H - 7) + '" text-anchor="middle" font-size="11" fill="#6B7C78">' + esc(d.l) + '</text>';
    });
    return '<div class="legenda"><span><i style="background:#B26A00"></i>' + nama1 + '</span><span><i style="background:#0F6E5C"></i>' + nama2 + '</span></div>' +
      '<svg viewBox="0 0 ' + W + ' ' + H + '" class="grafik" role="img">' + g + '</svg>';
  }
  function batangMendatar(label, nilai, maks, teks) {
    var w = maks ? Math.max(2, nilai / maks * 100) : 0;
    return '<div class="hb"><div class="hb-l"><span>' + label + '</span><b>' + teks + '</b></div><div class="hb-t"><div style="width:' + w + '%"></div></div></div>';
  }
  function capaian(nama, jumlah, target, modul) {
    var p = target ? Math.min(100, Math.round(jumlah / target * 100)) : 0;
    var st = p >= 100 ? ['ok', '✓ Tercapai'] : (p > 0 ? ['jalan', '◐ Berjalan'] : ['belum', '○ Belum']);
    return '<div class="cp"><div class="hb-l"><span>' + nama + '</span><span class="st ' + st[0] + '">' + st[1] + '</span></div>' +
      '<div class="hb-t cp-' + st[0] + '"><div style="width:' + Math.max(p, 0) + '%"></div></div>' +
      '<div class="cp-b"><span class="muted">' + jumlah + ' dari target ' + target + ' · ' + p + '%</span>' +
      (modul ? '<button type="button" class="chip" data-buka="' + modul + '">Buka</button>' : '') + '</div></div>';
  }
  function hasilUji(nama, ok, tidak) {
    var n = ok + tidak;
    if (!n) return '<div class="hb"><div class="hb-l"><span>' + nama + '</span><span class="muted">belum ada</span></div><div class="hb-t"></div></div>';
    return '<div class="hb"><div class="hb-l"><span>' + nama + '</span><b>' + persen(ok, n) + '% memenuhi</b></div>' +
      '<div class="hb-t duo"><div style="width:' + (ok / n * 100) + '%"></div><div class="tdk" style="width:' + (tidak / n * 100) + '%"></div></div>' +
      '<div class="muted" style="font-size:12px">' + ok + ' memenuhi · ' + tidak + ' tidak memenuhi</div></div>';
  }

  App.tabs.dasbor = async function (el) {
    var p = App.profil;
    var kini = new Date();
    var judul = '<div class="dsb-h"><div><div class="muted">' + BULAN[kini.getMonth()] + ' ' + kini.getFullYear() + '</div><h2>Halo, ' + esc(p.nama) + '</h2></div></div>';
    if (p.peran === 'admin_papkenz') {
      el.innerHTML = judul + '<div class="info">Anda masuk sebagai admin Papkenz. Data harian klien tidak ditampilkan di sini.</div>';
      return;
    }
    el.innerHTML = judul + '<p class="muted">Memuat dasbor...</p>';
    var hari = hariIni(), batas30 = tambahHari(30);
    var awalBulan = tglLokal(bulanKe(0)), awalLalu = tglLokal(bulanKe(-1)), awal6 = tglLokal(bulanKe(-5));
    var awal6Iso = bulanKe(-5); awal6Iso.setHours(0, 0, 0, 0);

    var akt = KEGIATAN.map(function (k) { return cobaBersih(k[0], k[0] === 'ipal_harian' ? 'tanggal' : (k[0] === 'sanitasi_checklist' || k[0] === 'tpm_inspeksi' || k[0] === 'ikl_inspeksi' ? 'tanggal, status' : 'tanggal, status'), awalBulan); });
    var r = await Promise.all([
      semuaLimbah(awal6),
      aman(App.db.from('limbah_harian').select('kode_limbah, berat_kg, batas_simpan').eq('status', 'disimpan')
        .not('batas_simpan', 'is', null).order('batas_simpan', { ascending: true }).limit(5)),
      aman(App.db.from('temuan').select('kategori').eq('status', 'terbuka')),
      aman(App.db.from('vendor').select('nama, izin_berakhir, mou_berakhir').eq('aktif', true)),
      aman(App.db.from('penjamah').select('nama, sertifikat_berakhir, tgl_periksa_kesehatan').eq('aktif', true).is('dihapus', null)),
      aman(App.db.from('sanitarian_kit').select('nama_alat, kalibrasi_berikutnya').is('dihapus', null).not('kalibrasi_berikutnya', 'is', null).lte('kalibrasi_berikutnya', batas30)),
      aman(App.db.from('ipal_harian').select('tanggal').is('dihapus', null).order('tanggal', { ascending: false }).limit(1)),
      aman(App.db.from('pengaturan').select('kunci, nilai').in('kunci', ['kelas_ipal', 'target_pemantauan'])),
      aman(App.db.from('temuan').select('status, dibuat, tanggal_selesai').gte('dibuat', awal6Iso.toISOString())),
      aman(App.db.from('fasyankes').select('jenis').eq('id', p.fasyankes_id).maybeSingle()),
      Promise.all(akt)
    ]);
    var limbah = r[0] || [];
    var set = {};
    (r[7].data || []).forEach(function (x) { set[x.kunci] = x.nilai; });
    var adaIpal = set.kelas_ipal !== 'tidak_ada';
    var target = ambilTarget(set.target_pemantauan, (r[9].data || {}).jenis);
    var aktData = {};
    KEGIATAN.forEach(function (k, i) { aktData[k[0]] = r[10][i].data || []; });

    // ----- angka utama -----
    var perBulan = {}, perKode = {}, hariIniKg = 0, nHariIni = 0;
    limbah.forEach(function (x) {
      var b = String(x.tanggal).slice(0, 7), w = Number(x.berat_kg) || 0;
      perBulan[b] = (perBulan[b] || 0) + w;
      if (x.tanggal >= awalBulan) perKode[x.kode_limbah] = (perKode[x.kode_limbah] || 0) + w;
      if (x.tanggal === hari) { hariIniKg += w; nHariIni++; }
    });
    var kgKini = perBulan[kunciBulan(bulanKe(0))] || 0, kgLalu = perBulan[kunciBulan(bulanKe(-1))] || 0;
    var hariBerjalan = kini.getDate(), hariSebulan = new Date(kini.getFullYear(), kini.getMonth() + 1, 0).getDate();
    var subLimbah = kgLalu ? (function () {
      // bandingkan laju per hari supaya bulan berjalan adil
      var laju = kgKini / hariBerjalan, lajuLalu = kgLalu / new Date(kini.getFullYear(), kini.getMonth(), 0).getDate();
      var d = Math.round((laju - lajuLalu) / lajuLalu * 100);
      return 'Hari ini ' + kg(hariIniKg) + ' · laju harian ' + (d >= 0 ? '▲ ' : '▼ ') + Math.abs(d) + '% vs bulan lalu';
    })() : 'Hari ini ' + kg(hariIniKg) + ' (' + nHariIni + ' catatan)';

    var ok = 0, tdk = 0, perBidang = {};
    BIDANG_UJI.forEach(function (b) {
      var a = 0, t = 0;
      aktData[b[0]].forEach(function (x) { if (x.status === 'memenuhi') a++; else if (x.status === 'tidak_memenuhi') t++; });
      perBidang[b[0]] = [a, t]; ok += a; tdk += t;
    });
    var insp = [['sanitasi_checklist', 'Sanitasi'], ['tpm_inspeksi', 'Pangan'], ['ikl_inspeksi', 'TFU']];
    insp.forEach(function (b) {
      var a = 0, t = 0;
      aktData[b[0]].forEach(function (x) { if (x.status === 'memenuhi') a++; else if (x.status === 'tidak_memenuhi') t++; });
      perBidang[b[0]] = [a, t];
    });
    var pKepatuhan = persen(ok, ok + tdk);

    var daftarCp = [], nCapai = 0, nTarget = 0;
    KEGIATAN.forEach(function (k) {
      if (k[0] === 'ipal_harian' || k[0] === 'ipal_lab') { if (!adaIpal) return; }
      var tg = k[0] === 'ipal_harian' ? hariBerjalan : Number(target[k[0]]) || 0;
      if (!tg) return;
      var tgl = {};
      aktData[k[0]].forEach(function (x) { tgl[x.tanggal] = 1; });
      var j = Object.keys(tgl).length;
      nTarget++; if (j >= tg) nCapai++;
      daftarCp.push(capaian(k[1] + (k[0] === 'ipal_harian' ? ' <span class="muted">(setiap hari)</span>' : ''), j, tg, k[3]));
    });
    var pCapai = persen(nCapai, nTarget);

    var temuan6 = r[8].data || [], nBuka = (r[2].data || []).length, selesaiBulan = 0;
    temuan6.forEach(function (x) { if (x.status === 'selesai' && x.tanggal_selesai && x.tanggal_selesai >= awalBulan) selesaiBulan++; });

    var h = judul + '<div class="kpi-grid">' +
      kpi('Limbah B3 bulan ini', kg(kgKini), subLimbah) +
      kpi('Hasil uji memenuhi', pKepatuhan == null ? '–' : pKepatuhan + '%', pKepatuhan == null ? 'Belum ada hasil uji bulan ini' : ok + ' dari ' + (ok + tdk) + ' parameter', pKepatuhan != null && pKepatuhan < 100 ? 'waspada' : '') +
      kpi('Capaian pemantauan', pCapai == null ? '–' : pCapai + '%', nCapai + ' dari ' + nTarget + ' kegiatan sesuai target') +
      kpi('Temuan terbuka', String(nBuka), selesaiBulan + ' diselesaikan bulan ini', nBuka ? 'waspada' : '') +
      '</div>';

    // ----- perlu perhatian -----
    var perhatian = [];
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
      if (x.sertifikat_berakhir && x.sertifikat_berakhir <= batas30)
        perhatian.push('<div class="baris">Sertifikat penjamah <b>' + esc(x.nama) + '</b> berakhir ' + esc(x.sertifikat_berakhir) + ' · ' + labelSisa(x.sertifikat_berakhir) + '</div>');
      if (!x.tgl_periksa_kesehatan || sisaHari(x.tgl_periksa_kesehatan) < -365)
        perhatian.push('<div class="baris">Penjamah <b>' + esc(x.nama) + '</b> perlu pemeriksaan kesehatan (minimal 1 kali setahun)</div>');
    });
    (r[5].data || []).forEach(function (x) {
      perhatian.push('<div class="baris">Kalibrasi <b>' + esc(x.nama_alat) + '</b> jatuh tempo ' + esc(x.kalibrasi_berikutnya) + ' · ' + labelSisa(x.kalibrasi_berikutnya) + '</div>');
    });
    if (perhatian.length) h += panel('Perlu perhatian (' + perhatian.length + ')', perhatian.join(''));

    // ----- capaian pemantauan -----
    var bolehAtur = ['admin_fasyankes', 'petugas_kesling'].indexOf(p.peran) > -1;
    h += '<div class="dsb-2">' + panel('Capaian pemantauan bulan ini', (daftarCp.join('') || '<p class="muted">Belum ada target.</p>') +
      '<p class="muted" style="font-size:12px">Hari ke-' + hariBerjalan + ' dari ' + hariSebulan + '. Target adalah target internal fasyankes; sesuaikan dengan persetujuan teknis IPAL, rekomendasi dinas, dan program kerja.</p>' +
      (bolehAtur ? '<button type="button" class="chip" id="ds-atur">Atur target</button><div id="ds-target"></div>' : ''));

    // ----- hasil uji -----
    h += panel('Hasil pemeriksaan bulan ini',
      BIDANG_UJI.map(function (b) { return hasilUji(b[1], perBidang[b[0]][0], perBidang[b[0]][1]); }).join('') +
      insp.map(function (b) { return hasilUji('Inspeksi ' + (b[1] === 'TFU' ? 'TFU' : b[1].toLowerCase()), perBidang[b[0]][0], perBidang[b[0]][1]); }).join('') +
      '<div class="legenda"><span><i style="background:#0F6E5C"></i>Memenuhi</span><span><i style="background:#B3261E"></i>Tidak memenuhi</span></div>' +
      (window.INSPEKSI && p.fasyankes_id ? '<button type="button" class="chip" id="ds-insp" style="margin-top:8px">Lihat rincian inspeksi (tempat, foto, lokasi)</button>' : '')) + '</div>';

    // ----- grafik limbah -----
    var seri = [];
    for (var i = -5; i <= 0; i++) { var d = bulanKe(i); seri.push({ l: BLN[d.getMonth()], v: Math.round((perBulan[kunciBulan(d)] || 0) * 10) / 10, kini: i === 0 }); }
    var kode = Object.keys(perKode).sort(function (a, b) { return perKode[b] - perKode[a]; });
    var maksKode = kode.length ? perKode[kode[0]] : 0;
    h += '<div class="dsb-2">' + panel('Timbulan limbah B3', grafikBatang(seri, function (v) { return angka(v, v >= 100 ? 0 : 1); }), '6 bulan terakhir, kg') +
      panel('Limbah B3 bulan ini per kode', kode.length ? kode.slice(0, 6).map(function (k) { return batangMendatar(esc(k), perKode[k], maksKode, kg(perKode[k])); }).join('') +
        (kode.length > 6 ? '<p class="muted">+' + (kode.length - 6) + ' kode lain</p>' : '') : '<p class="muted">Belum ada catatan bulan ini.</p>') + '</div>';

    // ----- grafik temuan -----
    var tb = [];
    for (var j = -5; j <= 0; j++) { var dd = bulanKe(j); tb.push({ k: kunciBulan(dd), l: BLN[dd.getMonth()], a: 0, b: 0 }); }
    var idx = {}; tb.forEach(function (x, i) { idx[x.k] = i; });
    temuan6.forEach(function (x) {
      var kb = String(x.dibuat).slice(0, 7);
      if (idx[kb] != null) tb[idx[kb]].a++;
      if (x.status === 'selesai' && x.tanggal_selesai) { var ks = String(x.tanggal_selesai).slice(0, 7); if (idx[ks] != null) tb[idx[ks]].b++; }
    });
    var hitung = {};
    (r[2].data || []).forEach(function (t) { hitung[t.kategori] = (hitung[t.kategori] || 0) + 1; });
    var isiTemuan = nBuka
      ? Object.keys(hitung).sort(function (a, b) { return hitung[b] - hitung[a]; }).map(function (k) {
          return '<div class="baris" style="display:flex;justify-content:space-between;align-items:center;gap:8px"><span><b>' + esc(NAMA_KAT[k] || k) + '</b><br><span class="lewat">' + hitung[k] + ' terbuka</span></span>' +
            (MODUL_KAT[k] ? '<button type="button" class="chip" data-buka="' + MODUL_KAT[k] + '">Tindak lanjuti</button>' : '') + '</div>';
        }).join('')
      : '<p class="ok">✓ Tidak ada temuan terbuka.</p>';
    h += '<div class="dsb-2">' + panel('Temuan dan penyelesaian', grafikGanda(tb, 'Temuan baru', 'Diselesaikan'), '6 bulan terakhir') +
      panel('Temuan terbuka per bidang', isiTemuan) + '</div>';

    // ----- batas simpan -----
    var b = r[1].data || [], isiBatas = '';
    if (!b.length) isiBatas = '<p class="muted">Tidak ada limbah yang sedang disimpan.</p>';
    else {
      var sekarang = Date.now();
      b.forEach(function (x) {
        var t = new Date(x.batas_simpan).getTime();
        var ket = t < sekarang ? '<span class="lewat">⚠ LEWAT BATAS</span>' : (t - sekarang < 86400000 ? '<span class="lewat">⚠ H-1</span>' : '<span class="ok">✓ Aman</span>');
        isiBatas += '<div class="baris"><b>' + esc(x.kode_limbah) + '</b> · ' + fmtBerat(x.berat_kg) + '<br>Batas: ' + fmtWaktu(x.batas_simpan) + ' · ' + ket + '</div>';
      });
    }
    h += panel('Batas simpan limbah terdekat', isiBatas);

    el.innerHTML = '<div id="dasbor-root">' + h + '</div>';
    $('dasbor-root').onclick = async function (e) {
      var t = e.target.closest ? e.target.closest('[data-buka]') : null;
      if (t && App.tabs[t.dataset.buka]) { App.tabs[t.dataset.buka](el); App.kembali('Dasbor', function () { bukaTab('dasbor'); }); window.scrollTo(0, 0); return; }
      if (e.target.id === 'ds-insp') {
        var nm = {}; nm[p.fasyankes_id] = (p.fasyankes && p.fasyankes.nama) || '';
        INSPEKSI.daftar(el, { ids: [p.fasyankes_id], nama: nm, judul: nm[p.fasyankes_id] });
        App.kembali('Dasbor', function () { bukaTab('dasbor'); }); window.scrollTo(0, 0); return;
      }
      if (e.target.id === 'ds-atur') {
        $('ds-target').innerHTML = KEGIATAN.filter(function (k) { return k[0] !== 'ipal_harian'; }).map(function (k) {
          return '<label>' + esc(k[1]) + ' (kali per bulan, 0 = tidak dipantau)</label><input type="number" min="0" step="1" data-tg="' + k[0] + '" value="' + (Number(target[k[0]]) || 0) + '">';
        }).join('') + '<button type="button" id="ds-simpan">Simpan target</button><div class="pesan" id="ds-pesan"></div>';
      }
      if (e.target.id === 'ds-simpan') {
        var baru = {};
        document.querySelectorAll('[data-tg]').forEach(function (x) { baru[x.dataset.tg] = Math.max(0, Math.round(Number(x.value) || 0)); });
        var err = window.PENGATURAN ? await PENGATURAN.simpan('target_pemantauan', JSON.stringify(baru)) : { message: 'modul pengaturan tidak termuat' };
        if (err) { $('ds-pesan').textContent = 'Gagal: ' + (err.message || 'coba lagi'); return; }
        App.tabs.dasbor(el);
      }
    };
  };
})();
