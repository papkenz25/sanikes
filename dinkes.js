(function () {
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var UJI = ['air_uji', 'ipal_lab', 'vektor', 'udara_skudr'];
  var INSP = ['sanitasi_checklist', 'tpm_inspeksi', 'ikl_inspeksi'];

  function angka(n, d) { return Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: d == null ? 1 : d }); }
  async function ambil(t, kol, ids, dari, sampai, bersih) {
    var out = [];
    for (var i = 0; i < 20; i++) {
      var q = App.db.from(t).select(kol).in('fasyankes_id', ids);
      if (dari) q = q.gte('tanggal', dari).lte('tanggal', sampai);
      if (bersih) q = q.is('dihapus', null);
      var r = await q.range(i * 1000, i * 1000 + 999);
      if (r.error) { if (bersih) return ambil(t, kol, ids, dari, sampai, false); return out; }
      out = out.concat(r.data || []);
      if (!r.data || r.data.length < 1000) break;
    }
    return out;
  }
  function kpi(l, n, s, nada) {
    return '<div class="kpi' + (nada ? ' ' + nada : '') + '"><div class="kpi-l">' + l + '</div><div class="kpi-n">' + n + '</div><div class="kpi-s">' + s + '</div></div>';
  }

  App.tabs.dinkes = async function (el) {
    var kini = new Date();
    var bl = window._dkBl != null ? window._dkBl : kini.getMonth(), th = window._dkTh || kini.getFullYear();
    el.innerHTML = '<p class="muted">Memuat data wilayah...</p>';
    var w = await App.db.from('wilayah').select('*').maybeSingle();
    var fr = await App.db.from('fasyankes').select('id, nama, jenis').order('nama');
    var fas = fr.data || [];
    var judul = '<div class="dk-hero"><small>' + esc((w.data || {}).nama || 'Wilayah') + '</small><h2>Rekap kesehatan lingkungan fasyankes</h2>' +
      '<div class="dk-per noprint"><div><label>Bulan</label><select id="dk-bl">' +
      BULAN.map(function (b, i) { return '<option value="' + i + '"' + (i === bl ? ' selected' : '') + '>' + b + '</option>'; }).join('') +
      '</select></div><div><label>Tahun</label><input type="number" id="dk-th" value="' + th + '" style="width:100px"></div>' +
      '<button type="button" class="chip" id="dk-buka">Tampilkan</button></div>@@RING@@</div>';
    if (!fas.length) {
      el.innerHTML = judul.replace('@@RING@@', '') + '<div class="info">Belum ada fasyankes yang terhubung ke wilayah ini. Puskesmas otomatis terlihat setelah didaftarkan ke wilayah; klinik dan RS terlihat setelah admin mereka menyetujui berbagi data.</div>';
      return;
    }
    var ids = fas.map(function (x) { return x.id; });
    var dari = tglLokal(new Date(th, bl, 1)), sampai = tglLokal(new Date(th, bl + 1, 0));
    var hariBulan = new Date(th, bl + 1, 0).getDate();
    var hariHitung = (th === kini.getFullYear() && bl === kini.getMonth()) ? kini.getDate() : hariBulan;

    var r = await Promise.all([
      ambil('limbah_harian', 'fasyankes_id, berat_kg, tanggal', ids, tglLokal(new Date(th, bl - 5, 1)), sampai, false),
      ambil('ipal_harian', 'fasyankes_id, tanggal', ids, dari, sampai, true),
      Promise.all(UJI.map(function (t) { return ambil(t, 'fasyankes_id, status', ids, dari, sampai, true); })),
      Promise.all(INSP.map(function (t) { return ambil(t, 'fasyankes_id, status', ids, dari, sampai, true); })),
      ambil('temuan', 'fasyankes_id, status', ids, null, null, false),
      ambil('k3_insiden', 'fasyankes_id, jumlah', ids, dari, sampai, true),
      ambil('pengaturan', 'fasyankes_id, kunci, nilai', ids, null, null, false)
    ]);
    var per = {};
    fas.forEach(function (x) { per[x.id] = { kg: 0, ipal: {}, ok: 0, tdk: 0, insp: 0, inspTdk: 0, buka: 0, k3: 0, lapor: false, adaIpal: true }; });
    r[6].forEach(function (x) { if (x.kunci === 'kelas_ipal' && x.nilai === 'tidak_ada' && per[x.fasyankes_id]) per[x.fasyankes_id].adaIpal = false; });
    var bulanKg = [0, 0, 0, 0, 0, 0];
    r[0].forEach(function (x) {
      var p = per[x.fasyankes_id]; if (!p) return;
      var d = String(x.tanggal || '').split('-'), sel = (th * 12 + bl) - (Number(d[0]) * 12 + Number(d[1]) - 1);
      if (sel >= 0 && sel <= 5) bulanKg[5 - sel] += Number(x.berat_kg) || 0;
      if (sel === 0) { p.kg += Number(x.berat_kg) || 0; p.lapor = true; }
    });
    r[1].forEach(function (x) { var p = per[x.fasyankes_id]; if (p) { p.ipal[x.tanggal] = 1; p.lapor = true; } });
    r[2].forEach(function (rows) { rows.forEach(function (x) { var p = per[x.fasyankes_id]; if (!p) return; p.lapor = true; if (x.status === 'memenuhi') p.ok++; else if (x.status === 'tidak_memenuhi') p.tdk++; }); });
    r[3].forEach(function (rows) { rows.forEach(function (x) { var p = per[x.fasyankes_id]; if (!p) return; p.lapor = true; p.insp++; if (x.status === 'tidak_memenuhi') p.inspTdk++; }); });
    r[4].forEach(function (x) { var p = per[x.fasyankes_id]; if (p && x.status === 'terbuka') p.buka++; });
    r[5].forEach(function (x) { var p = per[x.fasyankes_id]; if (p) { p.k3 += Number(x.jumlah) || 0; p.lapor = true; } });

    var tot = { kg: 0, ok: 0, tdk: 0, buka: 0, lapor: 0 };
    fas.forEach(function (x) { var p = per[x.id]; tot.kg += p.kg; tot.ok += p.ok; tot.tdk += p.tdk; tot.buka += p.buka; if (p.lapor) tot.lapor++; });
    var pUji = tot.ok + tot.tdk ? Math.round(tot.ok / (tot.ok + tot.tdk) * 100) : null;

    var persenLapor = fas.length ? Math.round(tot.lapor / fas.length * 100) : 0, R = 30, K = 2 * Math.PI * R;
    var ring = '<div class="dk-ring"><svg width="76" height="76" viewBox="0 0 76 76"><circle cx="38" cy="38" r="' + R + '" fill="none" stroke="rgba(255,255,255,.25)" stroke-width="8"/>' +
      '<circle cx="38" cy="38" r="' + R + '" fill="none" stroke="#fff" stroke-width="8" stroke-linecap="round" stroke-dasharray="' + (K * persenLapor / 100) + ' ' + K + '" transform="rotate(-90 38 38)"/>' +
      '<text x="38" y="43" text-anchor="middle" fill="#fff" font-size="16" font-weight="800">' + persenLapor + '%</text></svg>' +
      '<div><b>' + tot.lapor + ' dari ' + fas.length + ' fasyankes sudah melapor</b><span>' + BULAN[bl] + ' ' + th + (tot.lapor < fas.length ? ' · ' + (fas.length - tot.lapor) + ' belum ada catatan' : ' · semua sudah mengisi') + '</span></div></div>';

    var h = judul.replace('@@RING@@', ring) + '<div class="kpi-grid" style="margin-top:12px">' +
      kpi('Fasyankes melapor', tot.lapor + ' / ' + fas.length, BULAN[bl] + ' ' + th, tot.lapor < fas.length ? 'waspada' : '') +
      kpi('Hasil uji memenuhi', pUji == null ? '–' : pUji + '%', (tot.ok + tot.tdk) + ' parameter diperiksa', pUji != null && pUji < 100 ? 'waspada' : '') +
      kpi('Limbah B3 wilayah', angka(tot.kg, tot.kg >= 100 ? 0 : 1) + ' kg', 'total semua fasyankes') +
      kpi('Temuan terbuka', String(tot.buka), 'belum ditindaklanjuti', tot.buka ? 'waspada' : '') + '</div>';

    var maks = Math.max.apply(null, bulanKg.concat([1]));
    h += '<section class="panel"><div class="panel-h"><h3>Limbah B3 wilayah, 6 bulan terakhir</h3><span class="muted">kg</span></div><div class="dk-grafik">' +
      bulanKg.map(function (v, k) {
        var d = new Date(th, bl - 5 + k, 1);
        return '<div><span class="nil">' + angka(v, v >= 100 ? 0 : 1) + '</span><div class="btg' + (k === 5 ? ' kini' : '') + '" style="height:' + Math.max(3, Math.round(v / maks * 90)) + 'px"></div>' + BULAN[d.getMonth()].slice(0, 3) + '</div>';
      }).join('') + '</div></section>';

    function status(p, pUjiF, pIpal) {
      if (!p.lapor) return 'belum';
      if ((pUjiF != null && pUjiF < 80) || p.buka >= 5 || (pIpal != null && pIpal < 60)) return 'perhatian';
      return 'baik';
    }
    function bar(l, v, teks, nada) {
      return '<div><div class="dk-m-l"><span>' + l + '</span><b>' + teks + '</b></div><div class="dk-bar' + (nada ? ' ' + nada : '') + '"><div style="width:' + (v || 0) + '%"></div></div></div>';
    }
    var urut = fas.slice().sort(function (a, b) { return (per[a.id].lapor - per[b.id].lapor) || (per[b.id].buka - per[a.id].buka); });
    h += '<section class="panel"><div class="panel-h"><h3>Per fasyankes</h3><span class="muted">yang perlu perhatian di atas</span></div>' +
      urut.map(function (x) {
        var p = per[x.id], n = p.ok + p.tdk, hariIpal = Object.keys(p.ipal).length;
        var pIpal = p.adaIpal ? Math.min(100, Math.round(hariIpal / hariHitung * 100)) : null;
        var pUjiF = n ? Math.round(p.ok / n * 100) : null;
        var st = status(p, pUjiF, pIpal);
        var LB = { belum: '○ Belum melapor', perhatian: '! Perlu perhatian', baik: '✓ Baik' };
        return '<div class="dk-kartu ' + st + '"><div class="dk-kartu-h"><b>' + esc(x.nama) + '</b><span class="dk-lencana">' + LB[st] + '</span></div>' +
          '<div class="dk-metrik">' +
          bar('Pencatatan IPAL', pIpal, pIpal == null ? 'tidak ada IPAL' : hariIpal + '/' + hariHitung + ' hari', pIpal != null && pIpal < 60 ? 'merah' : (pIpal != null && pIpal < 85 ? 'kuning' : '')) +
          bar('Hasil uji memenuhi', pUjiF, pUjiF == null ? 'belum ada' : pUjiF + '% (' + p.tdk + ' tidak)', pUjiF != null && pUjiF < 60 ? 'merah' : (pUjiF != null && pUjiF < 80 ? 'kuning' : '')) +
          bar('Inspeksi memenuhi', p.insp ? Math.round((p.insp - p.inspTdk) / p.insp * 100) : 0, p.insp ? (p.insp - p.inspTdk) + '/' + p.insp : 'belum ada', p.inspTdk ? 'kuning' : '') +
          '</div><div class="dk-angka"><div>Limbah B3<b>' + angka(p.kg) + ' kg</b></div><div>Insiden K3<b>' + p.k3 + '</b></div><div>Temuan terbuka<b' + (p.buka ? ' class="merah"' : '') + '>' + p.buka + '</b></div></div>' +
          '<button type="button" class="chip noprint" style="margin-top:12px" data-lap="' + x.id + '">Lihat laporan bulanan</button> <button type="button" class="chip noprint" style="margin-top:12px" data-insp="' + x.id + '">Lihat inspeksi</button></div>';
      }).join('') + '<p class="muted" style="margin:8px 0 0;font-size:12px">Penanda cepat: "Perlu perhatian" bila hasil uji memenuhi di bawah 80%, pencatatan IPAL di bawah 60% hari, atau temuan terbuka 5 atau lebih.</p></section>' +
      '<button type="button" class="noprint" id="dk-insp" style="margin-bottom:8px">Semua inspeksi wilayah (saring kecamatan / desa)</button>' +
      '<button type="button" class="noprint" id="dk-cetak">Cetak rekap wilayah</button>';
    el.innerHTML = h;

    $('dk-buka').onclick = function () { window._dkBl = Number($('dk-bl').value); window._dkTh = Number($('dk-th').value); App.tabs.dinkes(el); };
    $('dk-cetak').onclick = function () { window.print(); };
    var namaFas = {}; fas.forEach(function (x) { namaFas[x.id] = x.nama; });
    function bukaInsp(daftarId, judul) {
      INSPEKSI.daftar(el, { ids: daftarId, nama: namaFas, bulan: bl, tahun: th, judul: judul });
      App.kembali('Rekap wilayah', function () { App.tabs.dinkes(el); });
      window.scrollTo(0, 0);
    }
    $('dk-insp').onclick = function () { bukaInsp(ids, (w.data || {}).nama || 'Wilayah'); };
    el.querySelectorAll('[data-insp]').forEach(function (b) { b.onclick = function () { bukaInsp([this.dataset.insp], namaFas[this.dataset.insp]); }; });
    el.querySelectorAll('[data-lap]').forEach(function (b) {
      b.onclick = function () {
        App.laporan.terpadu(el, this.dataset.lap, bl, th);
        App.kembali('Rekap wilayah', function () { App.tabs.dinkes(el); });
        window.scrollTo(0, 0);
      };
    });
  };

  var asli = App.tabs.dasbor;
  App.tabs.dasbor = function (el) {
    if (App.profil && App.profil.peran === 'dinkes') return App.tabs.dinkes(el);
    return asli.apply(this, arguments);
  };
})();
