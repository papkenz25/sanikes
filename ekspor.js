(function () {
  var pilih = 'harian';
  var satuanEks = null;
  var periode = null;
  var hasil = null;

  function angka(kg, satuan) {
    var n = Number(kg) || 0;
    if (satuan === 'ton') n = n / 1000;
    return n.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: satuan === 'ton' ? 4 : 3, useGrouping: false });
  }
  function sel(v) {
    var s = v == null ? '' : String(v);
    return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function nm(o) { return o ? (o.nama || '') : ''; }

  async function ambilTabel(tabel, kolomTgl, dari, sampai) {
    var out = [];
    for (var p = 0; p < 20; p++) {
      var r = await App.db.from(tabel).select('*').gte(kolomTgl, dari).lte(kolomTgl, sampai)
        .order(kolomTgl).order('id').range(p * 1000, p * 1000 + 999);
      if (r.error) throw r.error;
      out = out.concat(r.data);
      if (r.data.length < 1000) break;
    }
    return out;
  }
  async function petaId(tabel) {
    var r = await App.db.from(tabel).select('*');
    var o = {};
    (r.data || []).forEach(function (x) { o[x.id] = x; });
    return o;
  }

  async function bangun(sumber, dari, sampai, satuan) {
    var mk = {};
    var m = await App.db.from('master_limbah').select('kode, nama');
    (m.data || []).forEach(function (x) { mk[x.kode] = x.nama; });
    var rows = [];

    if (sumber === 'angkut') {
      var vd = await petaId('vendor');
      var a = await ambilTabel('limbah_angkut', 'tanggal', dari, sampai);
      a.forEach(function (r) {
        var kode = r.kode_limbah || r.kode || '';
        rows.push({
          tanggal: r.tanggal, vendor: nm(vd[r.vendor_id]) || r.vendor || '',
          manifest: r.manifest || r.no_manifest || '', kode: kode, nama: mk[kode] || '',
          berat: angka(r.berat_kg, satuan), satuan: satuan, perlakuan: r.perlakuan || ''
        });
      });
      return rows;
    }

    var h = await ambilTabel('limbah_harian', 'tanggal', dari, sampai);
    if (sumber === 'harian') {
      var rg = await petaId('ruangan'), tp = await petaId('tps');
      h.forEach(function (r) {
        rows.push({
          tanggal: r.tanggal, jam: r.jam ? String(r.jam).slice(0, 5) : '', kode: r.kode_limbah,
          nama: mk[r.kode_limbah] || '', ruangan: nm(rg[r.ruangan_id]) || r.ruangan || '',
          berat: angka(r.berat_kg, satuan), satuan: satuan, tps: nm(tp[r.tps_id]),
          batas: r.batas_simpan ? tglLokal(new Date(r.batas_simpan)) : '', status: r.status || ''
        });
      });
      return rows;
    }

    var per = {};
    h.forEach(function (r) {
      var o = per[r.kode_limbah] || (per[r.kode_limbah] = { t: 0, d: 0 });
      o.t += Number(r.berat_kg);
      if (r.tgl_keluar && r.tgl_keluar <= sampai) o.d += Number(r.berat_kg);
    });
    Object.keys(per).sort().forEach(function (k) {
      rows.push({ kode: k, nama: mk[k] || '', timbulan: angka(per[k].t, satuan), diangkut: angka(per[k].d, satuan), satuan: satuan });
    });
    return rows;
  }

  function formatTerpilih() {
    return window.SANIKES_FORMAT_EKSPOR.filter(function (f) { return f.id === pilih; })[0];
  }

  function csv(f, rows) {
    var baris = [f.kolom.map(function (k) { return sel(k[0]); }).join(';')];
    rows.forEach(function (r) {
      baris.push(f.kolom.map(function (k) { return sel(r[k[1]]); }).join(';'));
    });
    return '\uFEFF' + baris.join('\r\n');
  }

  function unduh(f, rows, dari, sampai) {
    var blob = new Blob([csv(f, rows)], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'sanikes-' + f.id + '-' + dari + '-' + sampai + '.csv';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
  }

  App.laporan.ekspor = function (el) {
    if (App.profil.peran === 'admin_papkenz') {
      el.innerHTML = '<div class="info">Ekspor milik fasyankes. Gunakan akun fasyankes.</div>';
      return;
    }
    if (!periode) { var n = new Date(); periode = { dari: tglLokal(new Date(n.getFullYear(), n.getMonth(), 1)), sampai: tglLokal(n) }; }
    if (!satuanEks) satuanEks = App.satuan || 'kg';
    var chips = window.SANIKES_FORMAT_EKSPOR.map(function (f) {
      return '<button type="button" class="chip' + (f.id === pilih ? ' aktif' : '') + '" data-f="' + f.id + '">' + esc(f.nama) + '</button>';
    }).join('');
    el.innerHTML =
      '<div class="info">Format ekspor ini <b>custom</b> (sementara) dan dapat disesuaikan dengan format resmi SPEED/SIKELIM.</div>' +
      '<div class="chips" id="e-chips">' + chips + '</div>' +
      '<label>Dari</label><input type="date" id="e-dari" value="' + periode.dari + '">' +
      '<label>Sampai</label><input type="date" id="e-sampai" value="' + periode.sampai + '">' +
      '<label>Satuan berat di file</label><select id="e-sat"><option value="kg"' + (satuanEks === 'kg' ? ' selected' : '') + '>kg</option><option value="ton"' + (satuanEks === 'ton' ? ' selected' : '') + '>ton</option></select>' +
      '<button type="button" id="e-lihat">Tampilkan pratinjau</button><div class="pesan" id="e-pesan"></div><div id="e-hasil"></div>';

    $('e-chips').addEventListener('click', function (e) {
      var c = e.target.closest('.chip');
      if (c) { pilih = c.dataset.f; hasil = null; App.laporan.ekspor(el); }
    });
    $('e-lihat').addEventListener('click', async function () {
      var dari = $('e-dari').value, sampai = $('e-sampai').value;
      satuanEks = $('e-sat').value;
      if (!dari || !sampai || dari > sampai) { $('e-pesan').textContent = 'Periode tidak valid.'; return; }
      $('e-pesan').textContent = '';
      periode = { dari: dari, sampai: sampai };
      var f = formatTerpilih();
      $('e-hasil').innerHTML = '<p class="muted">Menyiapkan...</p>';
      try {
        var rows = await bangun(f.sumber, dari, sampai, satuanEks);
        hasil = rows;
        var th = f.kolom.map(function (k) { return '<th style="text-align:left;padding:4px 8px;white-space:nowrap">' + esc(k[0]) + '</th>'; }).join('');
        var tb = rows.slice(0, 10).map(function (r) {
          return '<tr>' + f.kolom.map(function (k) { return '<td style="padding:4px 8px;white-space:nowrap">' + esc(r[k[1]] == null ? '' : r[k[1]]) + '</td>'; }).join('') + '</tr>';
        }).join('');
        $('e-hasil').innerHTML = '<p class="muted">' + rows.length + ' baris' + (rows.length > 10 ? ' (pratinjau 10 baris pertama)' : '') + '</p>' +
          (rows.length ? '<div style="overflow:auto;font-size:12px"><table><tr>' + th + '</tr>' + tb + '</table></div><button type="button" id="e-unduh">Unduh CSV</button>' : '');
        if (rows.length) $('e-unduh').addEventListener('click', function () { unduh(f, hasil, dari, sampai); });
      } catch (err) {
        $('e-hasil').innerHTML = '<div class="info waspada">Gagal menyiapkan data. Kirim screenshot ini kalau berulang.</div>';
      }
    });
  };
})();
