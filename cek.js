(function () {
  // Mesin checklist umum (dipakai TPM, K3 tahunan, dan modul checklist lain)
  // cfg: tab, judul, modul (master_checklist.modul), tabel, kategori (temuan), opsi [[nilai,label],...] dengan 'ya'/'tidak'/'tb',
  //      lokasi: 'ruangan' | 'teks' | 'tahun', lokasiLabel, batasKunci, batasDefault (null = tanpa status), info, hasilTidak
  var TULIS = ['admin_fasyankes', 'petugas_kesling', 'petugas_ruangan'];

  function bisaTulis() { return TULIS.indexOf(App.profil.peran) > -1; }
  function angka(n) { return Number(n).toLocaleString('id-ID', { maximumFractionDigits: 1 }); }
  function lencana(s) { return s === 'memenuhi' ? '<span class="ok">✓ memenuhi</span>' : (s === 'tidak_memenuhi' ? '<span class="lewat">✗ tidak memenuhi</span>' : ''); }
  function hitung(soal, jw) {
    var ya = 0, total = 0, tidak = [];
    soal.forEach(function (q) {
      var j = jw[q.kode], b = Number(q.bobot) || 1;
      if (j === 'ya') { ya += b; total += b; }
      else if (j === 'tidak') { total += b; tidak.push(q); }
    });
    return { skor: total > 0 ? Math.round(ya / total * 1000) / 10 : null, tidak: tidak, ya: ya, total: total };
  }

  window.CEK = function (cfg) {
    App.tabs[cfg.tab] = async function (el) {
      if (App.profil.peran === 'admin_papkenz') { el.innerHTML = '<div class="info">Data ini milik fasyankes. Gunakan akun fasyankes.</div>'; return; }
      var rows = [], soal = [];
      var r = await Promise.all([
        App.db.from('master_checklist').select('*').eq('modul', cfg.modul).eq('aktif', true).order('urutan'),
        cfg.lokasi === 'ruangan' ? App.db.from('ruangan').select('id,nama').eq('aktif', true).order('nama') : Promise.resolve({ data: [] }),
        window.PENGATURAN ? PENGATURAN.ambil() : Promise.resolve({})
      ]);
      soal = r[0].data || [];
      var ruang = r[1].data || [];
      var batas = cfg.batasDefault == null ? null : (Number((r[2] || {})[cfg.batasKunci]) || cfg.batasDefault);
      // Daftar tempat yang diperiksa (hanya untuk TPP dan TFU/TTU)
      var objekOk = false, semuaObjek = [], objek = [], terakhir = {};
      window._ckSel = window._ckSel || {};
      if (cfg.objekKat) {
        var ro = await App.db.from('objek_inspeksi').select('*').eq('kategori', cfg.objekKat).order('nama');
        if (!ro.error && window.OBJEK) {
          objekOk = true; semuaObjek = ro.data || [];
          objek = semuaObjek.filter(function (o) { return o.aktif; });
          var rt = await App.db.from(cfg.tabel).select('objek_id, tanggal').not('objek_id', 'is', null).is('dihapus', null).order('tanggal', { ascending: false }).limit(2000);
          (rt.data || []).forEach(function (x) { if (!terakhir[x.objek_id]) terakhir[x.objek_id] = x.tanggal; });
        }
      }
      var fotoOk = !!(cfg.foto && window.FOTO && await FOTO.siap());
      var stFoto = {}, widgets = {};
      function cariObjek(id) { return semuaObjek.filter(function (o) { return o.id === id; })[0]; }
      var opsiHtml = cfg.opsi.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('');

      var inLok = '';
      if (cfg.lokasi === 'ruangan') inLok = '<label>' + esc(cfg.lokasiLabel) + '</label><select id="ck-lok">' + ruang.map(function (x) { return '<option value="' + esc(x.nama) + '">' + esc(x.nama) + '</option>'; }).join('') + '</select>';
      else if (cfg.lokasi === 'tahun') inLok = '<label>' + esc(cfg.lokasiLabel) + '</label><input type="number" id="ck-lok" value="' + new Date().getFullYear() + '">';
      else inLok = '<label>' + esc(cfg.lokasiLabel) + '</label><input id="ck-lok" placeholder="' + esc(cfg.lokasiContoh || '') + '">';

      var tambahTempat = false;
      if (objekOk) {
        tambahTempat = OBJEK.bisaTulis();
        var sel = window._ckSel[cfg.tab];
        inLok = '<label>' + esc(cfg.lokasiLabel) + '</label>' +
          (objek.length
            ? '<select id="ck-objek">' + objek.map(function (o) { return '<option value="' + o.id + '"' + (o.id === sel ? ' selected' : '') + '>' + esc(o.nama) + (o.desa ? ' · ' + esc(o.desa) : '') + '</option>'; }).join('') + '</select><div id="ck-objek-info" class="muted" style="margin-top:6px;line-height:1.6"></div>'
            : '<div class="info waspada">Belum ada tempat di daftar. ' + (tambahTempat ? 'Tambahkan dulu dengan tombol di bawah.' : 'Minta admin atau petugas kesling menambahkannya.') + '</div>') +
          '<div class="aksi">' + (tambahTempat ? '<button type="button" class="chip" id="ck-objek-baru">+ Tempat baru</button>' : '') + '<button type="button" class="chip" id="ck-objek-kelola">Kelola daftar tempat</button></div><div id="ck-objek-form"></div>';
      }
      var inJenis = (cfg.jenis && !objekOk) ? '<label>Jenis tempat</label><select id="ck-jenis">' + cfg.jenis.map(function (j) { return '<option>' + esc(j) + '</option>'; }).join('') + '</select>' : '';
      var form = bisaTulis()
        ? (soal.length
          ? '<label>Tanggal</label><input type="date" id="ck-tgl" value="' + tglLokal(new Date()) + '">' + inJenis + inLok +
            '<p class="muted">' + (cfg.info || '') + (batas != null ? ' Batas laik: ' + batas + '.' : '') + '</p>' +
            (fotoOk ? '<div class="baris"><b>Foto tempat (tampak depan)</b><div class="foto-wadah" data-foto="_tempat"></div></div>' : '') +
            '<div id="ck-soal"></div><div id="ck-skor" class="info"></div>' +
            (objekOk ? '<label>Pemeriksa</label><input id="ck-pem" value="' + esc(App.profil.nama || '') + '">' +
              '<label>Rekomendasi perbaikan (opsional)</label><input id="ck-rek" placeholder="mis. Sediakan sabun dan air mengalir di toilet">' +
              '<label>Batas waktu perbaikan (opsional)</label><input type="date" id="ck-bts">' : '') +
            '<label>Catatan (opsional)</label><input id="ck-cat">' +
            '<button type="button" id="ck-simpan">Simpan</button><div class="pesan" id="ck-pesan"></div>'
          : '<div class="info waspada">Daftar pertanyaan belum tersedia di database.</div>')
        : '';
      el.innerHTML = '<div id="ck-root"><h3 style="margin-top:0" class="noprint">' + esc(cfg.judul) + '</h3><div class="noprint">' + form + '</div>' +
        '<div id="tl-box" class="noprint"></div><h3 class="noprint">Riwayat</h3><div id="ck-daftar"></div></div>';

      if (objekOk && bisaTulis()) {
        var pilih = $('ck-objek');
        var segarInfo = function () {
          if (!pilih) return;
          window._ckSel[cfg.tab] = pilih.value;
          var o = cariObjek(pilih.value);
          $('ck-objek-info').innerHTML = OBJEK.info(o, o && terakhir[o.id]);
        };
        if (pilih) { pilih.onchange = segarInfo; segarInfo(); }
        if ($('ck-objek-kelola')) $('ck-objek-kelola').onclick = function () {
          App.tabs['objek_' + cfg.objekKat](el);
          App.kembali(cfg.judul, function () { App.tabs[cfg.tab](el); });
          window.scrollTo(0, 0);
        };
        if ($('ck-objek-baru')) $('ck-objek-baru').onclick = function () {
          var w = $('ck-objek-form');
          if (w.innerHTML) { w.innerHTML = ''; return; }
          w.innerHTML = '<div class="info"><b>Tempat baru</b>' + OBJEK.form('ckn', cfg.objekKat, null) +
            '<button type="button" id="ckn-simpan">Simpan tempat</button><div class="pesan" id="ckn-pesan"></div></div>';
          OBJEK.pasangGps('ckn');
          $('ckn-simpan').onclick = async function () {
            var b = OBJEK.baca('ckn', cfg.objekKat);
            if (b.galat) { $('ckn-pesan').textContent = b.galat; return; }
            this.disabled = true;
            var res = await App.db.from('objek_inspeksi').insert(b.data).select('id');
            this.disabled = false;
            if (res.error) { $('ckn-pesan').textContent = OBJEK.pesanGalat(res.error); return; }
            window._ckSel[cfg.tab] = res.data && res.data[0] && res.data[0].id;
            await App.tabs[cfg.tab](el);
          };
        };
      }

      function jawaban() {
        var o = {};
        el.querySelectorAll('[data-q]').forEach(function (s) { if (s.value) o[s.dataset.q] = s.value; });
        return o;
      }
      function segar() {
        var jw = jawaban(), h = hitung(soal, jw);
        if (fotoOk) Object.keys(widgets).forEach(function (k) { if (k !== '_tempat') widgets[k].peringatan(jw[k] === 'tidak' && !(stFoto[k] || []).length); });
        $('ck-skor').innerHTML = 'Terjawab ' + Object.keys(jw).length + ' dari ' + soal.length + '.' +
          (h.skor !== null ? '<br>' + (batas != null ? 'Skor: <b>' + angka(h.skor) + '</b> ' + lencana(h.skor >= batas ? 'memenuhi' : 'tidak_memenuhi') : 'Terpenuhi: <b>' + h.ya + ' dari ' + h.total + '</b>') : '');
      }
      if (soal.length && bisaTulis()) {
        var bag = '';
        $('ck-soal').innerHTML = soal.map(function (q) {
          var h = q.bagian !== bag ? '<h3>' + esc(q.bagian || '') + '</h3>' : '';
          bag = q.bagian;
          return h + '<div class="baris">' + esc(q.pertanyaan) + '<select data-q="' + esc(q.kode) + '"><option value="">- pilih -</option>' + opsiHtml + '</select>' + (fotoOk ? '<div class="foto-wadah" data-foto="' + esc(q.kode) + '"></div>' : '') + '</div>';
        }).join('');
        $('ck-soal').onchange = segar;
        if (fotoOk) el.querySelectorAll('[data-foto]').forEach(function (w) {
          widgets[w.dataset.foto] = FOTO.pasang(w, stFoto, w.dataset.foto, { maks: w.dataset.foto === '_tempat' ? 1 : 2, onUbah: segar });
        });
        segar();
      }

      async function cetak(x) {
        var jw = x.jawaban || {}, bag = '';
        var kopH = window.DOK ? await DOK.kop() : '';
        var fotoPer = {}, umum = [];
        if (cfg.foto && window.FOTO && await FOTO.siap()) {
          (await FOTO.ambil(cfg.tabel, x.id)).forEach(function (f) { if (f.butir === '_tempat') umum.push(f); else (fotoPer[f.butir] = fotoPer[f.butir] || []).push(f); });
        }
        var isi = soal.map(function (q) {
          var h = q.bagian !== bag ? '<tr><td colspan="2"><b>' + esc(q.bagian || '') + '</b></td></tr>' : '';
          bag = q.bagian;
          var o = cfg.opsi.filter(function (p) { return p[0] === jw[q.kode]; })[0];
          return h + '<tr><td style="padding:4px 8px;border-bottom:1px solid #ddd">' + esc(q.pertanyaan) + '</td><td style="padding:4px 8px;border-bottom:1px solid #ddd;white-space:nowrap">' + esc(o ? o[1] : '-') + '</td></tr>' +
            (fotoPer[q.kode] ? '<tr><td colspan="2" style="padding:4px 8px;border-bottom:1px solid #ddd"><div class="foto-deret">' + FOTO.html(fotoPer[q.kode]) + '</div></td></tr>' : '');
        }).join('');
        var w = document.createElement('div');
        w.id = 'ck-cetak';
        w.innerHTML = '<div class="noprint" style="margin:12px 0"><button type="button" id="ck-print" style="width:auto;padding:10px 20px">Cetak / simpan PDF</button> ' +
          '<button type="button" id="ck-tutup" style="width:auto;padding:10px 20px;background:#666">Tutup</button></div>' +
          kopH + '<h3>' + esc(cfg.judulCetak || cfg.judul) + '</h3><p>' + esc((App.profil.fasyankes && App.profil.fasyankes.nama) || '') + '<br>' +
          (x.jenis_objek ? 'Jenis tempat: ' + esc(x.jenis_objek) + '<br>' : '') + esc(cfg.lokasiLabel) + ': ' + esc(x.lokasi || '-') + ' · Tanggal: ' + esc(x.tanggal) + '</p>' +
          (function () {
            var o = x.objek_id ? cariObjek(x.objek_id) : null;
            var a = o ? [o.alamat, o.desa, o.kecamatan].filter(Boolean).map(esc).join(', ') : '';
            var pj = o ? [o.penanggung_jawab, o.kontak].filter(Boolean).map(esc).join(' · ') : '';
            return (a ? '<p style="margin-top:-8px">Alamat: ' + a + (pj ? '<br>Penanggung jawab: ' + pj : '') + '</p>' : (pj ? '<p style="margin-top:-8px">Penanggung jawab: ' + pj + '</p>' : '')) +
              (x.pemeriksa ? '<p style="margin-top:-8px">Pemeriksa: ' + esc(x.pemeriksa) + '</p>' : '');
          })() +
          (umum.length ? '<div class="foto-deret"><div style="width:100%"><b>Foto tempat</b></div>' + FOTO.html(umum) + '</div>' : '') +
          '<table style="width:100%;border-collapse:collapse;font-size:13px">' + isi + '</table>' +
          '<p>' + (x.skor != null && x.batas_skor != null ? 'Skor: <b>' + angka(x.skor) + '</b> (batas ' + x.batas_skor + ') · ' + (x.status === 'memenuhi' ? 'MEMENUHI' : 'TIDAK MEMENUHI') : '') + '</p>' +
          (x.rekomendasi ? '<p>Rekomendasi: ' + esc(x.rekomendasi) + (x.batas_perbaikan ? ' (diperbaiki sebelum ' + esc(x.batas_perbaikan) + ')' : '') + '</p>' : '') +
          (x.catatan ? '<p>Catatan: ' + esc(x.catatan) + '</p>' : '') +
          (window.DOK ? DOK.tandaTangan() : '<p style="margin-top:32px">Petugas pemeriksa,<br><br><br>.................................</p>');
        $('ck-root').style.display = 'none';
        el.appendChild(w);
        $('ck-print').onclick = function () { window.print(); };
        $('ck-tutup').onclick = function () { w.remove(); $('ck-root').style.display = ''; };
        w.querySelectorAll('[data-besar-lihat]').forEach(function (im) { im.onclick = function () { FOTO.besar(im.src); }; });
        window.scrollTo(0, 0);
      }

      async function daftar(pesan) {
        var q = App.db.from(cfg.tabel).select('*');
        if (window.KL) q = KL.filter(q, cfg.tabel);
        var res = await q.order('tanggal', { ascending: false }).order('dibuat', { ascending: false }).limit(30);
        if (res.error) { $('ck-daftar').innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
        rows = res.data;
        var nFoto = (cfg.foto && window.FOTO && await FOTO.siap()) ? await FOTO.jumlah(cfg.tabel, rows.map(function (x) { return x.id; })) : {};
        $('ck-daftar').innerHTML = (pesan ? '<div class="pesan">' + esc(pesan) + '</div>' : '') + (window.KL ? KL.saklar(cfg.tabel) : '') +
          (rows.length ? rows.map(function (x) {
            var jml = 0;
            Object.keys(x.jawaban || {}).forEach(function (k) { if (x.jawaban[k] === 'tidak') jml++; });
            return '<div class="baris"' + (x.dihapus ? ' style="opacity:.6"' : '') + '><b>' + esc(x.lokasi || '-') + '</b>' + (x.jenis_objek ? ' · ' + esc(x.jenis_objek) : '') +
              (x.skor != null ? ' · skor ' + angka(x.skor) : '') + ' ' + lencana(x.status) +
              '<br><span class="muted">' + esc(x.tanggal) + ' · ' + jml + ' item ' + esc(cfg.hasilTidak || 'tidak sesuai') + (x.catatan ? ' · ' + esc(x.catatan) : '') + '</span>' +
              (x.rekomendasi ? '<br><span class="muted">Rekomendasi: ' + esc(x.rekomendasi) + (x.batas_perbaikan ? ' · perbaiki sebelum ' + esc(x.batas_perbaikan) : '') + '</span>' : '') +
              (nFoto[x.id] ? ' · ' + nFoto[x.id] + ' foto' : '') +
              '<br><button type="button" class="chip" data-cetak="' + x.id + '">Rincian / cetak</button>' +
              (window.KL ? KL.tombol(x) : '') + '</div>';
          }).join('') : '<p class="muted">Belum ada data.</p>');
      }

      $('ck-daftar').addEventListener('click', function (e) {
        var b = e.target.closest ? e.target.closest('[data-cetak]') : null;
        if (!b) return;
        var x = rows.filter(function (y) { return y.id === b.dataset.cetak; })[0];
        if (x) cetak(x);
      });
      if (window.KL) KL.pasang($('ck-daftar'), {
        tabel: cfg.tabel,
        cari: function (id) { return rows.filter(function (x) { return x.id === id; })[0]; },
        bidang: function (x) {
          return [{ k: 'tanggal', l: 'Tanggal', tipe: 'tanggal', nilai: x.tanggal }, { k: 'catatan', l: 'Catatan', tipe: 'teks', nilai: x.catatan }];
        },
        simpan: async function (x, is) {
          if (!is.tanggal) return { galat: 'Tanggal wajib diisi.' };
          return { ubah: { tanggal: is.tanggal, catatan: (is.catatan || '').trim() || null } };
        },
        selesai: function (m) { daftar(m); if (window.TL && $('tl-box')) TL.panel($('tl-box'), cfg.kategori); }
      });

      if (bisaTulis() && soal.length) {
        $('ck-simpan').addEventListener('click', async function () {
          var tgl = $('ck-tgl').value, lok, dipilih = null;
          if (objekOk) { dipilih = $('ck-objek') ? cariObjek($('ck-objek').value) : null; lok = dipilih ? dipilih.nama : ''; if (!dipilih) { $('ck-pesan').textContent = 'Pilih tempat yang diperiksa dulu.'; return; } }
          else lok = String($('ck-lok').value || '').trim();
          var jw = jawaban();
          var kosong = soal.filter(function (q) { return !jw[q.kode]; }).length;
          if (!tgl || !lok) { $('ck-pesan').textContent = 'Tanggal dan ' + cfg.lokasiLabel.toLowerCase() + ' wajib diisi.'; return; }
          if (kosong) { $('ck-pesan').textContent = 'Masih ada ' + kosong + ' pertanyaan yang belum dijawab.'; return; }
          var h = hitung(soal, jw);
          var st = (batas == null || h.skor === null) ? '-' : (h.skor >= batas ? 'memenuhi' : 'tidak_memenuhi');
          $('ck-pesan').textContent = 'Menyimpan...';
          var baru = {
            tanggal: tgl, lokasi: lok, jawaban: jw, skor: h.skor, status: st, batas_skor: batas,
            catatan: $('ck-cat').value.trim() || null,
            temuan: h.tidak.length ? h.tidak.map(function (q) { return '• ' + q.pertanyaan; }).join('\n') : null
          };
          if (objekOk) {
            baru.objek_id = dipilih.id;
            baru.pemeriksa = $('ck-pem').value.trim() || null;
            baru.rekomendasi = $('ck-rek').value.trim() || null;
            baru.batas_perbaikan = $('ck-bts').value || null;
            if (cfg.jenis) { baru.jenis_objek = dipilih.jenis || 'Lainnya'; baru.nama_objek = dipilih.nama; baru.alamat = [dipilih.alamat, dipilih.desa, dipilih.kecamatan].filter(Boolean).join(', ') || null; }
          } else if (cfg.jenis) baru.jenis_objek = $('ck-jenis').value;
          var res = await App.db.from(cfg.tabel).insert(baru).select('id');
          if (res.error) { $('ck-pesan').textContent = 'Gagal menyimpan: ' + (res.error.message || 'coba lagi'); return; }
          var id = res.data && res.data[0] && res.data[0].id;
          if (h.tidak.length && window.TL) {
            await TL.catat(h.tidak.map(function (q) {
              return { tanggal: tgl, kategori: cfg.kategori, sumber: cfg.tabel, sumber_id: id, lokasi: lok,
                parameter: q.pertanyaan, hasil: cfg.hasilTidak || 'Tidak sesuai', uraian: 'belum memenuhi (' + (q.dasar_aturan || '') + ')' };
            }));
          }
          var ringkas = 'Tersimpan' + (h.skor !== null && batas != null ? '. Skor ' + angka(h.skor) : '') +
            (h.tidak.length ? '. ' + h.tidak.length + ' item dicatat sebagai temuan.' : '.');
          var antre = [];
          if (fotoOk && !App.demo) Object.keys(stFoto).forEach(function (k) { stFoto[k].forEach(function (f) { antre.push({ butir: k, f: f }); }); });
          if (!antre.length) { await App.tabs[cfg.tab](el); $('ck-pesan').textContent = ringkas; return; }

          // Catatan sudah tersimpan: kunci tombol Simpan agar tidak dobel, lalu unggah foto satu per satu
          $('ck-simpan').disabled = true;
          var unggahLagi = async function () {
            var sisa = [];
            for (var i = 0; i < antre.length; i++) {
              $('ck-pesan').textContent = ringkas + ' Mengunggah foto ' + (i + 1) + ' dari ' + antre.length + '...';
              var u = await FOTO.unggah(cfg.tabel, id, antre[i].butir, antre[i].f);
              if (!u.ok) sisa.push(antre[i]);
            }
            antre = sisa;
            if (!antre.length) { await App.tabs[cfg.tab](el); $('ck-pesan').textContent = ringkas + ' Semua foto terunggah.'; return; }
            daftar();
            $('ck-pesan').innerHTML = esc(ringkas) + '<br><span class="lewat">' + antre.length + ' foto belum terunggah (sinyal lemah?). Catatan sudah aman tersimpan.</span><br>' +
              '<button type="button" class="chip" id="ck-ulang">Coba unggah lagi</button> <button type="button" class="chip" id="ck-lewati">Selesai tanpa foto itu</button>';
            $('ck-ulang').onclick = unggahLagi;
            $('ck-lewati').onclick = async function () { await App.tabs[cfg.tab](el); $('ck-pesan').textContent = ringkas + ' ' + antre.length + ' foto tidak diunggah.'; };
          };
          await unggahLagi();
        });
      }
      daftar();
      if (window.TL && $('tl-box')) TL.panel($('tl-box'), cfg.kategori);
    };
  };

  // ===== Pendaftaran checklist =====
  CEK({
    tab: 'tpm_cek', judul: 'Inspeksi tempat pengelolaan pangan (TPP)', judulCetak: 'HASIL INSPEKSI KESEHATAN LINGKUNGAN TEMPAT PENGELOLAAN PANGAN',
    modul: 'tpm', tabel: 'tpm_inspeksi', kategori: 'tpm', objekKat: 'tpm', foto: true,
    opsi: [['ya', 'Ya, sesuai'], ['tidak', 'Tidak sesuai'], ['tb', 'Tidak berlaku']],
    lokasi: 'teks', lokasiLabel: 'Nama TPP / dapur', lokasiContoh: 'mis. Instalasi gizi, Kantin karyawan',
    batasKunci: 'batas_skor_tpm', batasDefault: 80,
    info: 'Pertanyaan disusun dari Persyaratan Kesehatan Pangan Olahan Siap Saji (Permenkes 2/2023 Lampiran D). Batas laik mengikuti Permenkes 11/2025 (nilai minimal 80). Jawaban "Tidak sesuai" otomatis dicatat sebagai temuan.'
  });
  CEK({
    tab: 'ttu_cek', judul: 'Inspeksi tempat dan fasilitas umum (TFU/TTU)', judulCetak: 'HASIL INSPEKSI KESEHATAN LINGKUNGAN TEMPAT DAN FASILITAS UMUM',
    modul: 'ttu', tabel: 'ikl_inspeksi', kategori: 'ttu', objekKat: 'ttu', foto: true,
    jenis: ['Sekolah / madrasah', 'Pondok pesantren', 'Tempat ibadah', 'Pasar', 'Hotel / penginapan', 'Terminal / stasiun / pelabuhan', 'Tempat rekreasi', 'Sarana olahraga / kolam renang', 'Perkantoran', 'Fasilitas kesehatan', 'Lainnya'],
    opsi: [['ya', 'Ya, sesuai'], ['tidak', 'Tidak sesuai'], ['tb', 'Tidak berlaku']],
    lokasi: 'teks', lokasiLabel: 'Nama tempat', lokasiContoh: 'mis. SD Negeri 1, Masjid Raya, Pasar Sentral',
    batasKunci: 'batas_skor_ttu', batasDefault: 70,
    info: 'Pertanyaan disusun dari SBMKL dan Persyaratan Kesehatan media air, udara, sarana dan bangunan, serta vektor (Permenkes 2/2023 Lampiran). Batas laik 70 mengikuti batas IKL laik sehat di Permenkes 11/2025 dan bisa diubah di pengaturan. Jawaban "Tidak sesuai" otomatis menjadi temuan.'
  });
  CEK({
    tab: 'k3_tahunan', judul: 'Laporan tahunan K3 fasyankes', judulCetak: 'LAPORAN TAHUNAN KESELAMATAN DAN KESEHATAN KERJA DI FASILITAS PELAYANAN KESEHATAN',
    modul: 'k3_tahunan', tabel: 'k3_tahunan', kategori: 'k3',
    opsi: [['ya', 'Ada'], ['tidak', 'Tidak'], ['tb', 'Tidak berlaku']],
    lokasi: 'tahun', lokasiLabel: 'Tahun pelaporan',
    batasKunci: '', batasDefault: null, hasilTidak: 'tidak ada',
    info: 'Format mengikuti Laporan Tahunan K3 Fasyankes (Permenkes 52/2018 BAB III). Item "Tidak" otomatis dicatat sebagai temuan untuk ditindaklanjuti.'
  });
})();
