"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signup } from "@/lib/actions/auth";
import { NEW_TEAM_VALUE } from "@/lib/auth-validation";
import { Field, FormMessage, SubmitButton, inputClass } from "@/components/auth-ui";

type Team = { id: number; name: string };

export function SignupForm({ teams }: { teams: Team[] }) {
  const [state, action, pending] = useActionState(signup, undefined);
  // 입력 직후 값을 추적하고, 서버가 돌려준 값이 있으면 그것을 우선한다.
  // (폼 액션이 끝나면 React가 폼을 초기화하므로 select는 defaultValue로도 복원해야 한다.)
  const [picked, setPicked] = useState<string | null>(null);
  const team = picked ?? state?.values?.team ?? "";
  const isNewTeam = team === NEW_TEAM_VALUE;

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
      <Field label="비밀번호 (8자 이상)" htmlFor="password" error={state?.errors?.password}>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          className={inputClass}
        />
      </Field>
      <Field label="닉네임" htmlFor="nickname" error={state?.errors?.nickname}>
        <input
          id="nickname"
          name="nickname"
          autoComplete="nickname"
          defaultValue={state?.values?.nickname}
          className={inputClass}
        />
      </Field>
      <Field label="팀" htmlFor="team" error={state?.errors?.team}>
        <select
          id="team"
          name="team"
          key={state?.values?.team ?? ""}
          defaultValue={team}
          onChange={(event) => setPicked(event.target.value)}
          className={inputClass}
        >
          <option value="">팀을 선택하세요</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
          <option value={NEW_TEAM_VALUE}>새 팀 직접 입력</option>
        </select>
      </Field>
      {isNewTeam && (
        <Field label="새 팀 이름" htmlFor="newTeamName" error={state?.errors?.newTeamName}>
          <input
            id="newTeamName"
            name="newTeamName"
            defaultValue={state?.values?.newTeamName}
            className={inputClass}
          />
        </Field>
      )}
      <SubmitButton pending={pending}>가입하기</SubmitButton>
      <p className="text-center text-sm text-zinc-500">
        이미 계정이 있나요?{" "}
        <Link href="/login" className="font-medium text-[#1e2a5a] hover:underline">
          로그인
        </Link>
      </p>
    </form>
  );
}
