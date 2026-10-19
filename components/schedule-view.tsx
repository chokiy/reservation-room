import { connection } from "next/server";
import { AutoRefresh } from "@/components/auto-refresh";
import { DateBar } from "@/components/date-bar";
import { NowBand } from "@/components/now-band";
import { ScheduleGrid } from "@/components/schedule-grid";
import { getSchedule } from "@/lib/data/schedule";
import { getRoomStatuses, getSeoulNow, parseDateParam } from "@/lib/grid";

/** 날짜 쿼리에 맞는 현황 화면. 요청 시점의 시각·세션을 쓰므로 <Suspense> 안에서 렌더링한다. */
export async function ScheduleView({ searchParams }: { searchParams: Promise<{ date?: string | string[] }> }) {
  await connection(); // 아래에서 현재 시각을 읽는다
  const params = await searchParams;
  const now = getSeoulNow();
  const date = parseDateParam(params.date, now.date);
  const { rooms, reservations } = await getSchedule(date);

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
      <NowBand isToday={isToday} rooms={rooms} statuses={statuses} />
      <DateBar date={date} today={now.date} />
      <ScheduleGrid
        date={date}
        today={now.date}
        nowMinutes={now.minutes}
        rooms={rooms}
        reservations={reservations}
        statuses={statuses}
      />
      <p className="text-xs text-zinc-500">색 블록은 예약된 시간(팀별 색), 회색 칸은 지난 시간입니다.</p>
      {isToday && <AutoRefresh />}
    </div>
  );
}
