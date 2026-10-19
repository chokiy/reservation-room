import type { ReactNode } from "react";

export const inputClass =
  "w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm outline-none focus:border-[#1e2a5a] focus:ring-1 focus:ring-[#1e2a5a] disabled:bg-zinc-100";

export function AuthCard({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h1 className="mb-1 text-xl font-semibold text-[#1e2a5a]">회의실 예약</h1>
        <p className="mb-5 text-sm text-zinc-500">{title}</p>
        {children}
      </div>
    </main>
  );
}

export function Field({
  label,
  htmlFor,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-sm font-medium text-zinc-700">
        {label}
      </label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}

export function FormMessage({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
      {message}
    </p>
  );
}

export function SubmitButton({ pending, children }: { pending: boolean; children: ReactNode }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full rounded-md bg-[#1e2a5a] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a3a78] disabled:opacity-60"
    >
      {pending ? "처리 중…" : children}
    </button>
  );
}
