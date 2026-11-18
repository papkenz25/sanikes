(function () {
  var KELOLA = ['admin_fasyankes', 'petugas_kesling'];
  var KELAS = [
    ['3_50', 'Dibuang ke media air, 3 sampai 50 m³/hari'],
    ['gt50', 'Dibuang ke media air, di atas 50 m³/hari'],
    ['le3', 'Dibuang ke media air, sampai 3 m³/hari'],
    ['drainase', 'Dibuang ke drainase / irigasi'],
    ['tidak_ada', 'Tidak memiliki IPAL']
  ];
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

  async function tampil(box, pesan) {
    var boleh = KELOLA.indexOf(App.profil.peran) > -1;
    var p = await ambil(true);
    var ta = await titik('air'), ti = await titik('ipal');
    box.innerHTML = '<div id="pf-root">' +
      (boleh ? '' : '<div class="info">Hanya admin fasyankes dan petugas kesling yang dapat mengubah pengaturan.</div>') +
      '<label>Kelas baku mutu IPAL</label><select id="pf-kelas"' + (boleh ? '' : ' disabled') + '><option value="">- pilih -</option>' +
      KELAS.map(function (k) { return '<option value="' + k[0] + '"' + (p.kelas_ipal === k[0] ? ' selected' : '') + '>' + k[1] + '</option>'; }).join('') +
      '</select><p class="muted">Sesuaikan dengan persetujuan teknis atau izin IPAL fasyankes. Dipakai otomatis di IPAL harian dan uji lab IPAL.</p>' +
      blokTitik('air', 'Titik sampel air', ta, 'mis. Tandon atas, Keran dapur', boleh) +
      blokTitik('ipal', 'Titik IPAL', ti, 'mis. Inlet, Outlet', boleh) +
      '<p class="muted">Zona risiko ruangan diatur di sub-tab Ruangan.</p>' +
      '<div class="pesan" id="pf-pesan">' + esc(pesan || '') + '</div></div>';
    if (!boleh) return;

    var root = $('pf-root');
    root.onchange = async function (e) {
      if (e.target.id !== 'pf-kelas') return;
      var err = await simpan('kelas_ipal', e.target.value);
      $('pf-pesan').textContent = err ? 'Gagal: ' + (err.message || 'coba lagi') : 'Kelas IPAL disimpan.';
    };
    root.onclick = async function (e) {
      var tb = e.target.getAttribute && e.target.getAttribute('data-tambah');
      var na = e.target.getAttribute && e.target.getAttribute('data-nonaktif');
      if (tb) {
        var nama = $('pf-baru-' + tb).value.trim();
        if (!nama) { $('pf-pesan').textContent = 'Isi nama titik dulu.'; return; }
        var r = await App.db.from('titik').insert({ jenis: tb, nama: nama });
        if (r.error && r.error.code === '23505') r = await App.db.from('titik').update({ aktif: true }).eq('jenis', tb).eq('nama', nama);
        if (r.error) { $('pf-pesan').textContent = 'Gagal: ' + (r.error.message || 'coba lagi'); return; }
        await tampil(box, 'Titik "' + nama + '" ditambahkan.');
      } else if (na) {
        var n = await App.db.from('titik').update({ aktif: false }).eq('id', na);
        if (n.error) { $('pf-pesan').textContent = 'Gagal: ' + (n.error.message || 'coba lagi'); return; }
        await tampil(box, 'Titik dinonaktifkan.');
      }
    };
  }

  App.tabs.pengaturan_fas = function () {
    window.DATA_SUB = 'pengaturan';
    var b = document.querySelector('.bawah button[data-tab="data"]');
    if (b) b.click();
  };
  window.PENGATURAN = { ambil: ambil, simpan: simpan, titik: titik, KELAS: KELAS, tampil: tampil };
})();
