(function () {
  var TULIS = ['admin_fasyankes', 'petugas_kesling', 'petugas_ruangan'];
  var JENIS = [
    'Kecelakaan akibat kerja',
    'Kejadian hampir celaka (near miss)',
    'Tertusuk jarum / benda tajam',
    'Tumpahan bahan berbahaya (B3)',
    'Tumpahan / pecahan merkuri',
    'Dugaan penyakit akibat kerja',
    'Lainnya'
  ];
  var STATUS = [['terbuka', 'Belum selesai'], ['selesai', 'Selesai ditindaklanjuti']];
  var URAIAN = [
    ['sdm', 'Jumlah SDM Fasyankes'],
    ['sakit', 'Jumlah SDM Fasyankes yang sakit'],
    ['umum', 'Jumlah kasus penyakit umum pada SDM Fasyankes'],
    ['dugaan_pak', 'Jumlah kasus dugaan penyakit akibat kerja pada SDM Fasyankes'],
    ['pak', 'Jumlah kasus penyakit akibat kerja pada SDM Fasyankes'],
    ['kak', 'Jumlah kasus kecelakaan akibat kerja pada SDM Fasyankes'],
    ['nearmiss', 'Jumlah kasus kejadian hampir celaka (near miss) pada SDM Fasyankes'],
    ['absen', 'Jumlah hari absen SDM Fasyankes karena sakit']
  ];

  function hariIni() { return tglLokal(new Date()); }
  function bisaTulis() { return TULIS.indexOf(App.profil.peran) > -1; }
  function blokir(el) {
    if (App.profil.peran === 'admin_papkenz') { el.innerHTML = '<div class="info">Data ini milik fasyankes. Gunakan akun fasyankes.</div>'; return true; }
    return false;
  }
  function opsi(list, nilai) {
    return list.map(function (o) {
      var v = Array.isArray(o) ? o[0] : o, t = Array.isArray(o) ? o[1] : o;
      return '<option value="' + esc(v) + '"' + (v === nilai ? ' selected' : '') + '>' + esc(t) + '</option>';
    }).join('');
  }

  // ===== INSIDEN K3 =====
  App.tabs.k3_insiden = async function (el) {
    if (blokir(el)) return;
    var rows = [];
    var form = bisaTulis()
      ? '<div class="info">Jangan menulis nama korban atau diagnosis di sini. Cukup jenis kejadian, lokasi, dan uraian singkat.</div>' +
        '<label>Tanggal kejadian</label><input type="date" id="ki-tgl" value="' + hariIni() + '">' +
        '<label>Jenis kejadian</label><select id="ki-jenis">' + opsi(JENIS) + '</select>' +
        '<label>Lokasi</label><input id="ki-lok" placeholder="mis. IGD, TPS limbah B3">' +
        '<label>Jumlah SDM terdampak</label><input type="number" min="0" step="1" id="ki-jml" value="1">' +
        '<label>Uraian singkat</label><input id="ki-urai" placeholder="mis. tertusuk jarum saat menutup kembali jarum suntik">' +
        '<label>Tindakan segera yang sudah dilakukan</label><input id="ki-tin">' +
        '<button type="button" id="ki-simpan">Simpan kejadian</button><div class="pesan" id="ki-pesan"></div>'
      : '';
    el.innerHTML = '<h3 style="margin-top:0">Insiden K3</h3>' + form + '<div id="tl-box"></div><h3>Riwayat kejadian</h3><div id="ki-daftar"></div>';

    async function daftar(pesan) {
      var q = App.db.from('k3_insiden').select('*');
      if (window.KL) q = KL.filter(q, 'k3_insiden');
      var r = await q.order('tanggal', { ascending: false }).order('dibuat', { ascending: false }).limit(50);
      if (r.error) { $('ki-daftar').innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
      rows = r.data;
      $('ki-daftar').innerHTML = (pesan ? '<div class="pesan">' + esc(pesan) + '</div>' : '') + (window.KL ? KL.saklar('k3_insiden') : '') +
        (rows.length ? rows.map(function (x) {
          return '<div class="baris"' + (x.dihapus ? ' style="opacity:.6"' : '') + '><b>' + esc(x.jenis) + '</b> · ' + esc(x.lokasi || '-') +
            ' · ' + (x.status === 'selesai' ? '<span class="ok">selesai</span>' : '<span class="lewat">belum selesai</span>') +
            '<br><span class="muted">' + esc(x.tanggal) + ' · ' + (x.jumlah || 0) + ' orang' + (x.uraian ? ' · ' + esc(x.uraian) : '') + '</span>' +
            (x.tindakan ? '<br><span class="muted">Tindakan: ' + esc(x.tindakan) + '</span>' : '') +
            (window.KL ? KL.tombol(x) : '') + '</div>';
        }).join('') : '<p class="muted">Belum ada kejadian tercatat.</p>');
    }

    if (window.KL) KL.pasang($('ki-daftar'), {
      tabel: 'k3_insiden',
      cari: function (id) { return rows.filter(function (x) { return x.id === id; })[0]; },
      bidang: function (x) {
        return [
          { k: 'tanggal', l: 'Tanggal', tipe: 'tanggal', nilai: x.tanggal },
          { k: 'jenis', l: 'Jenis kejadian', tipe: 'pilih', opsi: JENIS, nilai: x.jenis },
          { k: 'lokasi', l: 'Lokasi', tipe: 'teks', nilai: x.lokasi },
          { k: 'jumlah', l: 'Jumlah SDM terdampak', tipe: 'angka', nilai: x.jumlah },
          { k: 'uraian', l: 'Uraian singkat', tipe: 'teks', nilai: x.uraian },
          { k: 'tindakan', l: 'Tindakan', tipe: 'teks', nilai: x.tindakan },
          { k: 'status', l: 'Status', tipe: 'pilih', opsi: STATUS, nilai: x.status }
        ];
      },
      simpan: async function (x, is) {
        if (!is.tanggal || !(is.lokasi || '').trim()) return { galat: 'Tanggal dan lokasi wajib diisi.' };
        var j = Number(is.jumlah);
        if (is.jumlah === '' || isNaN(j) || j < 0) return { galat: 'Jumlah harus angka 0 atau lebih.' };
        return {
          ubah: { tanggal: is.tanggal, jenis: is.jenis, lokasi: is.lokasi.trim(), jumlah: Math.round(j), uraian: (is.uraian || '').trim() || null, tindakan: (is.tindakan || '').trim() || null, status: is.status },
          setelah: async function () {
            if (is.status === 'selesai') {
              await App.db.from('temuan').update({ status: 'selesai', tindakan: (is.tindakan || '').trim() || 'Selesai', tanggal_selesai: hariIni() })
                .eq('sumber', 'k3_insiden').eq('sumber_id', x.id).eq('status', 'terbuka');
            }
          }
        };
      },
      selesai: function (m) { daftar(m); if (window.TL && $('tl-box')) TL.panel($('tl-box'), 'k3'); }
    });

    if (bisaTulis()) {
      $('ki-simpan').addEventListener('click', async function () {
        var tgl = $('ki-tgl').value, lok = $('ki-lok').value.trim(), j = Number($('ki-jml').value);
        if (!tgl || !lok) { $('ki-pesan').textContent = 'Tanggal dan lokasi wajib diisi.'; return; }
        if ($('ki-jml').value === '' || isNaN(j) || j < 0) { $('ki-pesan').textContent = 'Jumlah harus angka 0 atau lebih.'; return; }
        var jenis = $('ki-jenis').value;
        var r = await App.db.from('k3_insiden').insert({
          tanggal: tgl, jenis: jenis, lokasi: lok, jumlah: Math.round(j),
          uraian: $('ki-urai').value.trim() || null, tindakan: $('ki-tin').value.trim() || null, status: 'terbuka'
        }).select('id');
        if (r.error) { $('ki-pesan').textContent = 'Gagal menyimpan: ' + (r.error.message || 'coba lagi'); return; }
        if (window.TL) {
          await TL.catat([{ tanggal: tgl, kategori: 'k3', sumber: 'k3_insiden', sumber_id: r.data && r.data[0] && r.data[0].id,
            lokasi: lok, parameter: jenis, hasil: (j || 0) + ' orang terdampak', uraian: 'insiden K3 perlu ditindaklanjuti' }]);
        }
        await App.tabs.k3_insiden(el);
        $('ki-pesan').textContent = 'Tersimpan dan dicatat sebagai temuan, lihat saran di bawah.';
      });
    }
    daftar();
    if (window.TL && $('tl-box')) TL.panel($('tl-box'), 'k3');
  };

  // ===== LAPORAN SEMESTER K3 (Permenkes 52/2018 BAB III) =====
  function rentangSemester(tahun, s) {
    return s === 1 ? [tahun + '-01-01', tahun + '-06-30'] : [tahun + '-07-01', tahun + '-12-31'];
  }

  App.tabs.k3_semester = async function (el) {
    if (blokir(el)) return;
    var kini = new Date(), th = kini.getFullYear(), sm = kini.getMonth() < 6 ? 1 : 2;
    el.innerHTML = '<div id="ks-root"><div class="noprint"><h3 style="margin-top:0">Laporan semester K3</h3>' +
      '<p class="muted">Format mengikuti Laporan Semester K3 Fasyankes (Permenkes 52/2018 BAB III). Angka kecelakaan dan near miss diisi otomatis dari Insiden K3 dan masih bisa diubah.</p>' +
      '<label>Tahun</label><input type="number" id="ks-th" value="' + th + '">' +
      '<label>Semester</label><select id="ks-sm"><option value="1"' + (sm === 1 ? ' selected' : '') + '>Semester 1 (Januari sampai Juni)</option><option value="2"' + (sm === 2 ? ' selected' : '') + '>Semester 2 (Juli sampai Desember)</option></select>' +
      '<button type="button" id="ks-buka">Buka laporan</button></div><div id="ks-isi"></div></div>';

    async function buka() {
      var tahun = Number($('ks-th').value), s = Number($('ks-sm').value);
      if (!tahun) { $('ks-isi').innerHTML = '<div class="pesan">Isi tahun dengan benar.</div>'; return; }
      var periode = tahun + '-S' + s, rg = rentangSemester(tahun, s);
      $('ks-isi').innerHTML = '<p class="muted">Memuat...</p>';
      var r = await Promise.all([
        App.db.from('k3_semester').select('*').eq('periode', periode).maybeSingle(),
        App.db.from('k3_insiden').select('jenis, jumlah').is('dihapus', null).gte('tanggal', rg[0]).lte('tanggal', rg[1]),
        App.db.from('fasyankes').select('nama, alamat, kabupaten_kota, provinsi, nama_pimpinan').eq('id', App.profil.fasyankes_id).maybeSingle()
      ]);
      var ada = r[0].data, isian = (ada && ada.isian) || {};
      var otomatis = { kak: 0, nearmiss: 0, dugaan_pak: 0 };
      (r[1].data || []).forEach(function (x) {
        var j = Number(x.jumlah) || 0;
        if (x.jenis === 'Kejadian hampir celaka (near miss)') otomatis.nearmiss += j;
        else if (x.jenis === 'Dugaan penyakit akibat kerja') otomatis.dugaan_pak += j;
        else if (x.jenis !== 'Lainnya') otomatis.kak += j;
      });
      var f = r[2].data || {};
      var bisa = ['admin_fasyankes', 'petugas_kesling'].indexOf(App.profil.peran) > -1;
      $('ks-isi').innerHTML =
        '<h3 style="text-align:center">LAPORAN SEMESTER KESELAMATAN DAN KESEHATAN KERJA<br>DI FASILITAS PELAYANAN KESEHATAN</h3>' +
        '<p>Nama Fasyankes: ' + esc(f.nama || '') + '<br>Alamat: ' + esc(f.alamat || '') + '<br>Kabupaten/Kota: ' + esc(f.kabupaten_kota || '') +
        '<br>Provinsi: ' + esc(f.provinsi || '') + '<br>Periode: Semester ' + s + ' tahun ' + tahun + '</p>' +
        '<table style="width:100%;border-collapse:collapse;font-size:14px"><tr><th style="text-align:left">No.</th><th style="text-align:left">Uraian</th><th style="text-align:left">Jumlah</th></tr>' +
        URAIAN.map(function (u, i) {
          var nilai = isian[u[0]] != null ? isian[u[0]] : (otomatis[u[0]] != null ? otomatis[u[0]] : '');
          return '<tr><td style="padding:6px;border-bottom:1px solid #ddd">' + (i + 1) + '</td><td style="padding:6px;border-bottom:1px solid #ddd">' + esc(u[1]) +
            (otomatis[u[0]] != null ? '<br><span class="muted noprint">dari Insiden K3: ' + otomatis[u[0]] + '</span>' : '') + '</td>' +
            '<td style="padding:6px;border-bottom:1px solid #ddd;width:110px"><input type="number" min="0" step="1" data-u="' + u[0] + '" value="' + esc(nilai) + '"' + (bisa ? '' : ' disabled') + ' style="margin:0"></td></tr>';
        }).join('') + '</table>' +
        '<div style="display:flex;justify-content:space-between;margin-top:32px"><div>Mengetahui,<br>Pimpinan Fasyankes<br><br><br><b>' + esc(f.nama_pimpinan || '....................') + '</b></div>' +
        '<div>Ketua Tim / Penanggung jawab K3<br><br><br><br>....................</div></div>' +
        '<div class="noprint">' + (bisa ? '<button type="button" id="ks-simpan">Simpan laporan</button>' : '') +
        '<button type="button" id="ks-cetak" style="background:#666">Cetak / simpan PDF</button><div class="pesan" id="ks-pesan">' +
        (ada ? 'Laporan periode ini sudah pernah disimpan.' : '') + '</div></div>';
      $('ks-cetak').onclick = function () { window.print(); };
      if (bisa) $('ks-simpan').onclick = async function () {
        var o = {}, salah = '';
        $('ks-isi').querySelectorAll('[data-u]').forEach(function (i) {
          if (i.value === '') return;
          var n = Number(i.value);
          if (isNaN(n) || n < 0) salah = 'Semua isian harus angka 0 atau lebih.';
          o[i.dataset.u] = Math.round(n);
        });
        if (salah) { $('ks-pesan').textContent = salah; return; }
        var data = { periode: periode, tahun: tahun, semester: s, isian: o };
        var res = ada ? await App.db.from('k3_semester').update(data).eq('id', ada.id) : await App.db.from('k3_semester').insert(data);
        $('ks-pesan').textContent = res.error ? 'Gagal menyimpan: ' + res.error.message : 'Laporan tersimpan.';
        if (!res.error && !ada) buka();
      };
    }
    $('ks-buka').onclick = buka;
    buka();
  };
})();
