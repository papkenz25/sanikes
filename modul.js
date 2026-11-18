(function () {
  var DAFTAR = [
    ['limbah', 'Limbah B3', true],
    ['air', 'Air & IPAL', false],
    ['vektor', 'Vektor & Sanitasi', false],
    ['tpm', 'TPM & Gizi', false],
    ['k3', 'APD & K3', false],
    ['rs', 'Pengawasan RS', false],
    ['pkm', 'Kesling Puskesmas', false],
    ['udara', 'Udara (SKUDR)', false],
    ['kit', 'Sanitarian Kit & Alkes', false]
  ];

  function pindah(nama) {
    var isi = document.getElementById('isi');
    if (nama === 'angkut') { App.tabs.angkut(isi); return; }
    var tombol = document.querySelector('.bawah [data-tab="' + nama + '"]');
    if (tombol) tombol.click();
  }

  function tampil(el, sub) {
    var h = '';
    if (sub === 'limbah') {
      h = '<h3 style="margin-top:0">Limbah B3</h3>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        '<button type="button" data-go="catat" style="padding:20px 12px;min-height:90px">Catat limbah<br><small>+ cetak label</small></button>' +
        '<button type="button" data-go="angkut" style="padding:20px 12px;min-height:90px">Pengangkutan</button>' +
        '<button type="button" data-go="laporan" style="padding:20px 12px;min-height:90px">Neraca & ekspor</button>' +
        '<button type="button" data-go="data" style="padding:20px 12px;min-height:90px">Data (ruangan, TPS, vendor)</button>' +
        '</div><p><button type="button" data-back="1" style="background:#666">← Semua modul</button></p>';
    } else {
      h = '<h3 style="margin-top:0">Modul</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
        DAFTAR.map(function (m) {
          return '<button type="button" ' + (m[2] ? 'data-m="' + m[0] + '"' : 'disabled') +
            ' style="padding:20px 12px;min-height:90px;' + (m[2] ? '' : 'opacity:.45') + '">' + m[1] +
            (m[2] ? '' : '<br><small>Segera</small>') + '</button>';
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
