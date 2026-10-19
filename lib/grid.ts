// 현황 그리드 계산 (순수 함수). 화면 컴포넌트와 단위 테스트가 함께 쓴다.
import { DAY_START_MINUTES, SLOT_COUNT, SLOT_MINUTES, minutesToCurrentSlot } from "@/lib/slots";

export const TIME_ZONE = "Asia/Seoul";
const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];
const DAY_MINUTES = SLOT_COUNT * SLOT_MINUTES;

export type GridReservation = {
  id: string;
  roomId: number;
  startSlot: number;
  endSlot: number; // 배타적
  title: string;
  teamId: number;
  teamName: string;
};

// ───────────── 현재 시각 / 날짜 ─────────────

/** 서버는 UTC로 도므로 한국 시간 기준의 오늘 날짜(YYYY-MM-DD)와 하루 중 분(0~1439)을 구한다. */
export function getSeoulNow(now: Date = new Date()): { date: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)!.value;
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

function toUtcDate(date: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

function fromUtcDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** 실제로 존재하는 YYYY-MM-DD인지 검사한다. (2026-02-30 같은 값은 거부) */
export function isValidDateString(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  return fromUtcDate(toUtcDate(value)) === value;
}

/** URL 쿼리의 날짜를 검증하고, 없거나 잘못된 값이면 오늘로 대체한다. */
export function parseDateParam(value: string | string[] | undefined, today: string): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && isValidDateString(candidate) ? candidate : today;
}

export function shiftDate(date: string, days: number): string {
  const d = toUtcDate(date);
  d.setUTCDate(d.getUTCDate() + days);
  return fromUtcDate(d);
}

/** "2026-10-22 (목)" */
export function formatDateLabel(date: string): string {
  return `${date} (${WEEKDAYS[toUtcDate(date).getUTCDay()]})`;
}

// ───────────── 칸 위치 / 상태 ─────────────

/** 예약 블록의 가로 위치와 폭(전체 18칸 대비 %). */
export function blockLayout(startSlot: number, endSlot: number): { left: number; width: number } {
  return {
    left: (startSlot / SLOT_COUNT) * 100,
    width: ((endSlot - startSlot) / SLOT_COUNT) * 100,
  };
}

/** 현재 시각 세로선의 가로 위치(%). 영업시간 밖이면 null. */
export function nowLinePosition(minutesOfDay: number): number | null {
  const offset = minutesOfDay - DAY_START_MINUTES;
  if (offset < 0 || offset > DAY_MINUTES) return null;
  return (offset / DAY_MINUTES) * 100;
}

/** 지난 칸인가: 과거 날짜는 전부, 오늘은 끝나는 시각이 지금 이전인 칸, 미래 날짜는 없음. */
export function isPastSlot(viewDate: string, today: string, slot: number, nowMinutes: number): boolean {
  if (viewDate < today) return true;
  if (viewDate > today) return false;
  return DAY_START_MINUTES + (slot + 1) * SLOT_MINUTES <= nowMinutes;
}

/** 해당 방의 해당 슬롯을 점유한 예약을 찾는다. */
export function findReservationAt(
  reservations: GridReservation[],
  roomId: number,
  slot: number,
): GridReservation | undefined {
  return reservations.find((r) => r.roomId === roomId && r.startSlot <= slot && slot < r.endSlot);
}

export type RoomStatus = { roomId: number; busyWith: GridReservation | null };

/** 오늘 화면용: 각 방이 지금 비었는지 / 사용 중인지(예약 정보 포함). 영업시간 밖이면 null. */
export function getRoomStatuses(
  roomIds: number[],
  reservations: GridReservation[],
  nowMinutes: number,
): RoomStatus[] | null {
  const slot = minutesToCurrentSlot(nowMinutes);
  if (slot === null) return null;
  return roomIds.map((roomId) => ({
    roomId,
    busyWith: findReservationAt(reservations, roomId, slot) ?? null,
  }));
}

// ───────────── 팀 색 ─────────────

const TEAM_COLORS = ["#0d9488", "#2563eb", "#9333ea", "#be185d", "#b45309", "#4d7c0f", "#0e7490", "#7c3aed"];

/** 팀 id로 항상 같은 색을 돌려준다. 새 팀이 생겨도 색이 모자라지 않게 순환한다. */
export function teamColor(teamId: number): string {
  return TEAM_COLORS[(((teamId - 1) % TEAM_COLORS.length) + TEAM_COLORS.length) % TEAM_COLORS.length];
}
