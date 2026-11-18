// Daftar format ekspor. Tiap kolom: ['Judul di file', 'nama_isi'].
// Ubah judul/urutan kolom di sini untuk menyesuaikan format SPEED/SIKELIM.
// nama_isi yang tersedia:
//  harian : tanggal, jam, kode, nama, ruangan, berat, satuan, tps, batas, status
//  angkut : tanggal, vendor, manifest, kode, nama, berat, satuan, perlakuan
//  rekap  : kode, nama, timbulan, diangkut, satuan
window.SANIKES_FORMAT_EKSPOR = [
  {
    id: 'harian', nama: 'Timbulan harian', sumber: 'harian',
    kolom: [
      ['Tanggal', 'tanggal'], ['Jam', 'jam'], ['Kode limbah', 'kode'], ['Nama limbah', 'nama'],
      ['Asal ruangan', 'ruangan'], ['Berat', 'berat'], ['Satuan', 'satuan'],
      ['TPS', 'tps'], ['Batas simpan', 'batas'], ['Status', 'status']
    ]
  },
  {
    id: 'angkut', nama: 'Pengangkutan', sumber: 'angkut',
    kolom: [
      ['Tanggal angkut', 'tanggal'], ['Pengangkut', 'vendor'], ['No. manifest', 'manifest'],
      ['Kode limbah', 'kode'], ['Nama limbah', 'nama'], ['Berat', 'berat'], ['Satuan', 'satuan'], ['Perlakuan', 'perlakuan']
    ]
  },
  {
    id: 'rekap', nama: 'Rekap per kode', sumber: 'rekap',
    kolom: [
      ['Kode limbah', 'kode'], ['Nama limbah', 'nama'], ['Timbulan periode ini', 'timbulan'],
      ['Diangkut (dari timbulan periode ini)', 'diangkut'], ['Satuan', 'satuan']
    ]
  }
];
