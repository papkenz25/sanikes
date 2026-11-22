// Antrean kirim saat sinyal lemah: catatan dan foto disimpan dulu di perangkat (IndexedDB),
// lalu dikirim otomatis begitu sinyal kembali. Hanya untuk formulir yang sudah terbuka saat sinyal hilang.
(function () {
  var TABEL = ['limbah_harian', 'ipal_harian', 'vektor', 'k3_insiden', 'sanitasi_checklist', 'tpm_inspeksi', 'ikl_inspeksi',
    'temuan', 'pengawasan', 'air_uji', 'ipal_lab', 'udara_skudr'];
  var NAMA = { limbah_harian: 'limbah harian', ipal_harian: 'IPAL harian', vektor: 'vektor', k3_insiden: 'insiden K3', sanitasi_checklist: 'inspeksi sanitasi',
    tpm_inspeksi: 'inspeksi TPP', ikl_inspeksi: 'inspeksi TFU/TTU', temuan: 'temuan', pengawasan: 'pengawasan', air_uji: 'uji air', ipal_lab: 'uji lab IPAL', udara_skudr: 'udara' };
  var dbLokal = null, fromAsli = null, unggahAsli = null, jalan = false, ringkas = { data: 0, foto: 0, gagal: [] }, bolehKeluar = false;

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  function uid() { return App.profil && App.profil.id; }
  function putus(r) {
    if (!navigator.onLine) return true;
    if (!r || !r.error) return false;
    return r.status === 0 || /fetch|network|load failed|timed? ?out|jaringan/i.test(String(r.error.message || r.error));
  }

  // ----- IndexedDB -----
  function buka() {
    if (dbLokal) return Promise.resolve(dbLokal);
    return new Promise(function (ok, no) {
      if (!window.indexedDB) return no(new Error('Penyimpanan perangkat tidak tersedia.'));
      var q = indexedDB.open('sanikes-antrean', 1);
      q.onupgradeneeded = function () { q.result.createObjectStore('item', { keyPath: 'k', autoIncrement: true }); };
      q.onsuccess = function () { dbLokal = q.result; ok(dbLokal); };
      q.onerror = function () { no(q.error); };
    });
  }
  function toko(mode) { return buka().then(function (d) { return d.transaction('item', mode).objectStore('item'); }); }
  function janji(req) { return new Promise(function (ok, no) { req.onsuccess = function () { ok(req.result); }; req.onerror = function () { no(req.error); }; }); }
  async function tambah(item) { var s = await toko('readwrite'); await janji(s.add(item)); await hitung(); }
  async function semua() { var s = await toko('readonly'); return janji(s.getAll()); }
  async function buang(k) { var s = await toko('readwrite'); await janji(s.delete(k)); }
  async function perbarui(item) { var s = await toko('readwrite'); await janji(s.put(item)); }

  async function hitung() {
    var a = [];
    try { a = await semua(); } catch (e) { a = []; }
    var u = uid();
    var milik = a.filter(function (x) { return x.uid === u; });
    ringkas = {
      data: milik.filter(function (x) { return x.jenis === 'data' && !x.galat; }).length,
      foto: milik.filter(function (x) { return x.jenis === 'foto' && !x.galat; }).length,
      gagal: milik.filter(function (x) { return x.galat; })
    };
    pita();
    return ringkas;
  }

  // ----- Pita pemberitahuan -----
  function pita() {
    var p = document.getElementById('antre-pita');
    var n = ringkas.data + ringkas.foto;
    if (!n && !ringkas.gagal.length) { if (p) p.hidden = true; return; }
    if (!p) {
      p = document.createElement('div');
      p.id = 'antre-pita'; p.className = 'antre-pita noprint';
      var isi = document.getElementById('isi');
      if (!isi) return;
      isi.parentNode.insertBefore(p, isi);
    }
    var bag = [];
    if (ringkas.data) bag.push(ringkas.data + ' catatan');
    if (ringkas.foto) bag.push(ringkas.foto + ' foto');
    p.hidden = false;
    p.innerHTML = (n ? '<b>' + bag.join(' dan ') + ' menunggu dikirim.</b> Tersimpan di perangkat ini dan terkirim otomatis saat sinyal kembali. ' +
      '<button type="button" class="chip" data-antre="kirim">' + (jalan ? 'Mengirim...' : 'Kirim sekarang') + '</button>' : '') +
      ringkas.gagal.map(function (x) {
        return '<div class="antre-gagal">Ditolak server (' + esc(NAMA[x.tabel] || x.tabel) + (x.jenis === 'foto' ? ', foto' : '') + '): ' + esc(x.galat) +
          ' <button type="button" class="chip" data-buang="' + x.k + '">Buang</button></div>';
      }).join('');
  }
  document.addEventListener('click', async function (e) {
    var t = e.target;
    if (t.dataset && t.dataset.antre === 'kirim') { sinkron(); return; }
    if (t.dataset && t.dataset.buang) { await buang(Number(t.dataset.buang)); hitung(); }
  });

  // ----- Kirim antrean -----
  async function sinkron() {
    if (jalan || !fromAsli || !uid() || !navigator.onLine) return;
    jalan = true; pita();
    try {
      var a = (await semua()).filter(function (x) { return x.uid === uid() && !x.galat; }).sort(function (p, q) { return p.k - q.k; });
      for (var i = 0; i < a.length; i++) {
        var x = a[i], r;
        if (x.jenis === 'data') {
          r = await fromAsli(x.tabel).insert(x.rows);
          if (r && r.error && (r.error.code === '23505' || /duplicate key/i.test(r.error.message || ''))) r = { error: null };   // sudah pernah masuk
        } else {
          var blob = new Blob([x.buf], { type: 'image/jpeg' });
          r = await unggahAsli(x.tabel, x.dataId, x.butir, { blob: blob, lat: x.lat, lng: x.lng, akurasi: x.akurasi, diambil: x.diambil, sumber: x.sumber });
          r = r.ok ? { error: null } : { error: { message: r.galat || 'Unggah gagal.' }, status: /fetch|network|load failed/i.test(r.galat || '') ? 0 : 400 };
        }
        if (!r.error) { await buang(x.k); continue; }
        if (putus(r)) break;                       // sinyal putus lagi: coba nanti
        x.galat = String(r.error.message || 'ditolak'); await perbarui(x);
      }
    } catch (e) { /* biarkan, dicoba lagi nanti */ }
    jalan = false;
    var sebelum = ringkas.data + ringkas.foto;
    await hitung();
    if (sebelum && !(ringkas.data + ringkas.foto) && window.App && App.tab && App.tabs[App.tab] && document.getElementById('isi') && !document.querySelector('#isi input:focus, #isi textarea:focus')) {
      // semua terkirim: segarkan layar yang sedang terbuka bila pengguna tidak sedang mengetik
      var info = document.getElementById('antre-pita');
      if (info) { info.hidden = false; info.innerHTML = '<b>Semua data yang tertunda sudah terkirim.</b>'; setTimeout(function () { info.hidden = true; }, 5000); }
    }
  }

  // ----- Pasang pada klien Supabase -----
  function pasang(db) {
    if (fromAsli) return;
    fromAsli = db.from.bind(db);
    db.from = function (t) {
      var b = fromAsli(t);
      if (TABEL.indexOf(t) < 0 || !b || !b.insert) return b;
      var ins = b.insert.bind(b);
      b.insert = function (val, opsi) {
        var rows = Array.isArray(val) ? val : [val];
        var fid = App.profil && App.profil.fasyankes_id;
        rows.forEach(function (r) {
          if (!r || typeof r !== 'object') return;
          if (!r.id) r.id = uuid();                 // id dibuat di perangkat supaya pengiriman ulang tidak dobel
          if (!r.fasyankes_id && fid) r.fasyankes_id = fid;
        });
        var q = ins(val, opsi);
        var thAsli = q.then.bind(q);
        q.then = function (ok, no) {
          var jalanQ = navigator.onLine
            ? thAsli(function (r) { return r; }, function (e) { return { error: { message: String(e && e.message || e) }, status: 0 }; })
            : Promise.resolve({ error: { message: 'offline' }, status: 0 });
          return jalanQ.then(async function (r) {
            if (!putus(r) || !uid()) return r;
            try {
              await tambah({ jenis: 'data', uid: uid(), tabel: t, rows: JSON.parse(JSON.stringify(rows)), dibuat: Date.now() });
            } catch (e) { return r; }                // perangkat tidak bisa menyimpan: kembalikan galat asli
            return { data: rows.map(function (x) { return Object.assign({}, x); }), error: null, status: 201, antre: true };
          }).then(ok, no);
        };
        return q;
      };
      return b;
    };
  }

  function pasangFoto() {
    if (!window.FOTO || unggahAsli) return;
    unggahAsli = FOTO.unggah;
    FOTO.unggah = async function (tabel, dataId, butir, f) {
      if (navigator.onLine) {
        var r = await unggahAsli(tabel, dataId, butir, f);
        if (r.ok || !/fetch|network|load failed|timed? ?out/i.test(r.galat || '')) return r;
      }
      if (!uid()) return { galat: 'offline' };
      try {
        await tambah({ jenis: 'foto', uid: uid(), tabel: tabel, dataId: dataId, butir: butir, buf: await f.blob.arrayBuffer(),
          lat: f.lat, lng: f.lng, akurasi: f.akurasi, diambil: f.diambil, sumber: f.sumber, dibuat: Date.now() });
      } catch (e) { return { galat: 'Foto tidak bisa disimpan di perangkat.' }; }
      return { ok: true, antre: true };
    };
  }

  // Tahan tombol Keluar bila masih ada data yang belum terkirim
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('#tombol-keluar, #pita-beranda');
    if (!b || bolehKeluar || !(ringkas.data + ringkas.foto)) { bolehKeluar = false; return; }
    e.stopImmediatePropagation(); e.preventDefault();
    var w = document.getElementById('antre-keluar');
    if (!w) { w = document.createElement('div'); w.id = 'antre-keluar'; w.className = 'info waspada'; b.insertAdjacentElement('afterend', w); }
    w.innerHTML = 'Masih ada ' + (ringkas.data + ringkas.foto) + ' data yang belum terkirim dari perangkat ini. Data itu tetap tersimpan di perangkat dan dikirim saat Anda masuk lagi dengan akun yang sama di perangkat ini. Sebaiknya cari sinyal lalu tekan Kirim sekarang.<br>' +
      '<button type="button" class="chip" data-antre="kirim">Kirim sekarang</button> <button type="button" class="chip" id="antre-tetap">Tetap keluar</button>';
    document.getElementById('antre-tetap').onclick = function () { bolehKeluar = true; w.remove(); b.click(); };
  }, true);

  window.addEventListener('online', function () { setTimeout(sinkron, 1500); });
  document.addEventListener('DOMContentLoaded', function () {
    pasangFoto();
    setInterval(function () { if (uid()) { hitung().then(function (r) { if (r.data + r.foto) sinkron(); }); } }, 20000);
    setTimeout(function () { if (uid()) hitung().then(sinkron); }, 4000);
  });

  window.ANTRE = { pasang: pasang, sinkron: sinkron, hitung: hitung };
})();
