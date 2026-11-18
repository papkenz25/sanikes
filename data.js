(function () {
  var SUHU = [['ruang', 'Suhu ruang'], ['pendingin', 'Pendingin (0-5 C)'], ['beku', 'Beku (0 C atau kurang)']];
  var PERAN = [['pengangkut', 'Pengangkut'], ['pengumpul', 'Pengumpul'], ['pengolah', 'Pengolah'], ['pemanfaat', 'Pemanfaat']];
  var ZONA = [['Rendah', 'Rendah'], ['Sedang', 'Sedang'], ['Tinggi', 'Tinggi'], ['Sangat tinggi', 'Sangat tinggi']];

  var JENIS = {
    ruangan: { tabel: 'ruangan', judul: 'Ruangan', urut: 'nama', kolom: [
      { k: 'nama', l: 'Nama ruangan', t: 'text', w: true },
      { k: 'jenis', l: 'Jenis (opsional)', t: 'text' },
      { k: 'zona_risiko', l: 'Zona risiko (opsional)', t: 'select', o: ZONA },
      { k: 'kategori_udara', l: 'Kategori ruang untuk baku mutu udara (opsional)', t: 'select', o: [['operasi','Ruang operasi'],['bersalin','Ruang bersalin'],['perawatan','Ruang perawatan / pemulihan'],['bayi','Perawatan bayi baru lahir'],['icu','ICU'],['jenazah','Jenazah / autopsi'],['penginderaan','Penginderaan medis'],['lab','Laboratorium'],['radiologi','Radiologi'],['sterilisasi','Sterilisasi'],['dapur','Dapur'],['igd','Gawat darurat'],['administrasi','Administrasi / kantor'],['luka_bakar','Ruang luka bakar'],['umum','Ruang umum lainnya']] }
    ] },
    tps: { tabel: 'tps', judul: 'TPS', urut: 'nama', kolom: [
      { k: 'nama', l: 'Nama TPS', t: 'text', w: true },
      { k: 'suhu', l: 'Suhu penyimpanan', t: 'select', o: SUHU, w: true },
      { k: 'no_izin_rintek', l: 'No. izin / rintek TPS (opsional)', t: 'text' },
      { k: 'koordinat', l: 'Koordinat (opsional)', t: 'text' }
    ] },
    vendor: { tabel: 'vendor', judul: 'Vendor', urut: 'nama', kolom: [
      { k: 'nama', l: 'Nama vendor', t: 'text', w: true },
      { k: 'peran', l: 'Peran', t: 'select', o: PERAN, w: true },
      { k: 'no_izin', l: 'No. izin (opsional)', t: 'text' },
      { k: 'izin_berakhir', l: 'Izin berakhir (opsional)', t: 'date' },
      { k: 'no_mou', l: 'No. MoU (opsional)', t: 'text' },
      { k: 'mou_berakhir', l: 'MoU berakhir (opsional)', t: 'date' },
      { k: 'kontak', l: 'Kontak (opsional)', t: 'text' }
    ] },
    item: { tabel: 'limbah_item', judul: 'Nama barang', urut: 'nama_item', kolom: [
      { k: 'kode_limbah', l: 'Kode limbah', t: 'select', o: 'kode', w: true },
      { k: 'nama_item', l: 'Nama barang', t: 'text', w: true }
    ] }
  };

  var kini = 'ruangan', sunting = null, kodeOpsi = [], bisaUbah = false, elRoot = null, baris = {};

  function opsiHtml(o) {
    var arr = o === 'kode' ? kodeOpsi : o;
    return arr.map(function (x) { return '<option value="' + esc(x[0]) + '">' + esc(x[1]) + '</option>'; }).join('');
  }

  function statusTgl(d, label) {
    if (!d) return '';
    var sisa = Math.ceil((new Date(d + 'T00:00:00') - new Date(tglLokal(new Date()) + 'T00:00:00')) / 86400000);
    var st = sisa < 0 ? '<span class="lewat">sudah lewat</span>' : (sisa <= 30 ? '<span class="lewat">' + sisa + ' hari lagi</span>' : '');
    return '<br>' + label + ': ' + esc(d) + ' ' + st;
  }

  function ringkas(key, r) {
    if (key === 'ruangan') return '<b>' + esc(r.nama) + '</b>' + (r.jenis ? ' · ' + esc(r.jenis) : '') +
      (r.zona_risiko ? '<br><span class="muted">Zona risiko: ' + esc(r.zona_risiko) + '</span>' : '');
    if (key === 'tps') {
      var s = SUHU.filter(function (x) { return x[0] === r.suhu; })[0];
      return '<b>' + esc(r.nama) + '</b> · ' + esc(s ? s[1] : '-') + (r.no_izin_rintek ? '<br>Izin: ' + esc(r.no_izin_rintek) : '');
    }
    if (key === 'vendor') {
      return '<b>' + esc(r.nama) + '</b> · ' + esc(r.peran || '-') + (r.kontak ? '<br>Kontak: ' + esc(r.kontak) : '') +
        statusTgl(r.izin_berakhir, 'Izin berakhir') + statusTgl(r.mou_berakhir, 'MoU berakhir');
    }
    return '<b>' + esc(r.kode_limbah) + '</b> · ' + esc(r.nama_item);
  }

  function formHtml(j) {
    var h = '<form id="d-form" class="baris"><b>' + (sunting ? 'Ubah ' : 'Tambah ') + esc(j.judul) + '</b>';
    j.kolom.forEach(function (c) {
      h += '<label>' + esc(c.l) + '</label>';
      if (c.t === 'select') {
        h += '<select id="d-' + c.k + '">' + (c.w ? '' : '<option value="">-</option>') + opsiHtml(c.o) + '</select>';
      } else {
        h += '<input id="d-' + c.k + '" type="' + c.t + '"' + (c.w ? ' required' : '') + '>';
      }
    });
    h += '<button type="submit" id="d-simpan">Simpan</button>';
    if (sunting) h += '<button type="button" id="d-batal" class="chip" style="width:100%;margin-top:10px">Batal ubah</button>';
    return h + '<div class="pesan" id="d-pesan"></div></form>';
  }

  async function muatDaftar() {
    var j = JENIS[kini];
    var r = await App.db.from(j.tabel).select('*').order('aktif', { ascending: false }).order(j.urut);
    var box = $('d-daftar');
    if (!box) return;
    if (r.error) { box.innerHTML = '<p class="muted">Gagal memuat data.</p>'; return; }
    if (!r.data.length) { box.innerHTML = '<p class="muted">Belum ada data.</p>'; return; }
    baris = {};
    box.innerHTML = r.data.map(function (x) {
      baris[x.id] = x;
      var aksi = bisaUbah
        ? '<div class="aksi"><button type="button" class="chip" data-aksi="ubah" data-id="' + x.id + '">Ubah</button>' +
          '<button type="button" class="chip" data-aksi="toggle" data-id="' + x.id + '">' + (x.aktif ? 'Nonaktifkan' : 'Aktifkan') + '</button></div>'
        : '';
      return '<div class="baris' + (x.aktif ? '' : ' nonaktif') + '">' + ringkas(kini, x) + (x.aktif ? '' : ' <i>(nonaktif)</i>') + aksi + '</div>';
    }).join('');
    box.onclick = async function (e) {
      var b = e.target.closest('button');
      if (!b) return;
      var row = baris[b.dataset.id];
      if (!row) return;
      if (b.dataset.aksi === 'ubah') { sunting = row; render(); window.scrollTo(0, 0); }
      if (b.dataset.aksi === 'toggle') {
        b.disabled = true;
        await App.db.from(j.tabel).update({ aktif: !row.aktif }).eq('id', row.id);
        muatDaftar();
      }
    };
  }

  async function render() {
    var chips = Object.keys(JENIS).map(function (k) {
      return '<button type="button" class="chip' + (k === kini ? ' aktif' : '') + '" data-j="' + k + '">' + esc(JENIS[k].judul) + '</button>';
    }).join('') + '<button type="button" class="chip' + (kini === 'pengaturan' ? ' aktif' : '') + '" data-j="pengaturan">Pengaturan</button>';
    var html = '<h3 style="margin-top:0">Data fasyankes</h3><div class="chips" id="d-menu">' + chips + '</div>';

    if (kini === 'pengaturan') {
      elRoot.innerHTML = html + '<div id="d-pengaturan"><p class="muted">Memuat...</p></div>';
      pasangMenu();
      if (window.PENGATURAN && PENGATURAN.tampil) await PENGATURAN.tampil($('d-pengaturan'));
      else $('d-pengaturan').innerHTML = '<div class="info waspada">File pengaturan.js belum termuat.</div>';
      return;
    }

    var j = JENIS[kini];
    if (bisaUbah) html += formHtml(j);
    else html += '<div class="info">Peran Anda hanya bisa melihat data.</div>';
    html += '<h3>Daftar ' + esc(j.judul) + '</h3><div id="d-daftar"><p class="muted">Memuat...</p></div>';
    elRoot.innerHTML = html;
    pasangMenu();

    if (bisaUbah) {
      if (sunting) {
        j.kolom.forEach(function (c) { $('d-' + c.k).value = sunting[c.k] == null ? '' : sunting[c.k]; });
        $('d-batal').addEventListener('click', function () { sunting = null; render(); });
      }
      $('d-form').addEventListener('submit', async function (e) {
        e.preventDefault();
        var pesan = $('d-pesan');
        pesan.style.color = '';
        pesan.textContent = '';
        var data = {};
        for (var i = 0; i < j.kolom.length; i++) {
          var c = j.kolom[i];
          var v = $('d-' + c.k).value.trim();
          if (c.w && v === '') { pesan.textContent = c.l + ' wajib diisi.'; return; }
          data[c.k] = v === '' ? null : v;
        }
        $('d-simpan').disabled = true;
        var res = sunting
          ? await App.db.from(j.tabel).update(data).eq('id', sunting.id)
          : await App.db.from(j.tabel).insert(data);
        $('d-simpan').disabled = false;
        if (res.error) { pesan.textContent = 'Gagal menyimpan: ' + res.error.message; return; }
        sunting = null;
        await render();
        $('d-pesan').style.color = '#0F6E5C';
        $('d-pesan').textContent = 'Tersimpan.';
      });
    }
    await muatDaftar();
  }

  function pasangMenu() {
    $('d-menu').onclick = function (e) {
      var c = e.target.closest('.chip');
      if (c) { kini = c.dataset.j; sunting = null; render(); }
    };
  }

  App.tabs.data = async function (el) {
    elRoot = el;
    var peran = App.profil.peran;
    if (peran === 'admin_papkenz') {
      el.innerHTML = '<div class="info">Data ini milik masing-masing fasyankes. Gunakan akun fasyankes.</div>';
      return;
    }
    bisaUbah = ['admin_fasyankes', 'petugas_kesling'].indexOf(peran) >= 0;
    sunting = null;
    if (window.DATA_SUB) { kini = window.DATA_SUB; window.DATA_SUB = null; }
    var m = await App.db.from('master_limbah').select('kode, nama').eq('aktif', true).order('kode');
    var seen = {};
    kodeOpsi = [];
    (m.data || []).forEach(function (x) {
      if (!seen[x.kode]) { seen[x.kode] = 1; kodeOpsi.push([x.kode, x.kode + ' - ' + x.nama]); }
    });
    render();
  };
})();
