(function () {
  var TULIS = ['admin_fasyankes', 'petugas_kesling', 'petugas_ruangan'];
  var UMUM = 'Telusuri penyebab, lakukan perbaikan, lalu ukur atau uji ulang sampai memenuhi baku mutu.';

  function bisaTulis() { return TULIS.indexOf(App.profil.peran) > -1; }

  async function petaSaran(kategori) {
    var r = await App.db.from('master_tindaklanjut').select('*').eq('kategori', kategori).eq('aktif', true);
    var p = {};
    (r.data || []).forEach(function (x) { p[x.parameter] = x; });
    return p;
  }

  async function catat(daftar) {
    if (!daftar || !daftar.length) return null;
    var r = await App.db.from('temuan').insert(daftar);
    return r.error || null;
  }

  function kotakSaran(s) {
    if (!s) return '<div class="info">Saran: ' + esc(UMUM) + '</div>';
    return '<div class="info">Saran: ' + esc(s.saran) + (s.perlu_verifikasi ? ' <b>(perlu verifikasi)</b>' : '') +
      '<br><span class="muted">Dasar: ' + esc(s.dasar_aturan || '-') + '</span></div>';
  }

  async function panel(box, kategori) {
    if (!box) return;
    box.innerHTML = '<p class="muted">Memuat temuan...</p>';
    var t = await App.db.from('temuan').select('*').eq('kategori', kategori).eq('status', 'terbuka')
      .order('tanggal', { ascending: false }).order('dibuat', { ascending: false }).limit(50);
    if (t.error) { box.innerHTML = '<div class="info waspada">Gagal memuat temuan.</div>'; return; }
    var s = await App.db.from('temuan').select('*').eq('kategori', kategori).eq('status', 'selesai')
      .order('tanggal_selesai', { ascending: false }).limit(10);
    var peta = await petaSaran(kategori);
    var tulis = bisaTulis();

    var html = '<h3>Temuan belum ditindaklanjuti (' + t.data.length + ')</h3>';
    html += t.data.length ? t.data.map(function (x) {
      return '<div class="baris"><b>' + esc(x.parameter) + '</b>: ' + esc(x.hasil || '') +
        ' <span class="lewat">✗ ' + esc(x.uraian || 'tidak memenuhi baku mutu') + '</span>' +
        '<br><span class="muted">' + esc(x.tanggal) + (x.lokasi ? ' · ' + esc(x.lokasi) : '') + '</span>' +
        kotakSaran(peta[x.parameter]) +
        (tulis ? '<input id="tl-t-' + x.id + '" placeholder="Tindakan yang sudah dilakukan"><button type="button" data-selesai="' + x.id + '">Tandai selesai</button>' : '') +
        '</div>';
    }).join('') : '<p class="muted">Tidak ada temuan terbuka.</p>';

    if (s.data && s.data.length) {
      html += '<details><summary style="font-weight:700;margin:14px 0 4px;cursor:pointer">Sudah ditindaklanjuti (' + s.data.length + ' terakhir)</summary>' +
        s.data.map(function (x) {
          return '<div class="baris"><b>' + esc(x.parameter) + '</b>: ' + esc(x.hasil || '') +
            '<br><span class="muted">Temuan ' + esc(x.tanggal) + ' · selesai ' + esc(x.tanggal_selesai || '-') + '</span>' +
            '<br><span class="muted">Tindakan: ' + esc(x.tindakan || '-') + '</span></div>';
        }).join('') + '</details>';
    }
    html += '<div class="pesan" id="tl-pesan"></div>';
    box.innerHTML = html;

    box.onclick = async function (e) {
      var id = e.target.getAttribute ? e.target.getAttribute('data-selesai') : null;
      if (!id) return;
      var tin = document.getElementById('tl-t-' + id).value.trim();
      var pesan = document.getElementById('tl-pesan');
      if (!tin) { pesan.textContent = 'Isi dulu tindakan yang sudah dilakukan.'; return; }
      var u = await App.db.from('temuan').update({ status: 'selesai', tindakan: tin, tanggal_selesai: tglLokal(new Date()) }).eq('id', id);
      if (u.error) { pesan.textContent = 'Gagal menyimpan: ' + (u.error.message || 'coba lagi'); return; }
      await panel(box, kategori);
    };
  }

  window.TL = { catat: catat, panel: panel, petaSaran: petaSaran, kotakSaran: kotakSaran };
})();
