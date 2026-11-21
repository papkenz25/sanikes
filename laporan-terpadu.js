(function () {
  App.laporan = App.laporan || {};
  var NAMA_KAT = { air: 'Air', ipal: 'IPAL', vektor: 'Vektor', udara: 'Udara ruangan', sanitasi: 'Sanitasi bangunan', tpm: 'Pangan', k3: 'K3', merkuri: 'Alkes merkuri', ttu: 'TFU / TTU', rs: 'Pengawasan fasyankes' };
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

  function angka(n, d) { return Number(n || 0).toLocaleString('id-ID', { maximumFractionDigits: d == null ? 2 : d }); }
  function aman(q) { return q.then(function (r) { return r.error ? { data: [] } : r; }, function () { return { data: [] }; }); }
  function baris(a, b) { return '<tr><td style="padding:4px 8px;border-bottom:1px solid #ddd">' + a + '</td><td style="padding:4px 8px;border-bottom:1px solid #ddd">' + b + '</td></tr>'; }
  function tabel(isi) { return '<table style="width:100%;border-collapse:collapse;font-size:13px">' + isi + '</table>'; }
  function hitungStatus(rows) {
    var t = 0;
    rows.forEach(function (x) { if (x.status === 'tidak_memenuhi') t++; });
    return t;
  }
  function rataSkor(rows) {
    var s = 0, n = 0;
    rows.forEach(function (x) { if (x.skor != null) { s += Number(x.skor); n++; } });
    return n ? s / n : null;
  }

  App.laporan.terpadu = async function (el, fidLuar, blAwal, thAwal) {
    var fid = fidLuar || App.profil.fasyankes_id;
    if (!fid) { el.innerHTML = '<div class="info">Laporan milik fasyankes. Gunakan akun fasyankes.</div>'; return; }
    var kini = new Date();
    el.innerHTML = '<div class="noprint"><label>Bulan</label><select id="lt-bln">' +
      BULAN.map(function (b, i) { return '<option value="' + i + '"' + (i === (blAwal != null ? blAwal : kini.getMonth()) ? ' selected' : '') + '>' + b + '</option>'; }).join('') +
      '</select><label>Tahun</label><input type="number" id="lt-th" value="' + (thAwal || kini.getFullYear()) + '">' +
      '<button type="button" id="lt-buka">Tampilkan laporan</button></div><div id="lt-isi"></div>';

    async function buka() {
      var bl = Number($('lt-bln').value), th = Number($('lt-th').value);
      var dari = tglLokal(new Date(th, bl, 1)), sampai = tglLokal(new Date(th, bl + 1, 0));
      var awalIso = new Date(th, bl, 1).toISOString(), akhirIso = new Date(th, bl + 1, 1).toISOString();
      $('lt-isi').innerHTML = '<p class="muted">Menyusun laporan...</p>';
      function rentang(t, kol) { return App.db.from(t).select('*').eq('fasyankes_id', fid).gte(kol || 'tanggal', dari).lte(kol || 'tanggal', sampai); }
      function bersih(t, kol) {
        return rentang(t, kol).is('dihapus', null).then(function (r) { return r.error ? rentang(t, kol) : r; });
      }

      var r = await Promise.all([
        aman(rentang('limbah_harian')),
        aman(rentang('limbah_angkut')),
        aman(bersih('air_uji')),
        aman(bersih('ipal_harian')),
        aman(bersih('ipal_lab')),
        aman(bersih('vektor')),
        aman(bersih('udara_skudr')),
        aman(bersih('sanitasi_checklist')),
        aman(bersih('tpm_inspeksi')),
        aman(bersih('ikl_inspeksi')),
        aman(bersih('k3_insiden')),
        aman(App.db.from('temuan').select('kategori, status, dibuat, tanggal_selesai').eq('fasyankes_id', fid).gte('dibuat', awalIso).lt('dibuat', akhirIso)),
        aman(App.db.from('temuan').select('kategori').eq('fasyankes_id', fid).eq('status', 'terbuka')),
        aman(App.db.from('fasyankes').select('*').eq('id', fid).maybeSingle()),
        aman(App.db.from('master_limbah').select('kode, nama'))
      ]);
      var f = r[13].data || {};
      var namaKode = {};
      (r[14].data || []).forEach(function (x) { namaKode[x.kode] = x.nama; });
      var h = '';

      // Kop
      h += '<div style="text-align:center"><b>' + esc((f.nama || '').toUpperCase()) + '</b><br>' + esc(f.alamat || '') +
        (f.kabupaten_kota ? ', ' + esc(f.kabupaten_kota) : '') + (f.provinsi ? ', ' + esc(f.provinsi) : '') +
        '<hr><b>LAPORAN KESEHATAN LINGKUNGAN BULANAN</b><br>Periode: ' + BULAN[bl] + ' ' + th + '</div>';

      // 1. Limbah B3
      var per = {}, totM = 0, totA = 0;
      (r[0].data || []).forEach(function (x) { var o = per[x.kode_limbah] || (per[x.kode_limbah] = { m: 0, a: 0 }); o.m += Number(x.berat_kg); totM += Number(x.berat_kg); });
      (r[1].data || []).forEach(function (x) { var o = per[x.kode_limbah] || (per[x.kode_limbah] = { m: 0, a: 0 }); o.a += Number(x.berat_kg); totA += Number(x.berat_kg); });
      h += '<h3>1. Limbah B3</h3>' + tabel(
        '<tr><th style="text-align:left">Kode</th><th style="text-align:left">Timbulan / diangkut</th></tr>' +
        (Object.keys(per).sort().map(function (k) { return baris('<b>' + esc(k) + '</b> ' + esc(namaKode[k] || ''), fmtBerat(per[k].m) + ' / ' + fmtBerat(per[k].a)); }).join('') || baris('-', 'Tidak ada data')) +
        baris('<b>Total</b>', '<b>' + fmtBerat(totM) + ' / ' + fmtBerat(totA) + '</b>')) +
        '<p class="muted">Rincian sisa di TPS dan kinerja pengelolaan ada di Neraca limbah.</p>';

      // 2. Air dan IPAL
      var air = r[2].data || [], ih = r[3].data || [], il = r[4].data || [];
      var hariIpal = {}, phLuar = 0;
      ih.forEach(function (x) {
        hariIpal[x.tanggal] = 1;
        if (x.ph != null && ((x.ph_batas_min != null && x.ph < x.ph_batas_min) || (x.ph_batas_maks != null && x.ph > x.ph_batas_maks))) phLuar++;
      });
      var tdkAir = air.filter(function (x) { return x.status === 'tidak_memenuhi'; });
      var tdkIl = il.filter(function (x) { return x.status === 'tidak_memenuhi'; });
      h += '<h3>2. Air dan IPAL</h3>' + tabel(
        baris('Hasil uji kualitas air', air.length + ' parameter, ' + tdkAir.length + ' tidak memenuhi' + (tdkAir.length ? ' (' + esc(tdkAir.map(function (x) { return x.parameter + ' di ' + (x.titik_sampel || '-'); }).join('; ')) + ')' : '')) +
        baris('IPAL harian tercatat', Object.keys(hariIpal).length + ' dari ' + new Date(th, bl + 1, 0).getDate() + ' hari, pH outlet di luar baku mutu ' + phLuar + ' kali') +
        baris('Uji lab IPAL', il.length + ' parameter, ' + tdkIl.length + ' tidak memenuhi' + (tdkIl.length ? ' (' + esc(tdkIl.map(function (x) { return x.parameter; }).join(', ')) + ')' : '')));

      // 3. Vektor
      var vk = r[5].data || [], vj = {};
      vk.forEach(function (x) { var o = vj[x.jenis_vektor] || (vj[x.jenis_vektor] = { n: 0, t: 0, akhir: null }); o.n++; if (x.status === 'tidak_memenuhi') o.t++; if (!o.akhir || x.tanggal >= o.akhir.tanggal) o.akhir = x; });
      h += '<h3>3. Vektor dan binatang pembawa penyakit</h3>' + tabel(
        (Object.keys(vj).sort().map(function (k) { var o = vj[k]; return baris(esc(k), o.n + ' pengamatan, ' + o.t + ' tidak memenuhi; terakhir ' + angka(o.akhir.jumlah_temuan) + ' (' + esc(o.akhir.tanggal) + ')'); }).join('') || baris('-', 'Tidak ada pengamatan')));

      // 4. Udara ruangan
      var ud = r[6].data || [], up = {};
      ud.forEach(function (x) { var o = up[x.parameter] || (up[x.parameter] = { n: 0, t: 0 }); o.n++; if (x.status === 'tidak_memenuhi') o.t++; });
      h += '<h3>4. Udara ruangan</h3>' + tabel(
        (Object.keys(up).sort().map(function (k) { return baris(esc(k), up[k].n + ' pengukuran, ' + up[k].t + ' tidak memenuhi'); }).join('') || baris('-', 'Tidak ada pengukuran')));

      // 5. Inspeksi
      function ringkasCek(rows) {
        var rt = rataSkor(rows);
        return rows.length + ' inspeksi' + (rt != null ? ', rata-rata skor ' + angka(rt, 1) : '') + ', ' + hitungStatus(rows) + ' tidak memenuhi';
      }
      h += '<h3>5. Inspeksi kesehatan lingkungan</h3>' + tabel(
        baris('Sanitasi bangunan', ringkasCek(r[7].data || [])) +
        baris('Tempat pengelolaan pangan (TPP)', ringkasCek(r[8].data || [])) +
        baris('Tempat dan fasilitas umum (TFU)', ringkasCek(r[9].data || [])));

      // 6. K3
      var ins = r[10].data || [], ij = {};
      ins.forEach(function (x) { ij[x.jenis] = (ij[x.jenis] || 0) + (Number(x.jumlah) || 0); });
      h += '<h3>6. Keselamatan dan kesehatan kerja</h3>' + tabel(
        (Object.keys(ij).sort().map(function (k) { return baris(esc(k), ij[k] + ' orang terdampak'); }).join('') || baris('-', 'Tidak ada insiden tercatat')));

      // 7. Temuan
      var tb = r[11].data || [], tk = {};
      tb.forEach(function (x) { var o = tk[x.kategori] || (tk[x.kategori] = { baru: 0, selesai: 0 }); o.baru++; if (x.status === 'selesai') o.selesai++; });
      var buka = {};
      (r[12].data || []).forEach(function (x) { buka[x.kategori] = (buka[x.kategori] || 0) + 1; });
      var semua = {};
      Object.keys(tk).concat(Object.keys(buka)).forEach(function (k) { semua[k] = 1; });
      h += '<h3>7. Temuan dan tindak lanjut</h3>' + tabel(
        '<tr><th style="text-align:left">Bidang</th><th style="text-align:left">Temuan baru bulan ini / sudah selesai / masih terbuka (saat ini)</th></tr>' +
        (Object.keys(semua).sort().map(function (k) { var o = tk[k] || { baru: 0, selesai: 0 }; return baris(esc(NAMA_KAT[k] || k), o.baru + ' / ' + o.selesai + ' / ' + (buka[k] || 0)); }).join('') || baris('-', 'Tidak ada temuan')));

      // Tanda tangan
      h += '<div style="display:flex;justify-content:space-between;margin-top:32px"><div>Mengetahui,<br>Pimpinan<br><br><br><b>' + esc(f.nama_pimpinan || '....................') + '</b>' +
        (f.nip_nik_pimpinan ? '<br>NIP/NIK ' + esc(f.nip_nik_pimpinan) : '') + '</div>' +
        '<div>Penanggung jawab kesehatan lingkungan<br><br><br><br><b>' + esc(fidLuar ? '....................' : (App.profil.nama || '....................')) + '</b></div></div>' +
        '<button type="button" class="noprint" id="lt-cetak" style="margin-top:16px">Cetak / simpan PDF</button>';
      $('lt-isi').innerHTML = h;
      $('lt-cetak').onclick = function () { window.print(); };
    }
    $('lt-buka').onclick = buka;
    buka();
  };
})();
