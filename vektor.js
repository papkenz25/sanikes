(function () {
  var TULIS = ['admin_fasyankes', 'petugas_kesling', 'petugas_ruangan'];

  function angka(n) { return Number(n).toLocaleString('id-ID', { maximumFractionDigits: 4 }); }
  function n(s) { return s === '' || s == null ? NaN : Number(s); }
  function hariIni() { return tglLokal(new Date()); }
  function batasTeks(b) {
    if (!b) return '';
    if (b.min != null) return 'minimal ' + angka(b.min);
    if (b.maks != null) return 'kurang dari ' + angka(b.maks);
    return '';
  }
  function status(b, v) {
    if (!b || v === '' || v == null || isNaN(Number(v))) return '';
    if (b.min == null && b.maks == null) return '';
    var x = Number(v);
    if (b.min != null) return x >= Number(b.min) ? 'memenuhi' : 'tidak_memenuhi';
    return Number(b.maks) === 0 ? (x <= 0 ? 'memenuhi' : 'tidak_memenuhi') : (x < Number(b.maks) ? 'memenuhi' : 'tidak_memenuhi');
  }
  function lencana(s, b) {
    if (s === 'memenuhi') return '<span class="ok">✓ memenuhi</span>';
    if (s === 'tidak_memenuhi') return '<span class="lewat">✗ ' + ((b && b.min != null) ? 'di bawah baku mutu' : 'melebihi baku mutu') + '</span>';
    return '';
  }
  function uraian(b) { return ((b && b.min != null) ? 'di bawah baku mutu' : 'melebihi baku mutu') + ' (batas ' + batasTeks(b) + ')'; }

  // ===== RUMUS (Permenkes 2/2023, Lampiran, Tabel 24 dan 25) =====
  function persenPos(per, pos, kata) {
    if (isNaN(per) || isNaN(pos)) return null;
    if (per <= 0) return { galat: 'Jumlah yang diamati harus lebih dari 0.' };
    if (pos < 0 || pos > per) return { galat: 'Jumlah positif tidak boleh lebih dari yang diamati.' };
    return { nilai: Number((pos / per * 100).toFixed(4)), ket: pos + ' dari ' + per + ' ' + kata };
  }
  function perJam(v, bagiMalam) {
    var jml = n(v.jml), kol = n(v.kol), jam = n(v.jam), mnt = n(v.mnt);
    if ([jml, kol, jam, mnt].some(isNaN)) return null;
    if (jml < 0) return { galat: 'Jumlah nyamuk tidak boleh negatif.' };
    if (kol <= 0 || jam <= 0 || mnt <= 0 || mnt > 60) return { galat: 'Penangkap dan lama harus lebih dari 0, menit maksimal 60.' };
    var ef = jam * mnt / 60;
    var nilai = bagiMalam ? jml / (kol * ef / 12) : jml / (kol * ef);
    return { nilai: Number(nilai.toFixed(4)), ket: jml + ' nyamuk, ' + kol + ' penangkap, ' + angka(ef) + ' jam efektif' };
  }
  function rasio(a, b, namaB, kata) {
    if (isNaN(a) || isNaN(b)) return null;
    if (b <= 0) return { galat: namaB + ' harus lebih dari 0.' };
    if (a < 0) return { galat: 'Jumlah tidak boleh negatif.' };
    return { nilai: Number((a / b).toFixed(4)), ket: a + ' ' + kata + ' dari ' + b + ' ' + namaB.toLowerCase() };
  }
  function F_JAM(jam) {
    return [
      { k: 'jml', l: 'Jumlah nyamuk tertangkap', ph: 'mis. 10' },
      { k: 'kol', l: 'Jumlah penangkap (kolektor)', ph: 'mis. 5' },
      { k: 'jam', l: 'Lama penangkapan (jam)', v: jam },
      { k: 'mnt', l: 'Menit menangkap per jam', v: '40' }
    ];
  }

  var JENIS = {
    abj: {
      hasil: 'ABJ (%), dihitung otomatis',
      f: [{ k: 'per', l: 'Jumlah tempat yang diperiksa', ph: 'mis. 50' }, { k: 'pos', l: 'Jumlah yang ditemukan jentik', ph: 'mis. 2' }],
      hitung: function (v) {
        var per = n(v.per), pos = n(v.pos);
        if (isNaN(per) || isNaN(pos)) return null;
        if (per <= 0) return { galat: 'Jumlah yang diperiksa harus lebih dari 0.' };
        if (pos < 0 || pos > per) return { galat: 'Jumlah berjentik tidak boleh lebih dari yang diperiksa.' };
        return { nilai: Math.floor((per - pos) * 1000 / per) / 10, ket: (per - pos) + ' dari ' + per + ' bebas jentik' };
      }
    },
    habitat: {
      hasil: 'Indeks habitat (%), dihitung otomatis',
      f: [{ k: 'per', l: 'Jumlah habitat yang diamati', ph: 'mis. 30' }, { k: 'pos', l: 'Jumlah habitat positif larva', ph: 'mis. 5' }],
      hitung: function (v) { return persenPos(n(v.per), n(v.pos), 'habitat positif larva'); }
    },
    trap: {
      hasil: 'Success trap (%), dihitung otomatis',
      f: [{ k: 'per', l: 'Jumlah perangkap yang dipasang', ph: 'mis. 100' }, { k: 'pos', l: 'Jumlah perangkap yang mendapat tikus', ph: 'mis. 1' }],
      hitung: function (v) { return persenPos(n(v.per), n(v.pos), 'perangkap mendapat tikus'); }
    },
    mbr: { hasil: 'MBR (gigitan per orang per malam), dihitung otomatis', f: F_JAM('12'), hitung: function (v) { return perJam(v, true); } },
    mhd: { hasil: 'MHD (nyamuk per orang per jam), dihitung otomatis', f: F_JAM('6'), hitung: function (v) { return perJam(v, false); } },
    istirahat: { hasil: 'Angka istirahat (nyamuk per orang per jam), dihitung otomatis', f: F_JAM('12'), hitung: function (v) { return perJam(v, false); } },
    pinjal: {
      hasil: 'Indeks pinjal, dihitung otomatis',
      f: [{ k: 'a', l: 'Jumlah pinjal (khusus: hanya Xenopsylla cheopis; umum: semua pinjal)', ph: 'mis. 40' }, { k: 'b', l: 'Jumlah tikus yang diperiksa', ph: 'mis. 50' }],
      hitung: function (v) { return rasio(n(v.a), n(v.b), 'Tikus yang diperiksa', 'pinjal'); }
    },
    kecoa: {
      hasil: 'Indeks populasi kecoa, dihitung otomatis',
      f: [{ k: 'a', l: 'Jumlah kecoa tertangkap', ph: 'mis. 6' }, { k: 'b', l: 'Jumlah perangkap (sticky trap)', ph: 'mis. 4' }],
      hitung: function (v) { return rasio(n(v.a), n(v.b), 'Perangkap', 'kecoa'); }
    },
    lalat: {
      hasil: 'Indeks populasi lalat, dihitung otomatis',
      f: [{ k: 'teks', l: '10 kali pengamatan (30 detik per pengamatan), pisahkan koma', ph: 'mis. 2,2,4,3,2,0,1,1,2,1', teks: true }],
      hitung: function (v) {
        var a = String(v.teks || '').split(/[,;\s]+/).filter(function (x) { return x !== ''; });
        if (!a.length) return null;
        a = a.map(Number);
        if (a.some(function (x) { return isNaN(x) || x < 0; })) return { galat: 'Isi hanya angka, pisahkan dengan koma.' };
        if (a.length !== 10) return { galat: 'Perlu tepat 10 pengamatan (sekarang ' + a.length + ').' };
        var top = a.slice().sort(function (x, y) { return y - x; }).slice(0, 5);
        var rata = top.reduce(function (s, x) { return s + x; }, 0) / 5;
        return { nilai: Number(rata.toFixed(4)), ket: '5 nilai tertinggi: ' + top.join(', ') };
      }
    },
    infektif: { hasil: 'Jumlah yang mengandung patogen (hasil lab)' },
    langsung: { hasil: 'Hasil pengamatan (angka)' }
  };

  function jenisHitung(nama) {
    var s = String(nama || '').toLowerCase();
    if (s.indexOf('infektif') > -1) return 'infektif';
    if (s.indexOf('abj') > -1 || s.indexOf('bebas jentik') > -1) return 'abj';
    if (s.indexOf('habitat') > -1) return 'habitat';
    if (s.indexOf('success') > -1) return 'trap';
    if (s.indexOf('mbr') > -1 || s.indexOf('man biting') > -1) return 'mbr';
    if (s.indexOf('mhd') > -1 || s.indexOf('man hour') > -1) return 'mhd';
    if (s.indexOf('istirahat') > -1 || s.indexOf('resting') > -1) return 'istirahat';
    if (s.indexOf('pinjal') > -1) return 'pinjal';
    if (s.indexOf('lalat') > -1) return 'lalat';
    if (s.indexOf('kecoa') > -1) return 'kecoa';
    return 'langsung';
  }
  function isianHtml(f) {
    if (f.teks) return '<label>' + esc(f.l) + '</label><input data-f="' + f.k + '" placeholder="' + esc(f.ph || '') + '">';
    return '<label>' + esc(f.l) + '</label><input type="number" min="0" step="any" inputmode="decimal" data-f="' + f.k + '"' +
      (f.v ? ' value="' + esc(f.v) + '"' : '') + ' placeholder="' + esc(f.ph || '') + '">';
  }

  App.tabs.vektor_catat = async function (el) {
    if (App.profil.peran === 'admin_papkenz') {
      el.innerHTML = '<div class="info">Data ini milik fasyankes. Gunakan akun fasyankes.</div>';
      return;
    }
    var tulis = TULIS.indexOf(App.profil.peran) > -1;
    var baku = [], peta = {}, rows = [];
    var r = await App.db.from('master_bakumutu').select('*').eq('modul', 'vektor').eq('aktif', true)
      .lte('berlaku_mulai', hariIni()).order('berlaku_mulai', { ascending: false });
    (r.data || []).forEach(function (b) { if (!peta[b.parameter]) { peta[b.parameter] = b; baku.push(b); } });
    baku.sort(function (a, b) { return a.parameter.localeCompare(b.parameter); });
    var rg = await App.db.from('ruangan').select('nama').eq('aktif', true);
    var ruang = (rg.data || []).map(function (x) { return '<option value="' + esc(x.nama) + '">'; }).join('');

    var form = tulis ?
      '<label>Tanggal</label><input type="date" id="vk-tgl" value="' + hariIni() + '">' +
      '<label>Lokasi</label><input id="vk-lok" list="vk-lokl" placeholder="mis. Dapur, halaman belakang"><datalist id="vk-lokl">' + ruang + '</datalist>' +
      '<label>Jenis pengamatan</label><select id="vk-jenis">' +
        baku.map(function (b) { return '<option>' + esc(b.parameter) + '</option>'; }).join('') + '<option value="__lain">Lainnya (tanpa baku mutu)</option></select>' +
      '<div id="vk-batas" class="muted"></div>' +
      '<div id="vk-f"></div><div id="vk-hit" class="muted"></div>' +
      '<label id="vk-lbl">Hasil pengamatan (angka)</label><input type="number" step="any" inputmode="decimal" id="vk-nilai"><div id="vk-st"></div>' +
      '<label>Tindakan / keterangan</label><input id="vk-tin" placeholder="mis. fogging, pasang perangkap, ganti umpan">' +
      '<button type="button" id="vk-simpan">Simpan</button><div class="pesan" id="vk-pesan"></div>' : '';
    el.innerHTML = '<h3 style="margin-top:0">Pengamatan vektor</h3>' + form + '<div id="tl-box"></div><h3>Catatan terbaru</h3><div id="vk-daftar"></div>';

    function bakuBaris(x) {
      if (x.batas_min != null || x.batas_maks != null) return { min: x.batas_min, maks: x.batas_maks };
      return peta[x.jenis_vektor];
    }
    function ketBaris(x) {
      if (x.rincian && x.rincian.ket) return ' (' + x.rincian.ket + ')';
      if (x.jumlah_diperiksa != null) return ' (' + (x.jumlah_diperiksa - (x.jumlah_positif || 0)) + ' dari ' + x.jumlah_diperiksa + ' bebas jentik)';
      return '';
    }
    async function daftar(pesan) {
      var q = App.db.from('vektor').select('*');
      if (window.KL) q = KL.filter(q, 'vektor');
      var res = await q.order('tanggal', { ascending: false }).order('dibuat', { ascending: false }).limit(50);
      if (res.error) { $('vk-daftar').innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
      rows = res.data;
      $('vk-daftar').innerHTML = (pesan ? '<div class="pesan">' + esc(pesan) + '</div>' : '') + (window.KL ? KL.saklar('vektor') : '') +
        (rows.length ? rows.map(function (x) {
          var b = bakuBaris(x);
          var st = x.status && x.status !== '-' ? x.status : status(b, x.jumlah_temuan);
          return '<div class="baris"' + (x.dihapus ? ' style="opacity:.6"' : '') + '><b>' + esc(x.jenis_vektor || '') + '</b>: ' +
            (x.jumlah_temuan != null ? esc(angka(x.jumlah_temuan)) : '-') + esc(ketBaris(x)) + ' ' + lencana(st, b) +
            '<br><span class="muted">' + esc(x.tanggal) + ' · ' + esc(x.lokasi || '') + (x.tindakan ? ' · ' + esc(x.tindakan) : '') + '</span>' +
            (window.KL ? KL.tombol(x) : '') + '</div>';
        }).join('') : '<p class="muted">Belum ada catatan.</p>');
    }

    async function catatTemuan(id, tgl, lok, jenis, nilai, ket, b) {
      if (!window.TL) return null;
      var hs = angka(nilai) + (ket ? ' (' + ket + ')' : '');
      var ada = await App.db.from('temuan').select('id').eq('sumber', 'vektor').eq('sumber_id', id).eq('status', 'terbuka');
      if (ada.data && ada.data.length) return (await App.db.from('temuan').update({ hasil: hs, tanggal: tgl, lokasi: lok }).eq('id', ada.data[0].id)).error;
      return await TL.catat([{ tanggal: tgl, kategori: 'vektor', sumber: 'vektor', sumber_id: id, lokasi: lok, parameter: jenis, hasil: hs, uraian: uraian(b) }]);
    }

    if (window.KL) KL.pasang($('vk-daftar'), {
      tabel: 'vektor',
      cari: function (id) { return rows.filter(function (x) { return x.id === id; })[0]; },
      bidang: function (x) {
        var sp = JENIS[jenisHitung(x.jenis_vektor)];
        var data = (x.rincian && x.rincian.data) || (x.jumlah_diperiksa != null ? { per: x.jumlah_diperiksa, pos: x.jumlah_positif } : null);
        var f = [
          { k: 'tanggal', l: 'Tanggal', tipe: 'tanggal', nilai: x.tanggal },
          { k: 'lokasi', l: 'Lokasi', tipe: 'teks', nilai: x.lokasi }
        ];
        if (sp.f && data) sp.f.forEach(function (d) { f.push({ k: 'f_' + d.k, l: d.l, tipe: d.teks ? 'teks' : 'angka', nilai: data[d.k] }); });
        else f.push({ k: 'nilai', l: sp.hasil.replace(', dihitung otomatis', ''), tipe: 'angka', nilai: x.jumlah_temuan });
        f.push({ k: 'tindakan', l: 'Tindakan / keterangan', tipe: 'teks', nilai: x.tindakan });
        return f;
      },
      simpan: async function (x, is) {
        if (!is.tanggal || !(is.lokasi || '').trim()) return { galat: 'Tanggal dan lokasi wajib diisi.' };
        var sp = JENIS[jenisHitung(x.jenis_vektor)];
        var pakaiF = Object.keys(is).some(function (k) { return k.indexOf('f_') === 0; });
        var nilai, isian = null, h = null;
        if (pakaiF) {
          isian = {};
          Object.keys(is).forEach(function (k) { if (k.indexOf('f_') === 0) isian[k.slice(2)] = is[k]; });
          h = sp.hitung(isian);
          if (!h || h.galat) return { galat: h && h.galat ? h.galat : 'Lengkapi isian perhitungan.' };
          nilai = h.nilai;
        } else {
          if (is.nilai === '' || isNaN(Number(is.nilai)) || Number(is.nilai) < 0) return { galat: 'Hasil harus angka 0 atau lebih.' };
          nilai = Number(is.nilai);
        }
        var b = bakuBaris(x) || {};
        var st = status(b, nilai);
        var abj = jenisHitung(x.jenis_vektor) === 'abj';
        var ubah = {
          tanggal: is.tanggal, lokasi: is.lokasi.trim(), tindakan: (is.tindakan || '').trim() || null,
          jumlah_temuan: nilai, status: st || '-',
          batas_min: b.min != null ? Number(b.min) : null, batas_maks: b.maks != null ? Number(b.maks) : null
        };
        if (!x.dasar_aturan && peta[x.jenis_vektor]) ubah.dasar_aturan = peta[x.jenis_vektor].dasar_aturan || null;
        if (pakaiF) {
          ubah.rincian = { data: isian, ket: h.ket };
          if (abj) { ubah.jumlah_diperiksa = Number(isian.per); ubah.jumlah_positif = Number(isian.pos); }
        }
        return {
          ubah: ubah,
          setelah: async function () {
            if (st === 'tidak_memenuhi') await catatTemuan(x.id, is.tanggal, ubah.lokasi, x.jenis_vektor, nilai, h ? h.ket : '', b);
          }
        };
      },
      selesai: function (m) { daftar(m); if (window.TL && $('tl-box')) TL.panel($('tl-box'), 'vektor'); }
    });

    if (tulis) {
      function spesifik() { return JENIS[jenisHitung($('vk-jenis').value)]; }
      function ambilIsian() {
        var o = {};
        $('vk-f').querySelectorAll('[data-f]').forEach(function (i) { o[i.getAttribute('data-f')] = i.value; });
        return o;
      }
      function segar(ulang) {
        var j = $('vk-jenis').value, b = peta[j], sp = spesifik();
        if (ulang) $('vk-f').innerHTML = sp.f ? sp.f.map(isianHtml).join('') : '';
        var otomatis = !!sp.hitung;
        $('vk-nilai').readOnly = otomatis;
        $('vk-lbl').textContent = sp.hasil;
        if (otomatis) {
          var h = sp.hitung(ambilIsian());
          if (h && h.nilai != null) { $('vk-nilai').value = h.nilai; $('vk-hit').textContent = h.ket + ' = ' + angka(h.nilai); }
          else { $('vk-nilai').value = ''; $('vk-hit').textContent = h && h.galat ? h.galat : ''; }
        } else {
          if (ulang) $('vk-nilai').value = '';
          $('vk-hit').textContent = '';
        }
        $('vk-batas').textContent = b ? 'Batas: ' + batasTeks(b) + ' (' + (b.satuan || '') + ')' : 'Tidak ada baku mutu untuk jenis ini.';
        $('vk-st').innerHTML = lencana(status(b, $('vk-nilai').value), b);
      }
      $('vk-jenis').addEventListener('change', function () { segar(true); });
      $('vk-nilai').addEventListener('input', function () { segar(false); });
      $('vk-f').addEventListener('input', function () { segar(false); });
      $('vk-simpan').addEventListener('click', async function () {
        var tgl = $('vk-tgl').value, lok = $('vk-lok').value.trim();
        var pilih = $('vk-jenis').value, sp = spesifik();
        var isian = ambilIsian();
        var h = sp.hitung ? sp.hitung(isian) : null;
        if (!tgl || !lok) { $('vk-pesan').textContent = 'Tanggal dan lokasi wajib diisi.'; return; }
        if (sp.hitung && !(h && h.nilai != null)) { $('vk-pesan').textContent = 'Lengkapi isian perhitungan di atas dengan benar.'; return; }
        if (!sp.hitung && ($('vk-nilai').value === '' || Number($('vk-nilai').value) < 0)) { $('vk-pesan').textContent = 'Hasil wajib diisi (0 atau lebih).'; return; }
        var nilai = sp.hitung ? h.nilai : Number($('vk-nilai').value);
        var jenis = pilih === '__lain' ? 'Lainnya' : pilih;
        var b = peta[pilih];
        var st = status(b, nilai);
        var abj = jenisHitung(pilih) === 'abj';
        $('vk-pesan').textContent = 'Menyimpan...';
        var s = await App.db.from('vektor').insert({
          tanggal: tgl, lokasi: lok, jenis_vektor: jenis, jumlah_temuan: nilai, status: st || '-',
          jumlah_diperiksa: abj ? Number(isian.per) : null,
          jumlah_positif: abj ? Number(isian.pos) : null,
          rincian: sp.hitung ? { data: isian, ket: h.ket } : null,
          batas_min: b && b.min != null ? Number(b.min) : null,
          batas_maks: b && b.maks != null ? Number(b.maks) : null,
          dasar_aturan: b ? b.dasar_aturan || null : null,
          tindakan: $('vk-tin').value.trim() || null
        }).select('id');
        if (s.error) { $('vk-pesan').textContent = 'Gagal menyimpan: ' + (s.error.message || 'coba lagi'); return; }
        var tidak = st === 'tidak_memenuhi';
        var er = tidak ? await catatTemuan(s.data && s.data[0] && s.data[0].id, tgl, lok, jenis, nilai, h ? h.ket : '', b) : null;
        await App.tabs.vektor_catat(el);
        $('vk-pesan').textContent = tidak && window.TL ? (er ? 'Tersimpan, tetapi temuan gagal dicatat.' : 'Tersimpan. Tidak memenuhi baku mutu dan dicatat sebagai temuan, lihat saran di bawah.') : 'Tersimpan.';
      });
      segar(true);
    }
    daftar();
    if (window.TL && $('tl-box')) TL.panel($('tl-box'), 'vektor');
  };
})();
