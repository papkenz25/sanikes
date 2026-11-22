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
// Ikon garis sederhana (24x24), dipakai di menu dan halaman pembuka.
var IKON = {
  dasbor: '<path d="M4 20v-7M10 20V5M16 20v-10M21 20H3"/>',
  modul: '<rect x="3" y="3" width="7" height="7" rx="1.500"/><rect x="14" y="3" width="7" height="7" rx="1.500"/><rect x="14" y="14" width="7" height="7" rx="1.500"/><rect x="3" y="14" width="7" height="7" rx="1.500"/>',
  laporan: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
  data: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v6c0 1.700 3.600 3 8 3s8-1.300 8-3V5"/><path d="M4 11v6c0 1.700 3.600 3 8 3s8-1.300 8-3v-6"/>',
  akun: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 3.600-7 8-7s8 3 8 7"/>',
  limbah: '<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v5M14 11v5"/>',
  air: '<path d="M12 3s6 6.500 6 11a6 6 0 0 1-12 0c0-4.500 6-11 6-11z"/>',
  vektor: '<ellipse cx="12" cy="14" rx="4" ry="6"/><path d="M9 6l1.500 2M15 6l-1.500 2M4 12l4 1M20 12l-4 1M4 19l4-2M20 19l-4-2M12 8v12"/>',
  udara: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h16a3 3 0 1 1-3 3"/><path d="M3 16h7"/>',
  tpm: '<path d="M7 3v8M5 3v5a2 2 0 0 0 4 0V3M7 11v10"/><path d="M17 21V3c-2.500 1.500-3.500 4-3.500 7 0 1.500 1.500 2.500 3.500 2.500"/>',
  k3: '<path d="M12 3l8 3v6c0 4.500-3.200 8-8 9-4.800-1-8-4.500-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  rs: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4h6v3H9z"/><path d="M9 14l2 2 4-4"/>',
  pkm: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
  foto: '<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.500"/>',
  kunci: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  kit: '<path d="M14.700 6.300a4 4 0 0 0-5 5L3 18l3 3 6.700-6.700a4 4 0 0 0 5-5l-2.500 2.500-2.500-.5-.5-2.500z"/>'
};
function ikon(nama, ukuran) {
  var u = ukuran || 22;
  return '<svg width="' + u + '" height="' + u + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IKON[nama] || '') + '</svg>';
}
(function pasangIkon() {
  document.querySelectorAll('.bawah [data-tab]').forEach(function (b) {
    b.innerHTML = ikon(b.dataset.tab, 22) + '<span>' + b.textContent + '</span>';
  });
  document.querySelectorAll('[data-ik]').forEach(function (d) { d.innerHTML = ikon(d.dataset.ik, 24); });
})();

// Layar login punya dua tampilan: halaman pembuka (default) dan kartu masuk.
function keLogin(kartu) {
  $('pembuka').hidden = kartu;
  $('kartu-login').hidden = !kartu;
  window.scrollTo(0, 0);
}
function tampil(layar, kartu) {
  $('layar-login').hidden = layar !== 'login';
  $('layar-app').hidden = layar !== 'app';
  if (layar === 'login') keLogin(!!kartu);
}

