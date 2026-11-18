(function () {
  var TULIS = ['admin_fasyankes', 'petugas_kesling', 'petugas_ruangan'];
  var lihat = {};
  var G1 = 'width:auto;display:inline-block;padding:6px 14px;margin:6px 6px 0 0;font-size:14px';
  var G2 = G1 + ';background:#fff;color:#a33;border:1px solid #a33';

  function bisa() { return !!App.profil && TULIS.indexOf(App.profil.peran) > -1; }
  function waktu(s) {
    try { return new Date(s).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    catch (e) { return String(s).slice(0, 10); }
  }

  function tombol(row) {
    if (!bisa()) return '';
    if (row.dihapus) {
      return '<div data-kl-box="' + row.id + '"><span class="lewat">Dihapus ' + esc(waktu(row.dihapus)) + '</span><br>' +
        '<button type="button" style="' + G1 + '" data-kl="pulihkan" data-id="' + row.id + '">Pulihkan</button></div>';
    }
    return '<div data-kl-box="' + row.id + '">' +
      '<button type="button" style="' + G1 + '" data-kl="ubah" data-id="' + row.id + '">Ubah</button>' +
      '<button type="button" style="' + G2 + '" data-kl="hapus" data-id="' + row.id + '">Hapus</button></div>';
  }

  function saklar(tabel) {
    if (!bisa()) return '';
    return '<label style="display:flex;gap:8px;align-items:center;font-weight:400;margin:6px 0">' +
      '<input type="checkbox" style="width:auto;margin:0" data-kl-lihat="' + tabel + '"' + (lihat[tabel] ? ' checked' : '') + '> Tampilkan data yang dihapus</label>';
  }

  function filter(q, tabel) { return lihat[tabel] ? q : q.is('dihapus', null); }

  function cekRentang(b, v) {
    if (!b || v === '' || v == null || isNaN(Number(v))) return '';
    var n = Number(v);
    if (b.rentang_min != null && n < Number(b.rentang_min)) return b.parameter + ': nilai ' + v + ' tidak wajar (paling kecil ' + b.rentang_min + ').';
    if (b.rentang_maks != null && n > Number(b.rentang_maks)) return b.parameter + ': nilai ' + v + ' tidak wajar (paling besar ' + b.rentang_maks + ').';
    return '';
  }

  function inputHtml(f) {
    var v = f.nilai == null ? '' : f.nilai;
    if (f.tipe === 'pilih') {
      return '<label>' + esc(f.l) + '</label><select data-kf="' + f.k + '">' + f.opsi.map(function (o) {
        var val = Array.isArray(o) ? o[0] : o, tx = Array.isArray(o) ? o[1] : o;
        return '<option value="' + esc(val) + '"' + (String(val) === String(v) ? ' selected' : '') + '>' + esc(tx) + '</option>';
      }).join('') + '</select>';
    }
    var t = f.tipe === 'tanggal' ? 'date' : (f.tipe === 'angka' ? 'number' : 'text');
    return '<label>' + esc(f.l) + '</label><input type="' + t + '"' + (t === 'number' ? ' step="any" inputmode="decimal"' : '') +
      ' data-kf="' + f.k + '" value="' + esc(v) + '">';
  }

  // cfg: { tabel, cari(id) -> baris, bidang(baris) -> daftar isian, simpan(baris, isian) -> {ubah:{...}} atau {galat:'...'}, selesai(pesan) }
  function pasang(box, cfg) {
    if (!box) return;
    box.onchange = function (e) {
      var t = e.target.getAttribute && e.target.getAttribute('data-kl-lihat');
      if (!t) return;
      lihat[t] = e.target.checked;
      cfg.selesai();
    };
    box.onclick = async function (e) {
      var b = e.target.closest ? e.target.closest('[data-kl]') : null;
      if (!b) return;
      var aksi = b.getAttribute('data-kl'), id = b.getAttribute('data-id');
      var wadah = box.querySelector('[data-kl-box="' + id + '"]');
      var row = cfg.cari(id);
      if (!wadah || !row) return;
      function galat(err) {
        var p = wadah.querySelector('[data-kl-pesan]');
        var teks = 'Gagal: ' + (err && err.message ? err.message : 'coba lagi');
        if (p) p.textContent = teks; else wadah.insertAdjacentHTML('beforeend', '<div class="pesan">' + esc(teks) + '</div>');
      }

      if (aksi === 'batal') { cfg.selesai(); return; }

      if (aksi === 'hapus') {
        wadah.innerHTML = '<b>Yakin hapus data ini?</b><br>' +
          '<button type="button" style="' + G2 + '" data-kl="ya-hapus" data-id="' + id + '">Ya, hapus</button>' +
          '<button type="button" style="' + G1 + '" data-kl="batal" data-id="' + id + '">Batal</button>';
        return;
      }
      if (aksi === 'ya-hapus') {
        var u = await App.db.from(cfg.tabel).update({ dihapus: new Date().toISOString(), dihapus_oleh: App.profil.id || null }).eq('id', id);
        if (u.error) { galat(u.error); return; }
        cfg.selesai('Data dihapus. Bisa dipulihkan lewat "Tampilkan data yang dihapus".');
        return;
      }
      if (aksi === 'pulihkan') {
        var p = await App.db.from(cfg.tabel).update({ dihapus: null, dihapus_oleh: null }).eq('id', id);
        if (p.error) { galat(p.error); return; }
        cfg.selesai('Data dipulihkan.');
        return;
      }
      if (aksi === 'ubah') {
        wadah.innerHTML = '<div style="border:1px solid #ccc;border-radius:10px;padding:10px;margin-top:8px">' +
          cfg.bidang(row).map(inputHtml).join('') +
          '<button type="button" data-kl="simpan-ubah" data-id="' + id + '">Simpan perubahan</button>' +
          '<button type="button" style="' + G1 + '" data-kl="batal" data-id="' + id + '">Batal</button>' +
          '<div class="pesan" data-kl-pesan></div></div>';
        return;
      }
      if (aksi === 'simpan-ubah') {
        var isian = {};
        wadah.querySelectorAll('[data-kf]').forEach(function (i) { isian[i.getAttribute('data-kf')] = i.value; });
        var h = await cfg.simpan(row, isian);
        if (!h || h.galat) { wadah.querySelector('[data-kl-pesan]').textContent = h ? h.galat : 'Gagal menyimpan.'; return; }
        var s = await App.db.from(cfg.tabel).update(h.ubah).eq('id', id);
        if (s.error) { galat(s.error); return; }
        if (h.setelah) { try { await h.setelah(); } catch (er) {} }
        cfg.selesai('Perubahan disimpan.');
      }
    };
  }

  window.KL = { tombol: tombol, saklar: saklar, filter: filter, pasang: pasang, cekRentang: cekRentang, bisa: bisa };
})();
