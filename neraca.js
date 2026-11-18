(function () {
  App.laporan = App.laporan || {};
  var bagian = 'neraca';
  var periode = null;

  function awalBulan(d) { return tglLokal(new Date(d.getFullYear(), d.getMonth(), 1)); }
  function akhirBulan(d) { return tglLokal(new Date(d.getFullYear(), d.getMonth() + 1, 0)); }

  App.laporan.ekspor = App.laporan.ekspor || function (el) {
    el.innerHTML = '<div class="info">Ekspor ke SIKELIM dan SPEED: segera hadir.</div>';
  };

  App.tabs.laporan = function (el) {
    if (!periode) { var n = new Date(); periode = { dari: awalBulan(n), sampai: tglLokal(n) }; }
    var menu = [['terpadu', 'Laporan bulanan'], ['neraca', 'Neraca limbah'], ['ekspor', 'Ekspor']].map(function (x) {
      return '<button type="button" class="chip' + (x[0] === bagian ? ' aktif' : '') + '" data-b="' + x[0] + '">' + x[1] + '</button>';
    }).join('');
    el.innerHTML = '<h3 class="noprint" style="margin-top:0">Laporan</h3><div class="chips noprint" id="lp-menu">' + menu + '</div><div id="lp-isi"></div>';
    $('lp-menu').addEventListener('click', function (e) {
      var c = e.target.closest('.chip');
      if (c) { bagian = c.dataset.b; App.tabs.laporan(el); }
    });
    App.laporan[bagian]($('lp-isi'));
  };

  async function ambilSemua(dari, sampai) {
    var out = [];
    for (var p = 0; p < 20; p++) {
      var r = await App.db.from('limbah_harian')
        .select('id, kode_limbah, berat_kg, tanggal, tgl_keluar, batas_simpan')
        .lte('tanggal', sampai)
        .or('tgl_keluar.is.null,tgl_keluar.gte.' + dari)
        .order('tanggal').order('id')
        .range(p * 1000, p * 1000 + 999);
      if (r.error) throw r.error;
      out = out.concat(r.data);
      if (r.data.length < 1000) break;
    }
    return out;
  }

  function hitung(rows, dari, sampai) {
    var akhir = new Date(sampai + 'T23:59:59');
    var per = {};
    rows.forEach(function (r) {
      var b = Number(r.berat_kg);
      var o = per[r.kode_limbah] || (per[r.kode_limbah] = { awal: 0, masuk: 0, angkut: 0, sisa: 0, lewat: 0 });
      if (r.tanggal < dari) o.awal += b; else o.masuk += b;
      if (r.tgl_keluar && r.tgl_keluar >= dari && r.tgl_keluar <= sampai) o.angkut += b;
      if (!r.tgl_keluar || r.tgl_keluar > sampai) {
        o.sisa += b;
        if (r.batas_simpan && new Date(r.batas_simpan) < akhir) o.lewat += b;
      }
    });
    var t = { awal: 0, masuk: 0, angkut: 0, sisa: 0, lewat: 0 };
    Object.keys(per).forEach(function (k) {
      ['awal', 'masuk', 'angkut', 'sisa', 'lewat'].forEach(function (f) { t[f] += per[k][f]; });
    });
    var A = t.awal + t.masuk;
    var D = t.lewat;
    var C = 0;
    var kinerja = A > 0 ? ((A - (C + D)) / A) * 100 : null;
    return { per: per, t: t, A: A, B: A - D, C: C, D: D, kinerja: kinerja, dalamBatas: t.sisa - t.lewat };
  }

  function tampilHasil(box, h, nama, pimpinan, dari, sampai, namaKode) {
    var kin = h.kinerja === null ? '-' : h.kinerja.toFixed(1) + '%';
    var kelas = h.kinerja === null ? '' : (h.kinerja >= 99.95 ? 'ok' : 'lewat');
    var html = '<div class="baris"><b>NERACA LIMBAH B3</b><br>' + esc(nama) + '<br>Periode: ' + esc(dari) + ' s.d. ' + esc(sampai) + '</div>';
    html += '<div class="info"><b>I. Jenis awal limbah (A)</b><br>Sisa periode sebelumnya + dihasilkan: <b>' + fmtBerat(h.A) + '</b></div>';
    html += '<div class="info"><b>II. Perlakuan (B)</b><br>Disimpan (dalam batas waktu): ' + fmtBerat(h.dalamBatas) +
      '<br>Diserahkan ke pihak ketiga: ' + fmtBerat(h.t.angkut) + '<br>Total B: <b>' + fmtBerat(h.B) + '</b></div>';
    html += '<div class="info">Residu (C): ' + fmtBerat(h.C) + '<br>Belum terkelola (D, disimpan melebihi batas): <b>' + fmtBerat(h.D) +
      '</b><br>Total tersisa (C + D): ' + fmtBerat(h.C + h.D) + '</div>';
    html += '<div class="baris">Kinerja pengelolaan = [A - (C + D)] / A x 100%<br><span class="' + kelas + '" style="font-size:22px">' + kin + '</span></div>';
    html += '<h3>Rincian per kode</h3>';
    var kodes = Object.keys(h.per).sort();
    if (!kodes.length) html += '<p class="muted">Tidak ada data pada periode ini.</p>';
    kodes.forEach(function (k) {
      var o = h.per[k];
      var cocok = Math.abs(o.awal + o.masuk - o.angkut - o.sisa) < 0.0005;
      html += '<div class="baris"><b>' + esc(k) + '</b> · ' + esc(namaKode[k] || '') +
        '<br>Stok awal TPS: ' + fmtBerat(o.awal) + '<br>Limbah masuk: ' + fmtBerat(o.masuk) +
        '<br>Diangkut: ' + fmtBerat(o.angkut) + '<br>Sisa TPS: <b>' + fmtBerat(o.sisa) + '</b>' + (cocok ? ' <span class="ok">✓</span>' : ' <span class="lewat">tidak cocok</span>') +
        (o.lewat > 0 ? '<br><span class="lewat">Melebihi batas simpan: ' + fmtBerat(o.lewat) + '</span>' : '') + '</div>';
    });
    html += '<div class="baris" style="margin-top:24px">Penanggung jawab pengelolaan limbah B3:<br><br><br><b>' + esc(pimpinan || '....................') + '</b></div>';
    html += '<button type="button" class="noprint" id="n-cetak">Cetak / simpan PDF</button>';
    html += '<p class="muted noprint">Satuan mengikuti tombol di atas (kg atau ton). Batas simpan memakai data master yang sebagian kodenya belum terverifikasi.</p>';
    box.innerHTML = html;
    $('n-cetak').addEventListener('click', function () { window.print(); });
  }

  App.laporan.neraca = async function (el) {
    if (App.profil.peran === 'admin_papkenz') {
      el.innerHTML = '<div class="info">Neraca milik fasyankes. Gunakan akun fasyankes.</div>';
      return;
    }
    el.innerHTML =
      '<div class="noprint"><label>Dari</label><input type="date" id="n-dari" value="' + periode.dari + '">' +
      '<label>Sampai</label><input type="date" id="n-sampai" value="' + periode.sampai + '">' +
      '<div class="chips" style="margin-top:12px">' +
      '<button type="button" class="chip" data-pre="bulan">Bulan ini</button>' +
      '<button type="button" class="chip" data-pre="lalu">Bulan lalu</button>' +
      '<button type="button" class="chip" data-pre="tri">Triwulan ini</button></div>' +
      '<button type="button" id="n-hitung">Tampilkan neraca</button><div class="pesan" id="n-pesan"></div></div>' +
      '<div id="n-hasil"></div>';

    async function jalankan() {
      var dari = $('n-dari').value, sampai = $('n-sampai').value;
      if (!dari || !sampai || dari > sampai) { $('n-pesan').textContent = 'Periode tidak valid.'; return; }
      $('n-pesan').textContent = '';
      periode = { dari: dari, sampai: sampai };
      $('n-hasil').innerHTML = '<p class="muted">Menghitung...</p>';
      try {
        var rows = await ambilSemua(dari, sampai);
        var m = await App.db.from('master_limbah').select('kode, nama');
        var namaKode = {};
        (m.data || []).forEach(function (x) { namaKode[x.kode] = x.nama; });
        var f = await App.db.from('fasyankes').select('nama, nama_pimpinan').eq('id', App.profil.fasyankes_id).maybeSingle();
        var nama = f.data ? f.data.nama : (App.profil.fasyankes ? App.profil.fasyankes.nama : '');
        tampilHasil($('n-hasil'), hitung(rows, dari, sampai), nama, f.data ? f.data.nama_pimpinan : '', dari, sampai, namaKode);
      } catch (err) {
        $('n-hasil').innerHTML = '<div class="info waspada">Gagal menghitung neraca. Coba lagi.</div>';
      }
    }

    document.querySelectorAll('[data-pre]').forEach(function (b) {
      b.addEventListener('click', function () {
        var n = new Date();
        if (b.dataset.pre === 'bulan') { $('n-dari').value = awalBulan(n); $('n-sampai').value = tglLokal(n); }
        if (b.dataset.pre === 'lalu') {
          var l = new Date(n.getFullYear(), n.getMonth() - 1, 1);
          $('n-dari').value = awalBulan(l); $('n-sampai').value = akhirBulan(l);
        }
        if (b.dataset.pre === 'tri') {
          $('n-dari').value = tglLokal(new Date(n.getFullYear(), Math.floor(n.getMonth() / 3) * 3, 1));
          $('n-sampai').value = tglLokal(n);
        }
        jalankan();
      });
    });
    $('n-hitung').addEventListener('click', jalankan);
    jalankan();
  };
})();
