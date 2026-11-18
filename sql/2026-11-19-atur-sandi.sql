create or replace function public.atur_sandi_pengguna(p_id uuid, p_sandi text)
returns void language plpgsql security definer set search_path = '' as $$
declare r text := private.peran_saya()::text; tf uuid;
begin
  if p_id = auth.uid() then raise exception 'Untuk akun sendiri, gunakan menu Akun.'; end if;
  if length(coalesce(p_sandi, '')) < 8 then raise exception 'Kata sandi minimal 8 karakter.'; end if;
  select p.fasyankes_id into tf from public.profil p where p.id = p_id;
  if tf is null then raise exception 'Pengguna tidak ditemukan.'; end if;
  if r = 'admin_fasyankes' then
    if tf <> private.fasyankes_saya() then raise exception 'Bukan pengguna fasyankes Anda.'; end if;
  elsif r <> 'admin_papkenz' then raise exception 'Hanya admin.'; end if;
  update auth.users set encrypted_password = extensions.crypt(p_sandi, extensions.gen_salt('bf')), updated_at = now()
  where id = p_id;
end $$;
revoke all on function public.atur_sandi_pengguna(uuid, text) from public, anon;
grant execute on function public.atur_sandi_pengguna(uuid, text) to authenticated;
select count(*) as fungsi from pg_proc where proname = 'atur_sandi_pengguna';
