"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { inputClass } from "@/components/auth-ui";
import { createReservation } from "@/lib/actions/reservations";
import type { Person, Room } from "@/lib/data/schedule";
import { hasOverlap, type GridReservation } from "@/lib/grid";
import { TITLE_MAX_LENGTH, validateReservation } from "@/lib/reservation-validation";
import { SLOT_COUNT, slotToTime } from "@/lib/slots";

export type Draft = { key: number; roomId: number; date: string; startSlot: number; endSlot: number };

const START_SLOTS = Array.from({ length: SLOT_COUNT }, (_, i) => i); // 0~17
const MAX_SUGGESTIONS = 8;

export function ReservationModal({
  draft,
  rooms,
  people,
  reservations,
  viewDate,
  today,
  nowMinutes,
  onClose,
}: {
  draft: Draft;
  rooms: Room[];
  people: Person[];
  /** 지금 화면(viewDate)의 예약. 다른 날짜로 바꾸면 겹침은 저장 시 DB가 판정한다. */
  reservations: GridReservation[];
  viewDate: string;
  today: string;
  nowMinutes: number;
  onClose: () => void;
}) {
  const [roomId, setRoomId] = useState(draft.roomId);
  const [date, setDate] = useState(draft.date);
  const [startSlot, setStartSlot] = useState(draft.startSlot);
  const [endSlot, setEndSlot] = useState(draft.endSlot);
  const [title, setTitle] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<string[]>([]);
  const [query, setQuery] = useState("");
  const [serverMessage, setServerMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !pending) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, pending]);

  const validation = validateReservation(
    { roomId, date, startSlot, endSlot, title, attendeeIds },
    { today, nowMinutes },
  );
  const errors = validation.ok ? {} : validation.errors;
  const overlaps = date === viewDate && !errors.time && hasOverlap(reservations, roomId, startSlot, endSlot);
  const canSubmit = validation.ok && !overlaps && !pending;

  const peopleById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people
      .filter((p) => !attendeeIds.includes(p.id))
      .filter((p) => !q || p.nickname.toLowerCase().includes(q) || p.teamName.toLowerCase().includes(q))
      .slice(0, MAX_SUGGESTIONS);
  }, [people, attendeeIds, query]);

  function changeStart(value: number) {
    setStartSlot(value);
    if (endSlot <= value) setEndSlot(Math.min(value + 1, SLOT_COUNT));
  }

  function submit() {
    if (!validation.ok) return;
    setServerMessage(null);
    startTransition(async () => {
      const result = await createReservation(validation.data);
      if (result.ok) onClose();
      else setServerMessage(result.message);
    });
  }

  // 지금 막을 이유(필드 오류 + 겹침)를 한 줄씩 보여준다.
  const hints = [errors.room, errors.date, errors.time, overlaps ? "이미 예약된 시간과 겹칩니다." : undefined]
    .concat(errors.title, errors.attendees)
    .filter((hint): hint is string => Boolean(hint));

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-modal-title"
        className="max-h-full w-full max-w-md overflow-y-auto rounded-t-xl bg-white p-5 shadow-xl sm:rounded-xl"
      >
        <h3 id="reservation-modal-title" className="mb-4 text-lg font-semibold text-[#1e2a5a]">
          회의실 예약
        </h3>

        <div className="space-y-3 text-sm">
          {serverMessage && (
            <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-red-700">
              {serverMessage}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block font-medium text-zinc-700">회의실</span>
              <select value={roomId} onChange={(e) => setRoomId(Number(e.target.value))} className={inputClass}>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-medium text-zinc-700">날짜</span>
              <input
                type="date"
                value={date}
                min={today}
                onChange={(e) => e.target.value && setDate(e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className="mb-1 block font-medium text-zinc-700">시작</span>
              <select value={startSlot} onChange={(e) => changeStart(Number(e.target.value))} className={inputClass}>
                {START_SLOTS.map((slot) => (
                  <option key={slot} value={slot}>
                    {slotToTime(slot)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block font-medium text-zinc-700">종료</span>
              <select value={endSlot} onChange={(e) => setEndSlot(Number(e.target.value))} className={inputClass}>
                {START_SLOTS.filter((slot) => slot + 1 > startSlot).map((slot) => (
                  <option key={slot + 1} value={slot + 1}>
                    {slotToTime(slot + 1)}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block font-medium text-zinc-700">
              제목 <span className="text-red-600">*</span>
            </span>
            <input
              value={title}
              maxLength={TITLE_MAX_LENGTH}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="예: 스프린트 리뷰"
              className={inputClass}
            />
          </label>

          <div>
            <span className="mb-1 block font-medium text-zinc-700">
              참석자 <span className="text-red-600">*</span>{" "}
              <span className="font-normal text-zinc-500">(1명 이상)</span>
            </span>
            {attendeeIds.length > 0 && (
              <ul className="mb-2 flex flex-wrap gap-1.5">
                {attendeeIds.map((id) => {
                  const person = peopleById.get(id);
                  return (
                    <li
                      key={id}
                      className="flex items-center gap-1 rounded-full bg-indigo-100 py-0.5 pl-3 pr-1 text-xs text-[#1e2a5a]"
                    >
                      {person ? `${person.nickname} (${person.teamName})` : id}
                      <button
                        type="button"
                        aria-label={`${person?.nickname ?? "참석자"} 제거`}
                        onClick={() => setAttendeeIds((ids) => ids.filter((x) => x !== id))}
                        className="rounded-full px-1.5 text-sm hover:bg-indigo-200"
                      >
                        ×
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="이름 또는 팀으로 검색"
              aria-label="참석자 검색"
              className={inputClass}
            />
            <ul className="mt-1 max-h-36 overflow-y-auto rounded-md border border-zinc-200">
              {suggestions.length === 0 ? (
                <li className="px-3 py-2 text-zinc-500">
                  {people.length === attendeeIds.length ? "더 추가할 사용자가 없습니다." : "검색 결과가 없습니다."}
                </li>
              ) : (
                suggestions.map((p) => (
                  <li key={p.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setAttendeeIds((ids) => [...ids, p.id]);
                        setQuery("");
                      }}
                      className="flex w-full items-center justify-between px-3 py-1.5 text-left hover:bg-zinc-100"
                    >
                      <span>{p.nickname}</span>
                      <span className="text-xs text-zinc-500">{p.teamName}</span>
                    </button>
                  </li>
                ))
              )}
            </ul>
          </div>

          {!canSubmit && hints.length > 0 && (
            <ul className="space-y-0.5 text-xs text-zinc-500">
              {hints.map((hint) => (
                <li key={hint}>· {hint}</li>
              ))}
            </ul>
          )}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-100 disabled:opacity-60"
          >
            닫기
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={!canSubmit}
            className="rounded-md bg-[#1e2a5a] px-5 py-2 text-sm font-medium text-white hover:bg-[#2a3a78] disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {pending ? "예약 중…" : "예약"}
          </button>
        </div>
      </div>
    </div>
  );
}
