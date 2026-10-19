import type { Metadata } from "next";
import { Suspense } from "react";
import { AuthCard } from "@/components/auth-ui";
import { SignupForm } from "@/components/signup-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "회원가입 · 회의실 예약" };

export default function SignupPage() {
  return (
    <AuthCard title="회원가입">
      <Suspense fallback={<p className="text-sm text-zinc-500">불러오는 중…</p>}>
        <SignupFormWithTeams />
      </Suspense>
    </AuthCard>
  );
}

async function SignupFormWithTeams() {
  const supabase = await createClient();
  const { data: teams } = await supabase.from("teams").select("id, name").order("id");
  return <SignupForm teams={teams ?? []} />;
}
