-- M1: 회의실 예약 앱 초기 스키마
-- 슬롯: 0~17 = 08:00~16:30 시작하는 30분 칸. end_slot은 배타적(1~18, 18 = 17:00).

create extension if not exists btree_gist;

-- 권한 판정·트리거용 함수는 API로 노출되지 않는 private 스키마에 둔다.
create schema if not exists private;
grant usage on schema private to authenticated;

-- ───────────── 테이블 ─────────────

create table public.teams (
  id smallint generated always as identity primary key,
  name text not null unique
);

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 50),
  team_id smallint not null references public.teams (id),
  created_at timestamptz not null default now()
);
create index profiles_team_id_idx on public.profiles (team_id);

create table public.rooms (
  id smallint primary key,
  name text not null unique
);

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  room_id smallint not null references public.rooms (id),
  date date not null,
  start_slot smallint not null,
  end_slot smallint not null,
  title text not null check (char_length(btrim(title)) between 1 and 100),
  created_by uuid not null default auth.uid() references public.profiles (id),
  team_id smallint not null references public.teams (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_slot_range
    check (start_slot >= 0 and end_slot <= 18 and start_slot < end_slot),
  -- 같은 방·같은 날짜에서 시간이 겹치는 예약을 DB 수준에서 차단 (동시 요청 포함)
  constraint reservations_no_overlap
    exclude using gist (
      room_id with =,
      date with =,
      int4range(start_slot::int, end_slot::int) with &&
    )
);
create index reservations_date_idx on public.reservations (date);
create index reservations_created_by_idx on public.reservations (created_by);
create index reservations_team_id_idx on public.reservations (team_id);

create table public.reservation_attendees (
  reservation_id uuid not null references public.reservations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  primary key (reservation_id, user_id)
);
create index reservation_attendees_user_id_idx on public.reservation_attendees (user_id);

-- ───────────── 함수·트리거 ─────────────

-- 예약을 수정·취소할 수 있는가: 예약자 또는 참석자 (팀은 권한과 무관)
-- RLS 정책 간 순환 참조를 피하려고 SECURITY DEFINER로 두되, private 스키마에 두고 auth.uid()로 판정한다.
create function private.can_edit_reservation(rid uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select auth.uid() is not null and (
    exists (
      select 1 from public.reservations r
      where r.id = rid and r.created_by = auth.uid()
    )
    or exists (
      select 1 from public.reservation_attendees a
      where a.reservation_id = rid and a.user_id = auth.uid()
    )
  );
$$;
revoke all on function private.can_edit_reservation(uuid) from public, anon;
grant execute on function private.can_edit_reservation(uuid) to authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger reservations_set_updated_at
  before update on public.reservations
  for each row execute function private.set_updated_at();

-- 가입 시 profiles 자동 생성 (이름·팀은 가입 폼의 metadata에서 가져온다. 권한 판정에는 쓰지 않는다.)
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, name, team_id)
  values (
    new.id,
    coalesce(nullif(btrim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)),
    (new.raw_user_meta_data ->> 'team_id')::smallint
  );
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- ───────────── RLS ─────────────

alter table public.teams enable row level security;
alter table public.profiles enable row level security;
alter table public.rooms enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_attendees enable row level security;

-- teams: 가입 화면(비로그인)에서도 목록이 필요하다
create policy teams_select on public.teams
  for select to anon, authenticated using (true);

create policy rooms_select on public.rooms
  for select to authenticated using (true);

-- profiles: 참석자 검색·이름 표시를 위해 로그인 사용자 전체 조회, 수정은 본인만
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- reservations
create policy reservations_select on public.reservations
  for select to authenticated using (true);
create policy reservations_insert on public.reservations
  for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and team_id = (select p.team_id from public.profiles p where p.id = (select auth.uid()))
  );
create policy reservations_update on public.reservations
  for update to authenticated
  using ((select private.can_edit_reservation(id)))
  with check ((select private.can_edit_reservation(id)));
create policy reservations_delete on public.reservations
  for delete to authenticated
  using ((select private.can_edit_reservation(id)));

-- reservation_attendees: 해당 예약을 수정할 수 있는 사람만 추가·삭제
create policy attendees_select on public.reservation_attendees
  for select to authenticated using (true);
create policy attendees_insert on public.reservation_attendees
  for insert to authenticated
  with check ((select private.can_edit_reservation(reservation_id)));
create policy attendees_delete on public.reservation_attendees
  for delete to authenticated
  using ((select private.can_edit_reservation(reservation_id)));

-- ───────────── Data API 권한 (RLS와 별개로 테이블 접근 자체를 허용) ─────────────

grant select on public.teams to anon, authenticated;
grant select on public.rooms to authenticated;
grant select on public.profiles to authenticated;
grant update (name, team_id) on public.profiles to authenticated;
grant select, insert, delete on public.reservations to authenticated;
-- 수정은 일부 컬럼만 허용: 예약자·팀을 바꿔서 권한을 가로채는 일을 막는다
grant update (room_id, date, start_slot, end_slot, title) on public.reservations to authenticated;
grant select, insert, delete on public.reservation_attendees to authenticated;

-- ───────────── 시드 ─────────────

insert into public.rooms (id, name)
select n, '회의실' || n from generate_series(1, 10) as n;

-- 임시 팀 목록 (실제 팀 이름으로 교체 예정)
insert into public.teams (name) values ('기획팀'), ('개발팀'), ('영업팀'), ('HR팀');
