(function () {
  var TULIS = ['admin_fasyankes', 'petugas_kesling', 'petugas_ruangan'];
  var JWB = [['', '- pilih -'], ['ya', 'Ya, sesuai'], ['tidak', 'Tidak sesuai'], ['tb', 'Tidak berlaku']];

  function hariIni() { return tglLokal(new Date()); }
  function bisaTulis() { return TULIS.indexOf(App.profil.peran) > -1; }
  function angka(n) { return Number(n).toLocaleString('id-ID', { maximumFractionDigits: 1 }); }
  function lencana(s) { return s === 'memenuhi' ? '<span class="ok">✓ memenuhi</span>' : (s === 'tidak_memenuhi' ? '<span class="lewat">✗ tidak memenuhi</span>' : ''); }

  function hitungSkor(soal, jawab) {
    var ya = 0, total = 0, tidak = [];
    soal.forEach(function (q) {
      var j = jawab[q.kode];
      var b = Number(q.bobot) || 1;
      if (j === 'ya') { ya += b; total += b; }
      else if (j === 'tidak') { total += b; tidak.push(q); }
    });
    return { skor: total > 0 ? Math.round(ya / total * 1000) / 10 : null, tidak: tidak };
  }

  App.tabs.sanitasi_cek = async function (el) {
    if (App.profil.peran === 'admin_papkenz') { el.innerHTML = '<div class="info">Data ini milik fasyankes. Gunakan akun fasyankes.</div>'; return; }
    var rows = [], soalSemua = [], soal = [];
    var r = await Promise.all([
      App.db.from('master_checklist').select('*').eq('modul', 'sanitasi').eq('aktif', true).order('urutan'),
      App.db.from('ruangan').select('id,nama').eq('aktif', true).order('nama'),
      window.PENGATURAN ? PENGATURAN.ambil() : Promise.resolve({})
    ]);
    soalSemua = (r[0].data || []);
    var ruang = r[1].data || [];
    var batas = Number((r[2] || {}).batas_skor_sanitasi) || 80;

    var form = bisaTulis()
      ? (soalSemua.length
        ? '<label>Tanggal</label><input type="date" id="sn-tgl" value="' + hariIni() + '">' +
          '<label>Yang diinspeksi</label><select id="sn-lok"><option value="">Seluruh bangunan (lokasi, atap, air, toilet umum, sampah, limbah)</option>' +
          ruang.map(function (x) { return '<option value="' + x.id + '">Ruangan: ' + esc(x.nama) + '</option>'; }).join('') + '</select>' +
          '<p class="muted">Skor = jawaban "Ya" ÷ (Ya + Tidak) × 100. Batas memenuhi: ' + batas + '. "Tidak berlaku" tidak dihitung. Setiap jawaban "Tidak sesuai" otomatis dicatat sebagai temuan.</p>' +
          '<div id="sn-soal"></div><div id="sn-skor" class="info"></div>' +
          '<label>Catatan (opsional)</label><input id="sn-cat">' +
          '<button type="button" id="sn-simpan">Simpan inspeksi</button><div class="pesan" id="sn-pesan"></div>'
        : '<div class="info waspada">Daftar pertanyaan inspeksi belum tersedia di database.</div>')
      : '';
    el.innerHTML = '<h3 style="margin-top:0">Inspeksi sanitasi bangunan</h3>' + form + '<div id="tl-box"></div><h3>Riwayat inspeksi</h3><div id="sn-daftar"></div>';

    function jawaban() {
      var o = {};
      el.querySelectorAll('[data-q]').forEach(function (s) { if (s.value) o[s.dataset.q] = s.value; });
      return o;
    }
    function segarSkor() {
      var h = hitungSkor(soal, jawaban());
      var terisi = Object.keys(jawaban()).length;
      $('sn-skor').innerHTML = 'Terjawab ' + terisi + ' dari ' + soal.length + ' pertanyaan.' +
        (h.skor !== null ? '<br>Skor sementara: <b>' + angka(h.skor) + '</b> ' + lencana(h.skor >= batas ? 'memenuhi' : 'tidak_memenuhi') : '');
    }
    function tampilSoal() {
      var lingkup = $('sn-lok').value ? 'ruangan' : 'bangunan';
      soal = soalSemua.filter(function (q) { return (q.lingkup || 'ruangan') === lingkup; });
      var bag = '';
      $('sn-soal').innerHTML = soal.map(function (q) {
        var h = q.bagian !== bag ? '<h3>' + esc(q.bagian || '') + '</h3>' : '';
        bag = q.bagian;
        return h + '<div class="baris">' + esc(q.pertanyaan) +
          '<select data-q="' + esc(q.kode) + '">' + JWB.map(function (o) { return '<option value="' + o[0] + '">' + o[1] + '</option>'; }).join('') + '</select></div>';
      }).join('');
      $('sn-soal').onchange = segarSkor;
      segarSkor();
    }

    async function daftar(pesan) {
      var q = App.db.from('sanitasi_checklist').select('*, ruangan(nama)');
      if (window.KL) q = KL.filter(q, 'sanitasi_checklist');
      var res = await q.order('tanggal', { ascending: false }).order('dibuat', { ascending: false }).limit(30);
      if (res.error) { $('sn-daftar').innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
      rows = res.data;
      $('sn-daftar').innerHTML = (pesan ? '<div class="pesan">' + esc(pesan) + '</div>' : '') + (window.KL ? KL.saklar('sanitasi_checklist') : '') +
        (rows.length ? rows.map(function (x) {
          var jml = 0;
          Object.keys(x.jawaban || {}).forEach(function (k) { if (x.jawaban[k] === 'tidak') jml++; });
          return '<div class="baris"' + (x.dihapus ? ' style="opacity:.6"' : '') + '><b>' + esc(x.ruangan ? x.ruangan.nama : 'Seluruh bangunan') + '</b> · skor ' +
            (x.skor != null ? angka(x.skor) : '-') + ' ' + lencana(x.status) +
            '<br><span class="muted">' + esc(x.tanggal) + ' · ' + jml + ' item tidak sesuai' + (x.catatan ? ' · ' + esc(x.catatan) : '') + '</span>' +
            (x.temuan ? '<details><summary class="muted" style="cursor:pointer">Lihat item tidak sesuai</summary><div class="muted">' + esc(x.temuan).replace(/\n/g, '<br>') + '</div></details>' : '') +
            (window.KL ? KL.tombol(x) : '') + '</div>';
        }).join('') : '<p class="muted">Belum ada inspeksi.</p>');
    }

    if (window.KL) KL.pasang($('sn-daftar'), {
      tabel: 'sanitasi_checklist',
      cari: function (id) { return rows.filter(function (x) { return x.id === id; })[0]; },
      bidang: function (x) {
        return [
          { k: 'tanggal', l: 'Tanggal', tipe: 'tanggal', nilai: x.tanggal },
          { k: 'catatan', l: 'Catatan', tipe: 'teks', nilai: x.catatan }
        ];
      },
      simpan: async function (x, is) {
        if (!is.tanggal) return { galat: 'Tanggal wajib diisi.' };
        return { ubah: { tanggal: is.tanggal, catatan: (is.catatan || '').trim() || null } };
      },
      selesai: function (m) { daftar(m); if (window.TL && $('tl-box')) TL.panel($('tl-box'), 'sanitasi'); }
    });

    if (bisaTulis() && soalSemua.length) {
      $('sn-lok').addEventListener('change', tampilSoal);
      $('sn-simpan').addEventListener('click', async function () {
        var tgl = $('sn-tgl').value, rid = $('sn-lok').value || null;
        var jw = jawaban();
        var kosong = soal.filter(function (q) { return !jw[q.kode]; }).length;
        if (!tgl) { $('sn-pesan').textContent = 'Tanggal wajib diisi.'; return; }
        if (kosong) { $('sn-pesan').textContent = 'Masih ada ' + kosong + ' pertanyaan yang belum dijawab.'; return; }
        var h = hitungSkor(soal, jw);
        var st = h.skor === null ? '-' : (h.skor >= batas ? 'memenuhi' : 'tidak_memenuhi');
        var namaLok = rid ? (ruang.filter(function (x) { return x.id === rid; })[0] || {}).nama : 'Seluruh bangunan';
        $('sn-pesan').textContent = 'Menyimpan...';
        var res = await App.db.from('sanitasi_checklist').insert({
          tanggal: tgl, ruangan_id: rid, lingkup: rid ? 'ruangan' : 'bangunan', jawaban: jw, skor: h.skor, status: st,
          batas_skor: batas, catatan: $('sn-cat').value.trim() || null,
          temuan: h.tidak.length ? h.tidak.map(function (q) { return '• ' + q.pertanyaan; }).join('\n') : null,
          status_tindak_lanjut: h.tidak.length ? 'terbuka' : 'tidak_perlu'
        }).select('id');
        if (res.error) { $('sn-pesan').textContent = 'Gagal menyimpan: ' + (res.error.message || 'coba lagi'); return; }
        var id = res.data && res.data[0] && res.data[0].id;
        if (h.tidak.length && window.TL) {
          await TL.catat(h.tidak.map(function (q) {
            return { tanggal: tgl, kategori: 'sanitasi', sumber: 'sanitasi_checklist', sumber_id: id, lokasi: namaLok,
              parameter: q.pertanyaan, hasil: 'Tidak sesuai', uraian: 'tidak memenuhi persyaratan (' + (q.dasar_aturan || 'Permenkes 2/2023') + ')' };
          }));
        }
        await App.tabs.sanitasi_cek(el);
        $('sn-pesan').textContent = 'Tersimpan. Skor ' + (h.skor !== null ? angka(h.skor) : '-') +
          (h.tidak.length ? ', ' + h.tidak.length + ' item tidak sesuai dicatat sebagai temuan.' : '.');
      });
      tampilSoal();
    }
    daftar();
    if (window.TL && $('tl-box')) TL.panel($('tl-box'), 'sanitasi');
  };
})();
