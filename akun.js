(function () {
  var NAMA_PERAN = {
    admin_papkenz: 'Admin Papkenz', admin_fasyankes: 'Admin fasyankes', petugas_kesling: 'Petugas kesling',
    petugas_ruangan: 'Petugas ruangan', pimpinan: 'Pimpinan'
  };

  function pasangTombol() {
    if (document.getElementById('tombol-akun')) return true;
    var sat = document.getElementById('tombol-satuan');
    if (!sat) return false;
    var b = document.createElement('button');
    b.id = 'tombol-akun';
    b.className = 'kecil';
    b.textContent = 'Akun';
    b.addEventListener('click', function () {
      App.tab = 'akun';
      document.querySelectorAll('.bawah button').forEach(function (x) { x.classList.remove('aktif'); });
      App.tabs.akun(document.getElementById('isi'));
      window.scrollTo(0, 0);
    });
    sat.parentNode.insertBefore(b, sat);
    return true;
  }
  var coba = setInterval(function () { if (pasangTombol()) clearInterval(coba); }, 500);

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
  };
})();
