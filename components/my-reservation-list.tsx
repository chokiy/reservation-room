"use client";

import Link from "next/link";
import { useState } from "react";
import { ReservationDetailModal } from "@/components/reservation-detail-modal";
import type { ReservationDetail, Room } from "@/lib/data/schedule";
import { formatDateLabel, teamColor } from "@/lib/grid";
import { canEditReservation } from "@/lib/permissions";
import { slotToTime } from "@/lib/slots";

/** 내가 만들었거나 참석하는 오늘 이후 예약 목록. 항목을 누르면 상세·취소 창이 열린다. */
export function MyReservationList({
  reservations,
  rooms,
  userId,
}: {
  reservations: ReservationDetail[];
  rooms: Room[];
  userId: string;
}) {
  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = reservations.find((r) => r.id === detailId);

  if (reservations.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-200 bg-white p-6 text-center text-sm text-zinc-600">
        <p>오늘 이후 내 예약이 없습니다.</p>
        <Link href="/" className="mt-3 inline-block rounded-md bg-[#1e2a5a] px-4 py-2 text-white hover:bg-[#2a3a78]">
          회의실 예약하러 가기
        </Link>
      </div>
    );
  }

  const roomName = (id: number) => rooms.find((r) => r.id === id)?.name ?? "-";

  return (
    <>
      <ul className="divide-y divide-zinc-100 rounded-lg border border-zinc-200 bg-white">
        {reservations.map((r) => (
          <li key={r.id}>
            <button
              type="button"
              onClick={() => setDetailId(r.id)}
              className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-zinc-50"
            >
              <span aria-hidden className="h-10 w-1.5 shrink-0 rounded" style={{ backgroundColor: teamColor(r.teamId) }} />
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium text-zinc-800">{r.title}</span>
                <span className="block truncate text-xs text-zinc-500">
                  {formatDateLabel(r.date)} {slotToTime(r.startSlot)}~{slotToTime(r.endSlot)} · {roomName(r.roomId)}
                </span>
              </span>
              <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-600">
                {r.createdBy === userId ? "내가 예약" : "참석"}
              </span>
            </button>
          </li>
        ))}
      </ul>
      {detail && (
        <ReservationDetailModal
          key={detail.id}
          reservation={detail}
          room={rooms.find((r) => r.id === detail.roomId)}
          canEdit={canEditReservation(userId, detail)}
          onClose={() => setDetailId(null)}
        />
      )}
    </>
  );
}
