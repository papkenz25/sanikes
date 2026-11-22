// Foto bukti: ambil/pilih, kecilkan, catat lokasi, unggah ke penyimpanan privat, tampilkan.
(function () {
  var MAKS_SISI = 1280;
  var siapCache = null;

  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) { var r = Math.random() * 16 | 0; return (c === 'x' ? r : (r & 3 | 8)).toString(16); });
  }
  function kerja(b, w, h, mutu) {
    return new Promise(function (ok) {
      var c = document.createElement('canvas'); c.width = w; c.height = h;
      c.getContext('2d').drawImage(b, 0, 0, w, h);
      c.toBlob(function (x) { ok(x); }, 'image/jpeg', mutu);
    });
  }
  function muatGambar(file) {
    if (window.createImageBitmap) {
      return createImageBitmap(file, { imageOrientation: 'from-image' }).catch(function () { return viaImg(file); });
    }
    return viaImg(file);
  }
  function viaImg(file) {
    return new Promise(function (ok, gagal) {
      var u = URL.createObjectURL(file), i = new Image();
      i.onload = function () { ok(i); }; i.onerror = function () { gagal(new Error('Foto tidak bisa dibaca.')); }; i.src = u;
    });
  }

  var FOTO = window.FOTO = {
    // true bila tabel foto sudah ada (SQL sudah dijalankan)
    siap: function () {
      if (!siapCache) siapCache = App.db.from('foto').select('id').limit(1).then(function (r) { return !r.error; }, function () { return false; });
      return siapCache;
    },

    kecilkan: async function (file) {
      var g = await muatGambar(file);
      var w = g.width, h = g.height, s = Math.min(1, MAKS_SISI / Math.max(w, h));
      var blob = await kerja(g, Math.round(w * s), Math.round(h * s), 0.72);
      if (blob && blob.size > 450 * 1024) blob = await kerja(g, Math.round(w * s * 0.8), Math.round(h * s * 0.8), 0.6);
      if (!blob) throw new Error('Foto gagal diproses.');
      return blob;
    },

    lokasi: function () {
      return new Promise(function (ok) {
        if (!navigator.geolocation) return ok(null);
        navigator.geolocation.getCurrentPosition(function (p) {
          ok({ lat: Math.round(p.coords.latitude * 1e6) / 1e6, lng: Math.round(p.coords.longitude * 1e6) / 1e6, akurasi: Math.round(p.coords.accuracy) });
        }, function () { ok(null); }, { enableHighAccuracy: true, timeout: 7000, maximumAge: 15000 });
      });
    },

    // Pasang tombol foto di sebuah wadah. state[kode] = daftar foto yang menunggu diunggah.
    pasang: function (wadah, state, kode, opsi) {
      opsi = opsi || {};
      var maks = opsi.maks || 2;
      state[kode] = state[kode] || [];
      var peringatan = false;
      var id = 'f' + Math.random().toString(36).slice(2, 8);

      function gambar() {
        var arr = state[kode];
        if (App.demo) { wadah.innerHTML = '<div class="muted" style="font-size:12px">Unggah foto tidak tersedia di demo.</div>'; return; }
        wadah.innerHTML = '<div class="foto-baris">' +
          arr.map(function (f, i) {
            return '<span class="foto-mini"><img src="' + f.url + '" alt="foto" data-besar="' + i + '"><button type="button" class="foto-hapus" data-hapus="' + i + '" aria-label="Hapus foto">×</button>' +
              '<small>' + (f.sumber === 'kamera' ? (f.lat != null ? '📍' : 'tanpa lokasi') : 'galeri') + '</small></span>';
          }).join('') +
          (arr.length < maks ? '<label class="chip foto-tombol">Ambil foto<input type="file" accept="image/*" capture="environment" hidden data-sumber="kamera"></label>' +
            '<label class="chip foto-tombol">Dari galeri<input type="file" accept="image/*" hidden data-sumber="galeri"></label>' : '') + '</div>' +
          '<div class="foto-info muted" id="' + id + '-i"></div>' +
          (peringatan && !arr.length ? '<div class="foto-peringatan">Butir ini tidak memenuhi dan belum ada foto. Foto membantu sebagai bukti.</div>' : '');
        wadah.querySelectorAll('input[type=file]').forEach(function (inp) {
          inp.onchange = async function () {
            var file = inp.files && inp.files[0]; if (!file) return;
            var info = $(id + '-i'); info.textContent = 'Memproses foto...';
            try {
              var sumber = inp.dataset.sumber, blob = await FOTO.kecilkan(file), loc = null;
              if (sumber === 'kamera') { info.textContent = 'Mencari lokasi...'; loc = await FOTO.lokasi(); }
              state[kode].push({
                blob: blob, url: URL.createObjectURL(blob), sumber: sumber,
                lat: loc ? loc.lat : null, lng: loc ? loc.lng : null, akurasi: loc ? loc.akurasi : null,
                diambil: sumber === 'kamera' ? new Date().toISOString() : new Date(file.lastModified || Date.now()).toISOString()
              });
              gambar();
              $(id + '-i').textContent = (sumber === 'kamera' && !loc) ? 'Foto ditambahkan tanpa lokasi (izin lokasi ditolak atau sinyal GPS lemah).' : '';
              if (opsi.onUbah) opsi.onUbah();
            } catch (e) { info.textContent = (e && e.message) || 'Foto gagal diproses.'; }
          };
        });
        wadah.querySelectorAll('[data-hapus]').forEach(function (b) {
          b.onclick = function () { var f = state[kode].splice(Number(b.dataset.hapus), 1)[0]; if (f) URL.revokeObjectURL(f.url); gambar(); if (opsi.onUbah) opsi.onUbah(); };
        });
        wadah.querySelectorAll('[data-besar]').forEach(function (im) { im.onclick = function () { FOTO.besar(im.src); }; });
      }
      gambar();
      return { peringatan: function (b) { if (peringatan !== !!b) { peringatan = !!b; gambar(); } } };
    },

    // Unggah satu foto. Kembalikan {ok:true} atau {galat}
    unggah: async function (tabel, dataId, butir, f) {
      var fid = App.profil.fasyankes_id;
      if (!fid) return { galat: 'Fasyankes tidak dikenali.' };
      var path = fid + '/' + tabel + '/' + new Date().toISOString().slice(0, 7) + '/' + uuid() + '.jpg';
      var up = await App.db.storage.from('foto').upload(path, f.blob, { contentType: 'image/jpeg', upsert: false });
      if (up.error) return { galat: up.error.message || 'Unggah gagal.' };
      var ins = await App.db.from('foto').insert({
        tabel: tabel, data_id: dataId, butir: butir, path: path, lat: f.lat, lng: f.lng, akurasi: f.akurasi,
        diambil: f.diambil, sumber: f.sumber, ukuran: f.blob.size
      });
      if (ins.error) { await App.db.storage.from('foto').remove([path]); return { galat: ins.error.message || 'Gagal mencatat foto.' }; }
      return { ok: true };
    },

    // Ambil foto sebuah catatan beserta tautan sementara untuk menampilkan
    ambil: async function (tabel, dataId) {
      var r = await App.db.from('foto').select('*').eq('tabel', tabel).eq('data_id', dataId).is('dihapus', null).order('dibuat');
      var rows = r.data || [];
      if (!rows.length) return [];
      var s = await App.db.storage.from('foto').createSignedUrls(rows.map(function (x) { return x.path; }), 3600);
      var peta = {};
      (s.data || []).forEach(function (x) { peta[x.path] = x.signedUrl; });
      return rows.map(function (x) { x.url = peta[x.path] || null; return x; }).filter(function (x) { return x.url; });
    },

    jumlah: async function (tabel, ids) {
      if (!ids.length) return {};
      var r = await App.db.from('foto').select('data_id').eq('tabel', tabel).in('data_id', ids).is('dihapus', null);
      var o = {};
      (r.data || []).forEach(function (x) { o[x.data_id] = (o[x.data_id] || 0) + 1; });
      return o;
    },

    // Keterangan lokasi dan jam sebuah foto
    ket: function (f) {
      var jam = f.diambil ? new Date(f.diambil).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
      if (f.sumber === 'kamera' && f.lat != null) {
        return 'Kamera · sekitar <a href="https://www.google.com/maps?q=' + encodeURIComponent(f.lat + ',' + f.lng) + '" target="_blank" rel="noopener">' + f.lat + ', ' + f.lng + '</a>' + (f.akurasi ? ' (±' + f.akurasi + ' m)' : '') + ' · ' + esc(jam);
      }
      if (f.sumber === 'kamera') return 'Kamera · lokasi tidak tersedia · ' + esc(jam);
      return 'Galeri · tanpa lokasi terverifikasi · ' + esc(jam);
    },

    // Deretan foto + keterangan (untuk rincian dan cetak)
    html: function (daftar) {
      return daftar.map(function (f) {
        return '<div class="foto-lihat"><img src="' + esc(f.url) + '" alt="foto bukti" data-besar-lihat><div class="foto-ket">' + FOTO.ket(f) + '</div></div>';
      }).join('');
    },

    besar: function (src) {
      var o = document.createElement('div');
      o.className = 'foto-lightbox noprint';
      o.innerHTML = '<img src="' + esc(src) + '" alt="foto"><span>Ketuk untuk menutup</span>';
      o.onclick = function () { o.remove(); };
      document.body.appendChild(o);
    }
  };
})();
