// Status laporan "sudah dikirim ke Dinkes" dan catatan pembinaan dari Dinkes.
(function () {
  var BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var siapCache = {};
  function siap(t) {
    if (!siapCache[t]) siapCache[t] = App.db.from(t).select('id').limit(1).then(function (r) { return !r.error; }, function () { return false; });
    return siapCache[t];
  }
  function waktu(s) { return s ? new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''; }
  function periode(th, bl) { return th + '-' + String(bl + 1).padStart(2, '0'); }
  function peran() { return (App.profil && App.profil.peran) || ''; }
  var BOLEH_KIRIM = ['admin_fasyankes', 'petugas_kesling'];
  var BOLEH_TANGGAP = ['admin_fasyankes', 'petugas_kesling', 'pimpinan'];

  // ----- Status kirim laporan bulanan -----
  async function kirim(wadah, fid, th, bl) {
    if (!wadah || !(await siap('laporan_kirim'))) return;
    var p = periode(th, bl);
    var r = await App.db.from('laporan_kirim').select('*').eq('fasyankes_id', fid).eq('periode', p).maybeSingle();
    var x = r.data;
    var dinkes = peran() === 'dinkes';
    var h = x
      ? '<div class="kirim-status ok"><b>✓ Sudah dikirim ke Dinas Kesehatan</b><br><span>' + esc(waktu(x.dibuat)) + (x.petugas_nama ? ' oleh ' + esc(x.petugas_nama) : '') + '</span>' +
        (x.catatan ? '<br><span>Catatan: ' + esc(x.catatan) + '</span>' : '') +
        (!dinkes && peran() === 'admin_fasyankes' ? '<br><button type="button" class="chip" id="kr-batal">Batalkan status kirim (untuk diperbaiki)</button>' : '') + '</div>'
      : '<div class="kirim-status"><b>○ Belum ditandai dikirim</b> · ' + BULAN[bl] + ' ' + th +
        (dinkes ? '<br><span>Fasyankes belum menandai laporan bulan ini sebagai final.</span>'
          : (BOLEH_KIRIM.indexOf(peran()) > -1 ? '<br><span>Periksa isi laporan di bawah. Bila sudah lengkap, tandai sebagai dikirim supaya Dinas Kesehatan tahu laporan ini final.</span>' +
            '<label>Catatan untuk Dinkes (opsional)</label><input id="kr-cat" maxlength="1000" placeholder="mis. hasil lab IPAL menyusul">' +
            '<button type="button" id="kr-kirim" style="margin-top:8px">Tandai sudah dikirim ke Dinkes</button>' : '')) + '<div class="pesan" id="kr-pesan"></div></div>';
    wadah.innerHTML = h;
    if ($('kr-kirim')) $('kr-kirim').onclick = async function () {
      this.disabled = true;
      var q = await App.db.from('laporan_kirim').insert({ periode: p, catatan: $('kr-cat').value.trim() || null });
      if (q.error) { this.disabled = false; $('kr-pesan').textContent = 'Gagal: ' + (q.error.message || 'coba lagi'); return; }
      kirim(wadah, fid, th, bl);
    };
    if ($('kr-batal')) $('kr-batal').onclick = async function () {
      var q = await App.db.from('laporan_kirim').delete().eq('id', x.id);
      if (q.error) { $('kr-pesan') && ($('kr-pesan').textContent = 'Gagal: ' + q.error.message); return; }
      kirim(wadah, fid, th, bl);
    };
  }

  // Peta status kirim untuk banyak fasyankes (tampilan Dinkes)
  async function statusKirim(ids, th, bl) {
    if (!ids.length || !(await siap('laporan_kirim'))) return null;
    var r = await App.db.from('laporan_kirim').select('fasyankes_id, dibuat').in('fasyankes_id', ids).eq('periode', periode(th, bl));
    var o = {};
    (r.data || []).forEach(function (x) { o[x.fasyankes_id] = x.dibuat; });
    return o;
  }

  // ----- Catatan pembinaan -----
  function kartuBina(x, bisaTanggap) {
    return '<div class="bina-item" data-bina="' + x.id + '"><div class="bina-h"><b>' + esc(x.penulis_nama || 'Dinas Kesehatan') + '</b><span class="muted">' + esc(waktu(x.dibuat)) + '</span></div>' +
      (x.judul ? '<div class="muted" style="font-size:12px">' + esc(x.judul) + '</div>' : '') +
      '<div>' + esc(x.isi) + '</div>' +
      (x.tanggapan ? '<div class="bina-tanggap"><b>Tanggapan fasyankes</b> <span class="muted">' + esc(waktu(x.ditanggapi)) + '</span><br>' + esc(x.tanggapan) + '</div>'
        : (x.dibaca ? '<div class="muted" style="font-size:12px">Sudah dibaca ' + esc(waktu(x.dibaca)) + '</div>' : '<div class="lewat" style="font-size:12px">Belum dibaca</div>')) +
      (bisaTanggap && !x.tanggapan ? '<div class="noprint"><textarea rows="2" maxlength="2000" placeholder="Tanggapan (opsional), mis. sudah diperbaiki tanggal ..." data-tg="' + x.id + '"></textarea>' +
        '<button type="button" class="chip" data-kirimtg="' + x.id + '">' + (x.dibaca ? 'Kirim tanggapan' : 'Tandai dibaca / kirim tanggapan') + '</button></div>' : '') +
      (peran() === 'dinkes' && x.penulis_id === (App.profil && App.profil.id) && !x.tanggapan ? '<button type="button" class="chip noprint" data-tarik="' + x.id + '">Tarik catatan</button>' : '') +
      '</div>';
  }
  function pasangAksi(wadah, ulang) {
    wadah.querySelectorAll('[data-kirimtg]').forEach(function (b) {
      b.onclick = async function () {
        var id = b.dataset.kirimtg, ta = wadah.querySelector('[data-tg="' + id + '"]');
        b.disabled = true;
        var r = await App.db.rpc('tanggapi_pembinaan', { p_id: id, p_tanggapan: ta ? ta.value : null });
        if (r.error) { b.disabled = false; b.textContent = 'Gagal, coba lagi'; return; }
        ulang();
      };
    });
    wadah.querySelectorAll('[data-tarik]').forEach(function (b) {
      b.onclick = async function () { b.disabled = true; await App.db.from('pembinaan').delete().eq('id', b.dataset.tarik); ulang(); };
    });
  }

  // opsi: { fid, tabel, data_id, periode, judul }
  async function panel(wadah, o) {
    if (!wadah || !(await siap('pembinaan'))) return;
    var q = App.db.from('pembinaan').select('*').eq('fasyankes_id', o.fid).eq('tabel', o.tabel);
    if (o.data_id) q = q.eq('data_id', o.data_id);
    if (o.periode) q = q.eq('periode', o.periode);
    var r = await q.order('dibuat', { ascending: true });
    var daftar = r.data || [];
    var dinkes = peran() === 'dinkes';
    var bisaTanggap = !dinkes && BOLEH_TANGGAP.indexOf(peran()) > -1;
    if (!daftar.length && !dinkes) { wadah.innerHTML = ''; return; }
    wadah.innerHTML = '<div class="bina"><h3 style="margin-top:0">Catatan pembinaan Dinas Kesehatan</h3>' +
      (daftar.length ? daftar.map(function (x) { return kartuBina(x, bisaTanggap); }).join('') : '<p class="muted">Belum ada catatan.</p>') +
      (dinkes ? '<div class="noprint"><label>Tulis catatan pembinaan untuk fasyankes</label><textarea id="bn-isi" rows="3" maxlength="2000" placeholder="mis. Mohon sarana cuci tangan dilengkapi sabun dan diinspeksi ulang."></textarea>' +
        '<button type="button" id="bn-kirim">Kirim catatan</button><div class="pesan" id="bn-pesan"></div>' +
        '<p class="muted" style="font-size:12px">Catatan terlihat oleh admin, petugas kesling, dan pimpinan fasyankes. Data fasyankes tetap tidak bisa diubah dari akun Dinkes.</p></div>' : '') + '</div>';
    function ulang() { panel(wadah, o); }
    pasangAksi(wadah, ulang);
    if ($('bn-kirim')) $('bn-kirim').onclick = async function () {
      var isi = $('bn-isi').value.trim();
      if (!isi) { $('bn-pesan').textContent = 'Tulis isi catatan dulu.'; return; }
      this.disabled = true;
      var ins = await App.db.from('pembinaan').insert({ fasyankes_id: o.fid, tabel: o.tabel, data_id: o.data_id || null, periode: o.periode || null, judul: o.judul || null, isi: isi });
      if (ins.error) { this.disabled = false; $('bn-pesan').textContent = 'Gagal: ' + (ins.error.message || 'coba lagi'); return; }
      ulang();
    };
  }

  // Panel di Dasbor fasyankes: catatan yang belum ditanggapi
  async function dasbor(wadah) {
    if (!wadah || peran() === 'dinkes' || BOLEH_TANGGAP.indexOf(peran()) < 0 || !(await siap('pembinaan'))) return;
    var r = await App.db.from('pembinaan').select('*').is('tanggapan', null).order('dibuat', { ascending: false }).limit(20);
    var daftar = r.data || [];
    if (!daftar.length) { wadah.innerHTML = ''; return; }
    var baru = daftar.filter(function (x) { return !x.dibaca; }).length;
    wadah.innerHTML = '<section class="panel bina"><div class="panel-h"><h3>Catatan dari Dinas Kesehatan</h3><span class="' + (baru ? 'lewat' : 'muted') + '">' + (baru ? baru + ' belum dibaca' : daftar.length + ' belum ditanggapi') + '</span></div>' +
      daftar.map(function (x) { return kartuBina(x, true); }).join('') + '</section>';
    pasangAksi(wadah, function () { dasbor(wadah); });
  }

  window.BINA = { kirim: kirim, statusKirim: statusKirim, panel: panel, dasbor: dasbor, periode: periode };
})();
