-- ===== 1. PENGAWASAN FASYANKES =====
alter table public.pengawasan add column if not exists dihapus timestamptz;
alter table public.pengawasan add column if not exists dihapus_oleh uuid;
do $$
declare c record;
begin
  -- lepas batasan status lama supaya nilai 'terbuka' / 'selesai' diterima
  for c in select conname from pg_constraint
           where conrelid = 'public.pengawasan'::regclass and contype = 'c' and pg_get_constraintdef(oid) ilike '%status%' loop
    execute format('alter table public.pengawasan drop constraint %I', c.conname);
  end loop;
end $$;
update public.pengawasan set status = case when lower(coalesce(status,'')) in ('selesai','done','tuntas') then 'selesai' else 'terbuka' end
  where status is null or status not in ('terbuka','selesai');
alter table public.pengawasan alter column status set default 'terbuka';
alter table public.pengawasan add constraint pengawasan_status_cek check (status in ('terbuka','selesai'));
drop trigger if exists zz_riwayat on public.pengawasan;
create trigger zz_riwayat after update or delete on public.pengawasan for each row execute function private.catat_riwayat();
drop trigger if exists zz_temuan on public.pengawasan;
create trigger zz_temuan after update on public.pengawasan for each row execute function private.sinkron_temuan();

insert into master_tindaklanjut (kategori, parameter, saran, dasar_aturan, perlu_verifikasi) values
('rs','Penatalaksanaan linen','Pisahkan linen kotor infeksius dan non-infeksius sejak di ruangan, masukkan ke kantong tertutup, angkut dengan troli tertutup terpisah dari linen bersih, dan pastikan petugas laundry memakai APD.','Permenkes 27/2017 (PPI)',false),
('rs','Dekontaminasi / desinfeksi ruangan','Bersihkan permukaan dari area bersih ke kotor dengan desinfektan sesuai petunjuk pabrik; tumpahan darah atau cairan tubuh ditangani dengan spill kit lebih dulu.','Permenkes 27/2017 (PPI)',false),
('rs','Kawasan tanpa rokok','Pasang tanda dilarang merokok di pintu masuk dan area umum, tegur pelanggar, singkirkan asbak, dan laporkan pelanggaran berulang ke pimpinan.','Permenkes 6/2026 Pasal 36 ayat (1) huruf t',false),
('rs','Pengaduan masyarakat','Catat pengaduan, periksa lokasi, tindak lanjuti, dan sampaikan hasilnya kepada pengadu.','Kebijakan internal fasyankes',true),
('rs','Kebersihan lingkungan','Tetapkan jadwal pembersihan dan pengawasan area tersebut, lalu periksa ulang.','Permenkes 2/2023',true),
('rs','Lainnya','Tetapkan penanggung jawab dan batas waktu perbaikan, lalu periksa ulang.','-',true)
on conflict (kategori, parameter) do nothing;

-- ===== 2. KELOLA PENGGUNA =====
create or replace function public.daftar_fasyankes()
returns table (id uuid, nama text, jenis text)
language plpgsql stable security definer set search_path = '' as $$
begin
  if private.peran_saya()::text <> 'admin_papkenz' then raise exception 'Hanya admin Papkenz.'; end if;
  return query select f.id, f.nama::text, f.jenis::text from public.fasyankes f order by f.nama;
end $$;

