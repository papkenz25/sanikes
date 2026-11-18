(function () {
  var WARNA = { kuning: '#F2C200', cokelat: '#8B5A2B', ungu: '#7B3FA0', merah: '#D32F2F', hijau: '#2E7D32' };
  var SUHU = [['ruang', 'Suhu ruang'], ['pendingin', 'Pendingin (0-5 C)'], ['beku', 'Beku (0 C atau kurang)']];
  var G1 = 'width:auto;display:inline-block;padding:6px 14px;margin:6px 6px 0 0;font-size:14px';
  var G2 = G1 + ';background:#fff;color:#a33;border:1px solid #a33';
  var cache = {};
  var S = { master: [], items: [], tps: [], ruang: [], kode: null, token: 0, rows: {} };

  function beratKg() {
    var v = parseFloat($('l-berat').value);
    if (!(v > 0)) return NaN;
    var kg = $('l-satuan').value === 'ton' ? v * 1000 : v;
    return Math.round(kg * 1000) / 1000;
  }

  function pilihTerbaru(rows, hari) {
    var m = {};
    rows.forEach(function (r) {
      if (r.berlaku_mulai > hari) return;
      if (!m[r.kode] || r.berlaku_mulai > m[r.kode].berlaku_mulai) m[r.kode] = r;
    });
    return Object.keys(m).sort().map(function (k) { return m[k]; });
  }

  async function jumlah30(kode, tgl) {
    var key = kode + '|' + tgl;
    if (cache[key] !== undefined) return cache[key];
    var d = new Date(tgl + 'T00:00:00');
    d.setDate(d.getDate() - 29);
    var r = await App.db.from('limbah_harian').select('berat_kg')
      .eq('kode_limbah', kode).gte('tanggal', tglLokal(d)).lte('tanggal', tgl);
    var s = 0;
    (r.data || []).forEach(function (x) { s += Number(x.berat_kg); });
    cache[key] = s;
    return s;
  }

  async function hitungBatas(row, berat, tgl, jam, suhu) {
    var hari = null, ket = '';
    if (row.penentu_batas === 'suhu') {
      hari = suhu === 'ruang' ? row.batas_suhu_ruang_hari : (suhu === 'pendingin' ? row.batas_pendingin_hari : row.batas_beku_hari);
      ket = 'Penyimpanan suhu ' + suhu;
    } else if (row.penentu_batas === 'jumlah') {
      var total = (await jumlah30(row.kode, tgl)) + berat;
      var rata = total / 30;
      var ambang = Number(row.ambang_kg_per_hari || 50);
      hari = rata >= ambang ? row.batas_hari_ambang_atau_lebih : row.batas_hari_di_bawah_ambang;
      ket = 'Rata-rata timbulan ' + rata.toFixed(2) + ' kg/hari (ambang ' + ambang + ' kg)';
    }
    if (hari === null || hari === undefined) return { iso: null, hari: null, ket: ket };
    hari = Number(hari);
    var mulai = new Date(tgl + 'T' + (jam || '00:00'));
    return { iso: new Date(mulai.getTime() + hari * 86400000).toISOString(), hari: hari, ket: ket };
  }

  async function segarkanBatas() {
    var box = $('l-batas');
    var berat = beratKg();
    if (!S.kode || !(berat > 0)) { box.className = 'info'; box.textContent = 'Pilih kode limbah dan isi berat untuk melihat batas simpan.'; return; }
    var tok = ++S.token;
    var h = await hitungBatas(S.kode, berat, $('l-tgl').value, $('l-jam').value, $('l-suhu').value);
    if (tok !== S.token) return;
    if (!h.iso) {
      box.className = 'info waspada';
      box.textContent = 'Batas simpan belum ditetapkan untuk kode ini (perlu verifikasi aturan). Catatan tetap bisa disimpan.';
    } else {
      box.className = 'info';
      box.innerHTML = 'Batas simpan: <b>' + h.hari + ' hari</b> (sampai ' + fmtWaktu(h.iso) + ')<br><span class="muted">' + esc(h.ket) + '</span>';
    }
  }

  function pilihKode(kode) {
    S.kode = S.master.filter(function (m) { return m.kode === kode; })[0] || null;
    document.querySelectorAll('#l-chips .chip').forEach(function (c) { c.classList.toggle('aktif', c.dataset.kode === kode); });
    var m = S.kode;
    if (!m) return;
    var h = '<b>' + esc(m.nama) + '</b><br>Contoh: ' + esc(m.contoh_barang || '-');
    h += '<br>Wadah: ' + esc(m.jenis_wadah || '-') + (m.warna_kemasan ? ' (' + esc(m.warna_kemasan) + ')' : '');
    h += '<br>Simbol: ' + esc(m.simbol || '-');
    if (m.status_verifikasi !== 'terverifikasi') h += '<br><b>Perhatian:</b> kode ini belum diverifikasi dengan aturan resmi.';
    $('l-info-kode').className = m.status_verifikasi !== 'terverifikasi' ? 'info waspada' : 'info';
    $('l-info-kode').innerHTML = h;
    $('l-daftar-nama').innerHTML = S.items.filter(function (i) { return i.kode_limbah === kode; })
      .map(function (i) { return '<option value="' + esc(i.nama_item) + '">'; }).join('');
    segarkanBatas();
  }

  // ===== DAFTAR HARI INI + UBAH / HAPUS / PULIHKAN =====
  function opsi(list, nilai) {
    return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (String(o[0]) === String(nilai) ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
  }
  function formUbah(x) {
    return '<div style="border:1px solid #ccc;border-radius:10px;padding:10px;margin-top:8px">' +
      '<label>Tanggal</label><input type="date" id="e-tgl" value="' + esc(x.tanggal) + '">' +
      '<label>Jam</label><input type="time" id="e-jam" value="' + esc((x.jam || '').slice(0, 5)) + '">' +
      '<label>Ruangan asal</label><select id="e-ruang">' + opsi(S.ruang.map(function (r) { return [r.id, r.nama]; }), x.ruangan_id) + '</select>' +
      '<label>Kode limbah</label><select id="e-kode">' + opsi(S.master.map(function (m) { return [m.kode, m.kode + ' - ' + m.nama]; }), x.kode_limbah) + '</select>' +
      '<label>Nama barang</label><input id="e-nama" value="' + esc(x.nama_limbah || '') + '">' +
      '<label>Berat (kg)</label><input type="number" step="any" inputmode="decimal" id="e-berat" value="' + esc(x.berat_kg) + '">' +
      '<label>TPS</label><select id="e-tps">' + opsi(S.tps.map(function (t) { return [t.id, t.nama]; }), x.tps_id) + '</select>' +
      '<label>Suhu penyimpanan</label><select id="e-suhu">' + opsi(SUHU, x.suhu) + '</select>' +
      '<label>ID kantong / safety box</label><input id="e-kantong" value="' + esc(x.id_kantong || '') + '">' +
      '<button type="button" data-a="simpan" data-id="' + x.id + '">Simpan perubahan</button>' +
      '<button type="button" style="' + G1 + '" data-a="batal">Batal</button>' +
      '<div class="pesan" id="e-pesan"></div></div>';
  }

  async function muatDaftar(pesan) {
    var box = $('l-daftar');
    if (!box) return;
    var r = await App.db.from('limbah_harian').select('*, ruangan(nama), tps(nama)')
      .eq('tanggal', tglLokal(new Date())).order('dibuat', { ascending: false });
    if (r.error) { box.innerHTML = '<p class="muted">Gagal memuat catatan.</p>'; return; }
    S.rows = {};
    var total = 0;
    var isi = r.data.map(function (x) {
      S.rows[x.id] = x;
      total += Number(x.berat_kg);
      var aksi = x.status === 'disimpan'
        ? '<div data-box="' + x.id + '"><button type="button" style="' + G1 + '" data-a="ubah" data-id="' + x.id + '">Ubah</button>' +
          '<button type="button" style="' + G2 + '" data-a="hapus" data-id="' + x.id + '">Hapus</button></div>'
        : '<br><span class="muted">Sudah diangkut, data dikunci.</span>';
      return '<div class="baris"><b>' + esc(x.kode_limbah) + '</b> · ' + fmtBerat(x.berat_kg) + ' · ' + esc((x.jam || '').slice(0, 5)) +
        '<br>' + esc(x.nama_limbah || '') + '<br><span class="muted">' + esc(x.ruangan ? x.ruangan.nama : '-') + ' → ' + esc(x.tps ? x.tps.nama : '-') + '</span>' + aksi + '</div>';
    }).join('');
    var html = (pesan ? '<div class="pesan" style="color:#0F6E5C">' + esc(pesan) + '</div>' : '') +
      (r.data.length ? '<p class="ok">Total hari ini: ' + fmtBerat(total) + '</p>' + isi : '<p class="muted">Belum ada catatan hari ini.</p>');

    if (['admin_fasyankes', 'petugas_kesling'].indexOf(App.profil.peran) > -1) {
      var awal = new Date(tglLokal(new Date()) + 'T00:00:00').toISOString();
      var h = await App.db.from('riwayat').select('id, dibuat, sebelum').eq('tabel', 'limbah_harian').eq('aksi', 'hapus permanen')
        .is('detail', null).gte('dibuat', awal).order('dibuat', { ascending: false });
      if (h.data && h.data.length) {
        html += '<h3>Dihapus hari ini</h3>' + h.data.map(function (d) {
          var s = d.sebelum || {};
          return '<div class="baris" style="opacity:.7"><b>' + esc(s.kode_limbah || '') + '</b> · ' + fmtBerat(s.berat_kg) +
            '<br><span class="muted">Dihapus ' + esc(fmtWaktu(d.dibuat)) + '</span>' +
            '<br><button type="button" style="' + G1 + '" data-a="pulih" data-r="' + d.id + '">Pulihkan</button></div>';
        }).join('');
      }
    }
    box.innerHTML = html;
  }

  async function aksiDaftar(e) {
    var b = e.target.closest ? e.target.closest('[data-a]') : null;
    if (!b) return;
    var a = b.dataset.a, id = b.dataset.id, x = S.rows[id];
    var wadah = id ? document.querySelector('[data-box="' + id + '"]') : null;

    if (a === 'batal') { muatDaftar(); return; }
    if (a === 'ubah' && x && wadah) {
      var terbuka = document.getElementById('e-tgl');
      if (terbuka) { await muatDaftar(); wadah = document.querySelector('[data-box="' + id + '"]'); }
      if (wadah) wadah.innerHTML = formUbah(x);
      return;
    }
    if (a === 'hapus' && wadah) {
      wadah.innerHTML = '<b>Yakin hapus catatan ini?</b><br>' +
        '<button type="button" style="' + G2 + '" data-a="ya-hapus" data-id="' + id + '">Ya, hapus</button>' +
        '<button type="button" style="' + G1 + '" data-a="batal">Batal</button>';
      return;
    }
    if (a === 'ya-hapus') {
      var d = await App.db.rpc('hapus_limbah', { p_id: id });
      cache = {};
      muatDaftar(d.error ? 'Gagal: ' + d.error.message : 'Catatan dihapus.');
      return;
    }
    if (a === 'pulih') {
      var p = await App.db.rpc('pulihkan_limbah', { p_riwayat: b.dataset.r });
      cache = {};
      muatDaftar(p.error ? 'Gagal: ' + p.error.message : 'Catatan dipulihkan.');
      return;
    }
    if (a === 'simpan' && x) {
      var ps = $('e-pesan');
      var kode = $('e-kode').value, m = S.master.filter(function (k) { return k.kode === kode; })[0];
      var berat = Math.round(Number($('e-berat').value) * 1000) / 1000;
      var tgl = $('e-tgl').value, jam = $('e-jam').value, suhu = $('e-suhu').value;
      if (!tgl || !jam) { ps.textContent = 'Tanggal dan jam wajib diisi.'; return; }
      if (!(berat > 0)) { ps.textContent = 'Isi berat dengan benar (minimal 0,001 kg).'; return; }
      if (!m) { ps.textContent = 'Kode limbah tidak dikenal.'; return; }
      var koreksi = x.kode_limbah === kode ? Number(x.berat_kg) : 0;
      var h = await hitungBatas(m, berat - koreksi, tgl, jam, suhu);
      var u = await App.db.from('limbah_harian').update({
        tanggal: tgl, jam: jam, ruangan_id: $('e-ruang').value, kode_limbah: kode,
        nama_limbah: $('e-nama').value.trim() || m.nama, berat_kg: berat, tps_id: $('e-tps').value,
        suhu: suhu, batas_simpan: h.iso, id_kantong: $('e-kantong').value.trim() || null
      }).eq('id', id);
      if (u.error) { ps.textContent = 'Gagal menyimpan: ' + u.error.message; return; }
      cache = {};
      muatDaftar('Perubahan disimpan.' + (h.iso ? ' Batas simpan baru: ' + fmtWaktu(h.iso) : ''));
    }
  }

  App.tabs.catat = async function (el) {
    var peran = App.profil.peran;
    if (['admin_fasyankes', 'petugas_kesling', 'petugas_ruangan'].indexOf(peran) < 0) {
      el.innerHTML = '<div class="info">Peran Anda hanya bisa melihat data, tidak bisa mencatat.</div>';
      return;
    }
    el.innerHTML = '<p class="muted">Memuat...</p>';
    var hari = tglLokal(new Date());
    var r = await Promise.all([
      App.db.from('master_limbah').select('*').eq('aktif', true),
      App.db.from('ruangan').select('id, nama').eq('aktif', true).order('nama'),
      App.db.from('tps').select('id, nama, suhu').eq('aktif', true).order('nama'),
      App.db.from('limbah_item').select('kode_limbah, nama_item').eq('aktif', true).order('nama_item')
    ]);
    if (r[0].error || r[1].error || r[2].error || r[3].error) {
      el.innerHTML = '<div class="info waspada">Gagal memuat data. Coba muat ulang halaman.</div>';
      return;
    }
    S.master = pilihTerbaru(r[0].data, hari);
    S.items = r[3].data;
    S.tps = r[2].data;
    S.ruang = r[1].data;
    S.kode = null;
    if (!r[1].data.length || !S.tps.length) {
      el.innerHTML = '<div class="info waspada">Ruangan atau TPS belum diisi.</div>';
      return;
    }
    var opsiRuang = r[1].data.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.nama) + '</option>'; }).join('');
    var opsiTps = S.tps.map(function (x) { return '<option value="' + esc(x.id) + '">' + esc(x.nama) + '</option>'; }).join('');
    var chips = S.master.map(function (m) {
      return '<button type="button" class="chip" data-kode="' + esc(m.kode) + '"><span class="titik" style="background:' + (WARNA[m.warna_kemasan] || '#ccc') + '"></span>' + esc(m.kode) + '</button>';
    }).join('');

    el.innerHTML =
      '<h3 style="margin-top:0">Catat limbah B3</h3>' +
      '<form id="f-limbah">' +
      '<label>Tanggal</label><input type="date" id="l-tgl" value="' + hari + '" required>' +
      '<label>Jam</label><input type="time" id="l-jam" value="' + jamLokal(new Date()) + '" required>' +
      '<label>Ruangan asal</label><select id="l-ruangan" required>' + opsiRuang + '</select>' +
      '<label>Kode limbah</label><div class="chips" id="l-chips">' + chips + '</div>' +
      '<div id="l-info-kode" class="info">Pilih kode limbah di atas.</div>' +
      '<label>Nama barang (opsional)</label><input id="l-nama" list="l-daftar-nama" autocomplete="off"><datalist id="l-daftar-nama"></datalist>' +
      '<label>Berat</label><div style="display:flex;gap:8px"><input type="number" id="l-berat" step="any" min="0" inputmode="decimal" required style="flex:1"><select id="l-satuan" style="width:96px"><option value="kg">kg</option><option value="ton">ton</option></select></div>' +
      '<label>TPS tujuan</label><select id="l-tps" required>' + opsiTps + '</select>' +
      '<label>Suhu penyimpanan</label><select id="l-suhu"><option value="ruang">Suhu ruang</option><option value="pendingin">Pendingin (0-5 C)</option><option value="beku">Beku (0 C atau kurang)</option></select>' +
      '<label>ID kantong / safety box (opsional)</label><input id="l-kantong">' +
      '<div id="l-batas" class="info">Pilih kode limbah dan isi berat untuk melihat batas simpan.</div>' +
      '<button type="submit" id="l-simpan">Simpan</button>' +
      '<div class="pesan" id="l-pesan"></div>' +
      '</form>' +
      '<h3>Catatan hari ini</h3><div id="l-daftar"></div>';

    $('l-satuan').value = App.satuan;
    $('l-daftar').onclick = aksiDaftar;

    function setSuhuDariTps() {
      var t = S.tps.filter(function (x) { return x.id === $('l-tps').value; })[0];
      if (t && t.suhu) $('l-suhu').value = t.suhu;
    }
    setSuhuDariTps();

    $('l-chips').addEventListener('click', function (e) {
      var c = e.target.closest('.chip');
      if (c) pilihKode(c.dataset.kode);
    });
    $('l-tps').addEventListener('change', function () { setSuhuDariTps(); segarkanBatas(); });
    ['l-berat', 'l-satuan', 'l-suhu', 'l-tgl', 'l-jam'].forEach(function (id) {
      $(id).addEventListener('input', segarkanBatas);
    });

    $('f-limbah').addEventListener('submit', async function (e) {
      e.preventDefault();
      var pesan = $('l-pesan');
      pesan.style.color = '';
      pesan.textContent = '';
      if (!S.kode) { pesan.textContent = 'Pilih kode limbah dulu.'; return; }
      var berat = beratKg();
      if (!(berat > 0)) { pesan.textContent = 'Isi berat dengan benar (minimal 0,001 kg).'; return; }
      $('l-simpan').disabled = true;
      var h = await hitungBatas(S.kode, berat, $('l-tgl').value, $('l-jam').value, $('l-suhu').value);
      var res = await App.db.from('limbah_harian').insert({
        tanggal: $('l-tgl').value,
        jam: $('l-jam').value,
        ruangan_id: $('l-ruangan').value,
        kode_limbah: S.kode.kode,
        nama_limbah: $('l-nama').value.trim() || S.kode.nama,
        berat_kg: berat,
        tps_id: $('l-tps').value,
        suhu: $('l-suhu').value,
        batas_simpan: h.iso,
        id_kantong: $('l-kantong').value.trim() || null
      });
      $('l-simpan').disabled = false;
      if (res.error) { pesan.textContent = 'Gagal menyimpan: ' + res.error.message; return; }
      cache = {};
      pesan.style.color = '#0F6E5C';
      pesan.textContent = 'Tersimpan.' + (h.iso ? ' Batas simpan: ' + fmtWaktu(h.iso) : '');
      $('l-berat').value = '';
      $('l-nama').value = '';
      $('l-kantong').value = '';
      segarkanBatas();
      muatDaftar();
    });

    muatDaftar();
  };
})();
