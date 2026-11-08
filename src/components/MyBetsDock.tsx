"use client";

import { usePathname } from "next/navigation";
import { useState, useSyncExternalStore } from "react";

import WalletCard from "@/components/WalletCard";
import { hasTokens } from "@/lib/api";
import { getAutoBets, getServerAutoBets, subscribeAutoBets } from "@/lib/autoBet";

// 토큰은 localStorage 에 있으니 클라이언트에서만 읽는다
const subscribeNothing = () => () => {};

/** 오른쪽에 내 자산 카드가 이미 있는 게임 화면 (넓은 화면에서는 이 패널을 숨긴다) */
const PAGES_WITH_CARD = ["eth-hash", "cat-race", "block-match", "dice", "ladder", "lottery"].map((g) => `/games/${g}`);

/**
 * 모든 페이지에 떠 있는 '내 배팅' 버튼. 누르면 내 자산 카드(모든 게임 공유)를 펼친다.
 * 레이아웃에 있어서 페이지를 옮겨도 그대로다.
 * 모바일은 오른쪽 위(게임 화면 배팅 카드가 아래에 떠 있어서), 넓은 화면은 왼쪽 아래(마켓 푸터 줄보다 위)
 */
export default function MyBetsDock() {
  const loggedIn = useSyncExternalStore(subscribeNothing, hasTokens, () => false);
  const { autos, notices } = useSyncExternalStore(subscribeAutoBets, getAutoBets, getServerAutoBets);
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  if (!loggedIn) return null;

  const autoCount = Object.keys(autos).length;
  const hasNotice = Object.keys(notices).length > 0;
  const hideOnWide = PAGES_WITH_CARD.includes(pathname);

  return (
    <div className={`fixed top-16 right-3 z-30 lg:top-auto lg:right-auto lg:bottom-24 lg:left-6 ${hideOnWide ? "lg:hidden" : ""}`}>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="ml-auto flex items-center gap-1.5 rounded-full border border-foreground/10 bg-white px-3.5 py-2 text-sm font-bold shadow-lg hover:bg-orange-50 lg:ml-0"
      >
        📋 내 배팅
        {autoCount > 0 && <span className="rounded-full bg-eth px-2 py-0.5 text-[11px] text-white">자동 {autoCount}</span>}
        {hasNotice && <span className="h-2 w-2 rounded-full bg-red-500" aria-label="멈춘 자동배팅 있음" />}
      </button>

      {open && (
        <div className="animate-pop absolute top-full right-0 mt-2 max-h-[75vh] w-[22rem] max-w-[calc(100vw-1.5rem)] overflow-y-auto rounded-xl shadow-xl lg:top-auto lg:right-auto lg:bottom-full lg:left-0 lg:mt-0 lg:mb-2">
          <WalletCard className="shadow-none" />
        </div>
      )}
    </div>
  );
}
