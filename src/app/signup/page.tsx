"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ApiError, register } from "@/lib/api";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [passwordCheck, setPasswordCheck] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    if (password !== passwordCheck) {
      setError("비밀번호가 서로 다릅니다");
      return;
    }
    setLoading(true);
    try {
      await register(email, password, name.trim() || undefined);
      // 가입하면 바로 로그인된다. 입금 주소부터 보여준다
      router.replace("/deposit");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) setError("이미 가입된 이메일입니다");
      else if (err instanceof ApiError && err.status === 429) setError("시도가 너무 많습니다. 1분 뒤에 다시 시도해 주세요");
      else setError(err instanceof Error ? err.message : "가입에 실패했습니다");
    } finally {
      setLoading(false);
    }
  }

  const input = "w-full rounded-md border border-foreground/20 bg-transparent px-3 py-2 outline-primary";

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-10">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4">
        <Image src="/images/cat-happy.png" alt="Chonk" width={512} height={539} priority className="mx-auto h-auto w-32" />
        <h1 className="text-center text-2xl font-bold">Chonk 회원가입</h1>
        <input
          type="email"
          required
          placeholder="이메일"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
        <input
          type="text"
          maxLength={100}
          placeholder="이름 (선택)"
          autoComplete="nickname"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className={input}
        />
        <input
          type="password"
          required
          minLength={8}
          maxLength={72}
          placeholder="비밀번호 (8자 이상)"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={input}
        />
        <input
          type="password"
          required
          minLength={8}
          maxLength={72}
          placeholder="비밀번호 확인"
          autoComplete="new-password"
          value={passwordCheck}
          onChange={(e) => setPasswordCheck(e.target.value)}
          className={input}
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button type="submit" disabled={loading} className="w-full rounded-md bg-primary py-2 font-medium text-white disabled:opacity-50">
          {loading ? "가입하는 중..." : "가입하기"}
        </button>
        <p className="text-center text-sm text-foreground/60">
          이미 계정이 있나요?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            로그인
          </Link>
        </p>
      </form>
    </main>
  );
}
