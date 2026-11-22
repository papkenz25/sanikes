// Kotak saran: membuka email berisi masukan. Tanpa menyimpan apa pun di server.
(function () {
  var EMAIL = 'papkenz25@gmail.com';
  var JENIS = ['Saran fitur', 'Ada yang error', 'Pertanyaan', 'Lainnya'];
  function esc2(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function halaman() {
    var b = document.querySelector('nav [data-tab].aktif, [data-tab].aktif');
    var layar = b ? b.textContent.trim() : 'Beranda';
    var h = document.querySelector('#isi h3');
    return layar + (h && b ? ' > ' + h.textContent.trim().slice(0, 60) : '');
  }
  function tutup() { var o = document.getElementById('masukan-ov'); if (o) o.remove(); }
  function buka() {
    tutup();
    var o = document.createElement('div');
    o.id = 'masukan-ov'; o.className = 'noprint masukan-ov';
    o.innerHTML = '<div class="masukan-kotak" role="dialog" aria-label="Beri masukan">' +
      '<h3 style="margin-top:0">Beri masukan</h3>' +
      '<p class="muted">Masukan Anda sangat membantu. Tombol Kirim akan membuka email yang sudah terisi, tinggal Anda kirim.</p>' +
      '<label>Jenis masukan</label><select id="ms-jenis">' + JENIS.map(function (j) { return '<option>' + j + '</option>'; }).join('') + '</select>' +
      '<label>Isi masukan</label><textarea id="ms-isi" rows="5" maxlength="1500" placeholder="Tulis apa yang perlu ditambah atau diperbaiki"></textarea>' +
      '<label>Nama dan kontak (boleh dikosongkan)</label><input type="text" id="ms-nama" maxlength="100" placeholder="Supaya bisa dibalas">' +
      '<p class="muted" style="font-size:12px">Jangan menulis data pasien atau data pribadi lain.</p>' +
      '<div id="ms-pesan" class="muted"></div>' +
      '<button type="button" id="ms-kirim">Kirim lewat email</button> ' +
      '<button type="button" id="ms-batal" class="kecil" style="width:auto">Batal</button></div>';
    document.body.appendChild(o);
    o.addEventListener('click', function (e) { if (e.target === o) tutup(); });
    document.getElementById('ms-batal').onclick = tutup;
    document.getElementById('ms-kirim').onclick = function () {
      var isi = document.getElementById('ms-isi').value.trim();
      if (!isi) { document.getElementById('ms-pesan').textContent = 'Isi masukan dulu.'; return; }
      var jenis = document.getElementById('ms-jenis').value, nama = document.getElementById('ms-nama').value.trim();
      var badan = isi + '\n\n---\nDari: ' + (nama || '-') + '\nHalaman: ' + halaman() + '\nMode: ' + ((window.App && App.demo) ? 'demo' : (window.App && App.profil ? 'akun' : 'belum masuk'));
      location.href = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent('[SANIKES] ' + jenis) + '&body=' + encodeURIComponent(badan);
      document.getElementById('ms-pesan').innerHTML = 'Bila email tidak terbuka, kirim manual ke <b>' + esc2(EMAIL) + '</b>.';
    };
  }
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-masukan]')) { e.preventDefault(); buka(); }
  });
  window.MASUKAN = { buka: buka };
})();
