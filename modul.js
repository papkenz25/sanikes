(function () {
  var DAFTAR = [
    ['limbah', 'Limbah B3', true],
    ['air', 'Air & IPAL', true],
    ['vektor', 'Vektor & Sanitasi', true],
    ['tpm', 'TPM & Gizi', false],
    ['k3', 'APD & K3', false],
    ['rs', 'Pengawasan RS', false],
    ['pkm', 'Kesling Puskesmas', false],
    ['udara', 'Udara (SKUDR)', false],
    ['kit', 'Sanitarian Kit & Alkes', false]
  ];

  var SUB = {
    limbah: { judul: 'Limbah B3', isi: [
      ['catat', 'Catat limbah', '+ cetak label'],
      ['angkut', 'Pengangkutan', ''],
      ['laporan', 'Neraca & ekspor', ''],
      ['data', 'Data', 'ruangan, TPS, vendor']
    ] },
    air: { judul: 'Air & IPAL', isi: [
      ['air_uji', 'Uji kualitas air', 'higiene sanitasi / minum'],
      ['ipal_harian', 'IPAL harian', 'debit, pH, pompa'],
      ['ipal_lab', 'Uji lab IPAL', 'inlet / outlet']
    ] }
  };

  var KOTAK = 'padding:20px 12px;min-height:90px';

  function pindah(nama) {
    var isi = document.getElementById('isi');
    var tombol = document.querySelector('.bawah [data-tab="' + nama + '"]');
    if (tombol) tombol.click();
    else if (App.tabs[nama]) App.tabs[nama](isi);
  }

  function tampil(el, sub) {
    var h = '';
    if (sub && SUB[sub]) {
      h = '<h3 style="margin-top:0">' + SUB[sub].judul + '</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        SUB[sub].isi.map(function (m) {
          return '<button type="button" data-go="' + m[0] + '" style="' + KOTAK + '">' + m[1] + (m[2] ? '<br><small>' + m[2] + '</small>' : '') + '</button>';
        }).join('') +
        '</div><p><button type="button" data-back="1" style="background:#666">← Semua modul</button></p>';
    } else {
      h = '<h3 style="margin-top:0">Modul</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        DAFTAR.map(function (m) {
          return '<button type="button" ' + (m[2] ? 'data-m="' + m[0] + '"' : 'disabled') +
            ' style="' + KOTAK + (m[2] ? '' : ';opacity:.45') + '">' + m[1] + (m[2] ? '' : '<br><small>Segera</small>') + '</button>';
        }).join('') + '</div>';
    }
    el.innerHTML = h;
    el.onclick = function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      if (b.dataset.m) tampil(el, b.dataset.m);
      else if (b.dataset.back) tampil(el, null);
      else if (b.dataset.go) pindah(b.dataset.go);
    };
  }

  App.tabs.modul = function (el) { tampil(el, null); };
})();
