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
  function lencana(s, b) {
    if (s === 'memenuhi') return '<span class="ok">✓ memenuhi</span>';
    if (s === 'tidak_memenuhi') {
      var teks = (b && b.min != null) ? 'di bawah baku mutu' : 'melebihi baku mutu';
      return '<span class="lewat">✗ ' + teks + '</span>';
    }
    return '';
  }
  function adalahAbj(j) { return String(j || '').indexOf('ABJ') > -1; }

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
      '<div id="vk-abj" style="display:none">' +
        '<label>Jumlah tempat yang diperiksa</label><input type="number" min="1" step="1" inputmode="numeric" id="vk-per" placeholder="mis. 50">' +
        '<label>Jumlah yang ditemukan jentik</label><input type="number" min="0" step="1" inputmode="numeric" id="vk-pos" placeholder="mis. 2">' +
        '<div id="vk-hit" class="muted"></div>' +
      '</div>' +
      '<label id="vk-lbl">Hasil pengamatan (angka)</label><input type="number" step="any" inputmode="decimal" id="vk-nilai"><div id="vk-st"></div>' +
      '<label>Tindakan / keterangan</label><input id="vk-tin" placeholder="mis. fogging, pasang perangkap, ganti umpan">' +
      '<button type="button" id="vk-simpan">Simpan</button><div class="pesan" id="vk-pesan"></div>' : '';
    el.innerHTML = '<h3 style="margin-top:0">Pengamatan vektor</h3>' + form + '<div id="tl-box"></div><h3>Catatan terbaru</h3><div id="vk-daftar"></div>';

    async function daftar() {
      var q = await App.db.from('vektor').select('*').order('tanggal', { ascending: false }).order('dibuat', { ascending: false }).limit(30);
      if (q.error) { $('vk-daftar').innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
      $('vk-daftar').innerHTML = q.data.length ? q.data.map(function (x) {
        var b = peta[x.jenis_vektor];
        var rinci = x.jumlah_diperiksa != null ? ' (' + (x.jumlah_diperiksa - (x.jumlah_positif || 0)) + ' dari ' + x.jumlah_diperiksa + ' bebas jentik)' : '';
        return '<div class="baris"><b>' + esc(x.jenis_vektor || '') + '</b>: ' + (x.jumlah_temuan != null ? esc(angka(x.jumlah_temuan)) : '-') + esc(rinci) + ' ' + lencana(status(b, x.jumlah_temuan), b) +
          '<br><span class="muted">' + esc(x.tanggal) + ' · ' + esc(x.lokasi || '') + (x.tindakan ? ' · ' + esc(x.tindakan) : '') + '</span></div>';
      }).join('') : '<p class="muted">Belum ada catatan.</p>';
    }

    if (tulis) {
      function hitung() {
        var pv = $('vk-per').value, sv = $('vk-pos').value;
        var per = Number(pv), pos = Number(sv);
        if (pv !== '' && sv !== '' && per > 0 && pos >= 0 && pos <= per) {
          var v = Math.floor((per - pos) * 1000 / per) / 10;
          $('vk-nilai').value = v;
          $('vk-hit').textContent = (per - pos) + ' dari ' + per + ' bebas jentik = ' + angka(v) + '%';
        } else {
          $('vk-nilai').value = '';
          $('vk-hit').textContent = (pv !== '' && sv !== '' && pos > per) ? 'Jumlah berjentik tidak boleh lebih dari yang diperiksa.' : '';
        }
      }
      function segar() {
        var j = $('vk-jenis').value, b = peta[j], abj = adalahAbj(j);
        $('vk-abj').style.display = abj ? 'block' : 'none';
        $('vk-nilai').readOnly = abj;
        $('vk-lbl').textContent = abj ? 'ABJ (%), dihitung otomatis' : 'Hasil pengamatan (angka)';
        if (abj) hitung();
        $('vk-batas').textContent = b ? 'Batas: ' + batasTeks(b) + ' (' + (b.satuan || '') + ')' : 'Tidak ada baku mutu untuk jenis ini.';
        $('vk-st').innerHTML = lencana(status(b, $('vk-nilai').value), b);
      }
      $('vk-jenis').addEventListener('change', segar);
      $('vk-nilai').addEventListener('input', segar);
      $('vk-per').addEventListener('input', segar);
      $('vk-pos').addEventListener('input', segar);
      $('vk-simpan').addEventListener('click', async function () {
        var tgl = $('vk-tgl').value, lok = $('vk-lok').value.trim(), nilai = $('vk-nilai').value;
        var pilih = $('vk-jenis').value, abj = adalahAbj(pilih);
        if (!tgl || !lok || nilai === '') {
          $('vk-pesan').textContent = abj ? 'Tanggal, lokasi, jumlah diperiksa, dan jumlah berjentik wajib diisi.' : 'Tanggal, lokasi, dan hasil wajib diisi.';
          return;
        }
        var jenis = pilih === '__lain' ? 'Lainnya' : pilih;
        var per = Number($('vk-per').value), pos = Number($('vk-pos').value);
        var s = await App.db.from('vektor').insert({
          tanggal: tgl, lokasi: lok, jenis_vektor: jenis, jumlah_temuan: Number(nilai),
          jumlah_diperiksa: abj ? per : null,
          jumlah_positif: abj ? pos : null,
          tindakan: $('vk-tin').value.trim() || null
        });
        if (s.error) { $('vk-pesan').textContent = 'Gagal menyimpan: ' + (s.error.message || 'coba lagi'); return; }
        var b = peta[pilih];
        var tidak = b && status(b, nilai) === 'tidak_memenuhi';
        var er = null;
        if (tidak && window.TL) {
          er = await TL.catat([{
            tanggal: tgl, kategori: 'vektor', sumber: 'vektor', lokasi: lok, parameter: jenis,
            hasil: abj ? angka(Number(nilai)) + '% (' + (per - pos) + ' dari ' + per + ' bebas jentik)' : angka(Number(nilai)),
            uraian: (b.min != null ? 'di bawah baku mutu' : 'melebihi baku mutu') + ' (batas ' + batasTeks(b) + ')'
          }]);
        }
        await App.tabs.vektor_catat(el);
        $('vk-pesan').textContent = tidak && window.TL ? (er ? 'Tersimpan, tetapi temuan gagal dicatat.' : 'Tersimpan. Tidak memenuhi baku mutu dan dicatat sebagai temuan, lihat saran di bawah.') : 'Tersimpan.';
      });
      segar();
    }
    daftar();
    if (window.TL && $('tl-box')) TL.panel($('tl-box'), 'vektor');
  };
})();
