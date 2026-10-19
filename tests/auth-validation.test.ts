import { describe, expect, it } from "vitest";
import {
  NEW_TEAM_VALUE,
  validateLogin,
  validateSignup,
  type SignupInput,
} from "@/lib/auth-validation";

const validSignup: SignupInput = {
  email: " minsu@example.com ",
  password: "password1",
  nickname: " 민수 ",
  team: "1",
  newTeamName: "",
};

describe("validateLogin", () => {
  it("이메일은 공백을 제거하고 통과시킨다", () => {
    const result = validateLogin({ email: " a@b.co ", password: "x" });
    expect(result).toEqual({ ok: true, data: { email: "a@b.co", password: "x" } });
  });

  it("빈 값과 잘못된 이메일을 거부한다", () => {
    const empty = validateLogin({ email: "", password: "" });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(Object.keys(empty.errors)).toEqual(["email", "password"]);

    const bad = validateLogin({ email: "not-an-email", password: "x" });
    expect(bad.ok).toBe(false);
    if (!bad.ok) expect(bad.errors.email).toBeDefined();
  });
});

describe("validateSignup", () => {
  it("기존 팀을 고르면 teamId를 넘기고 값을 다듬는다", () => {
    const result = validateSignup(validSignup);
    expect(result).toEqual({
      ok: true,
      data: { email: "minsu@example.com", password: "password1", nickname: "민수", teamId: 1 },
    });
  });

  it("새 팀 직접 입력이면 teamName을 넘긴다", () => {
    const result = validateSignup({ ...validSignup, team: NEW_TEAM_VALUE, newTeamName: " 디자인팀 " });
    expect(result).toEqual({
      ok: true,
      data: { email: "minsu@example.com", password: "password1", nickname: "민수", teamName: "디자인팀" },
    });
  });

  it("새 팀 이름이 비었거나 30자를 넘으면 거부한다", () => {
    const empty = validateSignup({ ...validSignup, team: NEW_TEAM_VALUE, newTeamName: "  " });
    expect(empty.ok).toBe(false);
    if (!empty.ok) expect(empty.errors.newTeamName).toBeDefined();

    const long = validateSignup({ ...validSignup, team: NEW_TEAM_VALUE, newTeamName: "가".repeat(31) });
    expect(long.ok).toBe(false);
  });

  it("팀을 고르지 않았거나 숫자가 아닌 값이면 거부한다", () => {
    for (const team of ["", "abc", "1; drop table teams"]) {
      const result = validateSignup({ ...validSignup, team });
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.errors.team).toBeDefined();
    }
  });

  it("비밀번호는 8자 이상, 닉네임은 1~20자여야 한다", () => {
    const short = validateSignup({ ...validSignup, password: "1234567" });
    expect(short.ok).toBe(false);
    if (!short.ok) expect(short.errors.password).toBeDefined();

    const noNick = validateSignup({ ...validSignup, nickname: "   " });
    expect(noNick.ok).toBe(false);
    if (!noNick.ok) expect(noNick.errors.nickname).toBeDefined();

    const longNick = validateSignup({ ...validSignup, nickname: "가".repeat(21) });
    expect(longNick.ok).toBe(false);
  });

  it("여러 필드 오류를 한 번에 돌려준다", () => {
    const result = validateSignup({ email: "", password: "", nickname: "", team: "", newTeamName: "" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(Object.keys(result.errors).sort()).toEqual(["email", "nickname", "password", "team"]);
    }
  });
});
