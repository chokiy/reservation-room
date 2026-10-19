import Link from "next/link";
import { connection } from "next/server";
import { logout } from "@/lib/actions/auth";
import { createClient } from "@/lib/supabase/server";

// 세션을 읽는 컴포넌트라 호출하는 쪽에서 <Suspense>로 감싸야 한다.
export async function UserMenu() {
  // 세션 검증이 현재 시각(Date.now)을 쓰므로 요청 시점에 렌더링한다.
  await connection();
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;

  const { data: profile } = userId
    ? await supabase.from("profiles").select("nickname, teams(name)").eq("id", userId).maybeSingle()
    : { data: null };

  // 생성된 타입이 to-one 조인을 배열로 추론하므로 두 형태를 모두 받는다.
  const team = Array.isArray(profile?.teams) ? profile.teams[0] : profile?.teams;
  const teamName = team?.name;
  const label = profile ? `${profile.nickname}${teamName ? ` (${teamName})` : ""}` : "";

  return (
    <div className="flex items-center gap-3 text-sm">
      <span className="font-medium text-zinc-700">{label}</span>
      <form action={logout}>
        <button
          type="submit"
          className="rounded-md border border-zinc-300 px-3 py-1 text-zinc-600 hover:bg-zinc-100"
        >
          로그아웃
        </button>
      </form>
    </div>
  );
}

export function Header({ userMenu }: { userMenu: React.ReactNode }) {
  return (
    <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-4 py-3">
      <div className="flex items-center gap-4">
        <h1 className="text-lg font-semibold text-[#1e2a5a]">
          <Link href="/">회의실 예약</Link>
        </h1>
        <Link href="/my" className="text-sm text-zinc-600 hover:text-[#1e2a5a]">
          내 예약
        </Link>
      </div>
      {userMenu}
    </header>
  );
}
