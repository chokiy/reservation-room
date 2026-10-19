// 예약 입력 검증 (순수 함수). 예약 창(클라이언트)과 서버 액션이 같은 규칙을 쓴다.
import { isPastSlot, isValidDateString } from "@/lib/grid";
import { isValidSlotRange } from "@/lib/slots";

export const TITLE_MAX_LENGTH = 100;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ReservationInput = {
  roomId: number;
  date: string;
  startSlot: number;
  endSlot: number;
  title: string;
  attendeeIds: string[];
};

export type ReservationErrors = Partial<
  Record<"room" | "date" | "time" | "title" | "attendees", string>
>;

export type ReservationContext = { today: string; nowMinutes: number };

export type ReservationValidation =
  | { ok: true; data: ReservationInput }
  | { ok: false; errors: ReservationErrors };

export function validateReservation(
  input: ReservationInput,
  { today, nowMinutes }: ReservationContext,
): ReservationValidation {
  const errors: ReservationErrors = {};
  const title = input.title.trim();
  const attendeeIds = [...new Set(input.attendeeIds)];

  if (!Number.isInteger(input.roomId) || input.roomId < 1) errors.room = "회의실을 선택하세요.";

  if (!isValidDateString(input.date)) {
    errors.date = "날짜가 올바르지 않습니다.";
  } else if (input.date < today) {
    errors.date = "지난 날짜는 예약할 수 없습니다.";
  }

  if (!isValidSlotRange(input.startSlot, input.endSlot)) {
    errors.time = "종료 시각은 시작 시각보다 늦어야 합니다.";
  } else if (!errors.date && isPastSlot(input.date, today, input.startSlot, nowMinutes)) {
    errors.time = "지난 시간은 예약할 수 없습니다.";
  }

  if (!title) {
    errors.title = "제목을 입력하세요.";
  } else if (title.length > TITLE_MAX_LENGTH) {
    errors.title = `제목은 ${TITLE_MAX_LENGTH}자 이하로 입력하세요.`;
  }

  if (attendeeIds.length < 1) {
    errors.attendees = "참석자를 1명 이상 선택하세요.";
  } else if (!attendeeIds.every((id) => UUID_PATTERN.test(id))) {
    errors.attendees = "참석자 정보가 올바르지 않습니다.";
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, data: { ...input, title, attendeeIds } };
}
