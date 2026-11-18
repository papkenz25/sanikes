(function () {
  var G1 = 'width:auto;display:inline-block;padding:6px 14px;margin:6px 6px 0 0;font-size:14px';
  var G2 = G1 + ';background:#fff;color:#a33;border:1px solid #a33';

  function lewat(d) { return d && d < tglLokal(new Date()); }

  function statusBatas(iso) {
    if (!iso) return '';
    var t = new Date(iso).getTime(), now = Date.now();
    if (t < now) return ' · <span class="lewat">LEWAT BATAS</span>';
    if (t - now < 86400000) return ' · <span class="lewat">H-1</span>';
    return ' · batas ' + fmtWaktu(iso);
  }

  function hitungTerpilih() {
    var per = {}, total = 0;
    document.querySelectorAll('.a-cek:checked').forEach(function (c) {
      var b = Number(c.dataset.berat);
      per[c.dataset.kode] = (per[c.dataset.kode] || 0) + b;
      total += b;
    });
    var teks = Object.keys(per).sort().map(function (k) { return k + ': ' + fmtBerat(per[k]); }).join(' · ');
    $('a-ringkas').innerHTML = total > 0 ? 'Dipilih: <b>' + fmtBerat(total) + '</b><br>' + esc(teks) : 'Belum ada limbah dipilih.';
  }

  App.tabs.angkut = async function (el, pesanAwal) {
    var peran = App.profil.peran;
    if (peran === 'admin_papkenz') {
      el.innerHTML = '<div class="info">Data pengangkutan milik fasyankes. Gunakan akun fasyankes.</div>';
      return;
    }
    var bisa = ['admin_fasyankes', 'petugas_kesling'].indexOf(peran) >= 0;
    var admin = peran === 'admin_fasyankes';
    el.innerHTML = '<p class="muted">Memuat...</p>';

    var r = await Promise.all([
      App.db.from('vendor').select('id, nama, peran, izin_berakhir, mou_berakhir').eq('aktif', true).order('nama'),
      App.db.from('limbah_harian')
        .select('id, tanggal, jam, kode_limbah, nama_limbah, berat_kg, batas_simpan, id_kantong, ruangan(nama), tps(nama)')
        .eq('status', 'disimpan').order('kode_limbah').order('tanggal'),
      App.db.from('limbah_angkut')
        .select('id, tanggal, kode_limbah, berat_kg, no_manifest, vendor(nama)')
        .order('tanggal', { ascending: false }).order('dibuat', { ascending: false }).limit(20)
    ]);
    if (r[0].error || r[1].error || r[2].error) {
      el.innerHTML = '<div class="info waspada">Gagal memuat data. Coba muat ulang halaman.</div>';
      return;
    }

    var html = '<h3 style="margin-top:0">Pengangkutan limbah</h3>';
    var stok = r[1].data;
    var grup = {}, urut = [];
    stok.forEach(function (x) {
      if (!grup[x.kode_limbah]) { grup[x.kode_limbah] = []; urut.push(x.kode_limbah); }
      grup[x.kode_limbah].push(x);
    });

    if (bisa) {
      var opsiVendor = r[0].data.map(function (v) {
        var flag = (lewat(v.izin_berakhir) || lewat(v.mou_berakhir)) ? ' - IZIN/MOU LEWAT' : '';
        return '<option value="' + esc(v.id) + '">' + esc(v.nama) + ' (' + esc(v.peran || '-') + ')' + flag + '</option>';
      }).join('');
      html += '<form id="a-form">' +
        '<label>Tanggal pengangkutan</label><input type="date" id="a-tgl" value="' + tglLokal(new Date()) + '" required>' +
        '<label>Vendor pengangkut</label><select id="a-vendor" required><option value="">Pilih vendor</option>' + opsiVendor + '</select>' +
        '<label>Nomor manifest</label><input id="a-manifest" required>' +
        '<label>Keterangan perlakuan (opsional)</label><input id="a-perlakuan">' +
        '<h3>Pilih limbah yang diangkut</h3>';
      if (!stok.length) html += '<p class="muted">Tidak ada limbah yang sedang disimpan.</p>';
      urut.forEach(function (kode) {
        var tot = 0;
        grup[kode].forEach(function (x) { tot += Number(x.berat_kg); });
        html += '<div class="info"><b>' + esc(kode) + '</b> · stok ' + fmtBerat(tot) + ' ' +
          '<button type="button" class="chip" style="margin-top:8px" data-semua="' + esc(kode) + '">Pilih semua</button></div>';
        grup[kode].forEach(function (x) {
          html += '<div class="baris"><label style="display:flex;gap:10px;align-items:flex-start;margin:0;font-weight:400">' +
            '<input type="checkbox" class="a-cek" style="width:auto;margin-top:3px" value="' + esc(x.id) + '" data-kode="' + esc(kode) + '" data-berat="' + Number(x.berat_kg) + '">' +
            '<span><b>' + fmtBerat(x.berat_kg) + '</b> · ' + esc(x.tanggal) + ' ' + esc((x.jam || '').slice(0, 5)) +
            '<br>' + esc(x.nama_limbah || '') + (x.id_kantong ? ' · ' + esc(x.id_kantong) : '') +
            '<br><span class="muted">' + esc(x.ruangan ? x.ruangan.nama : '-') + ' → ' + esc(x.tps ? x.tps.nama : '-') + '</span>' +
            statusBatas(x.batas_simpan) + '</span></label></div>';
        });
      });
      html += '<div class="info" id="a-ringkas">Belum ada limbah dipilih.</div>' +
        '<button type="submit" id="a-simpan">Simpan pengangkutan</button><div class="pesan" id="a-pesan"></div></form>';
    } else {
      html += '<div class="info">Peran Anda hanya bisa melihat data.</div>';
    }

    html += '<h3>Riwayat pengangkutan</h3><div class="pesan" id="a-pesan2" style="color:#0F6E5C">' + esc(pesanAwal || '') + '</div><div id="a-riwayat">';
    if (!r[2].data.length) html += '<p class="muted">Belum ada pengangkutan.</p>';
    r[2].data.forEach(function (x) {
      html += '<div class="baris"><b>' + esc(x.kode_limbah) + '</b> · ' + fmtBerat(x.berat_kg) + ' · ' + esc(x.tanggal) +
        '<br>Manifest: ' + esc(x.no_manifest || '-') + '<br><span class="muted">' + esc(x.vendor ? x.vendor.nama : '-') + '</span>' +
        (admin ? '<div data-abox="' + x.id + '"><button type="button" style="' + G2 + '" data-a="batal" data-id="' + x.id + '">Batalkan pengangkutan</button></div>' : '') +
        '</div>';
    });
    html += '</div>';
    el.innerHTML = html;

    if (admin) {
      $('a-riwayat').onclick = async function (e) {
        var b = e.target.closest ? e.target.closest('[data-a]') : null;
        if (!b) return;
        var id = b.dataset.id, w = document.querySelector('[data-abox="' + id + '"]');
        if (!w) return;
        if (b.dataset.a === 'batal') {
          w.innerHTML = '<b>Batalkan pengangkutan ini? Limbahnya kembali berstatus disimpan.</b><br>' +
            '<button type="button" style="' + G2 + '" data-a="ya" data-id="' + id + '">Ya, batalkan</button>' +
            '<button type="button" style="' + G1 + '" data-a="tidak" data-id="' + id + '">Tidak</button>';
        } else if (b.dataset.a === 'tidak') {
          App.tabs.angkut(el);
        } else if (b.dataset.a === 'ya') {
          var res = await App.db.rpc('batal_pengangkutan', { p_angkut: id });
          if (res.error) { w.innerHTML = '<div class="pesan">Gagal: ' + esc(res.error.message) + '</div>'; return; }
          App.tabs.angkut(el, 'Pengangkutan dibatalkan, ' + res.data + ' catatan limbah kembali disimpan.');
        }
      };
    }

    if (!bisa) return;
    document.querySelectorAll('[data-semua]').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.a-cek').forEach(function (c) {
          if (c.dataset.kode === b.dataset.semua) c.checked = true;
        });
        hitungTerpilih();
      });
    });
    document.querySelectorAll('.a-cek').forEach(function (c) { c.addEventListener('change', hitungTerpilih); });

    $('a-form').addEventListener('submit', async function (e) {
      e.preventDefault();
      var pesan = $('a-pesan');
      pesan.style.color = '';
      pesan.textContent = '';
      var ids = [];
      document.querySelectorAll('.a-cek:checked').forEach(function (c) { ids.push(c.value); });
      if (!ids.length) { pesan.textContent = 'Pilih minimal satu limbah.'; return; }
      if (!$('a-vendor').value) { pesan.textContent = 'Pilih vendor.'; return; }
      $('a-simpan').disabled = true;
      var res = await App.db.rpc('catat_pengangkutan', {
        p_tanggal: $('a-tgl').value,
        p_vendor: $('a-vendor').value,
        p_manifest: $('a-manifest').value.trim(),
        p_perlakuan: $('a-perlakuan').value.trim() || null,
        p_ids: ids
      });
      $('a-simpan').disabled = false;
      if (res.error) { pesan.textContent = 'Gagal menyimpan: ' + res.error.message; return; }
      await App.tabs.angkut(el);
      var p2 = $('a-pesan');
      if (p2) { p2.style.color = '#0F6E5C'; p2.textContent = 'Pengangkutan tersimpan.'; }
    });
  };
})();
