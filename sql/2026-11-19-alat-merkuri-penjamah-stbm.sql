alter table penjamah add column if not exists tgl_periksa_kesehatan date;
do $$
declare t text;
begin
  foreach t in array array['sanitarian_kit','alkes_merkuri','penjamah','stbm_kk'] loop
    execute format('alter table public.%I add column if not exists dihapus timestamptz', t);
    execute format('alter table public.%I add column if not exists dihapus_oleh uuid', t);
    execute format('drop trigger if exists zz_riwayat on public.%I', t);
    execute format('create trigger zz_riwayat after update or delete on public.%I for each row execute function private.catat_riwayat()', t);
  end loop;
end $$;
drop trigger if exists zz_temuan on alkes_merkuri;
create trigger zz_temuan after update on alkes_merkuri for each row execute function private.sinkron_temuan();

insert into master_tindaklanjut (kategori, parameter, saran, dasar_aturan, perlu_verifikasi) values
('merkuri','Alkes bermerkuri masih digunakan','Hentikan penggunaan dan ganti dengan alat tidak bermerkuri. Inventarisasi, lalu simpan sementara alat yang sudah diganti dalam wadah atau ruang khusus yang tertutup, aman dari kerusakan dan kebocoran, dan hanya dapat diakses petugas yang ditetapkan. Laporkan ke dinas kesehatan untuk penarikan.','Permenkes 41/2019 Pasal 3, 4, 5, 7',false),
('merkuri','Alkes bermerkuri pecah / tumpah','Jangan disapu atau divakum. Kumpulkan merkuri dan pecahan ke wadah tertutup, simpan di tempat penyimpanan sementara limbah B3, terpisah dari limbah B3 lain, dan jangan diolah dengan insinerator. Kelola selanjutnya sebagai limbah B3.','Permenkes 41/2019 Pasal 6',false)
on conflict (kategori, parameter) do nothing;

select table_name, count(*) from information_schema.columns
where table_name in ('sanitarian_kit','alkes_merkuri','penjamah','stbm_kk') and column_name = 'dihapus'
group by table_name order by 1;
