// Dokumentasi foto (opsional) di formulir pelaporan + riwayat dan cetak laporan untuk semua formulir + kop surat fasyankes.
(function () {
  // [nama tab, tabel, judul, selector tombol simpan (null = belum ada foto di formulir ini)]
  var TAB = [
    ['catat', 'limbah_harian', 'Catatan limbah harian', '#l-simpan'],
    ['angkut', 'limbah_angkut', 'Pengangkutan limbah', null],
    ['air_uji', 'air_uji', 'Hasil uji air', '#au-simpan'],
    ['ipal_harian', 'ipal_harian', 'Catatan IPAL harian', '#ih-simpan'],
    ['ipal_lab', 'ipal_lab', 'Hasil uji laboratorium IPAL', '#il-simpan'],
    ['vektor_catat', 'vektor', 'Pemantauan vektor', '#vk-simpan'],
    ['udara_ukur', 'udara_skudr', 'Hasil pengukuran udara', '#ud-simpan'],
    ['sanitasi_cek', 'sanitasi_checklist', 'Inspeksi sanitasi bangunan', '#sn-simpan'],
    ['k3_insiden', 'k3_insiden', 'Insiden K3', '#ki-simpan'],
    ['rs_pengawasan', 'pengawasan', 'Pengawasan kesehatan lingkungan fasyankes', '#cr-simpan']
  ];
  // Tabel yang sudah boleh menyimpan foto (sesuai aturan di penyimpanan)
  // Tabel dengan satu baris per parameter: foto melekat pada baris pertama, rincian mengumpulkan foto satu pengambilan sampel
  var GRUP = { air_uji: ['tanggal', 'titik_sampel'], ipal_lab: ['tanggal', 'titik_sampel', 'titik'], udara_skudr: ['tanggal', 'ruangan_id', 'lokasi'] };
  var FOTO_OK = ['air_uji', 'ipal_lab', 'udara_skudr', 'limbah_harian', 'limbah_angkut', 'sanitasi_checklist', 'vektor', 'ipal_harian', 'k3_insiden', 'pengawasan', 'ikl_inspeksi', 'tpm_inspeksi'];
  var SEMBUNYI = ['id', 'fasyankes_id', 'petugas_id', 'dibuat', 'dihapus', 'dihapus_oleh', 'dihapus_alasan', 'objek_id', 'data_id', 'sumber_id', 'dibuat_oleh', 'diubah', 'diubah_oleh'];
  var LABEL = { tanggal: 'Tanggal', jam: 'Jam', kode_limbah: 'Kode limbah', nama_limbah: 'Jenis limbah', berat_kg: 'Berat (kg)', batas_simpan: 'Batas simpan', id_kantong: 'ID kantong', suhu: 'Suhu penyimpanan', parameter: 'Parameter', hasil: 'Hasil', satuan: 'Satuan', titik: 'Titik pemeriksaan', status: 'Status', lokasi: 'Lokasi', jenis: 'Jenis', jumlah: 'Jumlah', uraian: 'Uraian', tindakan: 'Tindakan', catatan: 'Catatan', skor: 'Skor', no_manifest: 'Nomor manifest', ruangan_id: 'Ruangan', tps_id: 'TPS', vendor_id: 'Vendor' };

  var S = null;             // formulir yang sedang tampil: { tabel, st, wadah }
  var antre = [], gagal = [], jalan = false;
  var kopCache = {};
  var terakhirKembali = null;

  function judulDari(k) { return LABEL[k] || (k.replace(/_/g, ' ').replace(/^./, function (c) { return c.toUpperCase(); })); }
  function nilaiTampil(k, v) {
    if (v === true) return 'Ya';
    if (v === false) return 'Tidak';
    if (/^\d{4}-\d{2}-\d{2}T/.test(String(v))) { var d = new Date(v); return d.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
    if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) { var p = v.split('-'); return p[2] + '/' + p[1] + '/' + p[0]; }
    if (k === 'status') return String(v).replace(/_/g, ' ');
    return String(v);
  }

  // ----- Kop surat fasyankes -----
  async function kop(fid) {
    fid = fid || (App.profil && App.profil.fasyankes_id);
    if (!fid) return '';
    if (!kopCache[fid]) {
      var r = await App.db.from('fasyankes').select('*').eq('id', fid).maybeSingle();
      kopCache[fid] = (r && r.data) || {};
    }
    var f = kopCache[fid];
    var nama = f.nama || (App.profil.fasyankes && App.profil.fasyankes.nama) || '';
    if (!nama) return '';
    var baris = [f.alamat, f.kabupaten_kota, f.provinsi].filter(Boolean).map(esc).join(', ');
    return '<div class="kop-surat">' + (f.logo_url && /^https:\/\//.test(f.logo_url) ? '<img src="' + esc(f.logo_url) + '" alt="" class="kop-logo">' : '') + '<div class="kop-nama">' + esc(nama) + '</div>' + (baris ? '<div class="kop-alamat">' + baris + '</div>' : '') + '<div class="kop-alamat">Laporan kesehatan lingkungan</div></div>';
  }
  function tandaTangan(nama) {
    var p = App.profil || {};
    var n = nama || (p.peran !== 'dinkes' && p.nama) || '.................................';
    return '<p style="margin-top:32px">Petugas pemeriksa,<br><br><br>' + esc(n) + '</p>' +
      '<p class="muted" style="font-size:11px">Dicetak dari SANIKES pada ' + new Date().toLocaleString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + '</p>';
  }

  // ----- Toast unggah foto -----
  function toast(teks, galat, aksi) {
    var t = $('dok-toast');
    if (!t) { t = document.createElement('div'); t.id = 'dok-toast'; t.className = 'dok-toast noprint'; document.body.appendChild(t); }
    t.className = 'dok-toast noprint' + (galat ? ' galat' : '');
    t.innerHTML = esc(teks) + (aksi ? '<br><button type="button" class="chip" data-a="ulang">Coba unggah lagi</button> <button type="button" class="chip" data-a="lewati">Lewati</button>' : '');
    t.hidden = false;
    t.onclick = function (e) {
      var a = e.target.dataset && e.target.dataset.a;
      if (a === 'ulang') { antre = gagal.concat(antre); gagal = []; proses(); }
      if (a === 'lewati') { gagal = []; t.hidden = true; }
    };
    clearTimeout(toast.w);
    if (!galat && !aksi && /terunggah/i.test(teks)) toast.w = setTimeout(function () { t.hidden = true; }, 4000);
  }
  async function proses() {
    if (jalan) return;
    jalan = true;
    var total = antre.length, n = 0, tunda = 0;
    while (antre.length) {
      var a = antre.shift(); n++;
      toast('Mengunggah foto ' + n + ' dari ' + total + '...');
      var r = await FOTO.unggah(a.tabel, a.id, '_dok', a.f);
      if (!r.ok) gagal.push(a); else if (r.antre) tunda++;
    }
    jalan = false;
    if (gagal.length) toast(gagal.length + ' foto belum terunggah (sinyal lemah?). Catatan sudah aman tersimpan.', true, true);
    else if (tunda) toast(tunda + ' foto disimpan di perangkat, dikirim otomatis saat sinyal kembali.');
    else toast('Semua foto terunggah.');
  }

  // Setelah catatan berhasil disimpan: kirim foto yang menunggu ke antrean unggah
  function setelahInsert(tabel, r) {
    if (!S || S.tabel !== tabel || !r || r.error) return;
    var arr = S.st.dok || [];
    if (!arr.length) return;
    var id = r.data && r.data[0] && r.data[0].id;
    if (!id) return;
    arr.forEach(function (f) { antre.push({ tabel: tabel, id: id, f: f }); });
    S.st.dok = [];
    if (S.wadah.isConnected) FOTO.pasang(S.wadah, S.st, 'dok', { maks: 3 });
    proses();
  }

  var terpasang = false;
  function bungkusDb() {
    if (terpasang || !App.db) return;
    terpasang = true;
    var asli = App.db.from.bind(App.db);
    App.db.from = function (t) {
      var b = asli(t);
      if (!S || S.tabel !== t || !b.insert) return b;
      var ins = b.insert.bind(b);
      b.insert = function () {
        var q = ins.apply(null, arguments);
        if (!q.select) return q;
        q = q.select('id');
        var th = q.then.bind(q);
        q.then = function (ok, no) {
          return th(function (r) { try { setelahInsert(t, r); } catch (e) {} return ok ? ok(r) : r; }, no);
        };
        return q;
      };
      return b;
    };
  }

  async function sisipFoto(el, tabel, sel) {
    var btn = el.querySelector(sel);
    if (!btn || el.querySelector('[data-dok]') || !window.FOTO) return;
    if (!(await FOTO.siap())) return;
    btn = el.querySelector(sel); if (!btn || el.querySelector('[data-dok]')) return;
    var k = document.createElement('div');
    k.className = 'baris'; k.setAttribute('data-dok', '1');
    k.innerHTML = '<b>Dokumentasi foto <span class="muted">(opsional)</span></b><div class="muted" style="font-size:12px;margin:2px 0 6px">Foto dari kamera otomatis mencatat titik lokasi dan jam. Jangan memotret wajah pasien atau data identitas.</div><div class="foto-wadah"></div>';
    btn.parentNode.insertBefore(k, btn);
    S = { tabel: tabel, st: {}, wadah: k.querySelector('.foto-wadah') };
    bungkusDb();
    FOTO.pasang(S.wadah, S.st, 'dok', { maks: 3 });
  }

  // ----- Riwayat dan cetak -----
  async function daftarRekam(el, tabel, judul, kembaliLabel, kembaliFn) {
    var bulan = '';
    async function muat() {
      var isi = $('rk-isi'); if (!isi) return;
      isi.innerHTML = '<p class="muted">Memuat...</p>';
      function q(bersih, urut) {
        var s = App.db.from(tabel).select('*');
        if (bersih) s = s.is('dihapus', null);
        if (bulan) { var p = bulan.split('-'); s = s.gte('tanggal', bulan + '-01').lte('tanggal', tglLokal(new Date(Number(p[0]), Number(p[1]), 0))); }
        return s.order(urut, { ascending: false }).limit(50);
      }
      var r = await q(true, 'tanggal');
      if (r.error) r = await q(false, 'tanggal');
      if (r.error) r = await q(false, 'dibuat');
      if (r.error) { isi.innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
      var rows = r.data || [];
      var nFoto = (FOTO_OK.indexOf(tabel) > -1 && window.FOTO && await FOTO.siap()) ? await FOTO.jumlah(tabel, rows.map(function (x) { return x.id; })) : {};
      isi.innerHTML = rows.length ? rows.map(function (x, i) {
        var ket = Object.keys(x).filter(function (k) { return SEMBUNYI.indexOf(k) < 0 && k !== 'tanggal' && x[k] != null && x[k] !== '' && typeof x[k] !== 'object' && !/_id$/.test(k); }).slice(0, 4)
          .map(function (k) { return esc(judulDari(k)) + ': ' + esc(nilaiTampil(k, x[k])); }).join(' · ');
        return '<div class="baris"><b>' + esc(x.tanggal ? nilaiTampil('tanggal', x.tanggal) : nilaiTampil('dibuat', x.dibuat)) + '</b>' + (nFoto[x.id] ? ' · ' + nFoto[x.id] + ' foto' : '') +
          '<br><span class="muted">' + ket + '</span><br><button type="button" class="chip" data-i="' + i + '">Rincian / cetak</button></div>';
      }).join('') : '<p class="muted">Belum ada data.</p>';
      isi.querySelectorAll('[data-i]').forEach(function (b) {
        b.onclick = function () { rincianRekam(el, tabel, judul, rows[Number(this.dataset.i)], function () { daftarRekam(el, tabel, judul, kembaliLabel, kembaliFn); App.kembali(kembaliLabel, kembaliFn); }); };
      });
    }
    el.innerHTML = '<h3>Riwayat dan cetak: ' + esc(judul) + '</h3><p class="muted">50 catatan terbaru. Pilih bulan untuk menyaring.</p>' +
      '<div class="noprint"><label>Bulan</label><input type="month" id="rk-bln"></div><div id="rk-isi"></div>';
    $('rk-bln').onchange = function () { bulan = this.value; muat(); };
    await muat();
    window.scrollTo(0, 0);
  }

  async function rincianRekam(el, tabel, judul, x, balik) {
    el.innerHTML = '<p class="muted">Memuat rincian...</p>';
    var peta = {};
    var jobs = [kop(x.fasyankes_id)];
    if (x.ruangan_id) jobs.push(App.db.from('ruangan').select('id,nama'));
    if (x.tps_id) jobs.push(App.db.from('tps').select('id,nama'));
    var hasil = await Promise.all(jobs);
    for (var i = 1; i < hasil.length; i++) ((hasil[i] && hasil[i].data) || []).forEach(function (o) { peta[o.id] = o.nama; });
    var fotoIds = [x.id];
    if (GRUP[tabel] && x.tanggal) {
      var gq = App.db.from(tabel).select('id').eq('tanggal', x.tanggal);
      GRUP[tabel].slice(1).forEach(function (k) { if (x[k] != null) gq = gq.eq(k, x[k]); });
      var gr = await gq.limit(200);
      if (!gr.error && gr.data && gr.data.length) fotoIds = gr.data.map(function (y) { return y.id; });
    }
    var foto = (FOTO_OK.indexOf(tabel) > -1 && window.FOTO && await FOTO.siap()) ? await FOTO.ambil(tabel, fotoIds) : [];
    var baris = Object.keys(x).filter(function (k) { return SEMBUNYI.indexOf(k) < 0 && x[k] != null && x[k] !== '' && typeof x[k] !== 'object'; }).map(function (k) {
      var v = /_id$/.test(k) ? peta[x[k]] : nilaiTampil(k, x[k]);
      if (v == null) return '';
      return '<tr><td style="padding:4px 8px;border-bottom:1px solid #ddd;width:38%"><b>' + esc(judulDari(k)) + '</b></td><td style="padding:4px 8px;border-bottom:1px solid #ddd">' + esc(v) + '</td></tr>';
    }).join('');
    var jw = x.jawaban && typeof x.jawaban === 'object' ? x.jawaban : null, ya = 0, tdk = 0;
    if (jw) Object.keys(jw).forEach(function (k) { if (jw[k] === 'ya') ya++; else if (jw[k] === 'tidak') tdk++; });
    el.innerHTML = '<div id="rk-cetak">' + hasil[0] +
      '<div class="noprint" style="margin:12px 0"><button type="button" id="rk-print" style="width:auto;padding:10px 20px">Cetak / simpan PDF</button></div>' +
      '<h3>' + esc(judul) + '</h3><table style="width:100%;border-collapse:collapse;font-size:13px">' + baris + '</table>' +
      (jw ? '<p>' + ya + ' butir sesuai, ' + tdk + ' butir tidak sesuai.</p>' : '') +
      (foto.length ? '<div class="foto-deret"><div style="width:100%"><b>Dokumentasi foto</b></div>' + FOTO.html(foto) + '</div>' : '') +
      tandaTangan() + '</div>';
    $('rk-print').onclick = function () { window.print(); };
    el.querySelectorAll('[data-besar-lihat]').forEach(function (im) { im.onclick = function () { FOTO.besar(im.src); }; });
    App.kembali('Riwayat', balik);
    window.scrollTo(0, 0);
  }

  // Ingat tombol kembali terakhir supaya bisa dipulihkan setelah membuka riwayat
  var kembaliAsli = App.kembali;
  App.kembali = function (label, fn) { terakhirKembali = label ? { l: label, f: fn } : null; return kembaliAsli.apply(this, arguments); };

  TAB.forEach(function (t) {
    var asli = App.tabs[t[0]];
    if (!asli) return;
    App.tabs[t[0]] = async function (el) {
      S = null;
      var hasil = await asli.apply(this, arguments);
      if (!el || !el.isConnected) return hasil;
      if (t[3]) await sisipFoto(el, t[1], t[3]);
      if (!el.querySelector('[data-rekam]')) {
        var w = document.createElement('div');
        w.className = 'noprint'; w.style.margin = '16px 0';
        w.innerHTML = '<button type="button" class="chip" data-rekam="1">Riwayat dan cetak laporan</button>';
        el.appendChild(w);
        w.firstChild.onclick = function () {
          var prev = terakhirKembali;
          function pulih() { App.tabs[t[0]](el); if (prev) App.kembali(prev.l, prev.f); else App.kembali(null); }
          daftarRekam(el, t[1], t[2], t[2], pulih);
          App.kembali(t[2], pulih);
        };
      }
      return hasil;
    };
  });

  window.DOK = { kop: kop, tandaTangan: tandaTangan, daftarRekam: daftarRekam };
})();
