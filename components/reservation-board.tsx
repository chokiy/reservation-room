"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { NowBand } from "@/components/now-band";
import { ReservationDetailModal } from "@/components/reservation-detail-modal";
import { ReservationModal, type Draft } from "@/components/reservation-modal";
import { ScheduleGrid } from "@/components/schedule-grid";
import { canEditReservation } from "@/lib/permissions";
import type { Person, ReservationDetail, Room } from "@/lib/data/schedule";
import { defaultEndSlot, type RoomStatus } from "@/lib/grid";
import { minutesToCurrentSlot } from "@/lib/slots";

/** 현황 그리드·"지금 비어있는 방" 띠·예약 창을 묶는다. 예약 창은 열릴 때마다 새로 시작한다. */
export function ReservationBoard({
  date,
  today,
  nowMinutes,
  rooms,
  reservations,
  statuses,
  people,
  userId,
  dateBar,
}: {
  date: string;
  today: string;
  nowMinutes: number;
  rooms: Room[];
  reservations: ReservationDetail[];
  statuses: RoomStatus[] | null;
  people: Person[];
  /** 로그인한 사용자 id (예약자·참석자 판정용) */
  userId: string | null;
  /** 띠와 그리드 사이에 놓을 날짜 바 */
  dateBar: ReactNode;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const nextKey = useRef(0);
  // 취소 등으로 목록이 갱신되어 사라진 예약이면 상세 창도 함께 닫힌다.
  const detail = reservations.find((r) => r.id === detailId);

  const open = useCallback(
    (roomId: number, startSlot: number, endSlot: number) => {
      nextKey.current += 1;
      setDraft({ key: nextKey.current, roomId, date, startSlot, endSlot });
    },
    [date],
  );

  // 비어있는 방 칩: 지금 진행 중인 30분 칸부터, 기본 1시간(다음 예약 앞까지)
  const reserveNow = (roomId: number) => {
    const slot = minutesToCurrentSlot(nowMinutes);
    if (slot === null) return;
    open(roomId, slot, defaultEndSlot(reservations, roomId, slot));
  };

  return (
    <>
      <NowBand isToday={date === today} rooms={rooms} statuses={statuses} onPick={reserveNow} />
      {dateBar}
      <ScheduleGrid
        date={date}
        today={today}
        nowMinutes={nowMinutes}
        rooms={rooms}
        reservations={reservations}
        statuses={statuses}
        onSelect={open}
        onOpenReservation={setDetailId}
      />
      {detail && (
        <ReservationDetailModal
          key={detail.id}
          reservation={detail}
          room={rooms.find((r) => r.id === detail.roomId)}
          canEdit={canEditReservation(userId, detail)}
          onClose={() => setDetailId(null)}
        />
      )}
      {draft && (
        <ReservationModal
          key={draft.key}
          draft={draft}
          rooms={rooms}
          people={people}
          reservations={reservations}
          viewDate={date}
          today={today}
          nowMinutes={nowMinutes}
          onClose={() => setDraft(null)}
        />
      )}
    </>
  );
}
