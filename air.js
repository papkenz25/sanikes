(function () {
  var TULIS = ['admin_fasyankes', 'petugas_kesling', 'petugas_ruangan'];
  var QUAL = { 'Bau': ['Tidak berbau', 'Berbau'], 'Salmonela': ['Negatif', 'Positif'], 'Shigela': ['Negatif', 'Positif'], 'Vibrio cholera': ['Negatif', 'Positif'], 'Streptococus': ['Negatif', 'Positif'] };
  var KEL = ['Fisik', 'Kimia', 'Biologi'];
  var SUHU = 'Suhu (selisih dari suhu udara)';
  var KONDISI = ['Baik', 'Perlu perbaikan', 'Mati'];
  var BAU = [['', '-'], ['Tidak berbau', 'Tidak berbau'], ['Berbau', 'Berbau']];
  var G1 = 'width:auto;display:inline-block;padding:6px 14px;margin:6px 6px 0 0;font-size:14px';
  var ICON_OK = '<span class="ok">✓ memenuhi</span>';
  var ICON_NO = '<span class="lewat">✗ tidak memenuhi</span>';

  function angka(n) { return Number(n).toLocaleString('id-ID', { maximumFractionDigits: 4 }); }
  function namaDasar(p) { return String(p || '').replace(' (pengamatan)', ''); }
  function tipe(b) {
    if (b.parameter === SUHU) return 'suhu';
    return b.satuan === 'kualitatif' ? 'kual' : (b.satuan === 'teks' ? 'teks' : 'angka');
  }
  function opsi(b) { return QUAL[namaDasar(b.parameter)] || ['Sesuai', 'Tidak sesuai']; }
  function kel(b) { return KEL.indexOf(b.kelompok) > -1 ? b.kelompok : 'Lainnya'; }
  function batasTeks(b) {
    if (b.min != null && b.maks != null) return angka(b.min) + ' sampai ' + angka(b.maks);
    if (b.maks != null) return '≤ ' + angka(b.maks);
    if (b.min != null) return '≥ ' + angka(b.min);
    return '';
  }
  function status(b, v) {
    if (v === '' || v == null) return '';
    var t = tipe(b);
    if (t === 'teks' || b.pengamatan) return '';
    if (t === 'kual') return v === 'ok' ? 'memenuhi' : (v === 'no' ? 'tidak_memenuhi' : '');
    if (isNaN(Number(v)) || (b.min == null && b.maks == null)) return '';
    var n = Number(v);
    if (b.min != null && n < Number(b.min)) return 'tidak_memenuhi';
    if (b.maks != null && n > Number(b.maks)) return 'tidak_memenuhi';
    return 'memenuhi';
  }
  function lencana(s) { return s === 'memenuhi' ? ICON_OK : (s === 'tidak_memenuhi' ? ICON_NO : ''); }
  function nilaiTeks(x) {
    var t = x.hasil != null ? angka(x.hasil) + (x.satuan && x.satuan !== '-' ? ' ' + x.satuan : '') : (x.catatan || '-');
    if (x.rincian && x.rincian.suhu_air != null) t += ' (air ' + angka(x.rincian.suhu_air) + ' °C, udara ' + angka(x.rincian.suhu_udara) + ' °C)';
    return t;
  }
  function hasilStr(x) {
    if (x.v != null) return angka(x.v) + (x.b.satuan ? ' ' + x.b.satuan : '') + (x.ket ? ' (' + x.ket + ')' : '');
    return x.q || '';
  }
  function uraianStr(b) { var t = batasTeks(b); return 'tidak memenuhi baku mutu' + (t ? ' (batas ' + t + ')' : ''); }
  function snap(b) {
    if (b.pengamatan) return { batas_min: null, batas_maks: null, dasar_aturan: null };
    return { batas_min: b.min != null ? Number(b.min) : null, batas_maks: b.maks != null ? Number(b.maks) : null, dasar_aturan: b.dasar_aturan || null };
  }
  function hariIni() { return tglLokal(new Date()); }
  function nz(v) { return v === '' || v == null ? null : Number(v); }
  function tx(v) { return v != null && v !== '' ? esc(v) : '-'; }
  function nm(v, sat) { return v != null ? esc(angka(v)) + (sat || '') : '-'; }
  function bisaTulis() { return TULIS.indexOf(App.profil.peran) > -1; }
  function gagal(id, err) { $(id).textContent = 'Gagal menyimpan: ' + (err && err.message ? err.message : 'coba lagi'); }
  function num(id) { var v = $(id).value; return v === '' ? null : Number(v); }
  function panelTL(k) { if (window.TL && $('tl-box')) TL.panel($('tl-box'), k); }
  function kelasModul(k) { return k === 'drainase' ? 'ipal_drainase' : 'ipal_media_air_' + (k && k !== 'tidak_ada' ? k : '3_50'); }
  function cekPh(v, l) { if (v === '' || v == null) return ''; var n = Number(v); return (isNaN(n) || n < 0 || n > 14) ? l + ' harus antara 0 dan 14.' : ''; }
  function cekSuhu(v, l) { if (v === '' || v == null) return ''; var n = Number(v); return (isNaN(n) || n < 0 || n > 100) ? l + ' tidak wajar (0 sampai 100 °C).' : ''; }
  function peringatan(el) {
    if (App.profil.peran === 'admin_papkenz') { el.innerHTML = '<div class="info">Data ini milik fasyankes. Gunakan akun fasyankes.</div>'; return true; }
    return false;
  }
  async function pengaturan() { try { return window.PENGATURAN ? await PENGATURAN.ambil() : {}; } catch (e) { return {}; } }
  async function daftarTitik(j) { try { return window.PENGATURAN ? await PENGATURAN.titik(j) : []; } catch (e) { return []; } }
  function tombolAtur(teks) { return (bisaTulis() && App.tabs.pengaturan_fas) ? '<button type="button" style="' + G1 + '" data-atur="1">⚙ ' + teks + '</button>' : ''; }
  function pasangAtur(el) { el.querySelectorAll('[data-atur]').forEach(function (b) { b.onclick = function () { App.tabs.pengaturan_fas(el); }; }); }
  function barisDaftar(x, isi) {
    return '<div class="baris"' + (x.dihapus ? ' style="opacity:.6"' : '') + '>' + isi + (window.KL ? KL.tombol(x) : '') + '</div>';
  }
  function kepalaDaftar(pesan, tabel) {
    return (pesan ? '<div class="pesan">' + esc(pesan) + '</div>' : '') + (window.KL ? KL.saklar(tabel) : '');
  }

  async function ambilBaku(modul) {
    var r = await App.db.from('master_bakumutu').select('*').eq('modul', modul).eq('aktif', true)
      .lte('berlaku_mulai', hariIni()).order('berlaku_mulai', { ascending: false });
    if (r.error) throw r.error;
    var ada = {}, out = [];
    r.data.forEach(function (x) { if (!ada[x.parameter]) { ada[x.parameter] = 1; out.push(x); } });
    return out;
  }

  // ===== ISIAN PARAMETER =====
  function satuBaris(b, i) {
    var t = tipe(b), o, input;
    var info = b.pengamatan ? 'pengamatan, tanpa baku mutu' :
      ((b.min != null || b.maks != null) ? 'batas ' + batasTeks(b) + ((t === 'angka' || t === 'suhu') ? ' ' + (b.satuan || '') : '') : '');
    if (t === 'suhu') {
      return '<div class="baris"><b>Suhu air</b> <span class="muted">selisih suhu air dengan suhu udara, ' + esc(info) + '</span>' +
        '<input type="number" step="any" inputmode="decimal" data-sa="' + i + '" placeholder="suhu air (°C)">' +
        '<input type="number" step="any" inputmode="decimal" data-su="' + i + '" placeholder="suhu udara (°C)">' +
        '<div id="st-' + i + '"></div></div>';
    }
    if (t === 'kual') {
      o = opsi(b);
      input = '<select data-i="' + i + '"><option value="">-</option><option value="ok">' + esc(o[0]) + '</option><option value="no">' + esc(o[1]) + '</option></select>';
    } else if (t === 'teks') {
      input = '<input data-i="' + i + '" placeholder="uraian">';
    } else {
      input = '<input type="number" step="any" inputmode="decimal" data-i="' + i + '" placeholder="hasil">';
    }
    return '<div class="baris"><b>' + esc(b.parameter) + '</b> <span class="muted">' + esc(info) + '</span>' + input + '<div id="st-' + i + '"></div></div>';
  }
  function baris(list) {
    var grup = {};
    list.forEach(function (b, i) { var k = kel(b); (grup[k] = grup[k] || []).push(i); });
    return KEL.concat(['Lainnya']).filter(function (k) { return grup[k]; }).map(function (k) {
      return '<details open><summary style="font-weight:700;margin:14px 0 4px;cursor:pointer">' + k + ' (' + grup[k].length + ')</summary>' +
        grup[k].map(function (i) { return satuBaris(list[i], i); }).join('') + '</details>';
    }).join('');
  }
  function baca(box, b, i) {
    if (tipe(b) === 'suhu') {
      var a = box.querySelector('[data-sa="' + i + '"]').value, u = box.querySelector('[data-su="' + i + '"]').value;
      if (a === '' && u === '') return null;
      if (a === '' || u === '') return { galat: 'Suhu: isi suhu air dan suhu udara.' };
      var s = Math.round((Number(a) - Number(u)) * 100) / 100;
      return { raw: String(s), v: s, rincian: { suhu_air: Number(a), suhu_udara: Number(u) }, ket: 'air ' + angka(a) + ' °C, udara ' + angka(u) + ' °C, selisih ' + angka(s) };
    }
    var inp = box.querySelector('[data-i="' + i + '"]');
    if (!inp || inp.value === '') return null;
    var t = tipe(b), x = { raw: inp.value };
    if (t === 'angka') x.v = Number(inp.value);
    else if (t === 'kual') x.q = inp.value === 'ok' ? opsi(b)[0] : opsi(b)[1];
    else x.q = inp.value.trim();
    return x;
  }
  function live(box, list) {
    function f(e) {
      var d = e.target.dataset || {}, i = d.i !== undefined ? d.i : (d.sa !== undefined ? d.sa : d.su);
      if (i === undefined) return;
      var x = baca(box, list[i], i), st = box.querySelector('#st-' + i);
      if (!x) { st.innerHTML = ''; return; }
      if (x.galat) { st.innerHTML = '<span class="muted">' + esc(x.galat) + '</span>'; return; }
      var r = window.KL ? KL.cekRentang(list[i], x.raw) : '';
      st.innerHTML = r ? '<span class="lewat">' + esc(r) + '</span>' : lencana(status(list[i], x.raw)) + (x.ket ? ' <span class="muted">' + esc(x.ket) + '</span>' : '');
    }
    box.oninput = f; box.onchange = f;
  }
  function kumpul(box, list) {
    var isi = [], galat = [];
    list.forEach(function (b, i) {
      var x = baca(box, b, i);
      if (!x) return;
      if (x.galat) { galat.push(x.galat); return; }
      var r = window.KL ? KL.cekRentang(b, x.raw) : '';
      if (r) { galat.push(r); return; }
      x.b = b; x.s = status(b, x.raw); isi.push(x);
    });
    return { isi: isi, galat: galat };
  }

  // ===== UBAH HASIL (air_uji dan ipal_lab) =====
  function aturUbah(box, cfg) {
    if (!window.KL || !box) return;
    KL.pasang(box, {
      tabel: cfg.tabel,
      cari: function (id) { return cfg.rows().filter(function (r) { return r.id === id; })[0]; },
      bidang: function (row) {
        var f = [{ k: 'tanggal', l: 'Tanggal', tipe: 'tanggal', nilai: row.tanggal }];
        var q = QUAL[namaDasar(row.parameter)];
        if (row.rincian && row.rincian.suhu_air != null) {
          f.push({ k: 'suhu_air', l: 'Suhu air (°C)', tipe: 'angka', nilai: row.rincian.suhu_air });
          f.push({ k: 'suhu_udara', l: 'Suhu udara (°C)', tipe: 'angka', nilai: row.rincian.suhu_udara });
        } else if (row.hasil != null) {
          f.push({ k: 'hasil', l: row.parameter + (row.satuan && row.satuan !== '-' ? ' (' + row.satuan + ')' : ''), tipe: 'angka', nilai: row.hasil });
        } else if (q) {
          f.push({ k: 'kual', l: row.parameter, tipe: 'pilih', opsi: [['ok', q[0]], ['no', q[1]]], nilai: row.catatan === q[1] ? 'no' : 'ok' });
        } else {
          f.push({ k: 'teks', l: row.parameter, tipe: 'teks', nilai: row.catatan });
        }
        f.push({ k: 'lab', l: 'Laboratorium / pemeriksa', tipe: 'teks', nilai: row.lab });
        return f;
      },
      simpan: async function (row, is) {
        if (!is.tanggal) return { galat: 'Tanggal wajib diisi.' };
        var master = {};
        try { (await ambilBaku(cfg.modul(row))).forEach(function (b) { master[b.parameter] = b; }); } catch (e) {}
        var m = master[row.parameter] || {};
        var adaSnap = row.batas_min != null || row.batas_maks != null || !!row.dasar_aturan;
        var tanpa = /\(pengamatan\)/.test(row.parameter) || cfg.tanpaBaku(row);
        var b = {
          parameter: row.parameter, satuan: row.satuan, pengamatan: tanpa,
          min: tanpa ? null : (adaSnap ? row.batas_min : m.min), maks: tanpa ? null : (adaSnap ? row.batas_maks : m.maks),
          rentang_min: m.rentang_min, rentang_maks: m.rentang_maks
        };
        var ubah = { tanggal: is.tanggal, lab: (is.lab || '').trim() || null }, raw;
        if ('suhu_air' in is) {
          if (is.suhu_air === '' || is.suhu_udara === '') return { galat: 'Isi suhu air dan suhu udara.' };
          var s = Math.round((Number(is.suhu_air) - Number(is.suhu_udara)) * 100) / 100;
          ubah.hasil = s; ubah.rincian = { suhu_air: Number(is.suhu_air), suhu_udara: Number(is.suhu_udara) }; raw = String(s);
        } else if ('hasil' in is) {
          if (is.hasil === '' || isNaN(Number(is.hasil))) return { galat: 'Hasil harus berupa angka.' };
          ubah.hasil = Number(is.hasil); raw = is.hasil;
        } else if ('kual' in is) {
          var o = QUAL[namaDasar(row.parameter)];
          ubah.catatan = is.kual === 'ok' ? o[0] : o[1]; raw = is.kual; b.satuan = 'kualitatif';
        } else {
          ubah.catatan = (is.teks || '').trim(); raw = ''; b.satuan = 'teks';
        }
        var rg = KL.cekRentang(b, raw);
        if (rg) return { galat: rg };
        var st = status(b, raw);
        ubah.status = st || '-';
        if (!tanpa) {
          ubah.batas_min = b.min != null ? Number(b.min) : null;
          ubah.batas_maks = b.maks != null ? Number(b.maks) : null;
          if (!adaSnap) ubah.dasar_aturan = m.dasar_aturan || null;
        }
        return {
          ubah: ubah,
          setelah: async function () {
            if (st !== 'tidak_memenuhi' || !window.TL) return;
            var hs = ubah.hasil != null ? angka(ubah.hasil) + (row.satuan && row.satuan !== '-' ? ' ' + row.satuan : '') : ubah.catatan;
            var ada = await App.db.from('temuan').select('id').eq('sumber', cfg.tabel).eq('sumber_id', row.id).eq('status', 'terbuka');
            if (ada.data && ada.data.length) await App.db.from('temuan').update({ hasil: hs, tanggal: is.tanggal }).eq('id', ada.data[0].id);
            else await TL.catat([{ tanggal: is.tanggal, kategori: cfg.kategori, sumber: cfg.tabel, sumber_id: row.id, lokasi: row[cfg.lokasiKey], parameter: row.parameter, hasil: hs, uraian: uraianStr(b) }]);
          }
        };
      },
      selesai: cfg.selesai
    });
  }

  // ===== UJI KUALITAS AIR =====
  App.tabs.air_uji = async function (el) {
    if (peringatan(el)) return;
    var list = [], rows = [];
    var titik = await daftarTitik('air');
    var inTitik = titik.length
      ? '<select id="au-titik">' + titik.map(function (t) { return '<option>' + esc(t.nama) + '</option>'; }).join('') + '</select>'
      : '<input id="au-titik" placeholder="mis. Keran dapur"><p class="muted">Daftarkan titik sampel tetap di Pengaturan supaya tren per titik bisa dilihat.</p>';
    var form = bisaTulis() ?
      '<label>Tanggal</label><input type="date" id="au-tgl" value="' + hariIni() + '">' +
      '<label>Titik sampel</label>' + inTitik + tombolAtur('Atur titik sampel') +
      '<label>Jenis air</label><select id="au-jenis"><option value="air_higiene_sanitasi">Air untuk higiene sanitasi</option><option value="air_minum">Air minum</option></select>' +
      '<label>Laboratorium / pemeriksa (opsional)</label><input id="au-lab">' +
      '<p class="muted">Isi hanya parameter yang diperiksa.</p><div id="au-param"></div>' +
      '<button type="button" id="au-simpan">Simpan hasil</button><div class="pesan" id="au-pesan"></div>' : '';
    el.innerHTML = '<h3 style="margin-top:0">Uji kualitas air</h3>' + form + '<div id="tl-box"></div><h3>Hasil terbaru</h3><div id="au-daftar"></div>';
    pasangAtur(el);

    async function daftar(pesan) {
      var q = App.db.from('air_uji').select('*');
      if (window.KL) q = KL.filter(q, 'air_uji');
      var r = await q.order('tanggal', { ascending: false }).order('dibuat', { ascending: false }).limit(50);
      if (r.error) { $('au-daftar').innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
      rows = r.data;
      $('au-daftar').innerHTML = kepalaDaftar(pesan, 'air_uji') + (rows.length ? rows.map(function (x) {
        return barisDaftar(x, '<b>' + esc(x.parameter) + '</b>: ' + esc(nilaiTeks(x)) + ' ' + lencana(x.status) +
          '<br><span class="muted">' + esc(x.tanggal) + ' · ' + esc(x.titik_sampel || '') + ' · ' + (x.jenis_uji === 'air_minum' ? 'air minum' : 'higiene sanitasi') + (x.lab ? ' · ' + esc(x.lab) : '') + '</span>');
      }).join('') : '<p class="muted">Belum ada hasil.</p>');
    }
    aturUbah($('au-daftar'), {
      tabel: 'air_uji', kategori: 'air', lokasiKey: 'titik_sampel',
      rows: function () { return rows; },
      modul: function (row) { return row.jenis_uji; },
      tanpaBaku: function () { return false; },
      selesai: function (m) { daftar(m); panelTL('air'); }
    });

    if (bisaTulis()) {
      async function muat() {
        $('au-param').innerHTML = '<p class="muted">Memuat...</p>';
        try { list = await ambilBaku($('au-jenis').value); } catch (e) { $('au-param').innerHTML = '<div class="info waspada">Gagal memuat baku mutu.</div>'; return; }
        list.sort(function (a, b) { return a.parameter.localeCompare(b.parameter); });
        $('au-param').innerHTML = baris(list);
        live($('au-param'), list);
      }
      $('au-jenis').addEventListener('change', muat);
      $('au-simpan').addEventListener('click', async function () {
        var tgl = $('au-tgl').value, titikV = $('au-titik').value.trim();
        var k = kumpul($('au-param'), list);
        if (!tgl || !titikV) { $('au-pesan').textContent = 'Tanggal dan titik sampel wajib diisi.'; return; }
        if (k.galat.length) { $('au-pesan').textContent = k.galat.join(' '); return; }
        if (!k.isi.length) { $('au-pesan').textContent = 'Isi minimal satu hasil.'; return; }
        $('au-pesan').textContent = 'Menyimpan...';
        var lab = $('au-lab').value.trim() || null, jenis = $('au-jenis').value;
        var data = k.isi.map(function (x) {
          var t = tipe(x.b);
          return Object.assign({
            tanggal: tgl, titik_sampel: titikV, jenis_uji: jenis, parameter: x.b.parameter,
            hasil: x.v != null ? x.v : null, satuan: (t === 'angka' || t === 'suhu') ? x.b.satuan : '-',
            status: x.s || '-', catatan: x.q || null, lab: lab, rincian: x.rincian || null
          }, snap(x.b));
        });
        var r = await App.db.from('air_uji').insert(data).select('id,parameter');
        if (r.error) { gagal('au-pesan', r.error); return; }
        var idPar = {};
        (r.data || []).forEach(function (d) { idPar[d.parameter] = d.id; });
        var tidak = k.isi.filter(function (x) { return x.s === 'tidak_memenuhi'; });
        var er = null;
        if (tidak.length && window.TL) {
          er = await TL.catat(tidak.map(function (x) {
            return { tanggal: tgl, kategori: 'air', sumber: 'air_uji', sumber_id: idPar[x.b.parameter] || null, lokasi: titikV, parameter: x.b.parameter, hasil: hasilStr(x), uraian: uraianStr(x.b) };
          }));
        }
        await App.tabs.air_uji(el);
        var msg = 'Tersimpan ' + k.isi.length + ' hasil';
        if (tidak.length) msg += ', ' + tidak.length + ' tidak memenuhi' + (window.TL ? (er ? ' (temuan gagal dicatat).' : ' dan dicatat sebagai temuan, lihat saran di bawah.') : '.');
        else msg += '.';
        $('au-pesan').textContent = msg;
      });
      muat();
    }
    daftar();
    panelTL('air');
  };

  // ===== IPAL HARIAN =====
  async function sinkronPh(id, tgl, ph, b, luar) {
    if (!window.TL || !id) return null;
    var ada = await App.db.from('temuan').select('id').eq('sumber', 'ipal_harian').eq('sumber_id', id).eq('status', 'terbuka');
    var buka = ada.data && ada.data[0];
    if (luar) {
      var hs = 'pH outlet ' + angka(ph);
      if (buka) return (await App.db.from('temuan').update({ hasil: hs, tanggal: tgl }).eq('id', buka.id)).error;
      return await TL.catat([{ tanggal: tgl, kategori: 'ipal', sumber: 'ipal_harian', sumber_id: id, lokasi: 'Outlet', parameter: 'pH', hasil: hs, uraian: uraianStr(b) }]);
    }
    if (buka) return (await App.db.from('temuan').update({ status: 'batal', catatan_selesai: 'Hasil dikoreksi menjadi memenuhi', tanggal_selesai: hariIni() }).eq('id', buka.id)).error;
    return null;
  }

  App.tabs.ipal_harian = async function (el) {
    if (peringatan(el)) return;
    var set = await pengaturan(), kelas = set.kelas_ipal || '';
    if (kelas === 'tidak_ada') {
      el.innerHTML = '<h3 style="margin-top:0">IPAL harian</h3><div class="info">Fasyankes diatur tidak memiliki IPAL. Ubah di Pengaturan bila keliru.</div>' + tombolAtur('Buka pengaturan');
      pasangAtur(el);
      return;
    }
    var phB = { parameter: 'pH', min: 6, maks: 9 };
    try { (await ambilBaku(kelasModul(kelas))).forEach(function (b) { if (b.parameter === 'pH' && (b.min != null || b.maks != null)) phB = b; }); } catch (e) {}
    var namaKelas = '';
    if (window.PENGATURAN) PENGATURAN.KELAS.forEach(function (k) { if (k[0] === kelas) namaKelas = k[1]; });
    var info = kelas
      ? '<p class="muted">Kelas baku mutu: ' + esc(namaKelas) + ' · batas pH outlet ' + batasTeks(phB) + '</p>'
      : '<div class="info waspada">Kelas IPAL belum diatur. Sementara dipakai kelas 3 sampai 50 m³/hari.</div>' + tombolAtur('Atur kelas IPAL');
    var rows = [];
    function opsiHtml(list) { return list.map(function (o) { var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o; return '<option value="' + esc(v) + '">' + esc(t) + '</option>'; }).join(''); }

    var form = bisaTulis() ?
      info +
      '<label>Tanggal</label><input type="date" id="ih-tgl" value="' + hariIni() + '">' +
      '<label>Debit air limbah (m³/hari)</label><input type="number" step="any" inputmode="decimal" id="ih-debit"><div id="ih-kelas" class="muted"></div>' +
      '<h3>Inlet (sebelum pengolahan)</h3>' +
      '<label>pH inlet</label><input type="number" step="any" inputmode="decimal" id="ih-phin">' +
      '<label>Suhu inlet (°C)</label><input type="number" step="any" inputmode="decimal" id="ih-suhuin">' +
      '<label>Warna inlet</label><input id="ih-warnain" placeholder="mis. keruh, kecokelatan">' +
      '<label>Bau inlet</label><select id="ih-bauin">' + opsiHtml(BAU) + '</select>' +
      '<h3>Outlet (setelah pengolahan)</h3>' +
      '<label>pH outlet</label><input type="number" step="any" inputmode="decimal" id="ih-ph"><div id="ih-phst"></div>' +
      '<label>Suhu outlet (°C)</label><input type="number" step="any" inputmode="decimal" id="ih-suhu">' +
      '<label>Warna outlet</label><input id="ih-warna" placeholder="mis. jernih, keruh">' +
      '<label>Bau outlet</label><select id="ih-bau">' + opsiHtml(BAU) + '</select>' +
      '<h3>Peralatan</h3>' +
      '<label>Kondisi pompa</label><select id="ih-pompa">' + opsiHtml(KONDISI) + '</select>' +
      '<label>Kondisi blower</label><select id="ih-blower">' + opsiHtml(KONDISI) + '</select>' +
      '<label>Catatan (opsional)</label><input id="ih-cat">' +
      '<button type="button" id="ih-simpan">Simpan</button><div class="pesan" id="ih-pesan"></div>' : '';
    el.innerHTML = '<h3 style="margin-top:0">IPAL harian</h3>' + form + '<div id="tl-box"></div><h3>Catatan terbaru</h3><div id="ih-daftar"></div>';
    pasangAtur(el);

    async function daftar(pesan) {
      var q = App.db.from('ipal_harian').select('*');
      if (window.KL) q = KL.filter(q, 'ipal_harian');
      var r = await q.order('tanggal', { ascending: false }).order('dibuat', { ascending: false }).limit(30);
      if (r.error) { $('ih-daftar').innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
      rows = r.data;
      $('ih-daftar').innerHTML = kepalaDaftar(pesan, 'ipal_harian') + (rows.length ? rows.map(function (x) {
        var b = (x.ph_batas_min != null || x.ph_batas_maks != null) ? { parameter: 'pH', min: x.ph_batas_min, maks: x.ph_batas_maks } : phB;
        var luar = x.ph != null && status(b, x.ph) === 'tidak_memenuhi';
        return barisDaftar(x, '<b>' + esc(x.tanggal) + '</b> · debit ' + nm(x.debit, ' m³') +
          '<br>Inlet: pH ' + nm(x.ph_inlet) + ' · suhu ' + nm(x.suhu_inlet, ' °C') + ' · warna ' + tx(x.warna_inlet) + ' · bau ' + tx(x.bau_inlet) +
          '<br>Outlet: pH <span class="' + (luar ? 'lewat' : '') + '">' + nm(x.ph) + '</span>' + (luar ? ' ' + ICON_NO : '') + ' · suhu ' + nm(x.suhu_outlet, ' °C') + ' · warna ' + tx(x.warna_outlet) + ' · bau ' + tx(x.bau_outlet) +
          '<br><span class="muted">Pompa: ' + tx(x.kondisi_pompa) + ' · Blower: ' + tx(x.kondisi_blower) + (x.catatan ? ' · ' + esc(x.catatan) : '') + '</span>');
      }).join('') : '<p class="muted">Belum ada catatan.</p>');
    }

    if (window.KL) KL.pasang($('ih-daftar'), {
      tabel: 'ipal_harian',
      cari: function (id) { return rows.filter(function (r) { return r.id === id; })[0]; },
      bidang: function (x) {
        return [
          { k: 'tanggal', l: 'Tanggal', tipe: 'tanggal', nilai: x.tanggal },
          { k: 'debit', l: 'Debit (m³/hari)', tipe: 'angka', nilai: x.debit },
          { k: 'ph_inlet', l: 'pH inlet', tipe: 'angka', nilai: x.ph_inlet },
          { k: 'suhu_inlet', l: 'Suhu inlet (°C)', tipe: 'angka', nilai: x.suhu_inlet },
          { k: 'warna_inlet', l: 'Warna inlet', tipe: 'teks', nilai: x.warna_inlet },
          { k: 'bau_inlet', l: 'Bau inlet', tipe: 'pilih', opsi: BAU, nilai: x.bau_inlet || '' },
          { k: 'ph', l: 'pH outlet', tipe: 'angka', nilai: x.ph },
          { k: 'suhu_outlet', l: 'Suhu outlet (°C)', tipe: 'angka', nilai: x.suhu_outlet },
          { k: 'warna_outlet', l: 'Warna outlet', tipe: 'teks', nilai: x.warna_outlet },
          { k: 'bau_outlet', l: 'Bau outlet', tipe: 'pilih', opsi: BAU, nilai: x.bau_outlet || '' },
          { k: 'kondisi_pompa', l: 'Kondisi pompa', tipe: 'pilih', opsi: KONDISI, nilai: x.kondisi_pompa },
          { k: 'kondisi_blower', l: 'Kondisi blower', tipe: 'pilih', opsi: KONDISI, nilai: x.kondisi_blower },
          { k: 'catatan', l: 'Catatan', tipe: 'teks', nilai: x.catatan }
        ];
      },
      simpan: async function (x, is) {
        if (!is.tanggal) return { galat: 'Tanggal wajib diisi.' };
        var g = cekPh(is.ph_inlet, 'pH inlet') || cekPh(is.ph, 'pH outlet') || cekSuhu(is.suhu_inlet, 'Suhu inlet') || cekSuhu(is.suhu_outlet, 'Suhu outlet');
        if (g) return { galat: g };
        if (is.debit !== '' && Number(is.debit) < 0) return { galat: 'Debit tidak boleh negatif.' };
        var b = (x.ph_batas_min != null || x.ph_batas_maks != null) ? { parameter: 'pH', min: x.ph_batas_min, maks: x.ph_batas_maks } : phB;
        var ph = nz(is.ph);
        var luar = ph !== null && status(b, ph) === 'tidak_memenuhi';
        return {
          ubah: {
            tanggal: is.tanggal, debit: nz(is.debit),
            ph_inlet: nz(is.ph_inlet), suhu_inlet: nz(is.suhu_inlet), warna_inlet: (is.warna_inlet || '').trim() || null, bau_inlet: is.bau_inlet || null,
            ph: ph, suhu_outlet: nz(is.suhu_outlet), warna_outlet: (is.warna_outlet || '').trim() || null, bau_outlet: is.bau_outlet || null,
            kondisi_pompa: is.kondisi_pompa, kondisi_blower: is.kondisi_blower, catatan: (is.catatan || '').trim() || null,
            ph_batas_min: b.min != null ? Number(b.min) : null, ph_batas_maks: b.maks != null ? Number(b.maks) : null
          },
          setelah: async function () { await sinkronPh(x.id, is.tanggal, ph, b, luar); }
        };
      },
      selesai: function (m) { daftar(m); panelTL('ipal'); }
    });

    if (bisaTulis()) {
      $('ih-debit').addEventListener('input', function () {
        var v = $('ih-debit').value, d = Number(v);
        if (!v) { $('ih-kelas').textContent = ''; return; }
        var kd = d > 50 ? 'gt50' : (d > 3 ? '3_50' : 'le3');
        var teks = { gt50: 'di atas 50 m³/hari', '3_50': '3 sampai 50 m³/hari', le3: 'sampai 3 m³/hari' }[kd];
        $('ih-kelas').textContent = 'Debit ini setara kelas ' + teks + '.' +
          ((kelas && kelas !== 'drainase' && kelas !== kd) ? ' Berbeda dengan kelas terdaftar, periksa kembali persetujuan teknis IPAL.' : '');
      });
      $('ih-ph').addEventListener('input', function () {
        var g = cekPh($('ih-ph').value, 'pH outlet');
        $('ih-phst').innerHTML = g ? '<span class="lewat">' + esc(g) + '</span>' : lencana(status(phB, $('ih-ph').value));
      });
      $('ih-simpan').addEventListener('click', async function () {
        var tgl = $('ih-tgl').value;
        if (!tgl) { $('ih-pesan').textContent = 'Tanggal wajib diisi.'; return; }
        if (num('ih-debit') === null && num('ih-ph') === null && num('ih-phin') === null) { $('ih-pesan').textContent = 'Isi debit atau pH.'; return; }
        var g = cekPh($('ih-phin').value, 'pH inlet') || cekPh($('ih-ph').value, 'pH outlet') || cekSuhu($('ih-suhuin').value, 'Suhu inlet') || cekSuhu($('ih-suhu').value, 'Suhu outlet');
        if (g) { $('ih-pesan').textContent = g; return; }
        var phOut = num('ih-ph');
        var r = await App.db.from('ipal_harian').insert({
          tanggal: tgl, debit: num('ih-debit'),
          ph_inlet: num('ih-phin'), suhu_inlet: num('ih-suhuin'), warna_inlet: $('ih-warnain').value.trim() || null, bau_inlet: $('ih-bauin').value || null,
          ph: phOut, suhu_outlet: num('ih-suhu'), warna_outlet: $('ih-warna').value.trim() || null, bau_outlet: $('ih-bau').value || null,
          kondisi_pompa: $('ih-pompa').value, kondisi_blower: $('ih-blower').value, catatan: $('ih-cat').value.trim() || null,
          kelas_ipal: kelas || '3_50',
          ph_batas_min: phB.min != null ? Number(phB.min) : null, ph_batas_maks: phB.maks != null ? Number(phB.maks) : null
        }).select('id');
        if (r.error) { gagal('ih-pesan', r.error); return; }
        var luar = phOut !== null && status(phB, phOut) === 'tidak_memenuhi';
        var er = luar ? await sinkronPh(r.data && r.data[0] && r.data[0].id, tgl, phOut, phB, true) : null;
        await App.tabs.ipal_harian(el);
        $('ih-pesan').textContent = luar && window.TL ? (er ? 'Tersimpan, tetapi temuan gagal dicatat.' : 'Tersimpan. pH outlet di luar baku mutu dan dicatat sebagai temuan, lihat saran di bawah.') : 'Tersimpan.';
      });
    }
    daftar();
    panelTL('ipal');
  };

  // ===== UJI LAB IPAL =====
  var EKSTRA = [
    { parameter: 'Suhu (pengamatan)', satuan: '°C', min: null, maks: null, pengamatan: true, kelompok: 'Fisik', rentang_min: 0, rentang_maks: 100 },
    { parameter: 'Warna (pengamatan)', satuan: 'teks', min: null, maks: null, pengamatan: true, kelompok: 'Fisik' },
    { parameter: 'Bau (pengamatan)', satuan: 'kualitatif', min: null, maks: null, pengamatan: true, kelompok: 'Fisik' }
  ];

  App.tabs.ipal_lab = async function (el) {
    if (peringatan(el)) return;
    var list = [], rows = [];
    var set = await pengaturan();
    var kelasSet = set.kelas_ipal && set.kelas_ipal !== 'tidak_ada' ? set.kelas_ipal : '';
    var kelasAwal = kelasSet;
    if (!kelasAwal) { try { kelasAwal = localStorage.getItem('ipal_kelas') || '3_50'; } catch (e) { kelasAwal = '3_50'; } }
    var titik = await daftarTitik('ipal');
    var namaTitik = titik.length ? titik.map(function (t) { return t.nama; }) : ['Outlet', 'Inlet'];
    function opt(v, t) { return '<option value="' + v + '"' + (v === kelasAwal ? ' selected' : '') + '>' + t + '</option>'; }
    var form = bisaTulis() ?
      '<label>Tanggal</label><input type="date" id="il-tgl" value="' + hariIni() + '">' +
      '<label>Titik</label><select id="il-titik">' + namaTitik.map(function (n) { return '<option>' + esc(n) + '</option>'; }).join('') + '</select>' + tombolAtur('Atur titik dan kelas IPAL') +
      '<label>Kelas baku mutu</label><select id="il-kelas">' + opt('gt50', 'Dibuang ke media air, di atas 50 m³/hari') + opt('3_50', 'Dibuang ke media air, 3 sampai 50 m³/hari') + opt('le3', 'Dibuang ke media air, sampai 3 m³/hari') + opt('drainase', 'Dibuang ke drainase / irigasi') + '</select>' +
      (kelasSet ? '<p class="muted">Kelas mengikuti pengaturan fasyankes.</p>' : '') +
      '<label>Laboratorium (opsional)</label><input id="il-lab">' +
      '<p class="muted">Isi hanya parameter yang diperiksa. Titik inlet tidak dibandingkan dengan baku mutu. Suhu, warna, dan bau dicatat sebagai pengamatan.</p><div id="il-param"></div>' +
      '<button type="button" id="il-simpan">Simpan hasil</button><div class="pesan" id="il-pesan"></div>' : '';
    el.innerHTML = '<h3 style="margin-top:0">Uji lab IPAL</h3>' + form + '<div id="tl-box"></div><h3>Hasil terbaru</h3><div id="il-daftar"></div>';
    pasangAtur(el);

    async function daftar(pesan) {
      var q = App.db.from('ipal_lab').select('*');
      if (window.KL) q = KL.filter(q, 'ipal_lab');
      var r = await q.order('tanggal', { ascending: false }).order('dibuat', { ascending: false }).limit(50);
      if (r.error) { $('il-daftar').innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
      rows = r.data;
      $('il-daftar').innerHTML = kepalaDaftar(pesan, 'ipal_lab') + (rows.length ? rows.map(function (x) {
        return barisDaftar(x, '<b>' + esc(x.parameter) + '</b>: ' + esc(nilaiTeks(x)) + ' ' + lencana(x.status) +
          '<br><span class="muted">' + esc(x.tanggal) + ' · ' + esc(x.titik || '') + (x.lab ? ' · ' + esc(x.lab) : '') + '</span>');
      }).join('') : '<p class="muted">Belum ada hasil.</p>');
    }
    aturUbah($('il-daftar'), {
      tabel: 'ipal_lab', kategori: 'ipal', lokasiKey: 'titik',
      rows: function () { return rows; },
      modul: function () { return kelasModul(kelasSet || kelasAwal); },
      tanpaBaku: function (row) { return /inlet/i.test(row.titik || ''); },
      selesai: function (m) { daftar(m); panelTL('ipal'); }
    });

    if (bisaTulis()) {
      async function muat() {
        var k = $('il-kelas').value;
        $('il-param').innerHTML = '<p class="muted">Memuat...</p>';
        try { list = await ambilBaku(kelasModul(k)); } catch (e) { $('il-param').innerHTML = '<div class="info waspada">Gagal memuat baku mutu.</div>'; return; }
        if (/inlet/i.test($('il-titik').value)) {
          list = list.map(function (b) { return { parameter: b.parameter, satuan: b.satuan, min: null, maks: null, kelompok: b.kelompok, rentang_min: b.rentang_min, rentang_maks: b.rentang_maks }; });
        }
        list = list.concat(EKSTRA);
        $('il-param').innerHTML = baris(list);
        live($('il-param'), list);
      }
      $('il-kelas').addEventListener('change', function () {
        try { localStorage.setItem('ipal_kelas', $('il-kelas').value); } catch (e) {}
        muat();
      });
      $('il-titik').addEventListener('change', muat);
      $('il-simpan').addEventListener('click', async function () {
        var tgl = $('il-tgl').value, titikIpal = $('il-titik').value;
        var k = kumpul($('il-param'), list);
        if (!tgl) { $('il-pesan').textContent = 'Tanggal wajib diisi.'; return; }
        if (k.galat.length) { $('il-pesan').textContent = k.galat.join(' '); return; }
        if (!k.isi.length) { $('il-pesan').textContent = 'Isi minimal satu hasil.'; return; }
        $('il-pesan').textContent = 'Menyimpan...';
        var lab = $('il-lab').value.trim() || null;
        var data = k.isi.map(function (x) {
          return Object.assign({
            tanggal: tgl, titik: titikIpal, parameter: x.b.parameter, hasil: x.v != null ? x.v : null,
            satuan: tipe(x.b) === 'angka' ? x.b.satuan : '-', status: x.s || '-', catatan: x.q || null, lab: lab
          }, snap(x.b));
        });
        var r = await App.db.from('ipal_lab').insert(data).select('id,parameter');
        if (r.error) { gagal('il-pesan', r.error); return; }
        var idPar = {};
        (r.data || []).forEach(function (d) { idPar[d.parameter] = d.id; });
        var tidak = k.isi.filter(function (x) { return x.s === 'tidak_memenuhi'; });
        var er = null;
        if (tidak.length && window.TL) {
          er = await TL.catat(tidak.map(function (x) {
            return { tanggal: tgl, kategori: 'ipal', sumber: 'ipal_lab', sumber_id: idPar[x.b.parameter] || null, lokasi: titikIpal, parameter: x.b.parameter, hasil: hasilStr(x), uraian: uraianStr(x.b) };
          }));
        }
        await App.tabs.ipal_lab(el);
        var msg = 'Tersimpan ' + k.isi.length + ' hasil';
        if (tidak.length) msg += ', ' + tidak.length + ' tidak memenuhi' + (window.TL ? (er ? ' (temuan gagal dicatat).' : ' dan dicatat sebagai temuan, lihat saran di bawah.') : '.');
        else msg += '.';
        $('il-pesan').textContent = msg;
      });
      muat();
    }
    daftar();
    panelTL('ipal');
  };
})();
