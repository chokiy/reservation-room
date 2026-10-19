-- 예약 수정: 예약 본문 + 참석자 변경을 한 트랜잭션으로 저장한다.
-- SECURITY INVOKER(기본값)라서 RLS가 그대로 적용된다: 예약자·참석자만 수정할 수 있다.
-- 겹침은 reservations_no_overlap 제약이 막는다(자기 자신은 제외되므로 같은 자리에서 시간만 줄이는 수정도 가능).
-- 순서 주의: 참석자 삭제는 마지막에 한다. 본인을 참석자에서 뺀 순간 권한을 잃기 때문이다.
create function public.update_reservation(
  p_id uuid,
  p_room_id smallint,
  p_date date,
  p_start_slot smallint,
  p_end_slot smallint,
  p_title text,
  p_attendee_ids uuid[]
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  v_now timestamp := now() at time zone 'Asia/Seoul';
  v_rows int;
begin
  if coalesce(cardinality(p_attendee_ids), 0) < 1 then
    raise exception 'no_attendees' using errcode = 'P0001';
  end if;

  if p_date + time '08:00' + ((p_start_slot + 1)::int * interval '30 minutes') <= v_now then
    raise exception 'past_time' using errcode = 'P0001';
  end if;

  update public.reservations
  set room_id = p_room_id, date = p_date, start_slot = p_start_slot, end_slot = p_end_slot, title = btrim(p_title)
  where id = p_id;
  get diagnostics v_rows = row_count;
  if v_rows = 0 then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  insert into public.reservation_attendees (reservation_id, user_id)
  select p_id, u from unnest(p_attendee_ids) as u group by u
  on conflict do nothing;

  delete from public.reservation_attendees
  where reservation_id = p_id and user_id <> all (p_attendee_ids);
end;
$$;

revoke all on function public.update_reservation(uuid, smallint, date, smallint, smallint, text, uuid[]) from public, anon;
grant execute on function public.update_reservation(uuid, smallint, date, smallint, smallint, text, uuid[]) to authenticated;
