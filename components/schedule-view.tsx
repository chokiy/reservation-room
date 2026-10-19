import { connection } from "next/server";
import { AutoRefresh } from "@/components/auto-refresh";
import { DateBar } from "@/components/date-bar";
import { ReservationBoard } from "@/components/reservation-board";
import { getPeople, getSchedule } from "@/lib/data/schedule";
import { createClient } from "@/lib/supabase/server";
import { getRoomStatuses, getSeoulNow, parseDateParam } from "@/lib/grid";

/** 날짜 쿼리에 맞는 현황 화면. 요청 시점의 시각·세션을 쓰므로 <Suspense> 안에서 렌더링한다. */
export async function ScheduleView({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  await connection(); // 아래에서 현재 시각을 읽는다
  const params = await searchParams;
  const now = getSeoulNow();
  const date = parseDateParam(params.date, now.date);
  const supabase = await createClient();
  const [{ rooms, reservations }, people, { data: claims }] = await Promise.all([
    getSchedule(date),
    getPeople(),
    supabase.auth.getClaims(),
  ]);

  const isToday = date === now.date;
  const statuses = isToday
    ? getRoomStatuses(
        rooms.map((r) => r.id),
        reservations,
        now.minutes,
      )
    : null;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 p-4">
      <ReservationBoard
        date={date}
        today={now.date}
        nowMinutes={now.minutes}
        rooms={rooms}
        reservations={reservations}
        statuses={statuses}
        people={people}
        userId={claims?.claims.sub ?? null}
        dateBar={<DateBar date={date} today={now.date} />}
      />
      <p className="text-xs text-zinc-500">
        빈 칸을 클릭하거나 드래그해서 예약하세요. 색 블록(팀별 색)을 누르면 상세 확인·취소, 회색 칸은 지난 시간입니다.
      </p>
      {isToday && <AutoRefresh />}
    </div>
  );
}
