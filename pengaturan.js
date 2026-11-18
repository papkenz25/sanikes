(function () {
  var KELOLA = ['admin_fasyankes', 'petugas_kesling'];
  var KELAS = [
    ['3_50', 'Dibuang ke media air, 3 sampai 50 m³/hari'],
    ['gt50', 'Dibuang ke media air, di atas 50 m³/hari'],
    ['le3', 'Dibuang ke media air, sampai 3 m³/hari'],
    ['drainase', 'Dibuang ke drainase / irigasi'],
    ['tidak_ada', 'Tidak memiliki IPAL']
  ];
  var ZONA = ['Rendah', 'Sedang', 'Tinggi', 'Sangat tinggi'];
  var G1 = 'width:auto;display:inline-block;padding:6px 14px;margin:6px 6px 0 0;font-size:14px';
  var cache = null;

  async function ambil(paksa) {
    if (cache && !paksa) return cache;
    var r = await App.db.from('pengaturan').select('kunci,nilai');
    cache = {};
    (r.data || []).forEach(function (x) { cache[x.kunci] = x.nilai; });
    return cache;
  }
  async function simpan(kunci, nilai) {
    var row = { kunci: kunci, nilai: nilai };
    if (App.profil && App.profil.fasyankes_id) row.fasyankes_id = App.profil.fasyankes_id;
    var r = await App.db.from('pengaturan').upsert(row, { onConflict: 'fasyankes_id,kunci' });
    if (!r.error) { cache = cache || {}; cache[kunci] = nilai; }
    return r.error;
  }
  async function titik(jenis) {
    var r = await App.db.from('titik').select('*').eq('jenis', jenis).eq('aktif', true).order('nama');
    return r.data || [];
  }

  function blokTitik(jenis, judul, list, contoh, boleh) {
    return '<h3>' + judul + '</h3>' +
      (list.length ? list.map(function (t) {
        return '<div class="baris"><b>' + esc(t.nama) + '</b>' +
          (boleh ? '<br><button type="button" style="' + G1 + '" data-nonaktif="' + t.id + '">Nonaktifkan</button>' : '') + '</div>';
      }).join('') : '<p class="muted">Belum ada.</p>') +
      (boleh ? '<input id="pf-baru-' + jenis + '" placeholder="' + contoh + '"><button type="button" data-tambah="' + jenis + '">Tambah</button>' : '');
  }

  async function tampil(el, pesan) {
    var boleh = KELOLA.indexOf(App.profil.peran) > -1;
    var p = await ambil(true);
    var ta = await titik('air'), ti = await titik('ipal');
    var rg = await App.db.from('ruangan').select('id,nama,zona_risiko').eq('aktif', true).order('nama');
    var dis = boleh ? '' : ' disabled';

    var html = '<button type="button" style="' + G1 + '" id="pf-kembali">← Kembali</button>' +
      '<h3>Pengaturan fasyankes</h3>' +
      (boleh ? '' : '<div class="info">Hanya admin fasyankes dan petugas kesling yang dapat mengubah pengaturan.</div>') +
      '<label>Kelas baku mutu IPAL</label><select id="pf-kelas"' + dis + '><option value="">- pilih -</option>' +
      KELAS.map(function (k) { return '<option value="' + k[0] + '"' + (p.kelas_ipal === k[0] ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') +
      '</select><p class="muted">Sesuaikan dengan persetujuan teknis atau izin IPAL fasyankes. Dipakai otomatis di IPAL harian dan uji lab IPAL.</p>' +
      blokTitik('air', 'Titik sampel air', ta, 'mis. Tandon atas, Keran dapur', boleh) +
      blokTitik('ipal', 'Titik IPAL', ti, 'mis. Inlet, Outlet', boleh) +
      '<h3>Zona risiko ruangan</h3><p class="muted">Dipakai untuk jadwal pemeriksaan dan baku mutu udara ruangan.</p>' +
      ((rg.data || []).length ? rg.data.map(function (r) {
        return '<div class="baris"><b>' + esc(r.nama) + '</b><select data-zona="' + r.id + '"' + dis + '><option value="">- belum diatur -</option>' +
          ZONA.map(function (z) { return '<option' + (r.zona_risiko === z ? ' selected' : '') + '>' + z + '</option>'; }).join('') + '</select></div>';
      }).join('') : '<p class="muted">Belum ada ruangan.</p>') +
      '<div class="pesan" id="pf-pesan">' + esc(pesan || '') + '</div>';
    el.innerHTML = html;

    $('pf-kembali').onclick = function () { App.tabs.data(el); };
    if (!boleh) return;

    el.onchange = async function (e) {
      var t = e.target, err = null, msg = '';
      if (t.id === 'pf-kelas') { err = await simpan('kelas_ipal', t.value); msg = 'Kelas IPAL disimpan.'; }
      else if (t.getAttribute('data-zona')) {
        var u = await App.db.from('ruangan').update({ zona_risiko: t.value || null }).eq('id', t.getAttribute('data-zona'));
        err = u.error; msg = 'Zona risiko disimpan.';
      } else return;
      $('pf-pesan').textContent = err ? 'Gagal: ' + (err.message || 'coba lagi') : msg;
    };
    el.onclick = async function (e) {
      var tb = e.target.getAttribute && e.target.getAttribute('data-tambah');
      var na = e.target.getAttribute && e.target.getAttribute('data-nonaktif');
      if (tb) {
        var nama = $('pf-baru-' + tb).value.trim();
        if (!nama) { $('pf-pesan').textContent = 'Isi nama titik dulu.'; return; }
        var r = await App.db.from('titik').insert({ jenis: tb, nama: nama });
        if (r.error && r.error.code === '23505') {
          r = await App.db.from('titik').update({ aktif: true }).eq('jenis', tb).eq('nama', nama);
        }
        if (r.error) { $('pf-pesan').textContent = 'Gagal: ' + (r.error.message || 'coba lagi'); return; }
        await tampil(el, 'Titik "' + nama + '" ditambahkan.');
      } else if (na) {
        var n = await App.db.from('titik').update({ aktif: false }).eq('id', na);
        if (n.error) { $('pf-pesan').textContent = 'Gagal: ' + (n.error.message || 'coba lagi'); return; }
        await tampil(el, 'Titik dinonaktifkan.');
      }
    };
  }

  var asli = App.tabs.data;
  if (asli) {
    App.tabs.data = async function (el) {
      el.onclick = null; el.onchange = null;
      await asli(el);
      if (!App.profil || App.profil.peran === 'admin_papkenz') return;
      var kartu = document.createElement('div');
      kartu.innerHTML = '<h3>Pengaturan fasyankes</h3><p class="muted">Kelas IPAL, titik sampel air dan IPAL, serta zona risiko ruangan.</p>' +
        '<button type="button" id="pf-buka">Buka pengaturan</button>';
      el.appendChild(kartu);
      $('pf-buka').onclick = function () { tampil(el); };
    };
  }
  App.tabs.pengaturan_fas = tampil;
  window.PENGATURAN = { ambil: ambil, simpan: simpan, titik: titik, KELAS: KELAS };
})();
