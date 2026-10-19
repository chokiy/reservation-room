import { describe, expect, it } from "vitest";
import {
  blockLayout,
  findReservationAt,
  formatDateLabel,
  getRoomStatuses,
  getSeoulNow,
  isPastSlot,
  isValidDateString,
  nowLinePosition,
  parseDateParam,
  shiftDate,
  teamColor,
  type GridReservation,
} from "@/lib/grid";

const res = (over: Partial<GridReservation>): GridReservation => ({
  id: "r1",
  roomId: 3,
  startSlot: 12,
  endSlot: 14,
  title: "스프린트 리뷰",
  teamId: 1,
  teamName: "기획팀",
  ...over,
});

describe("getSeoulNow", () => {
  it("UTC 시각을 한국 시간(+9)으로 바꾼다", () => {
    expect(getSeoulNow(new Date("2026-10-22T05:00:00Z"))).toEqual({ date: "2026-10-22", minutes: 14 * 60 });
  });

  it("UTC 기준 전날 밤이 한국에서는 다음 날이 된다", () => {
    expect(getSeoulNow(new Date("2026-10-21T15:30:00Z"))).toEqual({ date: "2026-10-22", minutes: 30 });
  });
});

describe("날짜 유틸", () => {
  it("존재하는 날짜만 유효하다", () => {
    expect(isValidDateString("2026-10-22")).toBe(true);
    expect(isValidDateString("2026-02-30")).toBe(false);
    expect(isValidDateString("2026-1-2")).toBe(false);
    expect(isValidDateString("abc")).toBe(false);
  });

  it("잘못되었거나 없는 쿼리는 오늘로 대체한다", () => {
    expect(parseDateParam("2026-10-25", "2026-10-22")).toBe("2026-10-25");
    expect(parseDateParam("garbage", "2026-10-22")).toBe("2026-10-22");
    expect(parseDateParam(undefined, "2026-10-22")).toBe("2026-10-22");
    expect(parseDateParam(["2026-10-25", "x"], "2026-10-22")).toBe("2026-10-25");
  });

  it("월·연 경계를 넘어 하루씩 이동한다", () => {
    expect(shiftDate("2026-10-31", 1)).toBe("2026-11-01");
    expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDate("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("요일을 한글로 붙인다", () => {
    expect(formatDateLabel("2026-10-22")).toBe("2026-10-22 (목)");
  });
});

describe("blockLayout", () => {
  it("슬롯을 18칸 대비 퍼센트로 바꾼다", () => {
    expect(blockLayout(0, 18)).toEqual({ left: 0, width: 100 });
    expect(blockLayout(9, 18)).toEqual({ left: 50, width: 50 });
    const b = blockLayout(12, 14); // 14:00~15:00
    expect(b.left).toBeCloseTo(66.667, 2);
    expect(b.width).toBeCloseTo(11.111, 2);
  });
});

describe("nowLinePosition", () => {
  it("영업시간 안에서만 위치를 돌려준다", () => {
    expect(nowLinePosition(8 * 60)).toBe(0);
    expect(nowLinePosition(12 * 60 + 30)).toBeCloseTo((270 / 540) * 100, 5);
    expect(nowLinePosition(17 * 60)).toBe(100);
    expect(nowLinePosition(7 * 60 + 59)).toBeNull();
    expect(nowLinePosition(17 * 60 + 1)).toBeNull();
  });
});

describe("isPastSlot", () => {
  const today = "2026-10-22";
  const at = (h: number, m = 0) => h * 60 + m;

  it("과거 날짜는 모두 지난 칸, 미래 날짜는 모두 가능", () => {
    expect(isPastSlot("2026-10-21", today, 17, at(9))).toBe(true);
    expect(isPastSlot("2026-10-23", today, 0, at(17))).toBe(false);
  });

  it("오늘은 끝난 칸만 지난 칸이다 (진행 중인 칸은 아님)", () => {
    // 10:10 → slot 4(10:00~10:30)는 진행 중, slot 3(09:30~10:00)까지 지남
    expect(isPastSlot(today, today, 3, at(10, 10))).toBe(true);
    expect(isPastSlot(today, today, 4, at(10, 10))).toBe(false);
  });

  it("칸 경계 정각에는 끝난 칸이 지난 칸이 된다", () => {
    expect(isPastSlot(today, today, 3, at(10, 0))).toBe(true);
    expect(isPastSlot(today, today, 4, at(10, 0))).toBe(false);
  });

  it("영업 전에는 지난 칸이 없고, 영업 후에는 전부 지난 칸", () => {
    expect(isPastSlot(today, today, 0, at(7))).toBe(false);
    expect(isPastSlot(today, today, 17, at(18))).toBe(true);
  });
});

describe("findReservationAt / getRoomStatuses", () => {
  const list = [res({}), res({ id: "r2", roomId: 5, startSlot: 0, endSlot: 2, teamName: "개발팀", teamId: 2 })];

  it("시작 슬롯은 포함, 끝 슬롯은 제외한다", () => {
    expect(findReservationAt(list, 3, 12)?.id).toBe("r1");
    expect(findReservationAt(list, 3, 13)?.id).toBe("r1");
    expect(findReservationAt(list, 3, 14)).toBeUndefined();
    expect(findReservationAt(list, 3, 11)).toBeUndefined();
    expect(findReservationAt(list, 4, 12)).toBeUndefined(); // 다른 방
  });

  it("지금 시각의 사용 중/빈 방을 가른다", () => {
    // 14:10 → slot 12
    const statuses = getRoomStatuses([3, 4, 5], list, 14 * 60 + 10)!;
    expect(statuses.map((s) => [s.roomId, s.busyWith?.teamName ?? null])).toEqual([
      [3, "기획팀"],
      [4, null],
      [5, null],
    ]);
  });

  it("영업시간 밖이면 null", () => {
    expect(getRoomStatuses([3], list, 7 * 60)).toBeNull();
    expect(getRoomStatuses([3], list, 17 * 60)).toBeNull();
  });
});

describe("teamColor", () => {
  it("같은 팀은 같은 색, 팔레트를 넘어도 순환한다", () => {
    expect(teamColor(1)).toBe(teamColor(1));
    expect(teamColor(1)).not.toBe(teamColor(2));
    expect(teamColor(9)).toBe(teamColor(1));
    expect(teamColor(100)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
