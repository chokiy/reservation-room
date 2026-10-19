"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/lib/actions/auth";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/auth-ui";

export function LoginForm() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage message={state?.message} />
      <Field label="이메일" htmlFor="email" error={state?.errors?.email}>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state?.values?.email}
          className={inputClass}
        />
      </Field>
      <Field label="비밀번호" htmlFor="password" error={state?.errors?.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          className={inputClass}
        />
      </Field>
      <SubmitButton pending={pending}>로그인</SubmitButton>
      <p className="text-center text-sm text-zinc-500">
        계정이 없나요?{" "}
        <Link href="/signup" className="font-medium text-[#1e2a5a] hover:underline">
          회원가입
        </Link>
      </p>
    </form>
  );
}
