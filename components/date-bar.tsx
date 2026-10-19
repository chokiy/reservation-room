"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { formatDateLabel, shiftDate } from "@/lib/grid";

const buttonClass =
  "rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm text-zinc-700 hover:bg-zinc-100";

// 오늘 날짜는 URL에 두지 않고(?date 없음) 기본값으로 처리한다.
function hrefFor(date: string, today: string) {
  return date === today ? "/" : `/?date=${date}`;
}

export function DateBar({ date, today }: { date: string; today: string }) {
  const router = useRouter();

  return (
    <nav aria-label="날짜 이동" className="flex flex-wrap items-center gap-2">
      <Link href={hrefFor(shiftDate(date, -1), today)} className={buttonClass} aria-label="전날">
        ◀
      </Link>
      <h2 className="min-w-40 text-center text-lg font-semibold text-[#1e2a5a]">{formatDateLabel(date)}</h2>
      <Link href={hrefFor(shiftDate(date, 1), today)} className={buttonClass} aria-label="다음날">
        ▶
      </Link>
      <Link href="/" className={buttonClass}>
        오늘
      </Link>
      <input
        type="date"
        value={date}
        aria-label="날짜 선택"
        onChange={(event) => {
          // 지우기 등으로 빈 값이 오면 무시한다.
          if (event.target.value) router.push(hrefFor(event.target.value, today));
        }}
        className="rounded-md border border-zinc-300 bg-white px-2 py-1.5 text-sm text-zinc-700"
      />
    </nav>
  );
}
