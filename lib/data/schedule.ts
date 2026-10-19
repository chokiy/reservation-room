import type { GridReservation } from "@/lib/grid";
import { createClient } from "@/lib/supabase/server";

export type Room = { id: number; name: string };

export type Schedule = { rooms: Room[]; reservations: GridReservation[] };

/** 선택한 날짜의 회의실 목록과 예약을 읽는다. 세션 쿠키를 쓰므로 <Suspense> 안에서 호출한다. */
export async function getSchedule(date: string): Promise<Schedule> {
  const supabase = await createClient();

  const [roomsResult, reservationsResult] = await Promise.all([
    supabase.from("rooms").select("id, name").order("id"),
    supabase
      .from("reservations")
      .select("id, room_id, start_slot, end_slot, title, team_id, teams(name)")
      .eq("date", date)
      .order("start_slot"),
  ]);

  if (roomsResult.error) throw new Error(`회의실을 불러오지 못했습니다: ${roomsResult.error.message}`);
  if (reservationsResult.error) {
    throw new Error(`예약을 불러오지 못했습니다: ${reservationsResult.error.message}`);
  }

  const reservations: GridReservation[] = reservationsResult.data.map((row) => {
    // 생성된 타입이 to-one 조인을 배열로 추론하므로 두 형태를 모두 받는다.
    const team = Array.isArray(row.teams) ? row.teams[0] : row.teams;
    return {
      id: row.id,
      roomId: row.room_id,
      startSlot: row.start_slot,
      endSlot: row.end_slot,
      title: row.title,
      teamId: row.team_id,
      teamName: team?.name ?? "",
    };
  });

  return { rooms: roomsResult.data, reservations };
}
