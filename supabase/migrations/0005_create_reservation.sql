-- 예약 생성: 예약 + 참석자를 한 트랜잭션으로 저장한다.
-- SECURITY INVOKER(기본값)라서 RLS가 그대로 적용된다 (created_by = auth.uid(), 본인 팀 등).
-- 같은 방·시간 겹침은 reservations_no_overlap 제약이 막고, 위반하면 SQLSTATE 23P01 로 돌아온다.
create function public.create_reservation(
  p_room_id smallint,
  p_date date,
  p_start_slot smallint,
  p_end_slot smallint,
  p_title text,
  p_attendee_ids uuid[]
)
returns uuid
language plpgsql
set search_path = ''
as $$
declare
  v_id uuid;
  v_now timestamp := now() at time zone 'Asia/Seoul';
begin
  if coalesce(cardinality(p_attendee_ids), 0) < 1 then
    raise exception 'no_attendees' using errcode = 'P0001';
  end if;

  -- 이미 끝난 슬롯에서 시작하는 예약은 불가 (진행 중인 슬롯은 허용: "지금 예약")
  if p_date + time '08:00' + ((p_start_slot + 1)::int * interval '30 minutes') <= v_now then
    raise exception 'past_time' using errcode = 'P0001';
  end if;

  insert into public.reservations (room_id, date, start_slot, end_slot, title, team_id)
  values (
    p_room_id,
    p_date,
    p_start_slot,
    p_end_slot,
    btrim(p_title),
    (select p.team_id from public.profiles p where p.id = auth.uid())
  )
  returning id into v_id;

  insert into public.reservation_attendees (reservation_id, user_id)
  select v_id, u from unnest(p_attendee_ids) as u group by u;

  return v_id;
end;
$$;

revoke all on function public.create_reservation(smallint, date, smallint, smallint, text, uuid[]) from public, anon;
grant execute on function public.create_reservation(smallint, date, smallint, smallint, text, uuid[]) to authenticated;
