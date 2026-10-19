import type { Room } from "@/lib/data/schedule";
import {
  blockLayout,
  isPastSlot,
  nowLinePosition,
  teamColor,
  type GridReservation,
  type RoomStatus,
} from "@/lib/grid";
import { DAY_START_MINUTES, SLOT_COUNT, SLOT_MINUTES } from "@/lib/slots";

const SLOT_INDEXES = Array.from({ length: SLOT_COUNT }, (_, i) => i);
const HOUR_LABELS = Array.from({ length: SLOT_COUNT / 2 }, (_, i) =>
  String(DAY_START_MINUTES / 60 + (i * 2 * SLOT_MINUTES) / 60).padStart(2, "0"),
);
const COLUMNS = "grid grid-cols-[repeat(18,minmax(0,1fr))]";

export function ScheduleGrid({
  date,
  today,
  nowMinutes,
  rooms,
  reservations,
  statuses,
}: {
  date: string;
  today: string;
  nowMinutes: number;
  rooms: Room[];
  reservations: GridReservation[];
  /** 오늘 화면의 방별 지금 상태. 오늘이 아니거나 영업시간 밖이면 null */
  statuses: RoomStatus[] | null;
}) {
  const isToday = date === today;
  const busyByRoom = new Map(statuses?.map((s) => [s.roomId, s.busyWith]));
  const nowLeft = isToday ? nowLinePosition(nowMinutes) : null;

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
      <div className="min-w-[760px]">
        {/* 시간 눈금 */}
        <div className="flex border-b border-zinc-200 bg-zinc-50">
          <div className="sticky left-0 z-10 w-28 shrink-0 border-r border-zinc-200 bg-zinc-50" />
          <div className={`${COLUMNS} flex-1 text-xs text-zinc-500`}>
            {HOUR_LABELS.map((label) => (
              <div key={label} className="col-span-2 border-l border-zinc-200 py-1.5 pl-1">
                {label}
              </div>
            ))}
          </div>
        </div>

        {rooms.map((room) => {
          const busy = busyByRoom.get(room.id) ?? null;
          const roomReservations = reservations.filter((r) => r.roomId === room.id);
          const dotClass = !isToday || !statuses ? "bg-zinc-300" : busy ? "bg-orange-500" : "bg-green-600";

          return (
            <div key={room.id} className="flex border-b border-zinc-100 last:border-b-0">
              <div className="sticky left-0 z-10 flex w-28 shrink-0 flex-col justify-center gap-0.5 border-r border-zinc-200 bg-white px-2 py-1 text-sm">
                <span className="flex items-center gap-1.5 font-medium text-zinc-800">
                  <span aria-hidden className={`inline-block size-2 rounded-full ${dotClass}`} />
                  {room.name}
                </span>
                {busy && <span className="truncate pl-3.5 text-[11px] text-orange-600">{busy.teamName} 사용 중</span>}
              </div>

              <div className="relative h-12 flex-1">
                <div className={`${COLUMNS} absolute inset-0`}>
                  {SLOT_INDEXES.map((slot) => (
                    <div
                      key={slot}
                      className={`border-l ${slot % 2 === 0 ? "border-zinc-200" : "border-zinc-100"} ${
                        isPastSlot(date, today, slot, nowMinutes) ? "bg-zinc-100" : ""
                      }`}
                    />
                  ))}
                </div>

                {roomReservations.map((r) => {
                  const { left, width } = blockLayout(r.startSlot, r.endSlot);
                  return (
                    <div
                      key={r.id}
                      title={`${r.teamName} · ${r.title}`}
                      style={{ left: `${left}%`, width: `${width}%`, backgroundColor: teamColor(r.teamId) }}
                      className="absolute inset-y-1 overflow-hidden rounded-md px-1.5 py-0.5 text-xs leading-tight text-white"
                    >
                      <div className="truncate font-medium">{r.title}</div>
                      <div className="truncate text-[10px] opacity-90">{r.teamName}</div>
                    </div>
                  );
                })}

                {nowLeft !== null && (
                  <div
                    aria-hidden
                    style={{ left: `${nowLeft}%` }}
                    className="pointer-events-none absolute inset-y-0 z-[1] w-0.5 bg-red-500"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
