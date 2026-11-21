var cfg = window.SANIKES_CONFIG || {};
var $ = function (id) { return document.getElementById(id); };
var App = { db: null, profil: null, tabs: {}, tab: 'dasbor', satuan: 'kg' };
try { App.satuan = localStorage.getItem('sanikes_satuan') === 'ton' ? 'ton' : 'kg'; } catch (e) { App.satuan = 'kg'; }

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
  });
}
function tglLokal(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10); }
function jamLokal(d) { return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(11, 16); }
function fmtWaktu(iso) {
  return new Date(iso).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}
function fmtBerat(kg) {
  var n = Number(kg) || 0;
  if (App.satuan === 'ton') {
    return (n / 1000).toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 4 }) + ' ton';
  }
  return n.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 3 }) + ' kg';
}
function tampil(layar) {
  $('layar-login').hidden = layar !== 'login';
  $('layar-app').hidden = layar !== 'app';
}

function pasangSatuan() {
  var ada = $('tombol-satuan');
  if (ada) { ada.textContent = 'Satuan: ' + App.satuan; return; }
  var k = $('tombol-keluar');
  var w = document.createElement('div');
  w.style.cssText = 'display:flex;gap:8px;align-items:center';
  k.parentNode.insertBefore(w, k);
  var tb = document.createElement('button');
  tb.id = 'tombol-satuan';
  tb.className = 'kecil';
  tb.textContent = 'Satuan: ' + App.satuan;
  tb.addEventListener('click', function () {
    App.satuan = App.satuan === 'kg' ? 'ton' : 'kg';
    try { localStorage.setItem('sanikes_satuan', App.satuan); } catch (e) {}
    tb.textContent = 'Satuan: ' + App.satuan;
    bukaTab(App.tab);
  });
  w.appendChild(tb);
  w.appendChild(k);
}

var VERSI_PRIVASI = '1.0';
function mintaPersetujuan(prof) {
  return new Promise(function (selesai) {
    tampil('login');
    $('form-login').hidden = true;
    if ($('tombol-lupa')) $('tombol-lupa').hidden = true;
    var d = document.createElement('div');
    d.innerHTML = '<p><b>Halo, ' + esc(prof.nama || '') + '</b></p>' +
      '<p class="muted" style="font-size:14px;line-height:1.6">Sebelum memakai SANIKES, mohon baca dan setujui ' +
      '<a href="privasi.html" target="_blank" rel="noopener">Syarat Layanan dan Kebijakan Privasi</a>. Ringkasnya: data fasyankes milik fasyankes, ' +
      'tidak dijual atau dibagikan, dan Dinas Kesehatan hanya bisa melihat data klinik/RS bila fasyankes mengizinkan.</p>' +
      '<label style="display:flex;gap:8px;align-items:flex-start;font-weight:400"><input type="checkbox" id="pv-cek" style="width:auto;margin:3px 0 0"> ' +
      'Saya sudah membaca dan menyetujui Syarat Layanan dan Kebijakan Privasi SANIKES.</label>' +
      '<button type="button" id="pv-setuju">Setuju dan lanjutkan</button>' +
      '<button type="button" class="kecil" id="pv-batal" style="margin-top:10px">Keluar</button><div class="pesan" id="pv-pesan"></div>';
    $('form-login').parentNode.appendChild(d);
    function tutup() { d.remove(); $('form-login').hidden = false; if ($('tombol-lupa')) $('tombol-lupa').hidden = false; }
    $('pv-batal').onclick = async function () { tutup(); await App.db.auth.signOut(); tampil('login'); selesai(false); };
    $('pv-setuju').onclick = async function () {
      if (!$('pv-cek').checked) { $('pv-pesan').textContent = 'Centang persetujuan terlebih dahulu.'; return; }
      this.disabled = true;
      var r = await App.db.rpc('setujui_privasi', { p_versi: VERSI_PRIVASI });
      this.disabled = false;
      if (r.error) { $('pv-pesan').textContent = 'Gagal: ' + r.error.message; return; }
      tutup(); selesai(true);
    };
  });
}

