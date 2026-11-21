// Daftar tempat yang diperiksa (TPP dan TFU/TTU): dibuat sekali, dipilih saat inspeksi.
(function () {
  var JENIS_TTU = ['Sekolah / madrasah', 'Pondok pesantren', 'Tempat ibadah', 'Pasar', 'Hotel / penginapan', 'Terminal / stasiun / pelabuhan', 'Tempat rekreasi', 'Sarana olahraga / kolam renang', 'Perkantoran', 'Fasilitas kesehatan', 'Lainnya'];
  var TULIS = ['admin_fasyankes', 'petugas_kesling'];
  function bisaTulis() { return TULIS.indexOf(App.profil.peran) > -1; }
  function v(id) { return String(($(id) || {}).value || '').trim(); }
  function peta(o) {
    return o && o.lat != null && o.lng != null
      ? ' · <a href="https://www.google.com/maps?q=' + encodeURIComponent(o.lat + ',' + o.lng) + '" target="_blank" rel="noopener" style="color:var(--hijau)">lihat di peta</a>' : '';
  }

  var OBJEK = window.OBJEK = {
    JENIS_TTU: JENIS_TTU,
    bisaTulis: bisaTulis,

    // Rincian singkat satu tempat (untuk di bawah pilihan tempat)
    info: function (o, terakhir) {
      if (!o) return '';
      var alamat = [o.alamat, o.desa, o.kecamatan].filter(Boolean).map(esc).join(', ');
      var pj = [o.penanggung_jawab, o.kontak].filter(Boolean).map(esc).join(' · ');
      return (o.jenis ? esc(o.jenis) + '<br>' : '') + (alamat ? 'Alamat: ' + alamat + '<br>' : '') + (pj ? 'Penanggung jawab: ' + pj + '<br>' : '') +
        'Terakhir diperiksa: ' + (terakhir ? esc(terakhir) : 'belum pernah') + peta(o);
    },

    // Formulir tempat (tambah atau ubah). prefix dipakai untuk id elemen.
    form: function (p, kat, o) {
      o = o || {};
      var jenis = kat === 'ttu'
        ? '<label>Jenis tempat</label><select id="' + p + '-jenis">' + JENIS_TTU.map(function (j) { return '<option' + (j === o.jenis ? ' selected' : '') + '>' + esc(j) + '</option>'; }).join('') + '</select>'
        : '<label>Jenis tempat (opsional)</label><input id="' + p + '-jenis" value="' + esc(o.jenis || '') + '" placeholder="mis. Instalasi gizi, Kantin, Katering">';
      return '<label>Nama tempat</label><input id="' + p + '-nama" value="' + esc(o.nama || '') + '" placeholder="' + (kat === 'ttu' ? 'mis. SD Negeri 1, Masjid Raya, Pasar Sentral' : 'mis. Dapur Gizi, Kantin karyawan') + '">' + jenis +
        '<label>Alamat</label><input id="' + p + '-alamat" value="' + esc(o.alamat || '') + '">' +
        '<label>Desa / kelurahan</label><input id="' + p + '-desa" value="' + esc(o.desa || '') + '">' +
        '<label>Kecamatan</label><input id="' + p + '-kec" value="' + esc(o.kecamatan || '') + '">' +
        '<label>Penanggung jawab</label><input id="' + p + '-pj" value="' + esc(o.penanggung_jawab || '') + '">' +
        '<label>Kontak (telepon, opsional)</label><input id="' + p + '-kontak" inputmode="tel" value="' + esc(o.kontak || '') + '">' +
        '<label>Titik lokasi (opsional)</label>' +
        '<div style="display:flex;gap:8px"><input id="' + p + '-lat" type="number" step="any" inputmode="decimal" placeholder="Lintang" value="' + (o.lat != null ? esc(o.lat) : '') + '">' +
        '<input id="' + p + '-lng" type="number" step="any" inputmode="decimal" placeholder="Bujur" value="' + (o.lng != null ? esc(o.lng) : '') + '"></div>' +
        '<button type="button" class="chip" id="' + p + '-gps" style="margin-top:8px">Ambil lokasi saat ini</button><div class="muted" id="' + p + '-gpsinfo" style="margin-top:4px">Tekan tombol ini saat Anda berada di tempat tersebut.</div>';
    },

    pasangGps: function (p) {
      var t = $(p + '-gps');
      if (!t) return;
      t.onclick = function () {
        var info = $(p + '-gpsinfo');
        if (!navigator.geolocation) { info.textContent = 'Perangkat ini tidak mendukung lokasi. Isi manual bila perlu.'; return; }
        info.textContent = 'Mencari lokasi... izinkan akses lokasi bila diminta.';
        navigator.geolocation.getCurrentPosition(function (pos) {
          $(p + '-lat').value = Math.round(pos.coords.latitude * 1e6) / 1e6;
          $(p + '-lng').value = Math.round(pos.coords.longitude * 1e6) / 1e6;
          info.textContent = 'Lokasi terisi (akurasi sekitar ' + Math.round(pos.coords.accuracy) + ' m).';
        }, function () {
          info.textContent = 'Lokasi tidak bisa diambil (izin ditolak atau sinyal GPS lemah). Tempat tetap bisa disimpan tanpa titik lokasi.';
        }, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
      };
    },

    // Baca isian formulir; kembalikan {galat} atau {data}
    baca: function (p, kat) {
      var nama = v(p + '-nama');
      if (!nama) return { galat: 'Nama tempat wajib diisi.' };
      var lat = v(p + '-lat'), lng = v(p + '-lng');
      if ((lat === '') !== (lng === '')) return { galat: 'Isi lintang dan bujur sekaligus, atau kosongkan keduanya.' };
      if (lat !== '' && (!(Math.abs(Number(lat)) <= 90) || !(Math.abs(Number(lng)) <= 180))) return { galat: 'Titik lokasi tidak valid.' };
      return { data: {
        kategori: kat, nama: nama, jenis: v(p + '-jenis') || null, alamat: v(p + '-alamat') || null, desa: v(p + '-desa') || null,
        kecamatan: v(p + '-kec') || null, penanggung_jawab: v(p + '-pj') || null, kontak: v(p + '-kontak') || null,
        lat: lat === '' ? null : Number(lat), lng: lng === '' ? null : Number(lng)
      } };
    },

    pesanGalat: function (e) {
      if (e && (e.code === '23505' || /objek_inspeksi_unik|duplicate/i.test(e.message || ''))) return 'Nama tempat itu sudah ada di daftar.';
      return 'Gagal menyimpan: ' + ((e && e.message) || 'coba lagi');
    }
  };

  // ===== Layar "Daftar tempat" =====
  function layar(kat, judul, tabInspeksi) {
    return async function (el) {
      if (App.profil.peran === 'admin_papkenz') { el.innerHTML = '<div class="info">Data ini milik fasyankes. Gunakan akun fasyankes.</div>'; return; }
      el.innerHTML = '<p class="muted">Memuat...</p>';
      var tabel = kat === 'tpm' ? 'tpm_inspeksi' : 'ikl_inspeksi';
      var r = await App.db.from('objek_inspeksi').select('*').eq('kategori', kat).order('nama');
      if (r.error) { el.innerHTML = '<div class="info waspada">Daftar tempat belum siap. Pastikan SQL "daftar tempat" sudah dijalankan.</div>'; return; }
      var rt = await App.db.from(tabel).select('objek_id, tanggal').not('objek_id', 'is', null).is('dihapus', null).order('tanggal', { ascending: false }).limit(2000);
      var terakhir = {}, jumlah = {};
      (rt.data || []).forEach(function (x) { if (!terakhir[x.objek_id]) terakhir[x.objek_id] = x.tanggal; jumlah[x.objek_id] = (jumlah[x.objek_id] || 0) + 1; });
      var rows = r.data || [], pesan = '';

      function baris(o) {
        return '<div class="baris"' + (o.aktif ? '' : ' style="opacity:.6"') + '><b>' + esc(o.nama) + '</b>' + (o.aktif ? '' : ' · <span class="muted">tidak aktif</span>') +
          '<br><span class="muted">' + OBJEK.info(o, terakhir[o.id]) + (jumlah[o.id] ? ' · ' + jumlah[o.id] + ' kali diperiksa' : '') + '</span>' +
          (bisaTulis() ? '<div class="aksi"><button type="button" class="chip" data-ubah="' + o.id + '">Ubah</button><button type="button" class="chip" data-aktif="' + o.id + '">' + (o.aktif ? 'Nonaktifkan' : 'Aktifkan lagi') + '</button></div>' : '') + '<div data-box="' + o.id + '"></div></div>';
      }
      function gambar() {
        var aktif = rows.filter(function (o) { return o.aktif; }), mati = rows.filter(function (o) { return !o.aktif; });
        el.innerHTML = '<h3 style="margin-top:0">' + esc(judul) + '</h3>' +
          '<p class="muted">Daftarkan tempat sekali di sini, lalu pilih saat inspeksi. Tempat tidak dihapus, hanya dinonaktifkan, supaya riwayat inspeksinya tetap utuh.</p>' +
          (bisaTulis() ? '<button type="button" id="ob-baru">+ Tempat baru</button><div id="ob-form"></div>' : '') +
          (pesan ? '<div class="pesan" style="color:var(--hijau)">' + esc(pesan) + '</div>' : '') +
          '<h3>Tempat aktif (' + aktif.length + ')</h3>' + (aktif.length ? aktif.map(baris).join('') : '<p class="muted">Belum ada tempat.</p>') +
          (mati.length ? '<h3>Tidak aktif (' + mati.length + ')</h3>' + mati.map(baris).join('') : '');
        pasang();
      }
      function bukaForm(wadah, o, prefix) {
        wadah.innerHTML = '<div class="info">' + OBJEK.form(prefix, kat, o) + '<button type="button" id="' + prefix + '-simpan">Simpan</button> <button type="button" class="kecil" id="' + prefix + '-batal" style="margin-top:10px">Batal</button><div class="pesan" id="' + prefix + '-pesan"></div></div>';
        OBJEK.pasangGps(prefix);
        $(prefix + '-batal').onclick = function () { wadah.innerHTML = ''; };
        $(prefix + '-simpan').onclick = async function () {
          var b = OBJEK.baca(prefix, kat);
          if (b.galat) { $(prefix + '-pesan').textContent = b.galat; return; }
          this.disabled = true;
          var res = o && o.id ? await App.db.from('objek_inspeksi').update(b.data).eq('id', o.id) : await App.db.from('objek_inspeksi').insert(b.data);
          this.disabled = false;
          if (res.error) { $(prefix + '-pesan').textContent = OBJEK.pesanGalat(res.error); return; }
          pesan = o && o.id ? 'Perubahan disimpan.' : 'Tempat ditambahkan.';
          layar(kat, judul, tabInspeksi)(el);
        };
      }
      function pasang() {
        if ($('ob-baru')) $('ob-baru').onclick = function () { bukaForm($('ob-form'), null, 'ob'); };
        el.querySelectorAll('[data-ubah]').forEach(function (b) {
          b.onclick = function () {
            var o = rows.filter(function (x) { return x.id === b.dataset.ubah; })[0];
            bukaForm(el.querySelector('[data-box="' + o.id + '"]'), o, 'ob-u');
          };
        });
        el.querySelectorAll('[data-aktif]').forEach(function (b) {
          b.onclick = async function () {
            var o = rows.filter(function (x) { return x.id === b.dataset.aktif; })[0];
            b.disabled = true;
            var res = await App.db.from('objek_inspeksi').update({ aktif: !o.aktif }).eq('id', o.id);
            if (res.error) { b.disabled = false; alert('Gagal: ' + res.error.message); return; }
            pesan = o.aktif ? 'Tempat dinonaktifkan. Tidak muncul lagi di pilihan inspeksi.' : 'Tempat diaktifkan lagi.';
            layar(kat, judul, tabInspeksi)(el);
          };
        });
      }
      gambar();
    };
  }
  App.tabs.objek_tpm = layar('tpm', 'Daftar tempat pangan (TPP)', 'tpm_cek');
  App.tabs.objek_ttu = layar('ttu', 'Daftar tempat dan fasilitas umum (TFU/TTU)', 'ttu_cek');
})();
