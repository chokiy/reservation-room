// 예약 슬롯: 08:00~17:00을 30분 단위로 나눈 18칸 (slot 0 = 08:00, slot 17 = 16:30 시작)
// end_slot은 배타적이라 18 = 17:00.

export const DAY_START_MINUTES = 8 * 60;
export const SLOT_MINUTES = 30;
export const SLOT_COUNT = 18;

/** 슬롯 경계(0~18)를 "HH:MM"으로 변환한다. */
export function slotToTime(slot: number): string {
  if (!Number.isInteger(slot) || slot < 0 || slot > SLOT_COUNT) {
    throw new RangeError(`slot must be an integer between 0 and ${SLOT_COUNT}: ${slot}`);
  }
  const minutes = DAY_START_MINUTES + slot * SLOT_MINUTES;
  const hh = String(Math.floor(minutes / 60)).padStart(2, "0");
  const mm = String(minutes % 60).padStart(2, "0");
  return `${hh}:${mm}`;
}

/** "HH:MM"을 슬롯 경계(0~18)로 변환한다. 30분 단위가 아니거나 범위 밖이면 에러. */
export function timeToSlot(time: string): number {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) throw new RangeError(`invalid time format: ${time}`);
  const minutes = Number(match[1]) * 60 + Number(match[2]) - DAY_START_MINUTES;
  if (minutes < 0 || minutes % SLOT_MINUTES !== 0 || minutes / SLOT_MINUTES > SLOT_COUNT) {
    throw new RangeError(`time out of range or not on a 30-minute boundary: ${time}`);
  }
  return minutes / SLOT_MINUTES;
}

/** 시작/종료 슬롯이 유효한 예약 구간인지 검사한다. */
export function isValidSlotRange(startSlot: number, endSlot: number): boolean {
  return (
    Number.isInteger(startSlot) &&
    Number.isInteger(endSlot) &&
    startSlot >= 0 &&
    endSlot <= SLOT_COUNT &&
    startSlot < endSlot
  );
}

/** 현재 시각(분 단위, 0~1439)이 속한 슬롯. 영업시간 밖이면 null. */
export function minutesToCurrentSlot(minutesOfDay: number): number | null {
  const offset = minutesOfDay - DAY_START_MINUTES;
  if (offset < 0 || offset >= SLOT_COUNT * SLOT_MINUTES) return null;
  return Math.floor(offset / SLOT_MINUTES);
}
