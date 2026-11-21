(function () {
  var PERAN = [
    ['petugas_kesling', 'Petugas kesling'],
    ['petugas_ruangan', 'Petugas ruangan'],
    ['pimpinan', 'Pimpinan (hanya melihat)'],
    ['admin_fasyankes', 'Admin fasyankes']
  ];
  var G1 = 'width:auto;display:inline-block;padding:6px 14px;margin:6px 6px 0 0;font-size:14px';

  function namaPeran(p) { var x = PERAN.filter(function (r) { return r[0] === p; })[0]; return x ? x[1] : p; }
  function opsi(list, nilai) {
    return list.map(function (o) { return '<option value="' + esc(o[0]) + '"' + (o[0] === nilai ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('');
  }
  function klienDaftar() {
    return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sanikes-daftar' }
    });
  }

  App.tabs.pengguna = async function (el, pesanAwal) {
    var peran = App.profil.peran;
    var papkenz = peran === 'admin_papkenz';
    if (!papkenz && peran !== 'admin_fasyankes') { el.innerHTML = '<div class="info">Halaman ini hanya untuk admin.</div>'; return; }
    el.innerHTML = '<p class="muted">Memuat...</p>';

    var daftarFas = [];
    if (papkenz) {
      var df = await App.db.rpc('daftar_fasyankes');
      daftarFas = df.data || [];
    }
    var fas = null;
    if (!papkenz) {
      var f = await App.db.from('fasyankes').select('*').eq('id', App.profil.fasyankes_id).maybeSingle();
      fas = f.data || {};
    }
    var pilihFas = papkenz ? (window._pgFas || (daftarFas[0] && daftarFas[0].id) || '') : null;
    var dp = await App.db.rpc('daftar_pengguna', { p_fasyankes: papkenz ? (pilihFas || null) : null });
    var orang = dp.data || [];

    var html = '<h3 style="margin-top:0">Kelola pengguna</h3>' + (pesanAwal ? '<div class="pesan" style="color:#0F6E5C">' + esc(pesanAwal) + '</div>' : '');

    if (papkenz) {
      html += '<button type="button" id="pg-wilayah">Kelola wilayah Dinkes</button>' +
        '<h3>Fasyankes klien</h3>' +
        (daftarFas.length ? '<label>Pilih fasyankes</label><select id="pg-fas">' + daftarFas.map(function (x) {
          return '<option value="' + x.id + '"' + (x.id === pilihFas ? ' selected' : '') + '>' + esc(x.nama) + ' (' + esc(x.jenis || '-') + ')</option>';
        }).join('') + '</select>' : '<p class="muted">Belum ada fasyankes.</p>') +
        '<details><summary style="font-weight:700;margin:12px 0;cursor:pointer">+ Tambah fasyankes baru</summary>' +
        '<label>Nama fasyankes</label><input id="pf-nama">' +
        '<label>Jenis</label><select id="pf-jenis">' + opsi([['Klinik', 'Klinik'], ['Puskesmas', 'Puskesmas'], ['Rumah sakit', 'Rumah sakit'], ['Laboratorium', 'Laboratorium'], ['Apotek', 'Apotek'], ['Lainnya', 'Lainnya']]) + '</select>' +
        '<label>Kabupaten/kota</label><input id="pf-kab"><label>Provinsi</label><input id="pf-prov">' +
        '<button type="button" id="pf-simpan">Simpan fasyankes</button><div class="pesan" id="pf-pesan"></div></details>';
    } else {
      html += '<details><summary style="font-weight:700;margin:12px 0;cursor:pointer">Data fasyankes (untuk kop dan tanda tangan laporan)</summary>' +
        '<label>Nama fasyankes</label><input value="' + esc(fas.nama || '') + '" disabled>' +
        '<label>Kode registrasi</label><input id="fs-kode" value="' + esc(fas.kode_registrasi || '') + '">' +
        '<label>Alamat</label><input id="fs-alamat" value="' + esc(fas.alamat || '') + '">' +
        '<label>Kabupaten/kota</label><input id="fs-kab" value="' + esc(fas.kabupaten_kota || '') + '">' +
        '<label>Provinsi</label><input id="fs-prov" value="' + esc(fas.provinsi || '') + '">' +
        '<label>Nama pimpinan</label><input id="fs-pim" value="' + esc(fas.nama_pimpinan || '') + '">' +
        '<label>NIP/NIK pimpinan</label><input id="fs-nip" value="' + esc(fas.nip_nik_pimpinan || '') + '">' +
        '<button type="button" id="fs-simpan">Simpan data fasyankes</button><div class="pesan" id="fs-pesan"></div></details>' +
        (/^puskesmas/i.test(fas.jenis || '')
          ? '<p class="muted">' + (fas.wilayah_id ? 'Data puskesmas ini dapat dilihat (hanya baca) oleh Dinas Kesehatan wilayah Anda.' : 'Puskesmas ini belum terhubung ke Dinas Kesehatan.') + '</p>'
          : '<h3>Berbagi data dengan Dinas Kesehatan</h3><p class="muted">Bila diizinkan, Dinas Kesehatan wilayah Anda dapat <b>melihat</b> (tidak mengubah) catatan kesehatan lingkungan fasyankes ini untuk pembinaan dan rekap wilayah. Izin bisa dicabut kapan saja.' +
            (fas.wilayah_id ? '' : ' Fasyankes ini belum terhubung ke wilayah Dinkes mana pun.') + '</p>' +
            '<label style="display:flex;gap:8px;align-items:center"><input type="checkbox" id="fs-bagi" style="width:auto"' + (fas.dibagikan_dinkes ? ' checked' : '') + '> Izinkan Dinkes melihat data</label><div class="pesan" id="fs-bagi-pesan"></div>');
    }

    var bisaTambah = !papkenz || pilihFas;
    html += '<h3>Tambah pengguna</h3>' + (bisaTambah
      ? '<p class="muted">Pengguna masuk dengan email dan kata sandi sementara ini, lalu menggantinya sendiri di menu Akun. Bila Supabase meminta konfirmasi email, pengguna perlu menekan tautan di emailnya lebih dulu.</p>' +
        '<label>Nama lengkap</label><input id="pg-nama">' +
        '<label>Email</label><input id="pg-email" type="email" autocomplete="off">' +
        '<label>Kata sandi sementara (minimal 8 karakter)</label><input id="pg-sandi" type="text" autocomplete="off">' +
        '<label>Peran</label><select id="pg-peran">' + opsi(papkenz ? [['admin_fasyankes', 'Admin fasyankes']].concat(PERAN.slice(0, 3)) : PERAN, papkenz ? 'admin_fasyankes' : 'petugas_kesling') + '</select>' +
        '<label>NIP/NIK (opsional)</label><input id="pg-nip">' +
        '<button type="button" id="pg-tambah">Tambah pengguna</button><div class="pesan" id="pg-pesan"></div>'
      : '<p class="muted">Tambahkan fasyankes dulu.</p>');

    html += '<h3>Daftar pengguna</h3><div id="pg-daftar">' + (orang.length ? orang.map(function (o) {
      var diri = o.id === App.profil.id;
      return '<div class="baris"' + (o.aktif ? '' : ' style="opacity:.6"') + '><b>' + esc(o.nama || '-') + '</b>' + (diri ? ' <span class="muted">(Anda)</span>' : '') +
        '<br>' + esc(o.email || '-') + ' · ' + esc(namaPeran(o.peran)) + (o.aktif ? '' : ' · <span class="lewat">nonaktif</span>') +
        (o.nip_nik ? '<br><span class="muted">NIP/NIK: ' + esc(o.nip_nik) + '</span>' : '') +
        '<div data-pbox="' + o.id + '"><button type="button" style="' + G1 + '" data-ubah="' + o.id + '">Ubah</button>' +
        (diri ? '' : '<button type="button" style="' + G1 + '" data-sandi="' + o.id + '">Atur ulang sandi</button>') + '</div></div>';
    }).join('') : '<p class="muted">Belum ada pengguna.</p>') + '</div>';
    el.innerHTML = html;

    if (papkenz && $('pg-fas')) $('pg-fas').onchange = function () { window._pgFas = this.value; App.tabs.pengguna(el); };
    if (papkenz) $('pf-simpan').onclick = async function () {
      var nama = $('pf-nama').value.trim();
      if (!nama) { $('pf-pesan').textContent = 'Isi nama fasyankes.'; return; }
      var r = await App.db.rpc('buat_fasyankes', { p_nama: nama, p_jenis: $('pf-jenis').value, p_kab: $('pf-kab').value.trim() || null, p_prov: $('pf-prov').value.trim() || null });
      if (r.error) { $('pf-pesan').textContent = 'Gagal: ' + r.error.message; return; }
      window._pgFas = r.data;
      App.tabs.pengguna(el, 'Fasyankes "' + nama + '" dibuat. Sekarang tambahkan admin fasyankes-nya.');
    };
    if (papkenz) $('pg-wilayah').onclick = function () { App.tabs.wilayah(el); App.kembali('Kelola pengguna', function () { App.tabs.pengguna(el); }); window.scrollTo(0, 0); };
    if (!papkenz && $('fs-bagi')) $('fs-bagi').onchange = async function () {
      var r = await App.db.rpc('atur_berbagi_dinkes', { p_boleh: this.checked });
      $('fs-bagi-pesan').textContent = r.error ? 'Gagal: ' + r.error.message : (this.checked ? 'Dinkes sekarang dapat melihat data fasyankes ini.' : 'Izin berbagi dicabut.');
    };
    if (!papkenz) $('fs-simpan').onclick = async function () {
      var r = await App.db.rpc('ubah_fasyankes_saya', {
        p_kode: $('fs-kode').value.trim() || null, p_alamat: $('fs-alamat').value.trim() || null,
        p_kab: $('fs-kab').value.trim() || null, p_prov: $('fs-prov').value.trim() || null,
        p_pimpinan: $('fs-pim').value.trim() || null, p_nip_pimpinan: $('fs-nip').value.trim() || null
      });
      $('fs-pesan').textContent = r.error ? 'Gagal: ' + r.error.message : 'Data fasyankes tersimpan.';
    };

    if (bisaTambah) $('pg-tambah').onclick = async function () {
      var ps = $('pg-pesan');
      var nama = $('pg-nama').value.trim(), email = $('pg-email').value.trim().toLowerCase(), sandi = $('pg-sandi').value;
      if (!nama) { ps.textContent = 'Isi nama lengkap.'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { ps.textContent = 'Format email tidak valid.'; return; }
      if (sandi.length < 8) { ps.textContent = 'Kata sandi sementara minimal 8 karakter.'; return; }
      this.disabled = true;
      ps.textContent = 'Membuat akun...';
      var d = await klienDaftar().auth.signUp({ email: email, password: sandi, options: { emailRedirectTo: location.origin } });
      var u = d.data && d.data.user;
      if (d.error || !u) { this.disabled = false; ps.textContent = 'Gagal membuat akun: ' + (d.error ? d.error.message : 'coba lagi'); return; }
      if (u.identities && u.identities.length === 0) { this.disabled = false; ps.textContent = 'Email ini sudah terdaftar. Gunakan email lain.'; return; }
      var r = await App.db.rpc('tambah_pengguna', { p_user: u.id, p_nama: nama, p_peran: $('pg-peran').value, p_nip: $('pg-nip').value.trim() || null, p_fasyankes: papkenz ? pilihFas : null });
      this.disabled = false;
      if (r.error) { ps.textContent = 'Akun dibuat, tetapi profil gagal disimpan: ' + r.error.message; return; }
      App.tabs.pengguna(el, 'Pengguna ' + nama + ' ditambahkan.' + (d.data.session ? '' : ' Minta pengguna menekan tautan konfirmasi di emailnya sebelum masuk.'));
    };

    $('pg-daftar').onclick = async function (e) {
      var b = e.target.closest ? e.target.closest('button') : null;
      if (!b) return;
      var id = b.dataset.ubah || b.dataset.simpan || b.dataset.batal || b.dataset.sandi || b.dataset.simpansandi;
      var o = orang.filter(function (x) { return x.id === id; })[0];
      var w = document.querySelector('[data-pbox="' + id + '"]');
      if (!o || !w) return;
      var diri = o.id === App.profil.id;
      if (b.dataset.sandi) {
        w.innerHTML = '<div style="border:1px solid #ccc;border-radius:10px;padding:10px;margin-top:8px">' +
          '<p class="muted">Kata sandi pengguna tersimpan terenkripsi, jadi tidak bisa dilihat siapa pun. Buat kata sandi sementara baru, berikan kepada ' + esc(o.nama || 'pengguna') + ', lalu minta ia menggantinya sendiri di menu Akun.</p>' +
          '<label>Kata sandi sementara baru (minimal 8 karakter)</label><input id="pu-sandi" type="text" autocomplete="off">' +
          '<button type="button" data-simpansandi="' + id + '">Simpan kata sandi</button><button type="button" style="' + G1 + '" data-batal="' + id + '">Batal</button>' +
          '<div class="pesan" id="pu-pesan"></div></div>';
      } else if (b.dataset.simpansandi) {
        var sd = $('pu-sandi').value;
        if (sd.length < 8) { $('pu-pesan').textContent = 'Minimal 8 karakter.'; return; }
        b.disabled = true;
        var rs = await App.db.rpc('atur_sandi_pengguna', { p_id: id, p_sandi: sd });
        b.disabled = false;
        if (rs.error) { $('pu-pesan').textContent = 'Gagal: ' + rs.error.message; return; }
        App.tabs.pengguna(el, 'Kata sandi ' + (o.nama || 'pengguna') + ' sudah diganti. Berikan kata sandi sementara itu kepadanya secara langsung.');
      } else if (b.dataset.ubah) {
        w.innerHTML = '<div style="border:1px solid #ccc;border-radius:10px;padding:10px;margin-top:8px">' +
          '<label>Nama</label><input id="pu-nama" value="' + esc(o.nama || '') + '">' +
          '<label>NIP/NIK</label><input id="pu-nip" value="' + esc(o.nip_nik || '') + '">' +
          (diri ? '<p class="muted">Peran dan status akun sendiri tidak bisa diubah, supaya Anda tidak terkunci.</p>'
            : '<label>Peran</label><select id="pu-peran">' + opsi(PERAN, o.peran) + '</select>' +
              '<label>Status</label><select id="pu-aktif">' + opsi([['true', 'Aktif'], ['false', 'Nonaktif (tidak bisa masuk)']], String(o.aktif)) + '</select>') +
          '<button type="button" data-simpan="' + id + '">Simpan</button><button type="button" style="' + G1 + '" data-batal="' + id + '">Batal</button>' +
          '<div class="pesan" id="pu-pesan"></div></div>';
      } else if (b.dataset.batal) {
        App.tabs.pengguna(el);
      } else if (b.dataset.simpan) {
        var nama = $('pu-nama').value.trim();
        if (!nama) { $('pu-pesan').textContent = 'Nama wajib diisi.'; return; }
        var r = await App.db.rpc('ubah_pengguna', {
          p_id: id, p_nama: nama, p_nip: $('pu-nip').value.trim() || null,
          p_peran: diri ? o.peran : $('pu-peran').value, p_aktif: diri ? true : $('pu-aktif').value === 'true'
        });
        if (r.error) { $('pu-pesan').textContent = 'Gagal: ' + r.error.message; return; }
        if (diri) App.profil.nama = nama;
        App.tabs.pengguna(el, 'Perubahan disimpan.');
      }
    };
  };
})();
