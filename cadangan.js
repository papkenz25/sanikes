(function () {
  var TABEL = [
    ['limbah_harian', 'Limbah B3 harian'], ['limbah_angkut', 'Limbah diangkut'], ['limbah_domestik', 'Limbah domestik'],
    ['air_uji', 'Uji air'], ['ipal_harian', 'IPAL harian'], ['ipal_lab', 'IPAL lab'],
    ['vektor', 'Vektor'], ['udara_skudr', 'Udara ruangan'], ['sanitasi_checklist', 'Inspeksi sanitasi'],
    ['tpm_inspeksi', 'Inspeksi pangan'], ['ikl_inspeksi', 'Inspeksi TFU'], ['penjamah', 'Penjamah pangan'],
    ['k3_insiden', 'K3 insiden'], ['k3_semester', 'K3 semester'], ['k3_tahunan', 'K3 tahunan'],
    ['sanitarian_kit', 'Alat sanitarian'], ['alkes_merkuri', 'Alkes merkuri'], ['stbm_kk', 'STBM'],
    ['pengawasan', 'Pengawasan'], ['kesling_puskesmas', 'Kesling puskesmas'], ['temuan', 'Temuan'],
    ['ruangan', 'Ruangan'], ['tps', 'TPS'], ['vendor', 'Vendor'], ['limbah_item', 'Nama barang'],
    ['titik', 'Titik sampel'], ['pengaturan', 'Pengaturan']
  ];
  var CDN = 'https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js';

  function muatXlsx() {
    if (window.XLSX) return Promise.resolve();
    return new Promise(function (ok, gagal) {
      var s = document.createElement('script');
      s.src = CDN; s.onload = ok; s.onerror = function () { gagal(new Error('Pustaka Excel gagal dimuat. Periksa internet.')); };
      document.head.appendChild(s);
    });
  }
  async function ambilSemua(t) {
    var out = [];
    for (var i = 0; i < 50; i++) {
      var r = await App.db.from(t).select('*').range(i * 1000, i * 1000 + 999);
      if (r.error) return null;
      out = out.concat(r.data || []);
      if (!r.data || r.data.length < 1000) break;
    }
    return out;
  }
  function rapikan(rows) {
    return rows.map(function (x) {
      var o = {};
      Object.keys(x).forEach(function (k) {
        var v = x[k];
        o[k] = v != null && typeof v === 'object' ? JSON.stringify(v) : v;
      });
      return o;
    });
  }

  window.CADANGAN = async function (tombol, pesan) {
    tombol.disabled = true;
    try {
      pesan.textContent = 'Menyiapkan...';
      await muatXlsx();
      var wb = XLSX.utils.book_new(), total = 0, isi = [];
      for (var i = 0; i < TABEL.length; i++) {
        pesan.textContent = 'Mengambil ' + TABEL[i][1] + ' (' + (i + 1) + '/' + TABEL.length + ')...';
        var rows = await ambilSemua(TABEL[i][0]);
        if (!rows) continue;
        total += rows.length;
        isi.push([TABEL[i][1], rows.length]);
        var ws = rows.length ? XLSX.utils.json_to_sheet(rapikan(rows)) : XLSX.utils.aoa_to_sheet([['(kosong)']]);
        XLSX.utils.book_append_sheet(wb, ws, TABEL[i][1].slice(0, 31));
      }
      var ring = XLSX.utils.aoa_to_sheet([['Cadangan data SANIKES'], ['Fasyankes', (App.profil.fasyankes || {}).nama || '-'],
        ['Diunduh oleh', App.profil.nama], ['Waktu', new Date().toLocaleString('id-ID')], [], ['Bagian', 'Jumlah baris']].concat(isi));
      XLSX.utils.book_append_sheet(wb, ring, 'Ringkasan');
      wb.SheetNames.unshift(wb.SheetNames.pop());
      var nama = ((App.profil.fasyankes || {}).nama || 'fasyankes').replace(/[^\w]+/g, '-').toLowerCase();
      XLSX.writeFile(wb, 'sanikes-cadangan-' + nama + '-' + tglLokal(new Date()) + '.xlsx');
      pesan.style.color = '#0F6E5C';
      pesan.textContent = 'Selesai: ' + total.toLocaleString('id-ID') + ' baris data tersimpan di file Excel.';
    } catch (e) {
      pesan.textContent = 'Gagal: ' + e.message;
    }
    tombol.disabled = false;
  };
})();