async function masukApp(user) {
  var p = await App.db.from('profil').select('*, fasyankes(nama)').eq('id', user.id).maybeSingle();
  if (p.error || !p.data) {
    await App.db.auth.signOut();
    tampil('login');
    $('pesan-login').textContent = 'Profil pengguna belum terdaftar.';
    return;
  }
  if (p.data.aktif === false) {
    await App.db.auth.signOut();
    tampil('login');
    $('pesan-login').textContent = 'Akun Anda dinonaktifkan. Hubungi admin fasyankes.';
    return;
  }
  if ('versi_privasi' in p.data && p.data.versi_privasi !== VERSI_PRIVASI) {
    var ok = await mintaPersetujuan(p.data);
    if (!ok) return;
    p.data.versi_privasi = VERSI_PRIVASI;
  }
  App.profil = p.data;
  var dinkes = p.data.peran === 'dinkes';
  $('info-fasyankes').textContent = p.data.fasyankes ? p.data.fasyankes.nama : (dinkes ? 'Dinas Kesehatan' : 'Admin Papkenz');
  document.querySelector('[data-tab="catat"]').hidden = p.data.peran === 'admin_papkenz' || dinkes;
  ['modul', 'laporan', 'data'].forEach(function (t) { document.querySelector('[data-tab="' + t + '"]').hidden = dinkes; });
  tampil('app');
  pasangSatuan();
  bukaTab('dasbor');
}

App.kembali = function (label, fn) {
  var w = $('kembali-wrap');
  if (!w) {
    w = document.createElement('div');
    w.id = 'kembali-wrap';
    w.className = 'noprint';
    w.innerHTML = '<button type="button" class="kecil" id="kembali-btn"></button>';
    $('isi').parentNode.insertBefore(w, $('isi'));
  }
  if (!label) { w.hidden = true; return; }
  $('kembali-btn').textContent = '← ' + label;
  w.hidden = false;
  $('kembali-btn').onclick = function () { w.hidden = true; fn(); window.scrollTo(0, 0); };
};

function bukaTab(nama) {
  App.kembali(null);
  App.tab = nama;
  document.querySelectorAll('.bawah button').forEach(function (b) {
    b.classList.toggle('aktif', b.dataset.tab === nama);
  });
  var fn = App.tabs[nama];
  if (fn) fn($('isi'));
  window.scrollTo(0, 0);
}

App.tabs.dasbor = async function (el) {
  var p = App.profil;
  var html = '<h3 style="margin-top:0">Halo, ' + esc(p.nama) + '</h3><p class="muted">' + esc(p.peran) + '</p>';
  if (p.peran === 'admin_papkenz') {
    el.innerHTML = html + '<div class="info">Anda masuk sebagai admin Papkenz. Data harian klien tidak ditampilkan di sini.</div>';
    return;
  }
  el.innerHTML = html + '<p class="muted">Memuat...</p>';
  var hari = tglLokal(new Date());
  var a = await App.db.from('limbah_harian').select('berat_kg').eq('tanggal', hari);
  var b = await App.db.from('limbah_harian').select('kode_limbah, berat_kg, batas_simpan')
    .eq('status', 'disimpan').not('batas_simpan', 'is', null)
    .order('batas_simpan', { ascending: true }).limit(5);
  var total = 0;
  (a.data || []).forEach(function (x) { total += Number(x.berat_kg); });
  html += '<div class="info">Limbah tercatat hari ini: <b>' + fmtBerat(total) + '</b> (' + (a.data || []).length + ' catatan)</div>';
  html += '<h3>Batas simpan terdekat</h3>';
  if (!b.data || !b.data.length) {
    html += '<p class="muted">Belum ada limbah yang disimpan.</p>';
  } else {
    var sekarang = Date.now();
    b.data.forEach(function (x) {
      var t = new Date(x.batas_simpan).getTime();
      var ket = t < sekarang ? '<span class="lewat">LEWAT BATAS</span>'
        : (t - sekarang < 86400000 ? '<span class="lewat">H-1</span>' : '<span class="ok">Aman</span>');
      html += '<div class="baris"><b>' + esc(x.kode_limbah) + '</b> · ' + fmtBerat(x.berat_kg) + '<br>Batas: ' + fmtWaktu(x.batas_simpan) + ' · ' + ket + '</div>';
    });
  }
  el.innerHTML = html;
};
App.tabs.laporan = function (el) { el.innerHTML = '<div class="info">Laporan dan ekspor SIKELIM/SPEED: segera hadir.</div>'; };
App.tabs.data = function (el) { el.innerHTML = '<div class="info">Pengaturan data (ruangan, TPS, vendor): segera hadir.</div>'; };

