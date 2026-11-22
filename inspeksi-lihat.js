// Daftar dan rincian inspeksi TPP dan TFU/TTU (baca saja): dipakai Dasbor fasyankes, laporan bulanan, dan tampilan Dinkes.
(function () {
  var JENIS = { tpm: 'TPP (pangan)', ttu: 'TFU / TTU' };
  var TABEL = { tpm: 'tpm_inspeksi', ttu: 'ikl_inspeksi' };
  var OPSI = { ya: 'Ya, sesuai', tidak: 'Tidak sesuai', tb: 'Tidak berlaku' };
  var HARI_LAMA = 90;

  function angka(n) { return Number(n).toLocaleString('id-ID', { maximumFractionDigits: 1 }); }
  function tgl(s) { var d = String(s || '').split('-'); return d.length === 3 ? d[2] + '/' + d[1] + '/' + d[0] : (s || '-'); }
  async function ambilSemua(t, kol, ids, dari, sampai, tglKolom) {
    var out = [];
    for (var i = 0; i < 20; i++) {
      var q = App.db.from(t).select(kol).in('fasyankes_id', ids).is('dihapus', null);
      if (dari) q = q.gte(tglKolom || 'tanggal', dari).lte(tglKolom || 'tanggal', sampai);
      var r = await q.range(i * 1000, i * 1000 + 999);
      if (r.error) return out;
      out = out.concat(r.data || []);
      if (!r.data || r.data.length < 1000) break;
    }
    return out;
  }
  function unduhCsv(nama, baris) {
    var isi = baris.map(function (b) { return b.map(function (c) { return '"' + String(c == null ? '' : c).replace(/"/g, '""') + '"'; }).join(','); }).join('\r\n');
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + isi], { type: 'text/csv;charset=utf-8' }));
    a.download = nama; document.body.appendChild(a); a.click(); a.remove();
  }
  function opsiSaring(id, label, daftar) {
    return '<div><label>' + label + '</label><select id="' + id + '"><option value="">Semua</option>' +
      daftar.map(function (x) { return '<option value="' + esc(x[0]) + '">' + esc(x[1]) + '</option>'; }).join('') + '</select></div>';
  }
  function unik(arr) { var o = {}; arr.forEach(function (x) { if (x) o[x] = 1; }); return Object.keys(o).sort(); }

  // ----- Rincian satu inspeksi (baca saja) -----
  async function rincian(el, x, kat, namaFas, balik) {
    el.innerHTML = '<p class="muted">Memuat rincian...</p>';
    var r = await Promise.all([
      App.db.from('master_checklist').select('*').eq('modul', kat).order('urutan'),
      x.objek_id ? App.db.from('objek_inspeksi').select('*').eq('id', x.objek_id).maybeSingle() : Promise.resolve({ data: null }),
      (window.FOTO ? FOTO.ambil(TABEL[kat], x.id) : Promise.resolve([]))
    ]);
    var soal = r[0].data || [], o = r[1].data, fotoPer = {}, umum = [], jw = x.jawaban || {};
    (r[2] || []).forEach(function (f) { if (f.butir === '_tempat') umum.push(f); else (fotoPer[f.butir] = fotoPer[f.butir] || []).push(f); });
    var bag = '', ya = 0, tdk = 0;
    var isi = soal.map(function (q) {
      var h = q.bagian !== bag ? '<tr><td colspan="2"><b>' + esc(q.bagian || '') + '</b></td></tr>' : '';
      bag = q.bagian;
      if (jw[q.kode] === 'ya') ya++; else if (jw[q.kode] === 'tidak') tdk++;
      return h + '<tr><td style="padding:4px 8px;border-bottom:1px solid #ddd">' + esc(q.pertanyaan) + '</td><td style="padding:4px 8px;border-bottom:1px solid #ddd;white-space:nowrap' + (jw[q.kode] === 'tidak' ? ';color:#B3261E;font-weight:700' : '') + '">' + esc(OPSI[jw[q.kode]] || '-') + '</td></tr>' +
        (fotoPer[q.kode] ? '<tr><td colspan="2" style="padding:4px 8px;border-bottom:1px solid #ddd"><div class="foto-deret">' + FOTO.html(fotoPer[q.kode]) + '</div></td></tr>' : '');
    }).join('');
    var alamat = o ? [o.alamat, o.desa, o.kecamatan].filter(Boolean).map(esc).join(', ') : '';
    var peta = o && o.lat != null ? ' · <a href="https://www.google.com/maps?q=' + encodeURIComponent(o.lat + ',' + o.lng) + '" target="_blank" rel="noopener">lihat di peta</a>' : '';
    el.innerHTML = '<div id="il-cetak"><div class="noprint" style="margin:12px 0"><button type="button" id="il-print" style="width:auto;padding:10px 20px">Cetak / simpan PDF</button></div>' +
      '<h3>Rincian inspeksi ' + (kat === 'tpm' ? 'tempat pengelolaan pangan' : 'tempat dan fasilitas umum') + '</h3>' +
      '<p><b>' + esc(x.lokasi || (o && o.nama) || '-') + '</b>' + (x.jenis_objek || (o && o.jenis) ? ' · ' + esc(x.jenis_objek || o.jenis) : '') + '<br>' +
      (namaFas ? 'Fasyankes: ' + esc(namaFas) + '<br>' : '') +
      'Tanggal: ' + esc(tgl(x.tanggal)) + (x.pemeriksa ? ' · Pemeriksa: ' + esc(x.pemeriksa) : '') + '<br>' +
      (alamat ? 'Alamat: ' + alamat + peta + '<br>' : '') +
      (o && (o.penanggung_jawab || o.kontak) ? 'Penanggung jawab: ' + [o.penanggung_jawab, o.kontak].filter(Boolean).map(esc).join(' · ') : '') + '</p>' +
      (umum.length ? '<div class="foto-deret"><div style="width:100%"><b>Foto tempat</b></div>' + FOTO.html(umum) + '</div>' : '') +
      '<table style="width:100%;border-collapse:collapse;font-size:13px">' + isi + '</table>' +
      '<p>' + (x.skor != null ? 'Skor: <b>' + angka(x.skor) + '</b>' + (x.batas_skor != null ? ' (batas ' + x.batas_skor + ')' : '') + ' · ' + (x.status === 'memenuhi' ? 'MEMENUHI' : 'TIDAK MEMENUHI') + '<br>' : '') +
      ya + ' butir sesuai, ' + tdk + ' butir tidak sesuai</p>' +
      (x.rekomendasi ? '<p>Rekomendasi: ' + esc(x.rekomendasi) + (x.batas_perbaikan ? ' (diperbaiki sebelum ' + esc(tgl(x.batas_perbaikan)) + ')' : '') + '</p>' : '') +
      (x.catatan ? '<p>Catatan: ' + esc(x.catatan) + '</p>' : '') + '</div>';
    $('il-print').onclick = function () { window.print(); };
    el.querySelectorAll('[data-besar-lihat]').forEach(function (im) { im.onclick = function () { FOTO.besar(im.src); }; });
    App.kembali('Daftar inspeksi', balik);
    window.scrollTo(0, 0);
  }

  // ----- Daftar inspeksi -----
  // opsi: { ids: [fasyankes_id], nama: {id: nama}, bulan, tahun, judul }
  async function daftar(el, opsi) {
    var kini = new Date(), th = opsi.tahun || kini.getFullYear(), bl = opsi.bulan != null ? opsi.bulan : kini.getMonth();
    var ids = opsi.ids, nama = opsi.nama || {}, banyak = ids.length > 1;
    el.innerHTML = '<p class="muted">Memuat daftar inspeksi...</p>';
    var dari = tglLokal(new Date(th, bl - 2, 1)), sampai = tglLokal(new Date(th, bl + 1, 0));
    var kol = 'id, fasyankes_id, tanggal, lokasi, objek_id, skor, status, jawaban, pemeriksa, rekomendasi, batas_perbaikan, catatan';
    var r = await Promise.all([
      ambilSemua('tpm_inspeksi', '*', ids, dari, sampai),
      ambilSemua('ikl_inspeksi', '*', ids, dari, sampai),
      (async function () {
        var out = [];
        for (var i = 0; i < 10; i++) {
          var q = await App.db.from('objek_inspeksi').select('*').in('fasyankes_id', ids).range(i * 1000, i * 1000 + 999);
          if (q.error) return out;
          out = out.concat(q.data || []);
          if (!q.data || q.data.length < 1000) break;
        }
        return out;
      })(),
      ambilSemua('tpm_inspeksi', 'objek_id, tanggal', ids),
      ambilSemua('ikl_inspeksi', 'objek_id, tanggal', ids)
    ]);
    var baris = [];
    r[0].forEach(function (x) { x._kat = 'tpm'; baris.push(x); });
    r[1].forEach(function (x) { x._kat = 'ttu'; baris.push(x); });
    var objek = {}; r[2].forEach(function (o) { objek[o.id] = o; });
    var terakhir = {};
    r[3].concat(r[4]).forEach(function (x) { if (x.objek_id && (!terakhir[x.objek_id] || x.tanggal > terakhir[x.objek_id])) terakhir[x.objek_id] = x.tanggal; });
    var kecList = unik(r[2].map(function (o) { return o.kecamatan; }));
    var bulanIni = tglLokal(new Date(th, bl, 1));

    el.innerHTML = '<div class="dk-hero" style="margin-bottom:12px"><small>' + esc(opsi.judul || 'Inspeksi tempat') + '</small><h2>Daftar inspeksi TPP dan TFU/TTU</h2>' +
      '<p style="margin:6px 0 0;opacity:.9;font-size:13px">Tiga bulan terakhir sampai ' + esc(['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'][bl]) + ' ' + th + '. Tampilan baca saja.</p></div>' +
      '<div class="dk-per" style="background:none;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-bottom:8px">' +
      opsiSaring('il-jenis', 'Jenis', [['tpm', JENIS.tpm], ['ttu', JENIS.ttu]]) +
      opsiSaring('il-stat', 'Hasil', [['memenuhi', 'Memenuhi'], ['tidak_memenuhi', 'Tidak memenuhi']]) +
      opsiSaring('il-kec', 'Kecamatan', kecList.map(function (k) { return [k, k]; })) +
      opsiSaring('il-desa', 'Desa / kelurahan', unik(r[2].map(function (o) { return o.desa; })).map(function (k) { return [k, k]; })) +
      '</div><div id="il-isi"></div>';

    function sar() {
      var j = $('il-jenis').value, st = $('il-stat').value, kc = $('il-kec').value, ds = $('il-desa').value;
      function cocokTempat(o) { return (!kc || (o && o.kecamatan === kc)) && (!ds || (o && o.desa === ds)); }
      var tampil = baris.filter(function (x) {
        return (!j || x._kat === j) && (!st || x.status === st) && cocokTempat(x.objek_id ? objek[x.objek_id] : null);
      }).sort(function (a, b) { return a.tanggal < b.tanggal ? 1 : -1; });
      var batasLama = tglLokal(new Date(Date.now() - HARI_LAMA * 86400000));
      var lama = Object.keys(objek).map(function (k) { return objek[k]; }).filter(function (o) {
        return o.aktif && (!j || o.kategori === j) && cocokTempat(o) && (!terakhir[o.id] || terakhir[o.id] < batasLama);
      }).sort(function (a, b) { return (terakhir[a.id] || '') < (terakhir[b.id] || '') ? -1 : 1; });

      var ok = tampil.filter(function (x) { return x.status === 'memenuhi'; }).length;
      var h = '<div class="kpi-grid"><div class="kpi"><div class="kpi-l">Inspeksi</div><div class="kpi-n">' + tampil.length + '</div><div class="kpi-s">sesuai saringan</div></div>' +
        '<div class="kpi' + (tampil.length - ok ? ' waspada' : '') + '"><div class="kpi-l">Memenuhi</div><div class="kpi-n">' + (tampil.length ? Math.round(ok / tampil.length * 100) + '%' : '–') + '</div><div class="kpi-s">' + (tampil.length - ok) + ' tidak memenuhi</div></div></div>' +
        '<button type="button" class="chip noprint" id="il-csv" style="margin:8px 0">Unduh daftar (Excel/CSV)</button>';
      h += tampil.length ? tampil.map(function (x, i) {
        var o = x.objek_id ? objek[x.objek_id] : null;
        var alamat = o ? [o.desa, o.kecamatan].filter(Boolean).map(esc).join(', ') : '';
        return '<div class="baris"><b>' + esc(x.lokasi || (o && o.nama) || '-') + '</b> · ' + esc(JENIS[x._kat]) + ' ' +
          (x.status === 'memenuhi' ? '<span class="ok">✓ memenuhi</span>' : '<span class="lewat">✗ tidak memenuhi</span>') +
          '<br><span class="muted">' + esc(tgl(x.tanggal)) + (x.skor != null ? ' · skor ' + angka(x.skor) : '') + (banyak ? ' · ' + esc(nama[x.fasyankes_id] || '') : '') + (alamat ? ' · ' + alamat : '') + '</span>' +
          '<br><button type="button" class="chip" data-i="' + i + '">Rincian</button></div>';
      }).join('') : '<p class="muted">Tidak ada inspeksi untuk saringan ini.</p>';
      h += '<section class="panel" style="margin-top:12px"><div class="panel-h"><h3>Belum diperiksa ' + HARI_LAMA + ' hari terakhir</h3><span class="muted">' + lama.length + ' tempat</span></div>' +
        (lama.length ? lama.slice(0, 50).map(function (o) {
          return '<div class="baris"><b>' + esc(o.nama) + '</b> · ' + esc(JENIS[o.kategori]) + '<br><span class="muted">' + [o.desa, o.kecamatan].filter(Boolean).map(esc).join(', ') + (banyak ? ' · ' + esc(nama[o.fasyankes_id] || '') : '') +
            ' · ' + (terakhir[o.id] ? 'terakhir ' + esc(tgl(terakhir[o.id])) : 'belum pernah diperiksa') + '</span></div>';
        }).join('') + (lama.length > 50 ? '<p class="muted">Menampilkan 50 pertama dari ' + lama.length + '.</p>' : '') : '<p class="muted">Semua tempat aktif sudah diperiksa dalam ' + HARI_LAMA + ' hari terakhir.</p>') + '</section>';
      $('il-isi').innerHTML = h;
      $('il-isi').querySelectorAll('[data-i]').forEach(function (b) {
        b.onclick = function () {
          var x = tampil[Number(this.dataset.i)];
          rincian(el, x, x._kat, nama[x.fasyankes_id], function () { daftar(el, opsi); });
        };
      });
      $('il-csv').onclick = function () {
        var rows = [['Fasyankes', 'Jenis', 'Nama tempat', 'Alamat', 'Desa', 'Kecamatan', 'Penanggung jawab', 'Tanggal', 'Skor', 'Hasil', 'Pemeriksa', 'Rekomendasi']];
        tampil.forEach(function (x) {
          var o = x.objek_id ? objek[x.objek_id] : {};
          o = o || {};
          rows.push([nama[x.fasyankes_id] || '', JENIS[x._kat], x.lokasi || o.nama || '', o.alamat || '', o.desa || '', o.kecamatan || '', o.penanggung_jawab || '', x.tanggal, x.skor != null ? x.skor : '', x.status === 'memenuhi' ? 'Memenuhi' : 'Tidak memenuhi', x.pemeriksa || '', x.rekomendasi || '']);
        });
        unduhCsv('inspeksi-' + th + '-' + String(bl + 1).padStart(2, '0') + '.csv', rows);
      };
    }
    ['il-jenis', 'il-stat', 'il-kec', 'il-desa'].forEach(function (id) { $(id).onchange = sar; });
    sar();
  }

  window.INSPEKSI = { daftar: daftar, rincian: rincian };
})();
