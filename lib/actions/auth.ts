"use server";

import { redirect } from "next/navigation";
import {
  validateLogin,
  validateSignup,
  type FieldErrors,
} from "@/lib/auth-validation";
import { createClient } from "@/lib/supabase/server";

export type AuthFormState = {
  errors?: FieldErrors;
  message?: string;
  /** 오류 후 입력값을 유지하기 위해 되돌려준다(비밀번호 제외). */
  values?: Record<string, string>;
} | undefined;

function str(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

export async function login(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = { email: str(formData, "email") };
  const parsed = validateLogin({ email: values.email, password: str(formData, "password") });
  if (!parsed.ok) return { errors: parsed.errors, values };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { message: "이메일 또는 비밀번호가 올바르지 않습니다.", values };
  }
  redirect("/");
}

export async function signup(_state: AuthFormState, formData: FormData): Promise<AuthFormState> {
  const values = {
    email: str(formData, "email"),
    nickname: str(formData, "nickname"),
    team: str(formData, "team"),
    newTeamName: str(formData, "newTeamName"),
  };
  const parsed = validateSignup({ ...values, password: str(formData, "password") });
  if (!parsed.ok) return { errors: parsed.errors, values };

  const { email, password, nickname, teamId, teamName } = parsed.data;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    // 가입 트리거(handle_new_user)가 이 metadata로 profiles·teams를 만든다.
    options: {
      data: {
        nickname,
        ...(teamId !== undefined ? { team_id: teamId } : { team_name: teamName }),
      },
    },
  });

  if (error) {
    const messages: Record<string, string> = {
      user_already_exists: "이미 가입된 이메일입니다.",
      weak_password: "비밀번호가 너무 약합니다. 더 길고 복잡하게 입력하세요.",
      email_address_invalid: "사용할 수 없는 이메일 주소입니다. 다른 이메일을 입력하세요.",
      over_email_send_rate_limit:
        "인증 메일 발송 한도를 초과했습니다. 잠시(약 1시간) 뒤 다시 시도하거나 관리자에게 문의하세요.",
    };
    const known = error.code ? messages[error.code] : undefined;
    if (!known) console.error("signup failed:", error.status, error.code, error.message);
    return { message: known ?? "가입에 실패했습니다. 잠시 후 다시 시도하세요.", values };
  }

  // 이메일 인증이 켜져 있으면 세션이 없다. 계획은 "인증 끔"이라 정상 경로에선 세션이 있다.
  if (!data.session) {
    return { message: "가입 확인 메일이 발송되었습니다. 메일의 링크를 누른 뒤 로그인하세요.", values };
  }
  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
