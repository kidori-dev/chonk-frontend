"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError, login, loginDemo } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(email, password);
      router.replace("/");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setError("이메일 또는 비밀번호가 올바르지 않습니다");
      else if (err instanceof ApiError && err.status === 429) setError("시도가 너무 많습니다. 1분 뒤에 다시 시도해 주세요");
      else setError(err instanceof Error ? err.message : "로그인에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        {/* 심술냥이 */}
        <Image
          src="/images/cat-grumpy.png"
          alt="Chonk"
          width={512}
          height={539}
          priority
          className="mx-auto h-auto w-40"
        />
        <h1 className="text-center text-2xl font-bold">Chonk 로그인</h1>
        <input
          type="email"
          required
          placeholder="이메일"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 outline-primary"
        />
        <input
          type="password"
          required
          minLength={8}
          placeholder="비밀번호"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 outline-primary"
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-md bg-primary py-2 font-medium text-white disabled:opacity-50"
        >
          {loading ? "로그인 중..." : "로그인"}
        </button>
        {/* 백엔드 없이 둘러보기용 */}
        <button
          type="button"
          onClick={() => {
            loginDemo();
            router.replace("/");
          }}
          className="w-full rounded-md border border-primary/40 py-2 font-medium text-primary hover:bg-primary/5"
        >
          demo 로그인
        </button>
      </form>
    </main>
  );
}
