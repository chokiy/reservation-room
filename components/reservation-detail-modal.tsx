"use client";

import { useEffect, useState, useTransition } from "react";
import { cancelReservation } from "@/lib/actions/reservations";
import type { ReservationDetail, Room } from "@/lib/data/schedule";
import { formatDateLabel } from "@/lib/grid";
import { slotToTime } from "@/lib/slots";

/** 예약 상세 + (예약자·참석자에게만) [예약 취소]. 취소는 확인 단계를 한 번 거친다. */
export function ReservationDetailModal({
  reservation,
  room,
  canEdit,
  onEdit,
  onClose,
}: {
  reservation: ReservationDetail;
  room: Room | undefined;
  canEdit: boolean;
  /** 있으면 [수정] 버튼을 보인다(시간이 지난 예약 등 수정할 수 없으면 넘기지 않는다) */
  onEdit?: () => void;
  onClose: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, pending]);

  function cancel() {
    setMessage(null);
    startTransition(async () => {
      const result = await cancelReservation(reservation.id);
      if (result.ok) onClose();
      else {
        setMessage(result.message);
        setConfirming(false);
      }
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-detail-title"
        className="max-h-full w-full max-w-md overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl sm:rounded-xl"
      >
        <h3 id="reservation-detail-title" className="mb-4 text-lg font-semibold break-words text-[#1e2a5a]">
          {reservation.title}
        </h3>

        {message && (
          <p role="alert" className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
            {message}
          </p>
        )}

        <dl className="grid grid-cols-[4.5rem_1fr] gap-x-3 gap-y-2 text-sm">
          <dt className="text-zinc-500">회의실</dt>
          <dd>{room?.name ?? "-"}</dd>
          <dt className="text-zinc-500">일시</dt>
          <dd>
            {formatDateLabel(reservation.date)} {slotToTime(reservation.startSlot)}~{slotToTime(reservation.endSlot)}
          </dd>
          <dt className="text-zinc-500">팀</dt>
          <dd>{reservation.teamName}</dd>
          <dt className="text-zinc-500">예약자</dt>
          <dd>{reservation.creatorName}</dd>
          <dt className="text-zinc-500">참석자</dt>
          <dd>
            {reservation.attendees.length === 0
              ? "-"
              : reservation.attendees.map((p) => `${p.nickname} (${p.teamName})`).join(", ")}
          </dd>
        </dl>

        {!canEdit && (
          <p className="mt-4 text-xs text-zinc-500">예약자와 참석자만 예약을 수정·취소할 수 있습니다.</p>
        )}

        <div className="mt-5 flex items-center justify-end gap-2">
          {canEdit && confirming ? (
            <>
              <span className="mr-auto text-sm text-zinc-700">이 예약을 취소할까요?</span>
              <button
                type="button"
                onClick={() => setConfirming(false)}
                disabled={pending}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
              >
                아니오
              </button>
              <button
                type="button"
                onClick={cancel}
                disabled={pending}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:bg-zinc-400"
              >
                {pending ? "취소 중…" : "예, 취소합니다"}
              </button>
            </>
          ) : (
            <>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setConfirming(true)}
                  className="mr-auto rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                >
                  예약 취소
                </button>
              )}
              {canEdit && onEdit && (
                <button
                  type="button"
                  onClick={onEdit}
                  className="rounded-md bg-[#1e2a5a] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a3a78]"
                >
                  수정
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100"
              >
                닫기
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
