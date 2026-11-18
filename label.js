(function () {
  var HEX = { kuning: '#F2C200', cokelat: '#8B5A2B', coklat: '#8B5A2B', ungu: '#7B3FA0', merah: '#C62828', hitam: '#222222' };

  var css = document.createElement('style');
  css.textContent =
    '#lbl-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:#fff;z-index:50;overflow:auto;padding:16px}' +
    '.lbl{border:3px solid #000;width:100mm;margin:12px auto;color:#000;background:#fff;font-size:13px}' +
    '.lbl .pita{padding:6px 8px;color:#fff;font-weight:bold;display:flex;justify-content:space-between;text-shadow:0 0 3px #000}' +
    '.lbl .isi{display:flex;gap:8px;padding:8px}' +
    '.lbl .kiri{flex:1}' +
    '.lbl .kode{font-size:26px;font-weight:bold;line-height:1.1}' +
    '.lbl .qr svg{width:28mm;height:28mm}' +
    '@media print{body.cetak-label #layar-app{display:none !important}body.cetak-label #lbl-overlay{position:static;padding:0}}';
  document.head.appendChild(css);

  function qrSvg(teks) {
    try {
      var q = qrcode(0, 'M');
      q.addData(teks);
      q.make();
      return q.createSvgTag(3, 0);
    } catch (e) { return ''; }
  }

  function tutup() {
    var o = document.getElementById('lbl-overlay');
    if (o) o.remove();
    document.body.classList.remove('cetak-label');
  }

  function buka(r, m, namaRuangan) {
    tutup();
    var warna = String((m && m.warna) || '').toLowerCase();
    var hex = HEX[warna] || '#777777';
    var kg = fmtBerat(r.berat_kg);
    var o = document.createElement('div');
    o.id = 'lbl-overlay';
    o.innerHTML =
      '<div class="noprint" style="text-align:center">' +
      '<button type="button" id="lbl-cetak" style="width:auto;padding:12px 24px">Cetak label</button> ' +
      '<button type="button" id="lbl-tutup" style="width:auto;padding:12px 24px;background:#666">Tutup</button></div>' +
      '<div class="lbl"><div class="pita" style="background:' + hex + '"><span>LIMBAH B3</span><span>' + esc(warna ? 'Wadah ' + warna : '') + '</span></div>' +
      '<div class="isi"><div class="kiri"><div class="kode">' + esc(r.kode_limbah) + '</div>' +
      '<div><b>' + esc((m && m.nama) || '') + '</b></div>' +
      '<div>Asal: ' + esc(namaRuangan || '-') + '</div>' +
      '<div>Berat: ' + esc(kg) + '</div>' +
      '<div>Tanggal: ' + esc(r.tanggal) + (r.jam ? ' ' + esc(String(r.jam).slice(0, 5)) : '') + '</div>' +
      '<div>Batas simpan: <b>' + esc(r.batas_simpan ? fmtWaktu(r.batas_simpan) : '-') + '</b></div></div>' +
      '<div class="qr">' + qrSvg('SANIKES:' + r.id) + '</div></div></div>';
    document.body.appendChild(o);
    document.body.classList.add('cetak-label');
    document.getElementById('lbl-tutup').addEventListener('click', tutup);
    document.getElementById('lbl-cetak').addEventListener('click', function () { window.print(); });
  }

  var asli = App.tabs.catat;
  App.tabs.catat = async function (el) {
    await asli(el);
    if (App.profil.peran === 'petugas_ruangan' && false) return;
    var kotak = document.createElement('div');
    kotak.className = 'noprint';
    kotak.innerHTML = '<h3>Cetak label</h3><label>Tanggal</label><input type="date" id="lbl-tgl" value="' + tglLokal(new Date()) + '">' +
      '<div id="lbl-daftar"><p class="muted">Memuat...</p></div>';
    el.appendChild(kotak);

    var data = {}, master = {}, ruang = {};
    async function muat() {
      var tgl = document.getElementById('lbl-tgl').value;
      var box = document.getElementById('lbl-daftar');
      var r = await App.db.from('limbah_harian').select('*').eq('tanggal', tgl).order('id', { ascending: false }).limit(50);
      if (r.error) { box.innerHTML = '<div class="info waspada">Gagal memuat.</div>'; return; }
      var m = await App.db.from('master_limbah').select('*');
      (m.data || []).forEach(function (x) { master[x.kode] = x; });
      var g = await App.db.from('ruangan').select('id, nama');
      (g.data || []).forEach(function (x) { ruang[x.id] = x.nama; });
      data = {};
      if (!r.data.length) { box.innerHTML = '<p class="muted">Tidak ada catatan pada tanggal ini.</p>'; return; }
      box.innerHTML = r.data.map(function (x) {
        data[x.id] = x;
        var rn = ruang[x.ruangan_id] || x.ruangan || '';
        return '<div class="baris"><b>' + esc(x.kode_limbah) + '</b> · ' + esc(fmtBerat(x.berat_kg)) + ' · ' + esc(rn) +
          '<br><button type="button" data-id="' + esc(x.id) + '" style="width:auto;padding:8px 16px">Label</button></div>';
      }).join('');
    }
    document.getElementById('lbl-tgl').addEventListener('change', muat);
    document.getElementById('lbl-daftar').addEventListener('click', function (e) {
      var b = e.target.closest('button[data-id]');
      if (!b) return;
      var x = data[b.dataset.id];
      if (x) buka(x, master[x.kode_limbah], ruang[x.ruangan_id] || x.ruangan || '');
    });
    muat();
  };
})();
