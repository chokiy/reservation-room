import { Suspense } from "react";
import { Header, UserMenu } from "@/components/header";

export default function Home() {
  return (
    <>
      <Header
        userMenu={
          <Suspense fallback={<span className="text-sm text-zinc-400">…</span>}>
            <UserMenu />
          </Suspense>
        }
      />
      <main className="flex flex-1 items-center justify-center bg-zinc-50">
        <p className="text-zinc-500">현황 그리드는 M3에서 만듭니다.</p>
      </main>
    </>
  );
}
