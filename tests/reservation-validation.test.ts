import { describe, expect, it } from "vitest";
import { clampSelection, defaultEndSlot, hasOverlap, type GridReservation } from "@/lib/grid";
import { validateReservation, type ReservationInput } from "@/lib/reservation-validation";

const ctx = { today: "2026-10-22", nowMinutes: 10 * 60 + 10 }; // 10:10 → slot 4 진행 중
const USER = "d5dec808-8026-42fc-832b-cb073512156d";

const valid: ReservationInput = {
  roomId: 3,
  date: "2026-10-22",
  startSlot: 12,
  endSlot: 14,
  title: " 스프린트 리뷰 ",
  attendeeIds: [USER],
};

const res = (roomId: number, startSlot: number, endSlot: number): GridReservation => ({
  id: `${roomId}-${startSlot}`,
  roomId,
  startSlot,
  endSlot,
  title: "t",
  teamId: 1,
  teamName: "기획팀",
});

describe("validateReservation", () => {
  it("정상 입력은 통과하고 제목 공백을 다듬는다", () => {
    const result = validateReservation(valid, ctx);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.title).toBe("스프린트 리뷰");
  });

  it("제목과 참석자가 비면 거부한다", () => {
    const result = validateReservation({ ...valid, title: "  ", attendeeIds: [] }, ctx);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(["attendees", "title"]);
  });

  it("종료가 시작보다 늦지 않으면 거부한다", () => {
    for (const [startSlot, endSlot] of [[12, 12], [14, 12], [0, 19], [-1, 2]]) {
      const result = validateReservation({ ...valid, startSlot, endSlot }, ctx);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.time).toBeDefined();
    }
  });

  it("지난 시간·지난 날짜는 거부하고, 진행 중인 칸은 허용한다", () => {
    const past = validateReservation({ ...valid, startSlot: 3, endSlot: 5 }, ctx);
    expect(past.ok).toBe(false);
    if (!past.ok) expect(past.errors.time).toBeDefined();

    const ongoing = validateReservation({ ...valid, startSlot: 4, endSlot: 6 }, ctx);
    expect(ongoing.ok).toBe(true);

    const pastDate = validateReservation({ ...valid, date: "2026-10-21" }, ctx);
    expect(pastDate.ok).toBe(false);
    if (!pastDate.ok) expect(pastDate.errors.date).toBeDefined();
  });

  it("미래 날짜는 시각과 무관하게 허용한다", () => {
    expect(validateReservation({ ...valid, date: "2026-10-23", startSlot: 0, endSlot: 1 }, ctx).ok).toBe(true);
  });

  it("참석자 중복은 하나로 합치고, uuid가 아니면 거부한다", () => {
    const dup = validateReservation({ ...valid, attendeeIds: [USER, USER] }, ctx);
    expect(dup.ok && dup.data.attendeeIds).toEqual([USER]);

    const bad = validateReservation({ ...valid, attendeeIds: ["abc"] }, ctx);
    expect(bad.ok).toBe(false);
  });

  it("제목이 100자를 넘으면 거부한다", () => {
    expect(validateReservation({ ...valid, title: "가".repeat(101) }, ctx).ok).toBe(false);
    expect(validateReservation({ ...valid, title: "가".repeat(100) }, ctx).ok).toBe(true);
  });
});

describe("hasOverlap", () => {
  const list = [res(3, 4, 8)];

  it("같은 방에서 구간이 겹치면 true (끝 슬롯은 배타적)", () => {
    expect(hasOverlap(list, 3, 6, 10)).toBe(true);
    expect(hasOverlap(list, 3, 2, 5)).toBe(true);
    expect(hasOverlap(list, 3, 8, 10)).toBe(false); // 8에서 시작 = 맞닿음
    expect(hasOverlap(list, 3, 2, 4)).toBe(false);
    expect(hasOverlap(list, 4, 4, 8)).toBe(false); // 다른 방
  });
});

describe("clampSelection", () => {
  const blocked = (set: number[]) => (slot: number) => set.includes(slot);

  it("막힌 칸이 없으면 시작~현재 칸 전체를 선택한다 (양방향)", () => {
    expect(clampSelection(3, 6, blocked([]))).toEqual({ start: 3, end: 7 });
    expect(clampSelection(6, 3, blocked([]))).toEqual({ start: 3, end: 7 });
    expect(clampSelection(5, 5, blocked([]))).toEqual({ start: 5, end: 6 });
  });

  it("막힌 칸을 만나면 그 직전에서 멈춘다 (건너뛰지 않는다)", () => {
    expect(clampSelection(2, 9, blocked([5, 6]))).toEqual({ start: 2, end: 5 });
    expect(clampSelection(9, 2, blocked([5]))).toEqual({ start: 6, end: 10 });
  });
});

describe("defaultEndSlot", () => {
  it("기본 1시간, 다음 예약이나 마감을 넘지 않는다", () => {
    const list = [res(3, 14, 16)];
    expect(defaultEndSlot(list, 3, 4)).toBe(6);
    expect(defaultEndSlot(list, 3, 13)).toBe(14); // 다음 예약 앞까지
    expect(defaultEndSlot(list, 5, 13)).toBe(15); // 다른 방이라 영향 없음
    expect(defaultEndSlot([], 3, 17)).toBe(18); // 마감
  });
});
