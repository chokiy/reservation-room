"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** 현재 시각 기준 표시("지금 비어있는 방", 현재 시각선)를 최신으로 유지하려고 주기적으로 서버 데이터를 다시 받는다. */
export function AutoRefresh({ intervalMs = 60_000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, intervalMs);
    return () => clearInterval(id);
  }, [router, intervalMs]);

  return null;
}
