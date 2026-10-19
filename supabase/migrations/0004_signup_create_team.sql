-- 가입 시 팀을 목록에서 고르거나, 없으면 새 팀 이름을 직접 입력해 만들 수 있게 한다.
-- 비로그인(anon) 상태에서 teams에 직접 insert 하지 않고, 가입 트리거(SECURITY DEFINER)가 대신 처리한다.
-- 가입 metadata: team_id(기존 팀 선택) 또는 team_name(새 팀 이름). team_id가 있으면 그것을 우선한다.
alter table public.teams
  add constraint teams_name_length check (char_length(btrim(name)) between 1 and 30);
-- 대소문자·앞뒤 공백만 다른 중복 팀 방지
create unique index teams_name_lower_key on public.teams (lower(btrim(name)));

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_team_id smallint;
  v_team_name text := nullif(btrim(new.raw_user_meta_data ->> 'team_name'), '');
begin
  if nullif(new.raw_user_meta_data ->> 'team_id', '') is not null then
    v_team_id := (new.raw_user_meta_data ->> 'team_id')::smallint;
  elsif v_team_name is not null then
    insert into public.teams (name) values (v_team_name)
    on conflict (lower(btrim(name))) do nothing;
    select t.id into v_team_id from public.teams t
    where lower(btrim(t.name)) = lower(v_team_name);
  end if;

  insert into public.profiles (id, nickname, team_id)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'nickname'), ''), split_part(new.email, '@', 1)),
    v_team_id
  );
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;
