(function () {
  var TULIS = ['admin_fasyankes', 'petugas_kesling', 'petugas_ruangan'];

  function angka(n) { return Number(n).toLocaleString('id-ID', { maximumFractionDigits: 4 }); }
  function batasTeks(b) {
    if (b.min != null) return 'minimal ' + angka(b.min);
    if (b.maks != null) return 'kurang dari ' + angka(b.maks);
    return '';
  }
  function status(b, v) {
    if (!b || v === '' || v == null || isNaN(Number(v))) return '';
    var n = Number(v);
    if (b.min != null) return n >= Number(b.min) ? 'memenuhi' : 'tidak_memenuhi';
    if (b.maks != null) return Number(b.maks) === 0 ? (n <= 0 ? 'memenuhi' : 'tidak_memenuhi') : (n < Number(b.maks) ? 'memenuhi' : 'tidak_memenuhi');
    return '';
  }
  function lencana(s) { return s === 'memenuhi' ? '<span class="ok">✓ memenuhi</span>' : (s === 'tidak_memenuhi' ? '<span class="lewat">✗ melebihi baku mutu</span>' : ''); }

  App.tabs.vektor_catat = async function (el) {
    if (App.profil.peran === 'admin_papkenz') {
      el.innerHTML = '<div class="info">Data ini milik fasyankes. Gunakan akun fasyankes.</div>';
      return;
    }
    var tulis = TULIS.indexOf(App.profil.peran) > -1;
    var baku = [], peta = {};
    var r = await App.db.from('master_bakumutu').select('*').eq('modul', 'vektor').eq('aktif', true)
      .lte('berlaku_mulai', tglLokal(new Date())).order('berlaku_mulai', { ascending: false });
    (r.data || []).forEach(function (b) { if (!peta[b.parameter]) { peta[b.parameter] = b; baku.push(b); } });
    baku.sort(function (a, b) { return a.parameter.localeCompare(b.parameter); });
    var rg = await App.db.from('ruangan').select('nama');
    var ruang = (rg.data || []).map(function (x) { return '<option value="' + esc(x.nama) + '">'; }).join('');

    var form = tulis ?
      '<label>Tanggal</label><input type="date" id="vk-tgl" value="' + tglLokal(new Date()) + '">' +
      '<label>Lokasi</label><input id="vk-lok" list="vk-lokl" placeholder="mis. Dapur, halaman belakang"><datalist id="vk-lokl">' + ruang + '</datalist>' +
      '<label>Jenis pengamatan</label><select id="vk-jenis">' +
        baku.map(function (b) { return '<option>' + esc(b.parameter) + '</option>'; }).join('') + '<option value="__lain">Lainnya (tanpa baku mutu)</option></select>' +
      '<div id="vk-batas" class="muted"></div>' +
      '<label>Hasil pengamatan (angka)</label><input type="number" step="any" inputmode="decimal" id="vk-nilai"><div id="vk-st"></div>' +
      '<label>Tindakan / keterangan</label><input id="vk-tin" placeholder="mis. fogging, pasang perangkap, ganti umpan">' +
      '<button type="button" id="vk-simpan">Simpan</button><div class="pesan" id="vk-pesan"></div>' : '';
    el.innerHTML = '<h3 style="margin-top:0">Pengamatan vektor</h3>' + form + '<h3>Catatan terbaru</h3><div id="vk-daftar"></div>';

    async function daftar() {
      var q = await App.db.from('vektor').select('*').order('tanggal', { ascending: false }).order('dibuat', { ascending: false }).limit(30);
      if (q.error) { $('vk-daftar').innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
      $('vk-daftar').innerHTML = q.data.length ? q.data.map(function (x) {
        var b = peta[x.jenis_vektor];
        return '<div class="baris"><b>' + esc(x.jenis_vektor || '') + '</b>: ' + (x.jumlah_temuan != null ? esc(angka(x.jumlah_temuan)) : '-') + ' ' + lencana(status(b, x.jumlah_temuan)) +
          '<br><span class="muted">' + esc(x.tanggal) + ' · ' + esc(x.lokasi || '') + (x.tindakan ? ' · ' + esc(x.tindakan) : '') + '</span></div>';
      }).join('') : '<p class="muted">Belum ada catatan.</p>';
    }

    if (tulis) {
      function segar() {
        var j = $('vk-jenis').value, b = peta[j];
        $('vk-batas').textContent = b ? 'Batas: ' + batasTeks(b) + ' (' + (b.satuan || '') + ')' : 'Tidak ada baku mutu untuk jenis ini.';
        $('vk-st').innerHTML = lencana(status(b, $('vk-nilai').value));
      }
      $('vk-jenis').addEventListener('change', segar);
      $('vk-nilai').addEventListener('input', segar);
      $('vk-simpan').addEventListener('click', async function () {
        var tgl = $('vk-tgl').value, lok = $('vk-lok').value.trim(), nilai = $('vk-nilai').value;
        if (!tgl || !lok || nilai === '') { $('vk-pesan').textContent = 'Tanggal, lokasi, dan hasil wajib diisi.'; return; }
        var jenis = $('vk-jenis').value === '__lain' ? 'Lainnya' : $('vk-jenis').value;
        var s = await App.db.from('vektor').insert({ tanggal: tgl, lokasi: lok, jenis_vektor: jenis, jumlah_temuan: Number(nilai), tindakan: $('vk-tin').value.trim() || null });
        if (s.error) { $('vk-pesan').textContent = 'Gagal menyimpan: ' + (s.error.message || 'coba lagi'); return; }
        await App.tabs.vektor_catat(el);
        $('vk-pesan').textContent = 'Tersimpan.';
      });
      segar();
    }
    daftar();
  };
})();
