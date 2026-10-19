import Link from "next/link";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { Suspense } from "react";
import { Header, UserMenu } from "@/components/header";
import { MyReservationList } from "@/components/my-reservation-list";
import { getMyReservations } from "@/lib/data/schedule";
import { getSeoulNow } from "@/lib/grid";
import { createClient } from "@/lib/supabase/server";

async function MyReservations() {
  await connection(); // 아래에서 현재 시각을 읽는다
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims.sub;
  if (!userId) redirect("/login");

  const [reservations, roomsResult] = await Promise.all([
    getMyReservations(userId, getSeoulNow().date),
    supabase.from("rooms").select("id, name").order("id"),
  ]);
  if (roomsResult.error) throw new Error(`회의실을 불러오지 못했습니다: ${roomsResult.error.message}`);

  return <MyReservationList reservations={reservations} rooms={roomsResult.data} userId={userId} />;
}

export default function MyPage() {
  return (
    <>
      <Header
        userMenu={
          <Suspense fallback={<span className="text-sm text-zinc-400">…</span>}>
            <UserMenu />
          </Suspense>
        }
      />
      <main className="flex-1 bg-zinc-50">
        <div className="mx-auto flex w-full max-w-2xl flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-[#1e2a5a]">내 예약</h2>
            <Link href="/" className="text-sm text-zinc-600 underline">
              현황으로 돌아가기
            </Link>
          </div>
          <p className="text-xs text-zinc-500">내가 만들었거나 참석자로 지정된, 오늘 이후의 예약입니다.</p>
          <Suspense fallback={<p className="text-sm text-zinc-500">내 예약을 불러오는 중…</p>}>
            <MyReservations />
          </Suspense>
        </div>
      </main>
    </>
  );
}
