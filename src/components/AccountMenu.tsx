"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";

import { getMe, hasTokens, logout, type User } from "@/lib/api";

// 토큰은 localStorage 에 있으니 클라이언트에서만 읽는다
const subscribeNothing = () => () => {};

/** 화면 오른쪽 위 계정 메뉴. 로그인했으면 내 이메일(누르면 메뉴), 아니면 로그인 / 회원가입 버튼 */
export default function AccountMenu() {
  const router = useRouter();
  const loggedIn = useSyncExternalStore(subscribeNothing, hasTokens, () => false);
  const [user, setUser] = useState<User | null>(null);
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loggedIn) return;
    getMe()
      .then(setUser)
      .catch(() => setUser(null));
  }, [loggedIn]);

  // 메뉴 밖을 누르면 닫는다
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!loggedIn) {
    return (
      <div className="flex shrink-0 items-center gap-2 text-sm font-medium">
        <Link href="/login" className="rounded-md px-3 py-1.5 text-foreground/70 hover:text-foreground">
          로그인
        </Link>
        <Link href="/signup" className="rounded-md bg-primary px-3 py-1.5 text-white hover:opacity-90">
          회원가입
        </Link>
      </div>
    );
  }

  return (
    <div ref={box} className="relative shrink-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex max-w-[12rem] items-center gap-1.5 rounded-md border border-foreground/15 px-3 py-1.5 text-sm hover:bg-foreground/5 sm:max-w-xs"
        title={user?.email}
      >
        <span className="h-2 w-2 shrink-0 rounded-full bg-accent" />
        <span className="truncate">{user?.email ?? "내 계정"}</span>
        <span className="text-xs text-foreground/40">▾</span>
      </button>
      {open && (
        <div className="absolute right-0 z-30 mt-2 w-44 overflow-hidden rounded-md border border-foreground/10 bg-white text-sm shadow-lg">
          <Link href="/me" className="block px-4 py-2.5 hover:bg-foreground/5">
            내 포인트
          </Link>
          <Link href="/deposit" className="block px-4 py-2.5 hover:bg-foreground/5">
            입금하기
          </Link>
          <button
            onClick={async () => {
              await logout();
              router.replace("/login");
            }}
            className="block w-full border-t border-foreground/10 px-4 py-2.5 text-left text-red-500 hover:bg-foreground/5"
          >
            로그아웃
          </button>
        </div>
      )}
    </div>
  );
}
