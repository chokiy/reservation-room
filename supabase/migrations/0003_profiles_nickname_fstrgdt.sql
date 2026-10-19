-- profiles 컬럼을 id / nickname / fstrgdt(최초 등록 일시) + team_id 로 정리한다.
-- 비밀번호(pw)는 Supabase Auth(auth.users)가 해시로 저장하므로 profiles에는 두지 않는다.
alter table public.profiles rename column name to nickname;
alter table public.profiles rename column created_at to fstrgdt;

comment on column public.profiles.nickname is '표시 이름(닉네임)';
comment on column public.profiles.fstrgdt is '최초 등록 일시';

-- 가입 폼 metadata 키를 name → nickname 으로 변경
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, nickname, team_id)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nickname'), ''), split_part(new.email, '@', 1)),
    (new.raw_user_meta_data ->> 'team_id')::smallint
  );
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
