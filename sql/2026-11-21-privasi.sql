alter table public.profil add column if not exists setuju_privasi timestamptz;
alter table public.profil add column if not exists versi_privasi text;
create or replace function public.setujui_privasi(p_versi text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Belum masuk.'; end if;
  update public.profil set setuju_privasi = now(), versi_privasi = p_versi where id = auth.uid();
end $$;
revoke all on function public.setujui_privasi(text) from public, anon;
grant execute on function public.setujui_privasi(text) to authenticated;
select count(*) filter (where versi_privasi is null) as belum_setuju from public.profil;