async function init() {
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.indexOf('ISI_') === 0) {
    $('pesan-login').textContent = 'config.js belum diisi.';
    return;
  }
  var pulih = /type=recovery/.test(location.hash);
  // "Ingat saya": sesi disimpan permanen (localStorage) hanya bila dicentang;
  // bila tidak, sesi hanya hidup di tab ini (sessionStorage) dan hilang saat tab/browser ditutup.
  function ingat() { try { return localStorage.getItem('sanikes-ingat') === '1'; } catch (e) { return false; } }
  function gudang() { try { return ingat() ? localStorage : sessionStorage; } catch (e) { return null; } }
  var simpanSesi = {
    getItem: function (k) { var g = gudang(); return g ? g.getItem(k) : null; },
    setItem: function (k, v) { var g = gudang(); if (g) g.setItem(k, v); },
    removeItem: function (k) { try { localStorage.removeItem(k); sessionStorage.removeItem(k); } catch (e) {} }
  };
  App.db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY, { auth: { storage: simpanSesi } });
  try { if (!ingat()) Object.keys(localStorage).forEach(function (k) { if (/^sb-.*-auth-token/.test(k)) localStorage.removeItem(k); }); } catch (e) {}
  if ($('ingat')) $('ingat').checked = ingat();

  $('tombol-lupa').addEventListener('click', async function () {
    var email = $('email').value.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { $('pesan-login').textContent = 'Isi email Anda dulu di kolom Email, lalu tekan Lupa kata sandi lagi.'; return; }
    this.disabled = true;
    var r = await App.db.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
    this.disabled = false;
    $('pesan-login').textContent = r.error
      ? 'Gagal mengirim email: ' + r.error.message
      : 'Bila email terdaftar, tautan atur ulang kata sandi sudah dikirim. Buka email lalu tekan tautannya.';
  });

  $('form-login').addEventListener('submit', async function (e) {
    e.preventDefault();
    $('tombol-masuk').disabled = true;
    $('pesan-login').textContent = '';
    try { if ($('ingat') && $('ingat').checked) localStorage.setItem('sanikes-ingat', '1'); else localStorage.removeItem('sanikes-ingat'); } catch (e2) {}
    var r = await App.db.auth.signInWithPassword({ email: $('email').value.trim(), password: $('pin').value });
    $('tombol-masuk').disabled = false;
    if (r.error) { $('pesan-login').textContent = 'Email atau PIN salah.'; return; }
    $('pin').value = '';
    masukApp(r.data.user);
  });
  $('tombol-keluar').addEventListener('click', async function () {
    await App.db.auth.signOut();
    tampil('login');
  });
  document.querySelector('.bawah').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) bukaTab(b.dataset.tab);
  });

  var s = await App.db.auth.getSession();
  if (s.data.session && pulih) { formPulih(s.data.session.user); return; }
  if (s.data.session) { masukApp(s.data.session.user); } else { tampil('login'); }
}

function formPulih(user) {
  tampil('login');
  $('form-login').hidden = true;
  var d = document.createElement('div');
  d.innerHTML = '<p><b>Atur kata sandi baru</b><br><span class="muted">' + esc(user.email || '') + '</span></p>' +
    '<label>Kata sandi baru (minimal 8 karakter)</label><input id="ps-1" type="password" autocomplete="new-password">' +
    '<label>Ulangi kata sandi baru</label><input id="ps-2" type="password" autocomplete="new-password">' +
    '<button type="button" id="ps-simpan">Simpan dan masuk</button><div class="pesan" id="ps-pesan"></div>';
  $('form-login').parentNode.appendChild(d);
  $('ps-simpan').onclick = async function () {
    var a = $('ps-1').value, b = $('ps-2').value;
    if (a.length < 8) { $('ps-pesan').textContent = 'Kata sandi minimal 8 karakter.'; return; }
    if (a !== b) { $('ps-pesan').textContent = 'Kedua kata sandi tidak sama.'; return; }
    this.disabled = true;
    var r = await App.db.auth.updateUser({ password: a });
    this.disabled = false;
    if (r.error) { $('ps-pesan').textContent = 'Gagal: ' + r.error.message; return; }
    history.replaceState(null, '', location.pathname);
    d.remove();
    $('form-login').hidden = false;
    masukApp(user);
  };
}
init();
