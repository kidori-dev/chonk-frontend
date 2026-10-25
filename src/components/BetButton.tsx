import Link from "next/link";

import type { Bet } from "@/lib/api";

/**
 * 블록 게임의 "배팅하기" 버튼. 누르면 바로 포인트가 빠지고 취소할 수 없다.
 * 로그인 전이면 로그인 버튼, 이번 라운드에 이미 걸었으면 완료 표시를 보여준다
 */
export default function BetButton({
  loggedIn,
  amount,
  placed,
  placing,
  disabled,
  onClick,
}: {
  loggedIn: boolean;
  amount: number;
  /** 이번 라운드에 건 배팅 */
  placed: Bet | null;
  placing: boolean;
  /** 마감됐거나 아직 고르지 않았을 때 */
  disabled: boolean;
  onClick: () => void;
}) {
  const base = "mt-3 block w-full rounded-md py-3 text-center text-base font-black transition";

  if (!loggedIn) {
    return (
      <Link href="/login" className={`${base} bg-primary/10 text-primary hover:bg-primary/20`}>
        로그인하고 배팅하기
      </Link>
    );
  }
  if (placed) {
    return (
      <div className={`${base} bg-primary text-white shadow-md`}>
        ✓ #{placed.targetBlockNumber?.toLocaleString()} {Number(placed.amount).toLocaleString()} 코인 배팅 완료
      </div>
    );
  }
  return (
    <button
      onClick={onClick}
      disabled={disabled || placing}
      className={`${base} bg-primary text-white hover:opacity-90 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100`}
    >
      {placing ? "배팅하는 중..." : `${amount} 코인 배팅하기`}
    </button>
  );
}
