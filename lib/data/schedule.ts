import type { GridReservation } from "@/lib/grid";
import { createClient } from "@/lib/supabase/server";

export type Room = { id: number; name: string };

export type Person = { id: string; nickname: string; teamName: string };

/** 그리드 블록에 필요한 정보 + 상세 창에 필요한 예약자·참석자 */
export type ReservationDetail = GridReservation & {
  date: string;
  createdBy: string;
  creatorName: string;
  attendees: Person[];
};

export type Schedule = { rooms: Room[]; reservations: ReservationDetail[] };

// 생성된 타입이 to-one 조인을 배열로 추론하므로 두 형태를 모두 받는다.
function one<T>(value: T | T[] | null | undefined): T | undefined {
  return Array.isArray(value) ? value[0] : (value ?? undefined);
}

type ProfileJoin = { nickname: string; teams: { name: string } | { name: string }[] | null };

function toPerson(id: string, profile: ProfileJoin | ProfileJoin[] | null | undefined): Person {
  const p = one(profile);
  return { id, nickname: p?.nickname ?? "(알 수 없음)", teamName: one(p?.teams)?.name ?? "" };
}

export const RESERVATION_SELECT =
  "id, room_id, date, start_slot, end_slot, title, team_id, created_by, teams(name), creator:profiles!reservations_created_by_fkey(nickname), reservation_attendees(user_id, profiles(nickname, teams(name)))";

type ReservationRow = {
  id: string;
  room_id: number;
  date: string;
  start_slot: number;
  end_slot: number;
  title: string;
  team_id: number;
  created_by: string;
  teams: { name: string } | { name: string }[] | null;
  creator: { nickname: string } | { nickname: string }[] | null;
  reservation_attendees: { user_id: string; profiles: ProfileJoin | ProfileJoin[] | null }[];
};

export function toReservationDetail(row: ReservationRow): ReservationDetail {
  return {
    id: row.id,
    roomId: row.room_id,
    date: row.date,
    startSlot: row.start_slot,
    endSlot: row.end_slot,
    title: row.title,
    teamId: row.team_id,
    teamName: one(row.teams)?.name ?? "",
    createdBy: row.created_by,
    creatorName: one(row.creator)?.nickname ?? "(알 수 없음)",
    attendees: row.reservation_attendees.map((a) => toPerson(a.user_id, a.profiles)),
  };
}

/** 선택한 날짜의 회의실 목록과 예약을 읽는다. 세션 쿠키를 쓰므로 <Suspense> 안에서 호출한다. */
export async function getSchedule(date: string): Promise<Schedule> {
  const supabase = await createClient();

  const [roomsResult, reservationsResult] = await Promise.all([
    supabase.from("rooms").select("id, name").order("id"),
    supabase.from("reservations").select(RESERVATION_SELECT).eq("date", date).order("start_slot"),
  ]);

  if (roomsResult.error) throw new Error(`회의실을 불러오지 못했습니다: ${roomsResult.error.message}`);
  if (reservationsResult.error) {
    throw new Error(`예약을 불러오지 못했습니다: ${reservationsResult.error.message}`);
  }

  return {
    rooms: roomsResult.data,
    reservations: (reservationsResult.data as unknown as ReservationRow[]).map(toReservationDetail),
  };
}

/** 내가 만들었거나 참석자로 들어 있는 오늘 이후 예약(날짜·시간순). 지난 예약은 제외한다. */
export async function getMyReservations(userId: string, today: string): Promise<ReservationDetail[]> {
  const supabase = await createClient();

  // 내가 참석자인 예약 id를 먼저 구하고, 예약자이거나 그 id에 속하는 예약을 한 번에 읽는다.
  const attended = await supabase.from("reservation_attendees").select("reservation_id").eq("user_id", userId);
  if (attended.error) throw new Error(`내 예약을 불러오지 못했습니다: ${attended.error.message}`);
  const attendedIds = attended.data.map((row) => row.reservation_id);

  const filter = attendedIds.length
    ? `created_by.eq.${userId},id.in.(${attendedIds.join(",")})`
    : `created_by.eq.${userId}`;
  const { data, error } = await supabase
    .from("reservations")
    .select(RESERVATION_SELECT)
    .or(filter)
    .gte("date", today)
    .order("date")
    .order("start_slot");
  if (error) throw new Error(`내 예약을 불러오지 못했습니다: ${error.message}`);

  return (data as unknown as ReservationRow[]).map(toReservationDetail);
}

/** 참석자 검색용 사내 사용자 목록(다른 팀 포함). 로그인 사용자 전체 조회는 RLS가 허용한다. */
export async function getPeople(): Promise<Person[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("profiles").select("id, nickname, teams(name)").order("nickname");
  if (error) throw new Error(`사용자 목록을 불러오지 못했습니다: ${error.message}`);

  return data.map((row) => toPerson(row.id, row));
}
