(function () {
  var TULIS = ['admin_fasyankes', 'petugas_kesling', 'petugas_ruangan'];
  var QUAL = { 'Bau': ['Tidak berbau', 'Berbau'] };
  var KEL = ['Fisik', 'Kimia', 'Biologi'];
  var ICON_OK = '<span class="ok">✓ memenuhi</span>';
  var ICON_NO = '<span class="lewat">✗ tidak memenuhi</span>';

  function angka(n) { return Number(n).toLocaleString('id-ID', { maximumFractionDigits: 4 }); }
  function tipe(b) { return b.satuan === 'kualitatif' ? 'kual' : (b.satuan === 'teks' ? 'teks' : 'angka'); }
  function opsi(b) { return QUAL[String(b.parameter).replace(' (pengamatan)', '')] || ['Sesuai', 'Tidak sesuai']; }
  function kel(b) { return KEL.indexOf(b.kelompok) > -1 ? b.kelompok : 'Lainnya'; }
  function batasTeks(b) {
    if (b.min != null && b.maks != null) return angka(b.min) + ' sampai ' + angka(b.maks);
    if (b.maks != null) return '≤ ' + angka(b.maks);
    if (b.min != null) return '≥ ' + angka(b.min);
    return '';
  }
  function status(b, v) {
    if (v === '' || v == null) return '';
    var t = tipe(b);
    if (t === 'teks' || b.pengamatan) return '';
    if (t === 'kual') return v === 'ok' ? 'memenuhi' : (v === 'no' ? 'tidak_memenuhi' : '');
    if (isNaN(Number(v)) || (b.min == null && b.maks == null)) return '';
    var n = Number(v);
    if (b.min != null && n < Number(b.min)) return 'tidak_memenuhi';
    if (b.maks != null && n > Number(b.maks)) return 'tidak_memenuhi';
    return 'memenuhi';
  }
  function lencana(s) { return s === 'memenuhi' ? ICON_OK : (s === 'tidak_memenuhi' ? ICON_NO : ''); }
  function nilaiTeks(x) {
    if (x.hasil != null) return angka(x.hasil) + ' ' + (x.satuan && x.satuan !== '-' ? x.satuan : '');
    return x.catatan || '-';
  }

  async function ambilBaku(modul) {
    var r = await App.db.from('master_bakumutu').select('*').eq('modul', modul).eq('aktif', true)
      .lte('berlaku_mulai', tglLokal(new Date())).order('berlaku_mulai', { ascending: false });
    if (r.error) throw r.error;
    var ada = {}, out = [];
    r.data.forEach(function (x) { if (!ada[x.parameter]) { ada[x.parameter] = 1; out.push(x); } });
    return out;
  }

  function satuBaris(b, i) {
    var t = tipe(b), o, input;
    var info = b.pengamatan ? 'pengamatan, tanpa baku mutu' : ((b.min != null || b.maks != null) ? 'batas ' + batasTeks(b) + ' ' + (t === 'angka' ? (b.satuan || '') : '') : '');
    if (t === 'kual') {
      o = opsi(b);
      input = '<select data-i="' + i + '"><option value="">-</option><option value="ok">' + esc(o[0]) + '</option><option value="no">' + esc(o[1]) + '</option></select>';
    } else if (t === 'teks') {
      input = '<input data-i="' + i + '" placeholder="uraian">';
    } else {
      input = '<input type="number" step="any" inputmode="decimal" data-i="' + i + '" placeholder="hasil">';
    }
    return '<div class="baris"><b>' + esc(b.parameter) + '</b> <span class="muted">' + esc(info) + '</span>' + input + '<div id="st-' + i + '"></div></div>';
  }
  function baris(list) {
    var grup = {};
    list.forEach(function (b, i) { var k = kel(b); (grup[k] = grup[k] || []).push(i); });
    return KEL.concat(['Lainnya']).filter(function (k) { return grup[k]; }).map(function (k) {
      return '<details open><summary style="font-weight:700;margin:14px 0 4px;cursor:pointer">' + k + ' (' + grup[k].length + ')</summary>' +
        grup[k].map(function (i) { return satuBaris(list[i], i); }).join('') + '</details>';
    }).join('');
  }
  function live(box, list) {
    box.oninput = function (e) {
      var i = e.target.dataset.i;
      if (i === undefined) return;
      box.querySelector('#st-' + i).innerHTML = lencana(status(list[i], e.target.value));
    };
  }
  function kumpul(box, list) {
    var out = [];
    box.querySelectorAll('[data-i]').forEach(function (inp) {
      if (inp.value === '') return;
      var b = list[inp.dataset.i], t = tipe(b);
      var x = { b: b, v: null, q: null, s: status(b, inp.value) };
      if (t === 'angka') x.v = Number(inp.value);
      else if (t === 'kual') x.q = inp.value === 'ok' ? opsi(b)[0] : opsi(b)[1];
      else x.q = inp.value.trim();
      out.push(x);
    });
    return out;
  }
  function peringatan(el) {
    if (App.profil.peran === 'admin_papkenz') {
      el.innerHTML = '<div class="info">Data ini milik fasyankes. Gunakan akun fasyankes.</div>';
      return true;
    }
    return false;
  }
  function bisaTulis() { return TULIS.indexOf(App.profil.peran) > -1; }
  function gagal(id, err) { $(id).textContent = 'Gagal menyimpan: ' + (err && err.message ? err.message : 'coba lagi'); }
  function num(id) { var v = $(id).value; return v === '' ? null : Number(v); }

  // ===== UJI KUALITAS AIR =====
  App.tabs.air_uji = async function (el) {
    if (peringatan(el)) return;
    var list = [];
    var form = bisaTulis() ?
      '<label>Tanggal</label><input type="date" id="au-tgl" value="' + tglLokal(new Date()) + '">' +
      '<label>Titik sampel</label><input id="au-titik" list="au-ts" placeholder="mis. Keran dapur"><datalist id="au-ts"><option value="Sumber air"><option value="Tandon"><option value="Keran dapur"><option value="Keran toilet"><option value="Air minum"></datalist>' +
      '<label>Jenis air</label><select id="au-jenis"><option value="air_higiene_sanitasi">Air untuk higiene sanitasi</option><option value="air_minum">Air minum</option></select>' +
      '<label>Laboratorium / pemeriksa (opsional)</label><input id="au-lab">' +
      '<p class="muted">Isi hanya parameter yang diperiksa. Suhu diisi sebagai selisih: suhu air dikurangi suhu udara.</p><div id="au-param"></div>' +
      '<button type="button" id="au-simpan">Simpan hasil</button><div class="pesan" id="au-pesan"></div>' : '';
    el.innerHTML = '<h3 style="margin-top:0">Uji kualitas air</h3>' + form + '<h3>Hasil terbaru</h3><div id="au-daftar"></div>';

    async function daftar() {
      var r = await App.db.from('air_uji').select('*').order('tanggal', { ascending: false }).order('dibuat', { ascending: false }).limit(30);
      if (r.error) { $('au-daftar').innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
      $('au-daftar').innerHTML = r.data.length ? r.data.map(function (x) {
        return '<div class="baris"><b>' + esc(x.parameter) + '</b>: ' + esc(nilaiTeks(x)) + ' ' + lencana(x.status) +
          '<br><span class="muted">' + esc(x.tanggal) + ' · ' + esc(x.titik_sampel || '') + ' · ' + (x.jenis_uji === 'air_minum' ? 'air minum' : 'higiene sanitasi') + '</span></div>';
      }).join('') : '<p class="muted">Belum ada hasil.</p>';
    }
    if (bisaTulis()) {
      async function muat() {
        $('au-param').innerHTML = '<p class="muted">Memuat...</p>';
        try { list = await ambilBaku($('au-jenis').value); } catch (e) { $('au-param').innerHTML = '<div class="info waspada">Gagal memuat baku mutu.</div>'; return; }
        list.sort(function (a, b) { return a.parameter.localeCompare(b.parameter); });
        $('au-param').innerHTML = baris(list);
        live($('au-param'), list);
      }
      $('au-jenis').addEventListener('change', muat);
      $('au-simpan').addEventListener('click', async function () {
        var tgl = $('au-tgl').value, titik = $('au-titik').value.trim();
        var isi = kumpul($('au-param'), list);
        if (!tgl || !titik) { $('au-pesan').textContent = 'Tanggal dan titik sampel wajib diisi.'; return; }
        if (!isi.length) { $('au-pesan').textContent = 'Isi minimal satu hasil.'; return; }
        $('au-pesan').textContent = '';
        var rows = isi.map(function (x) {
          return { tanggal: tgl, titik_sampel: titik, jenis_uji: $('au-jenis').value, parameter: x.b.parameter, hasil: x.v, satuan: tipe(x.b) === 'angka' ? x.b.satuan : '-', status: x.s || '-', catatan: x.q, lab: $('au-lab').value.trim() || null };
        });
        var r = await App.db.from('air_uji').insert(rows);
        if (r.error) { gagal('au-pesan', r.error); return; }
        var tidak = isi.filter(function (x) { return x.s === 'tidak_memenuhi'; }).length;
        await App.tabs.air_uji(el);
        $('au-pesan').textContent = 'Tersimpan ' + isi.length + ' hasil' + (tidak ? ', ' + tidak + ' tidak memenuhi.' : '.');
      });
      muat();
    }
    daftar();
  };

  // ===== IPAL HARIAN =====
  App.tabs.ipal_harian = async function (el) {
    if (peringatan(el)) return;
    var KONDISI = '<option>Baik</option><option>Perlu perbaikan</option><option>Mati</option>';
    var phB = { min: 6, maks: 9 };
    try {
      var bm = await ambilBaku('ipal_media_air_3_50');
      bm.forEach(function (b) { if (b.parameter === 'pH' && b.min != null && b.maks != null) phB = b; });
    } catch (e) {}
    var form = bisaTulis() ?
      '<label>Tanggal</label><input type="date" id="ih-tgl" value="' + tglLokal(new Date()) + '">' +
      '<label>Debit air limbah (m³/hari)</label><input type="number" step="any" inputmode="decimal" id="ih-debit"><div id="ih-kelas" class="muted"></div>' +
      '<label>pH inlet (sebelum pengolahan)</label><input type="number" step="any" inputmode="decimal" id="ih-phin">' +
      '<label>pH outlet (setelah pengolahan)</label><input type="number" step="any" inputmode="decimal" id="ih-ph"><div id="ih-phst"></div>' +
      '<label>Suhu outlet (°C)</label><input type="number" step="any" inputmode="decimal" id="ih-suhu">' +
      '<label>Warna outlet</label><input id="ih-warna" placeholder="mis. jernih, keruh">' +
      '<label>Bau outlet</label><select id="ih-bau"><option value="">-</option><option>Tidak berbau</option><option>Berbau</option></select>' +
      '<label>Kondisi pompa</label><select id="ih-pompa">' + KONDISI + '</select>' +
      '<label>Kondisi blower</label><select id="ih-blower">' + KONDISI + '</select>' +
      '<label>Catatan (opsional)</label><input id="ih-cat">' +
      '<button type="button" id="ih-simpan">Simpan</button><div class="pesan" id="ih-pesan"></div>' : '';
    el.innerHTML = '<h3 style="margin-top:0">IPAL harian</h3>' + form + '<h3>Catatan terbaru</h3><div id="ih-daftar"></div>';

    async function daftar() {
      var r = await App.db.from('ipal_harian').select('*').order('tanggal', { ascending: false }).order('dibuat', { ascending: false }).limit(15);
      if (r.error) { $('ih-daftar').innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
      $('ih-daftar').innerHTML = r.data.length ? r.data.map(function (x) {
        var luar = x.ph != null && status(phB, x.ph) === 'tidak_memenuhi';
        return '<div class="baris"><b>' + esc(x.tanggal) + '</b> · debit ' + (x.debit != null ? esc(angka(x.debit)) + ' m³' : '-') +
          '<br>pH inlet ' + (x.ph_inlet != null ? esc(angka(x.ph_inlet)) : '-') + ' · pH outlet <span class="' + (luar ? 'lewat' : '') + '">' + (x.ph != null ? esc(angka(x.ph)) : '-') + '</span>' +
          '<br><span class="muted">Outlet: suhu ' + (x.suhu_outlet != null ? esc(angka(x.suhu_outlet)) + ' °C' : '-') + ' · warna ' + esc(x.warna_outlet || '-') + ' · bau ' + esc(x.bau_outlet || '-') +
          '<br>Pompa: ' + esc(x.kondisi_pompa || '-') + ' · Blower: ' + esc(x.kondisi_blower || '-') + (x.catatan ? ' · ' + esc(x.catatan) : '') + '</span></div>';
      }).join('') : '<p class="muted">Belum ada catatan.</p>';
    }
    if (bisaTulis()) {
      $('ih-debit').addEventListener('input', function () {
        var d = Number($('ih-debit').value);
        $('ih-kelas').textContent = !$('ih-debit').value ? '' : 'Kelas baku mutu: ' + (d > 50 ? 'di atas 50 m³/hari' : (d > 3 ? '3 sampai 50 m³/hari' : 'sampai 3 m³/hari'));
      });
      $('ih-ph').addEventListener('input', function () { $('ih-phst').innerHTML = lencana(status(phB, $('ih-ph').value)); });
      $('ih-simpan').addEventListener('click', async function () {
        var tgl = $('ih-tgl').value;
        if (!tgl) { $('ih-pesan').textContent = 'Tanggal wajib diisi.'; return; }
        if (num('ih-debit') === null && num('ih-ph') === null && num('ih-phin') === null) { $('ih-pesan').textContent = 'Isi debit atau pH.'; return; }
        var r = await App.db.from('ipal_harian').insert({
          tanggal: tgl, debit: num('ih-debit'), ph_inlet: num('ih-phin'), ph: num('ih-ph'), suhu_outlet: num('ih-suhu'),
          warna_outlet: $('ih-warna').value.trim() || null, bau_outlet: $('ih-bau').value || null,
          kondisi_pompa: $('ih-pompa').value, kondisi_blower: $('ih-blower').value, catatan: $('ih-cat').value.trim() || null
        });
        if (r.error) { gagal('ih-pesan', r.error); return; }
        await App.tabs.ipal_harian(el);
        $('ih-pesan').textContent = 'Tersimpan.';
      });
    }
    daftar();
  };

  // ===== UJI LAB IPAL =====
  var EKSTRA = [
    { parameter: 'Suhu (pengamatan)', satuan: '°C', min: null, maks: null, pengamatan: true, kelompok: 'Fisik' },
    { parameter: 'Warna (pengamatan)', satuan: 'teks', min: null, maks: null, pengamatan: true, kelompok: 'Fisik' },
    { parameter: 'Bau (pengamatan)', satuan: 'kualitatif', min: null, maks: null, pengamatan: true, kelompok: 'Fisik' }
  ];

  App.tabs.ipal_lab = async function (el) {
    if (peringatan(el)) return;
    var list = [];
    var kelasAwal = '3_50';
    try { kelasAwal = localStorage.getItem('ipal_kelas') || '3_50'; } catch (e) {}
    function opt(v, t) { return '<option value="' + v + '"' + (v === kelasAwal ? ' selected' : '') + '>' + t + '</option>'; }
    var form = bisaTulis() ?
      '<label>Tanggal</label><input type="date" id="il-tgl" value="' + tglLokal(new Date()) + '">' +
      '<label>Titik</label><select id="il-titik"><option value="Outlet">Outlet (setelah pengolahan)</option><option value="Inlet">Inlet (sebelum pengolahan)</option></select>' +
      '<label>Kelas baku mutu</label><select id="il-kelas">' + opt('gt50', 'Dibuang ke media air, di atas 50 m³/hari') + opt('3_50', 'Dibuang ke media air, 3 sampai 50 m³/hari') + opt('le3', 'Dibuang ke media air, sampai 3 m³/hari') + opt('drainase', 'Dibuang ke drainase / irigasi') + '</select>' +
      '<label>Laboratorium (opsional)</label><input id="il-lab">' +
      '<p class="muted">Isi hanya parameter yang diperiksa. Inlet tidak dibandingkan dengan baku mutu. Suhu, warna, dan bau dicatat sebagai pengamatan.</p><div id="il-param"></div>' +
      '<button type="button" id="il-simpan">Simpan hasil</button><div class="pesan" id="il-pesan"></div>' : '';
    el.innerHTML = '<h3 style="margin-top:0">Uji lab IPAL</h3>' + form + '<h3>Hasil terbaru</h3><div id="il-daftar"></div>';

    async function daftar() {
      var r = await App.db.from('ipal_lab').select('*').order('tanggal', { ascending: false }).order('dibuat', { ascending: false }).limit(30);
      if (r.error) { $('il-daftar').innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
      $('il-daftar').innerHTML = r.data.length ? r.data.map(function (x) {
        return '<div class="baris"><b>' + esc(x.parameter) + '</b>: ' + esc(nilaiTeks(x)) + ' ' + lencana(x.status) +
          '<br><span class="muted">' + esc(x.tanggal) + ' · ' + esc(x.titik || '') + '</span></div>';
      }).join('') : '<p class="muted">Belum ada hasil.</p>';
    }
    if (bisaTulis()) {
      async function muat() {
        var k = $('il-kelas').value;
        $('il-param').innerHTML = '<p class="muted">Memuat...</p>';
        try { list = await ambilBaku(k === 'drainase' ? 'ipal_drainase' : 'ipal_media_air_' + k); } catch (e) { $('il-param').innerHTML = '<div class="info waspada">Gagal memuat baku mutu.</div>'; return; }
        if ($('il-titik').value === 'Inlet') list = list.map(function (b) { return { parameter: b.parameter, satuan: b.satuan, min: null, maks: null, kelompok: b.kelompok }; });
        list = list.concat(EKSTRA);
        $('il-param').innerHTML = baris(list);
        live($('il-param'), list);
      }
      $('il-kelas').addEventListener('change', function () {
        try { localStorage.setItem('ipal_kelas', $('il-kelas').value); } catch (e) {}
        muat();
      });
      $('il-titik').addEventListener('change', muat);
      $('il-simpan').addEventListener('click', async function () {
        var tgl = $('il-tgl').value;
        var isi = kumpul($('il-param'), list);
        if (!tgl) { $('il-pesan').textContent = 'Tanggal wajib diisi.'; return; }
        if (!isi.length) { $('il-pesan').textContent = 'Isi minimal satu hasil.'; return; }
        $('il-pesan').textContent = '';
        var rows = isi.map(function (x) {
          return { tanggal: tgl, titik: $('il-titik').value, parameter: x.b.parameter, hasil: x.v, satuan: tipe(x.b) === 'angka' ? x.b.satuan : '-', status: x.s || '-', catatan: x.q, lab: $('il-lab').value.trim() || null };
        });
        var r = await App.db.from('ipal_lab').insert(rows);
        if (r.error) { gagal('il-pesan', r.error); return; }
        var tidak = isi.filter(function (x) { return x.s === 'tidak_memenuhi'; }).length;
        await App.tabs.ipal_lab(el);
        $('il-pesan').textContent = 'Tersimpan ' + isi.length + ' hasil' + (tidak ? ', ' + tidak + ' tidak memenuhi.' : '.');
      });
      muat();
    }
    daftar();
  };
})();
