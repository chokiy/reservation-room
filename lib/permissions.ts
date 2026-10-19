// 예약 수정·취소 권한: 예약자 또는 참석자 (팀은 무관). DB의 private.can_edit_reservation()과 같은 규칙이다.

export type ReservationOwnership = {
  createdBy: string;
  attendees: { id: string }[];
};

export function canEditReservation(userId: string | null | undefined, reservation: ReservationOwnership): boolean {
  if (!userId) return false;
  return reservation.createdBy === userId || reservation.attendees.some((a) => a.id === userId);
}
