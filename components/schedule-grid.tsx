"use client";

import { useEffect, useRef, useState } from "react";
import type { Room } from "@/lib/data/schedule";
import {
  blockLayout,
  clampSelection,
  findReservationAt,
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

type Drag = { roomId: number; anchor: number; start: number; end: number };

export function ScheduleGrid({
  date,
  today,
  nowMinutes,
  rooms,
  reservations,
  statuses,
  onSelect,
  onOpenReservation,
}: {
  date: string;
  today: string;
  nowMinutes: number;
  rooms: Room[];
  reservations: GridReservation[];
  /** 오늘 화면의 방별 지금 상태. 오늘이 아니거나 영업시간 밖이면 null */
  statuses: RoomStatus[] | null;
  /** 빈 칸을 클릭/드래그해서 구간(start 포함, end 제외)을 골랐을 때 */
  onSelect: (roomId: number, startSlot: number, endSlot: number) => void;
  /** 예약 블록을 눌러 상세를 열 때 */
  onOpenReservation: (reservationId: string) => void;
}) {
  const isToday = date === today;
  const busyByRoom = new Map(statuses?.map((s) => [s.roomId, s.busyWith]));
  const nowLeft = isToday ? nowLinePosition(nowMinutes) : null;

  const [drag, setDrag] = useState<Drag | null>(null);
  const lastPointerType = useRef<string>("mouse");

  // 선택할 수 없는 칸: 지난 칸 또는 이미 예약된 칸
  const isBlocked = (roomId: number, slot: number) =>
    isPastSlot(date, today, slot, nowMinutes) || findReservationAt(reservations, roomId, slot) !== undefined;

  // 마우스 드래그는 창 어디서 버튼을 놓아도 끝낸다.
  useEffect(() => {
    if (!drag) return;
    const finish = () => {
      onSelect(drag.roomId, drag.start, drag.end);
      setDrag(null);
    };
    const cancel = () => setDrag(null);
    window.addEventListener("pointerup", finish, { once: true });
    window.addEventListener("pointercancel", cancel, { once: true });
    return () => {
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", cancel);
    };
  }, [drag, onSelect]);

  return (
    <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white select-none">
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
                  {SLOT_INDEXES.map((slot) => {
                    const blocked = isBlocked(room.id, slot);
                    const past = isPastSlot(date, today, slot, nowMinutes);
                    const selected = drag?.roomId === room.id && slot >= drag.start && slot < drag.end;
                    return (
                      <div
                        key={slot}
                        onPointerDown={(event) => {
                          lastPointerType.current = event.pointerType;
                          // 터치는 가로 스크롤과 겹치므로 드래그 대신 탭(click)으로만 선택한다.
                          if (event.pointerType !== "mouse" || event.button !== 0 || blocked) return;
                          setDrag({ roomId: room.id, anchor: slot, start: slot, end: slot + 1 });
                        }}
                        onPointerEnter={() => {
                          if (!drag || drag.roomId !== room.id) return;
                          const { start, end } = clampSelection(drag.anchor, slot, (s) => isBlocked(room.id, s));
                          if (start !== drag.start || end !== drag.end) setDrag({ ...drag, start, end });
                        }}
                        onClick={() => {
                          if (lastPointerType.current === "mouse" || blocked) return;
                          onSelect(room.id, slot, slot + 1);
                        }}
                        className={`border-l ${slot % 2 === 0 ? "border-zinc-200" : "border-zinc-100"} ${
                          selected
                            ? "bg-blue-200"
                            : past
                              ? "cursor-not-allowed bg-zinc-100"
                              : blocked
                                ? ""
                                : "cursor-pointer hover:bg-blue-50"
                        }`}
                      />
                    );
                  })}
                </div>

                {roomReservations.map((r) => {
                  const { left, width } = blockLayout(r.startSlot, r.endSlot);
                  return (
                    <button
                      type="button"
                      key={r.id}
                      title={`${r.teamName} · ${r.title}`}
                      aria-label={`예약 상세: ${r.title}`}
                      onClick={() => onOpenReservation(r.id)}
                      style={{ left: `${left}%`, width: `${width}%`, backgroundColor: teamColor(r.teamId) }}
                      className="absolute inset-y-1 cursor-pointer overflow-hidden rounded-md px-1.5 py-0.5 text-left text-xs leading-tight text-white hover:brightness-110"
                    >
                      <div className="truncate font-medium">{r.title}</div>
                      <div className="truncate text-[10px] opacity-90">{r.teamName}</div>
                    </button>
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
