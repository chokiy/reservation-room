import { Suspense } from "react";
import { Header, UserMenu } from "@/components/header";
import { ScheduleView } from "@/components/schedule-view";

export default function Home({ searchParams }: PageProps<"/">) {
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
        <Suspense fallback={<p className="p-4 text-sm text-zinc-500">현황을 불러오는 중…</p>}>
          <ScheduleView searchParams={searchParams} />
        </Suspense>
      </main>
    </>
  );
}
