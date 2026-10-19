import { describe, expect, it } from "vitest";
import {
  isValidSlotRange,
  minutesToCurrentSlot,
  slotToTime,
  timeToSlot,
} from "@/lib/slots";

describe("slotToTime", () => {
  it("경계값을 변환한다", () => {
    expect(slotToTime(0)).toBe("08:00");
    expect(slotToTime(1)).toBe("08:30");
    expect(slotToTime(17)).toBe("16:30");
    expect(slotToTime(18)).toBe("17:00");
  });

  it("범위 밖이거나 정수가 아니면 에러", () => {
    expect(() => slotToTime(-1)).toThrow(RangeError);
    expect(() => slotToTime(19)).toThrow(RangeError);
    expect(() => slotToTime(1.5)).toThrow(RangeError);
  });
});

describe("timeToSlot", () => {
  it("slotToTime과 왕복 변환된다", () => {
    for (let slot = 0; slot <= 18; slot++) {
      expect(timeToSlot(slotToTime(slot))).toBe(slot);
    }
  });

  it("30분 단위가 아니거나 범위 밖이면 에러", () => {
    expect(() => timeToSlot("08:15")).toThrow(RangeError);
    expect(() => timeToSlot("07:30")).toThrow(RangeError);
    expect(() => timeToSlot("17:30")).toThrow(RangeError);
    expect(() => timeToSlot("8:00")).toThrow(RangeError);
  });
});

describe("isValidSlotRange", () => {
  it("유효한 구간", () => {
    expect(isValidSlotRange(0, 1)).toBe(true);
    expect(isValidSlotRange(0, 18)).toBe(true);
    expect(isValidSlotRange(17, 18)).toBe(true);
  });

  it("잘못된 구간", () => {
    expect(isValidSlotRange(2, 2)).toBe(false);
    expect(isValidSlotRange(3, 2)).toBe(false);
    expect(isValidSlotRange(-1, 2)).toBe(false);
    expect(isValidSlotRange(0, 19)).toBe(false);
  });
});

describe("minutesToCurrentSlot", () => {
  it("현재 시각이 속한 슬롯을 돌려준다", () => {
    expect(minutesToCurrentSlot(8 * 60)).toBe(0);
    expect(minutesToCurrentSlot(8 * 60 + 29)).toBe(0);
    expect(minutesToCurrentSlot(13 * 60 + 10)).toBe(10);
    expect(minutesToCurrentSlot(16 * 60 + 59)).toBe(17);
  });

  it("영업시간 밖이면 null", () => {
    expect(minutesToCurrentSlot(7 * 60 + 59)).toBeNull();
    expect(minutesToCurrentSlot(17 * 60)).toBeNull();
  });
});