var VERSI_PRIVASI = '1.0';
// Akun demo publik: hanya bisa mengakses fasyankes demo; data dan sandinya dikembalikan setiap malam.
var DEMO = { klinik: 'papkenz25+demoklinik@gmail.com', dinkes: 'papkenz25+demodinkes@gmail.com', sandi: 'demosanikes' };
function mintaPersetujuan(prof) {
  return new Promise(function (selesai) {
    tampil('login', true);
    $('form-login').hidden = true;
    if ($('tombol-lupa')) $('tombol-lupa').hidden = true;
    if ($('login-ekstra')) $('login-ekstra').hidden = true;
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
    function tutup() { d.remove(); $('form-login').hidden = false; if ($('tombol-lupa')) $('tombol-lupa').hidden = false; if ($('login-ekstra')) $('login-ekstra').hidden = false; }
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
    tampil('login', true);
    $('pesan-login').textContent = 'Profil pengguna belum terdaftar.';
    return;
  }
  if (p.data.aktif === false) {
    await App.db.auth.signOut();
    tampil('login', true);
    $('pesan-login').textContent = 'Akun Anda dinonaktifkan. Hubungi admin fasyankes.';
    return;
  }
  if ('versi_privasi' in p.data && p.data.versi_privasi !== VERSI_PRIVASI) {
    var ok = await mintaPersetujuan(p.data);
    if (!ok) return;
    p.data.versi_privasi = VERSI_PRIVASI;
  }
  App.profil = p.data;
  App.demo = [DEMO.klinik, DEMO.dinkes].indexOf(String(user.email || '').toLowerCase()) > -1;
  var pita = $('pita-demo');
  if (!pita) {
    pita = document.createElement('div');
    pita.id = 'pita-demo';
    pita.className = 'noprint pita-demo';
    $('isi').parentNode.insertBefore(pita, document.querySelector('header.atas').nextSibling);
  }
  pita.hidden = !App.demo;
  pita.innerHTML = 'Mode demo: semua data adalah contoh dan kembali seperti semula setiap pukul 02.00 WITA. ' +
    'Tertarik memakai SANIKES? Hubungi <a href="mailto:papkenz25@gmail.com" style="color:inherit;font-weight:700">papkenz25@gmail.com</a> ' +
    '<button type="button" id="pita-beranda" class="kecil" style="width:auto;margin-left:6px;background:#fff;color:#0F6E5C">← Kembali ke beranda</button>';
  var dinkes = p.data.peran === 'dinkes';
  $('info-fasyankes').textContent = p.data.fasyankes ? p.data.fasyankes.nama : (dinkes ? 'Dinas Kesehatan' : 'Admin Papkenz');
  ['modul', 'laporan', 'data'].forEach(function (t) { document.querySelector('[data-tab="' + t + '"]').hidden = dinkes; });
  tampil('app');
  bukaTab('dasbor');
  if (window.ANTRE) ANTRE.hitung().then(function () { ANTRE.sinkron(); });
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
    keLogin(true); $('pesan-login').textContent = 'config.js belum diisi.';
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
  if (window.ANTRE) ANTRE.pasang(App.db);
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
    if (r.error) { keLogin(true); $('pesan-login').textContent = 'Email atau PIN salah.'; return; }
    $('pin').value = '';
    masukApp(r.data.user);
  });
  document.querySelectorAll('[data-demo]').forEach(function (b) {
    b.addEventListener('click', function () {
      $('email').value = DEMO[this.dataset.demo];
      $('pin').value = DEMO.sandi;
      if ($('ingat')) $('ingat').checked = false;
      $('form-login').requestSubmit ? $('form-login').requestSubmit() : $('tombol-masuk').click();
    });
  });
  document.addEventListener('click', async function (e) {
    if (!e.target.closest('#tombol-keluar, #pita-beranda')) return;
    await App.db.auth.signOut();
    App.profil = null; App.demo = false;
    tampil('login');
  });
  ['pb-masuk', 'pb-masuk-atas'].forEach(function (id) { $(id).addEventListener('click', function () { keLogin(true); }); });
  $('kartu-balik').addEventListener('click', function () { keLogin(false); });
  document.querySelector('.bawah').addEventListener('click', function (e) {
    var b = e.target.closest('button');
    if (b) bukaTab(b.dataset.tab);
  });

  var s = await App.db.auth.getSession();
  if (s.data.session && pulih) { formPulih(s.data.session.user); return; }
  if (s.data.session) { masukApp(s.data.session.user); } else { tampil('login'); }
}

function formPulih(user) {
  tampil('login', true);
  $('form-login').hidden = true;
  if ($('login-ekstra')) $('login-ekstra').hidden = true;
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
    if ($('login-ekstra')) $('login-ekstra').hidden = false;
    masukApp(user);
  };
}
// Tunggu semua skrip modul selesai dimuat sebelum masuk (supaya Dasbor lengkap yang tampil)
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
