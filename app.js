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

async function masukApp(user) {
  var p = await App.db.from('profil').select('id, nama, peran, aktif, fasyankes_id, fasyankes(nama)').eq('id', user.id).maybeSingle();
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
  App.profil = p.data;
  $('info-fasyankes').textContent = p.data.fasyankes ? p.data.fasyankes.nama : 'Admin Papkenz';
  document.querySelector('[data-tab="catat"]').hidden = p.data.peran === 'admin_papkenz';
  tampil('app');
  pasangSatuan();
  bukaTab('dasbor');
}

function bukaTab(nama) {
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
  App.db = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_KEY);

  $('form-login').addEventListener('submit', async function (e) {
    e.preventDefault();
    $('tombol-masuk').disabled = true;
    $('pesan-login').textContent = '';
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
  if (s.data.session) { masukApp(s.data.session.user); } else { tampil('login'); }
}
init();
