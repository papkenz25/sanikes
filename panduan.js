// Kotak "Panduan" (bisa dibuka-tutup) di atas formulir pelaporan.
(function () {
  var P = {
    catat: {
      judul: 'Panduan: mencatat limbah B3',
      isi: '<p><b>Untuk apa:</b> setiap limbah B3 yang keluar dari ruangan dicatat di sini. Catatan ini menjadi dasar neraca limbah, pengangkutan, dan laporan bulanan.</p>' +
        '<p><b>Kapan diisi:</b> setiap kali limbah dipindahkan dari ruangan ke TPS, sebaiknya di hari yang sama.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li><b>Tanggal dan jam:</b> waktu limbah diserahkan ke TPS.</li>' +
        '<li><b>Ruangan asal:</b> ruangan yang menghasilkan limbah.</li>' +
        '<li><b>Kode limbah:</b> pilih jenis limbah. Keterangan jenisnya tampil di bawah pilihan.</li>' +
        '<li><b>Berat:</b> hasil timbangan kantong atau safety box. Satuan bisa kg atau ton.</li>' +
        '<li><b>Suhu penyimpanan:</b> memengaruhi batas simpan untuk jenis limbah tertentu.</li>' +
        '<li><b>ID kantong:</b> boleh dikosongkan. Berguna untuk menelusuri kantong dan untuk label.</li></ul>' +
        '<p><b>Setelah disimpan:</b> batas simpan dihitung otomatis dan tampil di Dasbor. Label kantong bisa dicetak lewat bagian Cetak label di halaman ini. Bila batas simpan sebuah kode belum ditetapkan, aplikasi memberi tanda dan catatan tetap tersimpan.</p>' +
        '<p class="muted">Batas simpan mengikuti pengaturan kode limbah di aplikasi. Cocokkan dengan ketentuan terbaru yang berlaku di fasyankes Anda.</p>'
    },
    angkut: {
      judul: 'Panduan: pengangkutan limbah',
      isi: '<p><b>Untuk apa:</b> mencatat limbah B3 yang diserahkan ke pihak pengangkut berizin. Catatan ini mengurangi stok limbah di TPS dan masuk ke neraca limbah.</p>' +
        '<p><b>Kapan diisi:</b> setiap kali limbah diambil oleh pengangkut, sesuai nomor manifest.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li>Pilih limbah yang masih tersimpan di TPS yang ikut diangkut.</li>' +
        '<li>Pilih <b>vendor</b> pengangkut. Vendor yang izin atau MoU-nya sudah lewat diberi tanda, jadi perbarui datanya sebelum dipakai.</li>' +
        '<li>Isi <b>nomor manifest</b> persis seperti pada dokumen manifest.</li></ul>' +
        '<p><b>Salah catat?</b> Pengangkutan yang salah catat bisa dibatalkan dari daftar di bawah.</p>'
    },
    air_uji: {
      judul: 'Panduan: uji kualitas air',
      isi: '<p><b>Untuk apa:</b> mencatat hasil pemeriksaan air dan membandingkannya otomatis dengan baku mutu Permenkes 2/2023.</p>' +
        '<p><b>Kapan diisi:</b> setiap ada hasil pemeriksaan (dari laboratorium atau pemeriksaan sendiri).</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li><b>Tanggal:</b> tanggal pengambilan sampel.</li>' +
        '<li><b>Titik sampel:</b> tempat sampel diambil. Daftarkan titik tetap di Pengaturan supaya tren per titik bisa dilihat.</li>' +
        '<li><b>Jenis air:</b> air untuk higiene sanitasi, atau air minum. Daftar parameter dan batasnya mengikuti pilihan ini.</li>' +
        '<li><b>Parameter:</b> isi hanya yang benar-benar diperiksa, sisanya dikosongkan.</li></ul>' +
        '<p><b>Setelah disimpan:</b> tiap parameter diberi status memenuhi atau tidak memenuhi. Yang tidak memenuhi otomatis menjadi <b>temuan</b> beserta saran tindak lanjut, dan angkanya masuk ke Dasbor dan laporan bulanan.</p>'
    },
    ipal_harian: {
      judul: 'Panduan: IPAL harian',
      isi: '<p><b>Untuk apa:</b> catatan pemantauan harian pengolahan air limbah. Ini bukti bahwa IPAL dipantau setiap hari.</p>' +
        '<p><b>Kapan diisi:</b> setiap hari IPAL beroperasi.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li><b>Debit:</b> volume air limbah hari itu (m³/hari). Debit menentukan kelas baku mutu yang dipakai.</li>' +
        '<li><b>Inlet:</b> kondisi air sebelum diolah (pH, suhu, warna, bau). Inlet hanya dicatat sebagai pengamatan dan tidak dibandingkan dengan baku mutu.</li>' +
        '<li><b>Outlet:</b> kondisi air setelah diolah. Nilai pH outlet dibandingkan dengan batas pada kelas IPAL fasyankes.</li>' +
        '<li><b>Peralatan:</b> kondisi pompa dan blower.</li></ul>' +
        '<p><b>Setelah disimpan:</b> pH outlet di luar batas ditandai merah dan dicatat sebagai <b>temuan</b>. Bila nanti dikoreksi menjadi memenuhi, temuannya dibatalkan otomatis. Kelas IPAL diatur di Pengaturan, dan bila belum diatur dipakai kelas 3 sampai 50 m³/hari.</p>' +
        '<p class="muted">Dasar baku mutu air limbah: Permen LH 11/2025 Lampiran I.</p>'
    },
    ipal_lab: {
      judul: 'Panduan: uji lab IPAL',
      isi: '<p><b>Untuk apa:</b> mencatat hasil uji laboratorium air limbah dan membandingkannya otomatis dengan baku mutu Permen LH 11/2025 Lampiran I.</p>' +
        '<p><b>Kapan diisi:</b> setiap ada hasil uji laboratorium.</p>' +
        '<p><b>Cara mengisi:</b></p><ul>' +
        '<li><b>Titik:</b> Outlet atau Inlet. Hanya titik outlet yang dibandingkan dengan baku mutu.</li>' +
        '<li><b>Kelas baku mutu:</b> sesuai ke mana air limbah dibuang dan berapa volumenya (di atas 50, 3 sampai 50, atau sampai 3 m³/hari ke media air, atau ke drainase/irigasi). Biasanya sudah terisi dari Pengaturan.</li>' +
        '<li><b>Parameter:</b> isi hanya yang diperiksa. Suhu, warna, dan bau dicatat sebagai pengamatan.</li></ul>' +
        '<p><b>Setelah disimpan:</b> parameter yang tidak memenuhi otomatis menjadi <b>temuan</b>, dan persentase hasil memenuhi masuk ke Dasbor serta rekap Dinas Kesehatan.</p>'
    }
  };

  function kotak(kunci) {
    var d = document.createElement('details');
    d.className = 'panduan noprint';
    d.setAttribute('data-panduan', kunci);
    d.innerHTML = '<summary>' + P[kunci].judul + '</summary><div class="panduan-isi">' + P[kunci].isi + '</div>';
    return d;
  }

  Object.keys(P).forEach(function (kunci) {
    var asli = App.tabs[kunci];
    if (!asli) return;
    App.tabs[kunci] = async function (el) {
      var hasil = await asli.apply(this, arguments);
      if (el && el.isConnected !== false && !el.querySelector('[data-panduan="' + kunci + '"]') && el.firstChild) {
        var h = el.querySelector('h3');
        var k = kotak(kunci);
        if (h && h.parentNode === el) h.insertAdjacentElement('afterend', k); else el.insertBefore(k, el.firstChild);
      }
      return hasil;
    };
  });
})();
