"use server";

import { revalidatePath } from "next/cache";
import { getSeoulNow } from "@/lib/grid";
import { validateReservation, type ReservationErrors, type ReservationInput } from "@/lib/reservation-validation";
import { createClient } from "@/lib/supabase/server";

export type CreateReservationResult =
  | { ok: true }
  | { ok: false; message: string; errors?: ReservationErrors };

const OVERLAP_MESSAGE = "방금 예약되었습니다. 다른 시간을 선택하세요.";

export async function createReservation(input: ReservationInput): Promise<CreateReservationResult> {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims.sub) return { ok: false, message: "로그인이 필요합니다. 다시 로그인하세요." };

  // 클라이언트 검증은 믿지 않고 서버에서 같은 규칙으로 다시 검사한다.
  const now = getSeoulNow();
  const parsed = validateReservation(input, { today: now.date, nowMinutes: now.minutes });
  if (!parsed.ok) return { ok: false, message: "입력 내용을 확인하세요.", errors: parsed.errors };

  const { roomId, date, startSlot, endSlot, title, attendeeIds } = parsed.data;
  const { error } = await supabase.rpc("create_reservation", {
    p_room_id: roomId,
    p_date: date,
    p_start_slot: startSlot,
    p_end_slot: endSlot,
    p_title: title,
    p_attendee_ids: attendeeIds,
  });

  if (error) {
    // 23P01: 같은 방·시간 겹침(exclusion), 23503: 존재하지 않는 참석자/방(FK), P0001: DB 함수의 검증 실패
    if (error.code === "23P01") return { ok: false, message: OVERLAP_MESSAGE };
    if (error.code === "23503") return { ok: false, message: "선택한 회의실 또는 참석자를 찾을 수 없습니다." };
    if (error.message === "past_time") return { ok: false, message: "지난 시간은 예약할 수 없습니다." };
    if (error.message === "no_attendees") return { ok: false, message: "참석자를 1명 이상 선택하세요." };
    console.error("create_reservation failed:", error.code, error.message);
    return { ok: false, message: "예약에 실패했습니다. 잠시 후 다시 시도하세요." };
  }

  revalidatePath("/");
  return { ok: true };
}
