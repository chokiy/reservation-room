import type { Room } from "@/lib/data/schedule";
import type { RoomStatus } from "@/lib/grid";

/** "지금 비어있는 방" 띠. 오늘 화면에서만 의미가 있어서 다른 날짜에는 안내 문구로 대신한다. */
export function NowBand({
  isToday,
  rooms,
  statuses,
}: {
  isToday: boolean;
  rooms: Room[];
  /** 영업시간 밖이면 null */
  statuses: RoomStatus[] | null;
}) {
  if (!isToday) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm text-zinc-500">
        “지금 비어있는 방”은 오늘 화면에서 볼 수 있습니다. [오늘]을 누르세요.
      </div>
    );
  }

  if (statuses === null) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-zinc-100 px-4 py-2.5 text-sm text-zinc-500">
        지금은 예약 가능 시간(08:00~17:00)이 아닙니다.
      </div>
    );
  }

  const roomName = new Map(rooms.map((r) => [r.id, r.name]));
  const freeRooms = statuses.filter((s) => !s.busyWith);

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm">
      <span className="font-medium text-emerald-800">🟢 지금 비어있는 방:</span>
      {freeRooms.length === 0 ? (
        <span className="text-zinc-600">비어 있는 방이 없습니다.</span>
      ) : (
        freeRooms.map((s) => (
          <span
            key={s.roomId}
            className="rounded-full border border-green-600 bg-white px-3 py-0.5 text-[13px] text-green-700"
          >
            {roomName.get(s.roomId)}
          </span>
        ))
      )}
    </div>
  );
}
