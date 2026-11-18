(function () {
  var TULIS = ['admin_fasyankes', 'petugas_kesling', 'petugas_ruangan'];
  var KAT = {
    operasi: 'Ruang operasi', bersalin: 'Ruang bersalin', perawatan: 'Ruang perawatan / pemulihan', bayi: 'Perawatan bayi baru lahir',
    icu: 'ICU', jenazah: 'Jenazah / autopsi', penginderaan: 'Penginderaan medis', lab: 'Laboratorium', radiologi: 'Radiologi',
    sterilisasi: 'Sterilisasi', dapur: 'Dapur', igd: 'Gawat darurat', administrasi: 'Administrasi / kantor', luka_bakar: 'Ruang luka bakar', umum: 'Ruang umum lainnya'
  };
  var URUT = { Fisik: 1, Kimia: 2, Biologi: 3 };

  function angka(n) { return Number(n).toLocaleString('id-ID', { maximumFractionDigits: 2 }); }
  function hariIni() { return tglLokal(new Date()); }
  function bisaTulis() { return TULIS.indexOf(App.profil.peran) > -1; }
  function batasTeks(b) {
    if (b.min != null && b.maks != null) return angka(b.min) + ' sampai ' + angka(b.maks);
    if (b.maks != null) return '≤ ' + angka(b.maks);
    if (b.min != null) return '≥ ' + angka(b.min);
    return '';
  }
  function status(b, v) {
    if (v === '' || v == null || isNaN(Number(v)) || (b.min == null && b.maks == null)) return '';
    var n = Number(v);
    if (b.min != null && n < Number(b.min)) return 'tidak_memenuhi';
    if (b.maks != null && n > Number(b.maks)) return 'tidak_memenuhi';
    return 'memenuhi';
  }
  function lencana(s) { return s === 'memenuhi' ? '<span class="ok">✓ memenuhi</span>' : (s === 'tidak_memenuhi' ? '<span class="lewat">✗ tidak memenuhi</span>' : ''); }
  function uraian(b) { return 'tidak memenuhi baku mutu (batas ' + batasTeks(b) + ')'; }
  function kuman(p) { return /^Angka kuman/.test(p || ''); }
  function hitungKuman(k, l, m) {
    k = Number(k); l = Number(l); m = Number(m);
    if (isNaN(k) || isNaN(l) || isNaN(m) || k < 0 || l <= 0 || m <= 0) return { galat: 'koloni 0 atau lebih, laju alir dan lama pengambilan harus lebih dari 0.' };
    return { nilai: Math.round(k * 1000 / (l * m) * 100) / 100, ket: k + ' koloni, ' + angka(l) + ' L/menit, ' + angka(m) + ' menit' };
  }
  function ketRincian(r) { return r && r.koloni != null ? r.koloni + ' koloni, ' + angka(r.laju) + ' L/menit, ' + angka(r.menit) + ' menit' : ''; }
  function snap(b) { return { batas_min: b.min != null ? Number(b.min) : null, batas_maks: b.maks != null ? Number(b.maks) : null, dasar_aturan: b.dasar_aturan || null }; }

  async function ambilBaku(kat) {
    var r = await App.db.from('master_bakumutu').select('*').eq('modul', 'udara_' + kat).eq('aktif', true)
      .lte('berlaku_mulai', hariIni()).order('berlaku_mulai', { ascending: false });
    if (r.error) throw r.error;
    var ada = {}, out = [];
    r.data.forEach(function (x) { if (!ada[x.parameter]) { ada[x.parameter] = 1; out.push(x); } });
    out.sort(function (a, b) { return (URUT[a.kelompok] || 9) - (URUT[b.kelompok] || 9) || a.parameter.localeCompare(b.parameter); });
    return out;
  }

  function barisInput(b, i) {
    var info = 'batas ' + batasTeks(b) + ' ' + (b.satuan || '');
    var head = '<div class="baris"><b>' + esc(b.parameter) + '</b> <span class="muted">' + esc(info) + '</span>';
    if (kuman(b.parameter)) {
      return head +
        '<input type="number" step="any" inputmode="decimal" data-k="' + i + '" data-p="koloni" placeholder="jumlah koloni">' +
        '<input type="number" step="any" inputmode="decimal" data-k="' + i + '" data-p="laju" placeholder="laju alir alat (L/menit)">' +
        '<input type="number" step="any" inputmode="decimal" data-k="' + i + '" data-p="menit" placeholder="lama pengambilan (menit)">' +
        '<div id="us-' + i + '"></div></div>';
    }
    return head + '<input type="number" step="any" inputmode="decimal" data-k="' + i + '" data-p="nilai" placeholder="hasil"><div id="us-' + i + '"></div></div>';
  }
  function baca(box, b, i) {
    function v(p) { var e = box.querySelector('[data-k="' + i + '"][data-p="' + p + '"]'); return e ? e.value : ''; }
    if (kuman(b.parameter)) {
      var k = v('koloni'), l = v('laju'), m = v('menit');
      if (k === '' && l === '' && m === '') return null;
      if (k === '' || l === '' || m === '') return { galat: b.parameter + ': isi koloni, laju alir, dan lama pengambilan.' };
      var h = hitungKuman(k, l, m);
      if (h.galat) return { galat: b.parameter + ': ' + h.galat };
      return { v: h.nilai, ket: h.ket, rincian: { koloni: Number(k), laju: Number(l), menit: Number(m) } };
    }
    var x = v('nilai');
    if (x === '') return null;
    if (isNaN(Number(x))) return { galat: b.parameter + ': harus berupa angka.' };
    return { v: Number(x) };
  }

  async function catatTemuan(id, tgl, lok, b, hs) {
    if (!window.TL || !id) return null;
    var ada = await App.db.from('temuan').select('id').eq('sumber', 'udara_skudr').eq('sumber_id', id).eq('status', 'terbuka');
    if (ada.data && ada.data.length) return (await App.db.from('temuan').update({ hasil: hs, tanggal: tgl }).eq('id', ada.data[0].id)).error;
    return await TL.catat([{ tanggal: tgl, kategori: 'udara', sumber: 'udara_skudr', sumber_id: id, lokasi: lok, parameter: b.parameter, hasil: hs, uraian: uraian(b) }]);
  }

  App.tabs.udara_ukur = async function (el) {
    if (App.profil.peran === 'admin_papkenz') { el.innerHTML = '<div class="info">Data ini milik fasyankes. Gunakan akun fasyankes.</div>'; return; }
    var list = [], rows = [];
    var rg = await App.db.from('ruangan').select('id,nama,kategori_udara').eq('aktif', true).order('nama');
    var ruang = rg.data || [];
    var form = '';
    if (bisaTulis()) {
      form = ruang.length
        ? '<label>Tanggal</label><input type="date" id="ud-tgl" value="' + hariIni() + '">' +
          '<label>Ruangan</label><select id="ud-ruang">' + ruang.map(function (r) { return '<option value="' + r.id + '">' + esc(r.nama) + '</option>'; }).join('') + '</select>' +
          '<div id="ud-kat" class="muted"></div>' +
          '<label>Alat ukur (opsional)</label><input id="ud-alat" placeholder="mis. thermohygrometer, lux meter">' +
          '<p class="muted">Isi hanya parameter yang diukur. Angka kuman dihitung otomatis: koloni × 1000 ÷ (laju alir × menit).</p>' +
          '<div id="ud-param"></div><button type="button" id="ud-simpan">Simpan hasil</button><div class="pesan" id="ud-pesan"></div>'
        : '<div class="info waspada">Belum ada ruangan. Tambahkan di Data → Ruangan.</div>';
    }
    el.innerHTML = '<h3 style="margin-top:0">Pengukuran udara ruangan</h3>' + form + '<div id="tl-box"></div><h3>Hasil terbaru</h3><div id="ud-daftar"></div>';

    function ruangPilih() { var id = $('ud-ruang').value; return ruang.filter(function (r) { return r.id === id; })[0]; }

    async function muat() {
      var r = ruangPilih(), kat = (r && r.kategori_udara) || 'umum';
      $('ud-kat').textContent = 'Kategori ruang: ' + (KAT[kat] || kat) + (r && r.kategori_udara ? '' : ' (belum diatur, sementara dipakai kategori umum. Atur di Data → Ruangan.)');
      $('ud-param').innerHTML = '<p class="muted">Memuat...</p>';
      try { list = await ambilBaku(kat); } catch (e) { $('ud-param').innerHTML = '<div class="info waspada">Gagal memuat baku mutu.</div>'; return; }
      var kel = '';
      $('ud-param').innerHTML = list.map(function (b, i) {
        var h = b.kelompok !== kel ? '<h3>' + esc(b.kelompok || 'Lainnya') + '</h3>' : '';
        kel = b.kelompok;
        return h + barisInput(b, i);
      }).join('');
      $('ud-param').oninput = function (e) {
        var i = e.target.dataset ? e.target.dataset.k : undefined;
        if (i === undefined) return;
        var x = baca($('ud-param'), list[i], i), st = $('us-' + i);
        if (!x) { st.innerHTML = ''; return; }
        if (x.galat) { st.innerHTML = '<span class="muted">' + esc(x.galat) + '</span>'; return; }
        var rg2 = window.KL ? KL.cekRentang(list[i], x.v) : '';
        st.innerHTML = rg2 ? '<span class="lewat">' + esc(rg2) + '</span>' : lencana(status(list[i], x.v)) + (x.ket ? ' <span class="muted">' + esc(x.ket) + ' = ' + angka(x.v) + ' CFU/m³</span>' : '');
      };
    }

    async function daftar(pesan) {
      var q = App.db.from('udara_skudr').select('*');
      if (window.KL) q = KL.filter(q, 'udara_skudr');
      var res = await q.order('tanggal', { ascending: false }).order('dibuat', { ascending: false }).limit(50);
      if (res.error) { $('ud-daftar').innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
      rows = res.data;
      $('ud-daftar').innerHTML = (pesan ? '<div class="pesan">' + esc(pesan) + '</div>' : '') + (window.KL ? KL.saklar('udara_skudr') : '') +
        (rows.length ? rows.map(function (x) {
          var k = ketRincian(x.rincian);
          return '<div class="baris"' + (x.dihapus ? ' style="opacity:.6"' : '') + '><b>' + esc(x.parameter) + '</b>: ' +
            (x.hasil != null ? esc(angka(x.hasil)) + ' ' + esc(x.satuan || '') : '-') + (k ? ' <span class="muted">(' + esc(k) + ')</span>' : '') + ' ' + lencana(x.status) +
            '<br><span class="muted">' + esc(x.tanggal) + ' · ' + esc(x.lokasi || '') + (x.alat ? ' · ' + esc(x.alat) : '') + '</span>' +
            (window.KL ? KL.tombol(x) : '') + '</div>';
        }).join('') : '<p class="muted">Belum ada hasil.</p>');
    }

    if (window.KL) KL.pasang($('ud-daftar'), {
      tabel: 'udara_skudr',
      cari: function (id) { return rows.filter(function (r) { return r.id === id; })[0]; },
      bidang: function (x) {
        var f = [{ k: 'tanggal', l: 'Tanggal', tipe: 'tanggal', nilai: x.tanggal }];
        if (x.rincian && x.rincian.koloni != null) {
          f.push({ k: 'koloni', l: 'Jumlah koloni', tipe: 'angka', nilai: x.rincian.koloni });
          f.push({ k: 'laju', l: 'Laju alir (L/menit)', tipe: 'angka', nilai: x.rincian.laju });
          f.push({ k: 'menit', l: 'Lama pengambilan (menit)', tipe: 'angka', nilai: x.rincian.menit });
        } else {
          f.push({ k: 'hasil', l: x.parameter + ' (' + (x.satuan || '') + ')', tipe: 'angka', nilai: x.hasil });
        }
        f.push({ k: 'alat', l: 'Alat ukur', tipe: 'teks', nilai: x.alat });
        return f;
      },
      simpan: async function (x, is) {
        if (!is.tanggal) return { galat: 'Tanggal wajib diisi.' };
        var master = {};
        try { (await ambilBaku(x.kategori || 'umum')).forEach(function (b) { master[b.parameter] = b; }); } catch (e) {}
        var m = master[x.parameter] || {};
        var adaSnap = x.batas_min != null || x.batas_maks != null;
        var b = { parameter: x.parameter, satuan: x.satuan, min: adaSnap ? x.batas_min : m.min, maks: adaSnap ? x.batas_maks : m.maks, rentang_min: m.rentang_min, rentang_maks: m.rentang_maks };
        var ubah = { tanggal: is.tanggal, alat: (is.alat || '').trim() || null }, nilai, ket = '';
        if ('koloni' in is) {
          var h = hitungKuman(is.koloni, is.laju, is.menit);
          if (h.galat) return { galat: 'Angka kuman: ' + h.galat };
          nilai = h.nilai; ket = h.ket;
          ubah.rincian = { koloni: Number(is.koloni), laju: Number(is.laju), menit: Number(is.menit) };
        } else {
          if (is.hasil === '' || isNaN(Number(is.hasil))) return { galat: 'Hasil harus berupa angka.' };
          nilai = Number(is.hasil);
        }
        var rg2 = KL.cekRentang(b, nilai);
        if (rg2) return { galat: rg2 };
        var st = status(b, nilai);
        ubah.hasil = nilai; ubah.status = st || '-';
        ubah.batas_min = b.min != null ? Number(b.min) : null;
        ubah.batas_maks = b.maks != null ? Number(b.maks) : null;
        if (!adaSnap) ubah.dasar_aturan = m.dasar_aturan || null;
        return {
          ubah: ubah,
          setelah: async function () {
            if (st === 'tidak_memenuhi') await catatTemuan(x.id, is.tanggal, x.lokasi, b, angka(nilai) + ' ' + (x.satuan || '') + (ket ? ' (' + ket + ')' : ''));
          }
        };
      },
      selesai: function (m) { daftar(m); if (window.TL && $('tl-box')) TL.panel($('tl-box'), 'udara'); }
    });

    if (bisaTulis() && ruang.length) {
      $('ud-ruang').addEventListener('change', muat);
      $('ud-simpan').addEventListener('click', async function () {
        var tgl = $('ud-tgl').value, r = ruangPilih(), kat = (r && r.kategori_udara) || 'umum';
        if (!tgl || !r) { $('ud-pesan').textContent = 'Tanggal dan ruangan wajib diisi.'; return; }
        var isi = [], galat = [];
        list.forEach(function (b, i) {
          var x = baca($('ud-param'), b, i);
          if (!x) return;
          if (x.galat) { galat.push(x.galat); return; }
          var rg2 = window.KL ? KL.cekRentang(b, x.v) : '';
          if (rg2) { galat.push(rg2); return; }
          x.b = b; x.s = status(b, x.v); isi.push(x);
        });
        if (galat.length) { $('ud-pesan').textContent = galat.join(' '); return; }
        if (!isi.length) { $('ud-pesan').textContent = 'Isi minimal satu hasil.'; return; }
        $('ud-pesan').textContent = 'Menyimpan...';
        var alat = $('ud-alat').value.trim() || null;
        var data = isi.map(function (x) {
          return Object.assign({ tanggal: tgl, lokasi: r.nama, ruangan_id: r.id, kategori: kat, parameter: x.b.parameter, hasil: x.v, satuan: x.b.satuan, status: x.s || '-', alat: alat, rincian: x.rincian || null }, snap(x.b));
        });
        var res = await App.db.from('udara_skudr').insert(data).select('id,parameter');
        if (res.error) { $('ud-pesan').textContent = 'Gagal menyimpan: ' + (res.error.message || 'coba lagi'); return; }
        var idPar = {};
        (res.data || []).forEach(function (d) { idPar[d.parameter] = d.id; });
        var tidak = isi.filter(function (x) { return x.s === 'tidak_memenuhi'; });
        for (var i = 0; i < tidak.length; i++) {
          var x = tidak[i];
          await catatTemuan(idPar[x.b.parameter], tgl, r.nama, x.b, angka(x.v) + ' ' + (x.b.satuan || '') + (x.ket ? ' (' + x.ket + ')' : ''));
        }
        await App.tabs.udara_ukur(el);
        $('ud-pesan').textContent = 'Tersimpan ' + isi.length + ' hasil' + (tidak.length ? ', ' + tidak.length + ' tidak memenuhi dan dicatat sebagai temuan.' : '.');
      });
      muat();
    }
    daftar();
    if (window.TL && $('tl-box')) TL.panel($('tl-box'), 'udara');
  };
})();
