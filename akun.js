(function () {
  var NAMA_PERAN = {
    admin_papkenz: 'Admin Papkenz', admin_fasyankes: 'Admin fasyankes', petugas_kesling: 'Petugas kesling',
    petugas_ruangan: 'Petugas ruangan', pimpinan: 'Pimpinan', dinkes: 'Dinas Kesehatan (lihat saja)'
  };

  async function cekSandi(email, sandi) {
    var r = await App.db.auth.signInWithPassword({ email: email, password: sandi });
    return !r.error;
  }

  App.tabs.akun = async function (el) {
    el.innerHTML = '<p class="muted">Memuat...</p>';
    var u = await App.db.auth.getUser();
    var user = u.data && u.data.user;
    if (!user) { el.innerHTML = '<div class="info waspada">Sesi berakhir. Silakan keluar lalu masuk lagi.</div>'; return; }
    var p = App.profil || {};
    var menunggu = user.new_email ? '<br><span class="lewat">Menunggu konfirmasi email baru: ' + esc(user.new_email) + '</span>' : '';

    el.innerHTML = '<h3 style="margin-top:0">Akun saya</h3>' +
      '<div class="info">Nama: <b>' + esc(p.nama || '-') + '</b><br>Peran: ' + esc(NAMA_PERAN[p.peran] || p.peran || '-') +
      '<br>Fasyankes: ' + esc((p.fasyankes && p.fasyankes.nama) || '-') + '<br>Email: <b>' + esc(user.email || '-') + '</b>' + menunggu + '</div>' +

      '<button type="button" id="tombol-keluar" class="keluar">Keluar dari SANIKES</button>' +
      '<h3>Satuan berat</h3><p class="muted">Dipakai untuk menampilkan berat limbah di seluruh aplikasi.</p><div class="chips">' +
      '<button type="button" class="chip' + (App.satuan === 'kg' ? ' aktif' : '') + '" data-sat="kg">Kilogram (kg)</button>' +
      '<button type="button" class="chip' + (App.satuan === 'ton' ? ' aktif' : '') + '" data-sat="ton">Ton</button></div>' +
      ((p.peran === 'admin_fasyankes' || p.peran === 'admin_papkenz') ? '<button type="button" id="ak-pengguna">Kelola pengguna dan data fasyankes</button>' : '') +
      ((p.peran === 'admin_fasyankes' || p.peran === 'pimpinan' || p.peran === 'petugas_kesling') ? '<h3>Cadangan data</h3><p class="muted">Unduh seluruh data fasyankes ke satu file Excel. Simpan di tempat aman, minimal sebulan sekali.</p><button type="button" id="ak-cadangan">Unduh semua data (Excel)</button><div class="pesan" id="ak-pesan-cad"></div>' : '') +
      '<h3>Bantuan</h3><details class="panduan"><summary>Pertanyaan yang sering muncul</summary>' +
      '<p><b>Foto wajib?</b> Tidak. Foto bersifat opsional. Foto dari kamera mencatat titik lokasi dan jam, foto dari galeri tidak.</p>' +
      '<p><b>Sinyal jelek, bagaimana?</b> Catatan tersimpan lebih dulu, foto menyusul. Bila foto gagal terunggah, tekan Coba unggah lagi.</p>' +
      '<p><b>Salah catat?</b> Catatan yang salah bisa dihapus dari daftar riwayat, dan bisa dipulihkan lewat Tampilkan data yang dihapus.</p>' +
      '<p><b>Mencetak laporan?</b> Buka formulirnya, tekan Riwayat dan cetak laporan, pilih catatan, lalu Cetak / simpan PDF.</p>' +
      '<p><b>Lupa kata sandi?</b> Minta admin fasyankes mengatur ulang lewat Kelola pengguna.</p></details>' +
      '<button type="button" id="ak-aturan" class="chip">Dasar aturan yang dipakai aplikasi</button>' +
      '<button type="button" class="chip" data-masukan>Beri masukan atau saran</button>' +
      '<p class="muted">Butuh bantuan lain? Email <a href="mailto:papkenz25@gmail.com">papkenz25@gmail.com</a>.</p>' +
      '<h3>Ubah nama</h3><label>Nama lengkap</label><input id="ak-nama" value="' + esc(p.nama || '') + '">' +
      '<button type="button" id="ak-simpan-nama">Simpan nama</button><div class="pesan" id="ak-pesan-nama"></div>' +
      '<h3>Ubah kata sandi</h3>' +
      '<label>Kata sandi saat ini</label><input type="password" id="ak-lama" autocomplete="current-password">' +
      '<label>Kata sandi baru (minimal 8 karakter)</label><input type="password" id="ak-baru" autocomplete="new-password">' +
      '<label>Ulangi kata sandi baru</label><input type="password" id="ak-ulang" autocomplete="new-password">' +
      '<button type="button" id="ak-simpan-sandi">Simpan kata sandi baru</button><div class="pesan" id="ak-pesan-sandi"></div>' +

      '<h3>Ubah email</h3>' +
      '<p class="muted">Email baru baru aktif setelah dikonfirmasi lewat tautan yang dikirim ke email. Sampai saat itu, tetap masuk dengan email lama.</p>' +
      '<label>Email baru</label><input type="email" id="ak-email" autocomplete="email">' +
      '<label>Kata sandi saat ini</label><input type="password" id="ak-sandi-email" autocomplete="current-password">' +
      '<button type="button" id="ak-simpan-email">Kirim konfirmasi email baru</button><div class="pesan" id="ak-pesan-email"></div>';

    el.querySelectorAll('[data-sat]').forEach(function (b) {
      b.onclick = function () {
        App.satuan = this.dataset.sat;
        try { localStorage.setItem('sanikes_satuan', App.satuan); } catch (e) {}
        App.tabs.akun(el);
      };
    });

    if (App.demo) {
      ['ak-simpan-sandi', 'ak-simpan-email', 'ak-simpan-nama'].forEach(function (k) { if ($(k)) $(k).disabled = true; });
      el.insertAdjacentHTML('afterbegin', '<div class="info" style="margin-bottom:12px">Ini akun demo. Nama, kata sandi, dan email tidak bisa diubah.</div>');
    }
    if ($('ak-cadangan')) $('ak-cadangan').onclick = function () { window.CADANGAN(this, $('ak-pesan-cad')); };
    if ($('ak-pengguna')) $('ak-pengguna').onclick = function () { App.tabs.pengguna(el); App.kembali('Akun', function () { App.tabs.akun(el); }); window.scrollTo(0, 0); };
    $('ak-simpan-nama').addEventListener('click', async function () {
      var nama = $('ak-nama').value.trim(), ps = $('ak-pesan-nama');
      ps.style.color = '';
      if (!nama) { ps.textContent = 'Nama wajib diisi.'; return; }
      var r = await App.db.rpc('ubah_nama_saya', { p_nama: nama });
      if (r.error) { ps.textContent = 'Gagal: ' + r.error.message; return; }
      App.profil.nama = nama;
      ps.style.color = '#0F6E5C';
      ps.textContent = 'Nama tersimpan.';
    });
    $('ak-simpan-sandi').addEventListener('click', async function () {
      var ps = $('ak-pesan-sandi'), lama = $('ak-lama').value, baru = $('ak-baru').value, ulang = $('ak-ulang').value;
      ps.style.color = '';
      if (!lama || !baru) { ps.textContent = 'Isi kata sandi saat ini dan kata sandi baru.'; return; }
      if (baru.length < 8) { ps.textContent = 'Kata sandi baru minimal 8 karakter.'; return; }
      if (baru !== ulang) { ps.textContent = 'Ulangan kata sandi baru tidak sama.'; return; }
      if (baru === lama) { ps.textContent = 'Kata sandi baru harus berbeda dari yang lama.'; return; }
      this.disabled = true;
      ps.textContent = 'Memeriksa...';
      if (!(await cekSandi(user.email, lama))) { this.disabled = false; ps.textContent = 'Kata sandi saat ini salah.'; return; }
      var r = await App.db.auth.updateUser({ password: baru });
      this.disabled = false;
      if (r.error) { ps.textContent = 'Gagal: ' + r.error.message; return; }
      $('ak-lama').value = ''; $('ak-baru').value = ''; $('ak-ulang').value = '';
      ps.style.color = '#0F6E5C';
      ps.textContent = 'Kata sandi berhasil diubah. Gunakan kata sandi baru saat masuk berikutnya.';
    });

    $('ak-simpan-email').addEventListener('click', async function () {
      var ps = $('ak-pesan-email'), email = $('ak-email').value.trim().toLowerCase(), sandi = $('ak-sandi-email').value;
      ps.style.color = '';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { ps.textContent = 'Format email tidak valid.'; return; }
      if (email === String(user.email).toLowerCase()) { ps.textContent = 'Email baru sama dengan email saat ini.'; return; }
      if (!sandi) { ps.textContent = 'Isi kata sandi saat ini untuk konfirmasi.'; return; }
      this.disabled = true;
      ps.textContent = 'Memeriksa...';
      if (!(await cekSandi(user.email, sandi))) { this.disabled = false; ps.textContent = 'Kata sandi saat ini salah.'; return; }
      var r = await App.db.auth.updateUser({ email: email }, { emailRedirectTo: location.origin });
      this.disabled = false;
      if (r.error) { ps.textContent = 'Gagal: ' + r.error.message; return; }
      $('ak-sandi-email').value = '';
      ps.style.color = '#0F6E5C';
      ps.textContent = 'Tautan konfirmasi sudah dikirim. Buka email (cek juga folder spam) dan tekan tautannya. Bila diminta, konfirmasi juga dari email lama.';
    });
    if ($('ak-aturan')) $('ak-aturan').onclick = function () { App.tabs.aturan(el); App.kembali('Akun', function () { App.tabs.akun(el); }); window.scrollTo(0, 0); };
  };
})();
