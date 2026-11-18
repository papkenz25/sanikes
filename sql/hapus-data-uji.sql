-- HAPUS DATA UJI KLINIK CONTOH
-- Jalankan BAGIAN A dulu (aman, hanya menghitung). BAGIAN B menghapus permanen,
-- jalankan hanya bila sudah yakin. Data pengaturan (ruangan, TPS, vendor, nama barang,
-- titik, pengaturan) dan akun pengguna TIDAK ikut dihapus.

-- ===== BAGIAN A: lihat jumlah data yang akan dihapus =====
do $$
declare
  f uuid := (select id from public.fasyankes where nama ilike '%contoh%' limit 1);
  t text; n bigint;
  simpan text[] := array['fasyankes','profil','ruangan','tps','vendor','limbah_item','titik','pengaturan'];
begin
  if f is null then raise notice 'Fasyankes "Contoh" tidak ditemukan.'; return; end if;
  raise notice 'Fasyankes: % (%)', (select nama from public.fasyankes where id = f), f;
  for t in select c.table_name from information_schema.columns c join information_schema.tables x
             on x.table_schema = c.table_schema and x.table_name = c.table_name and x.table_type = 'BASE TABLE'
           where c.table_schema = 'public' and c.column_name = 'fasyankes_id' and c.table_name <> all (simpan) order by 1 loop
    execute format('select count(*) from public.%I where fasyankes_id = $1', t) into n using f;
    if n > 0 then raise notice '% : % baris', t, n; end if;
  end loop;
end $$;
-- Hasilnya ada di tab "Messages" / "Notices" (bukan tab Results).


-- ===== BAGIAN B: HAPUS PERMANEN (hapus tanda -- di awal tiap baris untuk menjalankan) =====
-- begin;
-- do $$
-- declare
--   f uuid := (select id from public.fasyankes where nama ilike '%contoh%' limit 1);
--   t text; daftar text[]; sisa text[]; putaran int := 0;
--   simpan text[] := array['fasyankes','profil','ruangan','tps','vendor','limbah_item','titik','pengaturan'];
-- begin
--   if f is null then raise exception 'Fasyankes "Contoh" tidak ditemukan.'; end if;
--   select array_agg(c.table_name::text) into daftar from information_schema.columns c join information_schema.tables x
--     on x.table_schema = c.table_schema and x.table_name = c.table_name and x.table_type = 'BASE TABLE'
--   where c.table_schema = 'public' and c.column_name = 'fasyankes_id' and c.table_name <> all (simpan) and c.table_name <> 'riwayat';
--   foreach t in array daftar loop execute format('alter table public.%I disable trigger user', t); end loop;
--   while array_length(daftar, 1) > 0 and putaran < 10 loop
--     sisa := '{}'; putaran := putaran + 1;
--     foreach t in array daftar loop
--       begin
--         execute format('delete from public.%I where fasyankes_id = $1', t) using f;
--       exception when foreign_key_violation then sisa := sisa || t;
--       end;
--     end loop;
--     daftar := sisa;
--   end loop;
--   if array_length(daftar, 1) > 0 then raise exception 'Masih terkunci: %', daftar; end if;
--   delete from public.riwayat where fasyankes_id = f;
--   select array_agg(c.table_name::text) into daftar from information_schema.columns c join information_schema.tables x
--     on x.table_schema = c.table_schema and x.table_name = c.table_name and x.table_type = 'BASE TABLE'
--   where c.table_schema = 'public' and c.column_name = 'fasyankes_id' and c.table_name <> all (simpan) and c.table_name <> 'riwayat';
--   foreach t in array daftar loop execute format('alter table public.%I enable trigger user', t); end loop;
-- end $$;
-- commit;
