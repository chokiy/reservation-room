import { describe, expect, it } from "vitest";
import { canEditReservation } from "@/lib/permissions";

const reservation = { createdBy: "owner", attendees: [{ id: "guest" }] };

describe("canEditReservation", () => {
  it("예약자는 가능하다", () => expect(canEditReservation("owner", reservation)).toBe(true));
  it("참석자는 가능하다", () => expect(canEditReservation("guest", reservation)).toBe(true));
  it("예약자도 참석자도 아니면 불가하다", () => expect(canEditReservation("other", reservation)).toBe(false));
  it("로그인하지 않았으면 불가하다", () => {
    expect(canEditReservation(null, reservation)).toBe(false);
    expect(canEditReservation(undefined, reservation)).toBe(false);
  });
});