create or replace function public.buat_fasyankes(p_nama text, p_jenis text, p_kab text, p_prov text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  if private.peran_saya()::text <> 'admin_papkenz' then raise exception 'Hanya admin Papkenz.'; end if;
  if coalesce(trim(p_nama), '') = '' then raise exception 'Nama fasyankes wajib diisi.'; end if;
  insert into public.fasyankes (nama, jenis, kabupaten_kota, provinsi) values (trim(p_nama), p_jenis, p_kab, p_prov) returning id into v;
  return v;
end $$;

create or replace function public.daftar_pengguna(p_fasyankes uuid default null)
returns table (id uuid, nama text, peran text, aktif boolean, nip_nik text, email text)
language plpgsql stable security definer set search_path = '' as $$
declare f uuid; r text := private.peran_saya()::text;
begin
  if r = 'admin_papkenz' then f := p_fasyankes;
  elsif r = 'admin_fasyankes' then f := private.fasyankes_saya();
  else raise exception 'Hanya admin.'; end if;
  return query select p.id, p.nama::text, p.peran::text, coalesce(p.aktif, true), p.nip_nik::text, u.email::text
    from public.profil p left join auth.users u on u.id = p.id
    where p.fasyankes_id = f order by p.nama;
end $$;

create or replace function public.tambah_pengguna(p_user uuid, p_nama text, p_peran text, p_nip text, p_fasyankes uuid default null)
returns void language plpgsql security definer set search_path = '' as $$
declare r text := private.peran_saya()::text; f uuid; lama uuid; ada boolean;
begin
  if r = 'admin_papkenz' then f := p_fasyankes;
  elsif r = 'admin_fasyankes' then f := private.fasyankes_saya();
  else raise exception 'Hanya admin.'; end if;
  if f is null then raise exception 'Fasyankes belum dipilih.'; end if;
  if p_peran not in ('admin_fasyankes','petugas_kesling','petugas_ruangan','pimpinan') then raise exception 'Peran tidak valid.'; end if;
  if coalesce(trim(p_nama), '') = '' then raise exception 'Nama wajib diisi.'; end if;
  -- hanya akun yang baru saja dibuat (cegah mengambil akun orang lain)
  if not exists (select 1 from auth.users u where u.id = p_user and u.created_at > now() - interval '30 minutes') then
    raise exception 'Akun tidak ditemukan atau sudah lama dibuat.';
  end if;
  select true, p.fasyankes_id into ada, lama from public.profil p where p.id = p_user;
  if ada and lama is not null then raise exception 'Akun ini sudah terdaftar di fasyankes.'; end if;
  if ada then
    execute format('update public.profil set fasyankes_id = $1, nama = $2, peran = %L, nip_nik = $3, aktif = true where id = $4', p_peran)
      using f, trim(p_nama), p_nip, p_user;
  else
    execute format('insert into public.profil (id, fasyankes_id, nama, peran, nip_nik, aktif) values ($1, $2, $3, %L, $4, true)', p_peran)
      using p_user, f, trim(p_nama), p_nip;
  end if;
end $$;

create or replace function public.ubah_pengguna(p_id uuid, p_nama text, p_nip text, p_peran text, p_aktif boolean)
returns void language plpgsql security definer set search_path = '' as $$
declare r text := private.peran_saya()::text; f uuid; tf uuid; tp text;
begin
  select p.fasyankes_id, p.peran::text into tf, tp from public.profil p where p.id = p_id;
  if tf is null then raise exception 'Pengguna tidak ditemukan.'; end if;
  if r = 'admin_fasyankes' then
    if tf <> private.fasyankes_saya() then raise exception 'Bukan pengguna fasyankes Anda.'; end if;
  elsif r <> 'admin_papkenz' then raise exception 'Hanya admin.'; end if;
  if p_peran not in ('admin_fasyankes','petugas_kesling','petugas_ruangan','pimpinan') then raise exception 'Peran tidak valid.'; end if;
  if coalesce(trim(p_nama), '') = '' then raise exception 'Nama wajib diisi.'; end if;
  if p_id = auth.uid() and (p_peran <> tp or p_aktif is not true) then
    raise exception 'Peran dan status akun sendiri tidak bisa diubah.';
  end if;
  execute format('update public.profil set nama = $1, nip_nik = $2, peran = %L, aktif = $3 where id = $4', p_peran)
    using trim(p_nama), p_nip, p_aktif, p_id;
  -- akun nonaktif tidak bisa masuk lagi; diaktifkan kembali = bisa masuk
  update auth.users set banned_until = case when p_aktif then null else 'infinity'::timestamptz end where id = p_id;
end $$;

create or replace function public.ubah_nama_saya(p_nama text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if coalesce(trim(p_nama), '') = '' then raise exception 'Nama wajib diisi.'; end if;
  update public.profil set nama = trim(p_nama) where id = auth.uid();
end $$;

create or replace function public.ubah_fasyankes_saya(p_kode text, p_alamat text, p_kab text, p_prov text, p_pimpinan text, p_nip_pimpinan text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if private.peran_saya()::text <> 'admin_fasyankes' then raise exception 'Hanya admin fasyankes.'; end if;
  update public.fasyankes set kode_registrasi = p_kode, alamat = p_alamat, kabupaten_kota = p_kab, provinsi = p_prov,
    nama_pimpinan = p_pimpinan, nip_nik_pimpinan = p_nip_pimpinan
  where id = private.fasyankes_saya();
end $$;

do $$
declare f text;
begin
  foreach f in array array['daftar_fasyankes()','buat_fasyankes(text,text,text,text)','daftar_pengguna(uuid)',
    'tambah_pengguna(uuid,text,text,text,uuid)','ubah_pengguna(uuid,text,text,text,boolean)','ubah_nama_saya(text)',
    'ubah_fasyankes_saya(text,text,text,text,text,text)'] loop
    execute format('revoke all on function public.%s from public, anon', f);
    execute format('grant execute on function public.%s to authenticated', f);
  end loop;
end $$;

-- cek: harus muncul 7 fungsi dan 6 saran pengawasan
select count(*) as fungsi from pg_proc where proname in ('daftar_fasyankes','buat_fasyankes','daftar_pengguna','tambah_pengguna','ubah_pengguna','ubah_nama_saya','ubah_fasyankes_saya');
select count(*) as saran_rs from master_tindaklanjut where kategori = 'rs';
