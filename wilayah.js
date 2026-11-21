(function () {
  var G1 = 'width:auto;display:inline-block;padding:6px 14px;margin:6px 6px 0 0;font-size:14px';
  function klienDaftar() {
    return window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'sanikes-daftar' }
    });
  }

  App.tabs.wilayah = async function (el, pesanAwal) {
    if (App.profil.peran !== 'admin_papkenz') { el.innerHTML = '<div class="info">Halaman ini hanya untuk admin Papkenz.</div>'; return; }
    el.innerHTML = '<p class="muted">Memuat...</p>';
    var w = await App.db.from('wilayah').select('*').order('nama');
    var daftarW = w.data || [];
    var f = await App.db.rpc('daftar_fasyankes');
    var daftarF = f.data || [];
    var pilih = window._pgWil || (daftarW[0] && daftarW[0].id) || '';
    var orang = [];
    if (pilih) { var d = await App.db.rpc('daftar_pengguna_dinkes', { p_wilayah: pilih }); orang = d.data || []; }
    var namaW = {}; daftarW.forEach(function (x) { namaW[x.id] = x.nama; });

    var h = '<h3 style="margin-top:0">Wilayah Dinkes</h3>' + (pesanAwal ? '<div class="pesan" style="color:#0F6E5C">' + esc(pesanAwal) + '</div>' : '') +
      '<p class="muted">Dinkes hanya bisa melihat data (tidak bisa mengubah). Yang terlihat: puskesmas di wilayahnya, serta klinik/RS yang sudah menyetujui berbagi data.</p>' +
      (daftarW.length ? '<label>Pilih wilayah</label><select id="wl-pilih">' + daftarW.map(function (x) {
        return '<option value="' + x.id + '"' + (x.id === pilih ? ' selected' : '') + '>' + esc(x.nama) + '</option>';
      }).join('') + '</select>' : '<p class="muted">Belum ada wilayah.</p>') +
      '<details><summary style="font-weight:700;margin:12px 0;cursor:pointer">+ Tambah wilayah</summary>' +
      '<label>Nama (mis. Dinas Kesehatan Kab. Maros)</label><input id="wl-nama"><label>Kabupaten/kota</label><input id="wl-kab"><label>Provinsi</label><input id="wl-prov">' +
      '<button type="button" id="wl-simpan">Simpan wilayah</button><div class="pesan" id="wl-pesan"></div></details>';

    h += '<h3>Fasyankes dan wilayahnya</h3>' + (daftarF.length ? daftarF.map(function (x) {
      var puskes = /^puskesmas/i.test(x.jenis || '');
      var lihat = x.wilayah_id ? (puskes || x.dibagikan_dinkes ? '<span class="ok">terlihat oleh Dinkes</span>' : '<span class="muted">belum setuju berbagi</span>') : '<span class="muted">tanpa wilayah</span>';
      return '<div class="baris"><b>' + esc(x.nama) + '</b> <span class="muted">(' + esc(x.jenis || '-') + ')</span><br>' + lihat +
        '<select data-fw="' + x.id + '" style="margin-top:6px"><option value="">— tanpa wilayah —</option>' + daftarW.map(function (wl) {
          return '<option value="' + wl.id + '"' + (wl.id === x.wilayah_id ? ' selected' : '') + '>' + esc(wl.nama) + '</option>';
        }).join('') + '</select></div>';
    }).join('') : '<p class="muted">Belum ada fasyankes.</p>');

    if (pilih) {
      h += '<h3>Akun Dinkes: ' + esc(namaW[pilih] || '') + '</h3>' +
        (orang.length ? orang.map(function (o) {
          return '<div class="baris"' + (o.aktif ? '' : ' style="opacity:.6"') + '><b>' + esc(o.nama) + '</b><br>' + esc(o.email || '-') +
            (o.aktif ? '' : ' · <span class="lewat">nonaktif</span>') +
            '<br><button type="button" style="' + G1 + '" data-aktif="' + o.id + '" data-nilai="' + (!o.aktif) + '">' + (o.aktif ? 'Nonaktifkan' : 'Aktifkan') + '</button></div>';
        }).join('') : '<p class="muted">Belum ada akun Dinkes.</p>') +
        '<label>Nama petugas Dinkes</label><input id="wd-nama"><label>Email</label><input id="wd-email" type="email" autocomplete="off">' +
        '<label>Kata sandi sementara (minimal 8 karakter)</label><input id="wd-sandi" type="text" autocomplete="off"><label>NIP (opsional)</label><input id="wd-nip">' +
        '<button type="button" id="wd-tambah">Tambah akun Dinkes</button><div class="pesan" id="wd-pesan"></div>';
    }
    el.innerHTML = h;

    if ($('wl-pilih')) $('wl-pilih').onchange = function () { window._pgWil = this.value; App.tabs.wilayah(el); };
    $('wl-simpan').onclick = async function () {
      var nama = $('wl-nama').value.trim();
      if (!nama) { $('wl-pesan').textContent = 'Isi nama wilayah.'; return; }
      var r = await App.db.rpc('buat_wilayah', { p_nama: nama, p_kab: $('wl-kab').value.trim() || null, p_prov: $('wl-prov').value.trim() || null });
      if (r.error) { $('wl-pesan').textContent = 'Gagal: ' + r.error.message; return; }
      window._pgWil = r.data;
      App.tabs.wilayah(el, 'Wilayah ditambahkan.');
    };
    document.querySelectorAll('[data-fw]').forEach(function (s) {
      s.onchange = async function () {
        var r = await App.db.rpc('atur_wilayah_fasyankes', { p_fasyankes: this.dataset.fw, p_wilayah: this.value || null });
        App.tabs.wilayah(el, r.error ? 'Gagal: ' + r.error.message : 'Wilayah fasyankes disimpan.');
      };
    });
    document.querySelectorAll('[data-aktif]').forEach(function (b) {
      b.onclick = async function () {
        var r = await App.db.rpc('ubah_pengguna_dinkes', { p_id: this.dataset.aktif, p_aktif: this.dataset.nilai === 'true' });
        App.tabs.wilayah(el, r.error ? 'Gagal: ' + r.error.message : 'Status akun disimpan.');
      };
    });
    if ($('wd-tambah')) $('wd-tambah').onclick = async function () {
      var ps = $('wd-pesan');
      var nama = $('wd-nama').value.trim(), email = $('wd-email').value.trim().toLowerCase(), sandi = $('wd-sandi').value;
      if (!nama) { ps.textContent = 'Isi nama.'; return; }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { ps.textContent = 'Format email tidak valid.'; return; }
      if (sandi.length < 8) { ps.textContent = 'Kata sandi minimal 8 karakter.'; return; }
      this.disabled = true; ps.textContent = 'Membuat akun...';
      var d = await klienDaftar().auth.signUp({ email: email, password: sandi, options: { emailRedirectTo: location.origin } });
      var u = d.data && d.data.user;
      if (d.error || !u) { this.disabled = false; ps.textContent = 'Gagal membuat akun: ' + (d.error ? d.error.message : 'coba lagi'); return; }
      if (u.identities && u.identities.length === 0) { this.disabled = false; ps.textContent = 'Email ini sudah terdaftar.'; return; }
      var r = await App.db.rpc('tambah_pengguna_dinkes', { p_user: u.id, p_nama: nama, p_wilayah: pilih, p_nip: $('wd-nip').value.trim() || null });
      this.disabled = false;
      if (r.error) { ps.textContent = 'Akun dibuat, tetapi profil gagal disimpan: ' + r.error.message; return; }
      App.tabs.wilayah(el, 'Akun Dinkes ' + nama + ' ditambahkan.');
    };
  };
})();
