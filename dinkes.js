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
    var judul = '<div class="dsb-h"><div class="muted">' + esc((w.data || {}).nama || 'Wilayah') + '</div><h2>Rekap kesehatan lingkungan fasyankes</h2></div>' +
      '<div class="noprint" style="display:flex;gap:8px;align-items:end;flex-wrap:wrap"><div><label>Bulan</label><select id="dk-bl">' +
      BULAN.map(function (b, i) { return '<option value="' + i + '"' + (i === bl ? ' selected' : '') + '>' + b + '</option>'; }).join('') +
      '</select></div><div><label>Tahun</label><input type="number" id="dk-th" value="' + th + '" style="width:110px"></div>' +
      '<button type="button" class="chip" id="dk-buka">Tampilkan</button></div>';
    if (!fas.length) {
      el.innerHTML = judul + '<div class="info">Belum ada fasyankes yang terhubung ke wilayah ini. Puskesmas otomatis terlihat setelah didaftarkan ke wilayah; klinik dan RS terlihat setelah admin mereka menyetujui berbagi data.</div>';
      return;
    }
    var ids = fas.map(function (x) { return x.id; });
    var dari = tglLokal(new Date(th, bl, 1)), sampai = tglLokal(new Date(th, bl + 1, 0));
    var hariBulan = new Date(th, bl + 1, 0).getDate();
    var hariHitung = (th === kini.getFullYear() && bl === kini.getMonth()) ? kini.getDate() : hariBulan;

    var r = await Promise.all([
      ambil('limbah_harian', 'fasyankes_id, berat_kg', ids, dari, sampai, false),
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
    r[0].forEach(function (x) { var p = per[x.fasyankes_id]; if (p) { p.kg += Number(x.berat_kg) || 0; p.lapor = true; } });
    r[1].forEach(function (x) { var p = per[x.fasyankes_id]; if (p) { p.ipal[x.tanggal] = 1; p.lapor = true; } });
    r[2].forEach(function (rows) { rows.forEach(function (x) { var p = per[x.fasyankes_id]; if (!p) return; p.lapor = true; if (x.status === 'memenuhi') p.ok++; else if (x.status === 'tidak_memenuhi') p.tdk++; }); });
    r[3].forEach(function (rows) { rows.forEach(function (x) { var p = per[x.fasyankes_id]; if (!p) return; p.lapor = true; p.insp++; if (x.status === 'tidak_memenuhi') p.inspTdk++; }); });
    r[4].forEach(function (x) { var p = per[x.fasyankes_id]; if (p && x.status === 'terbuka') p.buka++; });
    r[5].forEach(function (x) { var p = per[x.fasyankes_id]; if (p) { p.k3 += Number(x.jumlah) || 0; p.lapor = true; } });

    var tot = { kg: 0, ok: 0, tdk: 0, buka: 0, lapor: 0 };
    fas.forEach(function (x) { var p = per[x.id]; tot.kg += p.kg; tot.ok += p.ok; tot.tdk += p.tdk; tot.buka += p.buka; if (p.lapor) tot.lapor++; });
    var pUji = tot.ok + tot.tdk ? Math.round(tot.ok / (tot.ok + tot.tdk) * 100) : null;

    var h = judul + '<div class="kpi-grid" style="margin-top:12px">' +
      kpi('Fasyankes melapor', tot.lapor + ' / ' + fas.length, BULAN[bl] + ' ' + th, tot.lapor < fas.length ? 'waspada' : '') +
      kpi('Hasil uji memenuhi', pUji == null ? '–' : pUji + '%', (tot.ok + tot.tdk) + ' parameter diperiksa', pUji != null && pUji < 100 ? 'waspada' : '') +
      kpi('Limbah B3 wilayah', angka(tot.kg, 0) + ' kg', 'total semua fasyankes') +
      kpi('Temuan terbuka', String(tot.buka), 'belum ditindaklanjuti', tot.buka ? 'waspada' : '') + '</div>';

    var urut = fas.slice().sort(function (a, b) { return (per[a.id].lapor - per[b.id].lapor) || (per[b.id].buka - per[a.id].buka); });
    h += '<section class="panel"><div class="panel-h"><h3>Per fasyankes</h3><span class="muted">yang belum melapor di atas</span></div>' +
      urut.map(function (x) {
        var p = per[x.id], n = p.ok + p.tdk, hariIpal = Object.keys(p.ipal).length;
        var pIpal = p.adaIpal ? Math.min(100, Math.round(hariIpal / hariHitung * 100)) : null;
        return '<div class="baris" style="border-bottom:1px solid var(--garis);padding:10px 0">' +
          '<div style="display:flex;justify-content:space-between;gap:8px;align-items:baseline"><b>' + esc(x.nama) + '</b>' +
          (p.lapor ? '<span class="st ok">✓ melapor</span>' : '<span class="st belum">○ belum melapor</span>') + '</div>' +
          '<div class="muted" style="font-size:12.5px;margin-top:4px;line-height:1.6">' +
          'IPAL harian: ' + (pIpal == null ? 'tidak punya IPAL' : hariIpal + ' dari ' + hariHitung + ' hari (' + pIpal + '%)') +
          ' · Hasil uji: ' + (n ? Math.round(p.ok / n * 100) + '% memenuhi (' + p.tdk + ' tidak)' : 'belum ada') +
          ' · Inspeksi: ' + p.insp + (p.inspTdk ? ' (' + p.inspTdk + ' tidak memenuhi)' : '') +
          ' · Limbah B3: ' + angka(p.kg) + ' kg · Insiden K3: ' + p.k3 +
          ' · Temuan terbuka: ' + (p.buka ? '<span class="lewat">' + p.buka + '</span>' : '0') + '</div>' +
          '<button type="button" class="chip noprint" style="margin-top:6px" data-lap="' + x.id + '">Lihat laporan bulanan</button></div>';
      }).join('') + '</section>' +
      '<button type="button" class="noprint" id="dk-cetak">Cetak rekap wilayah</button>';
    el.innerHTML = h;

    $('dk-buka').onclick = function () { window._dkBl = Number($('dk-bl').value); window._dkTh = Number($('dk-th').value); App.tabs.dinkes(el); };
    $('dk-cetak').onclick = function () { window.print(); };
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
