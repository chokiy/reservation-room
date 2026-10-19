import type { Metadata } from "next";
import { AuthCard } from "@/components/auth-ui";
import { LoginForm } from "@/components/login-form";

export const metadata: Metadata = { title: "로그인 · 회의실 예약" };

export default function LoginPage() {
  return (
    <AuthCard title="로그인">
      <LoginForm />
    </AuthCard>
  );
}
