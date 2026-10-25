"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import AccountMenu from "@/components/AccountMenu";
import QrCode from "@/components/QrCode";
import {
  ApiError,
  getDepositInfo,
  getPointHistory,
  hasTokens,
  type DepositInfo,
  type PointHistoryItem,
} from "@/lib/api";
import { addressUrl, txUrl } from "@/lib/betting";

const CHAIN_NAME: Record<number, string> = { 1: "Ethereum", 11155111: "Sepolia" };

/**
 * 입금. 내 입금 주소(처음 열면 서버가 발급)와 받는 토큰, 최근 입금 내역을 보여준다.
 * 토큰을 보내면 finalized 블록에서 확인된 뒤(약 15분) 포인트가 적립된다
 */
export default function DepositPage() {
  const router = useRouter();
  const [info, setInfo] = useState<DepositInfo | null>(null);
  const [deposits, setDeposits] = useState<PointHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!hasTokens()) {
      router.replace("/login");
      return;
    }
    getDepositInfo()
      .then(setInfo)
      .catch((err) => {
        if (err instanceof ApiError && err.status === 401) router.replace("/login");
        else setError(err instanceof Error ? err.message : "입금 주소를 불러오지 못했습니다");
      });
    getPointHistory(50, 0)
      .then(({ items }) => setDeposits(items.filter((h) => h.type === "deposit")))
      .catch(() => {});
  }, [router]);

  async function copy() {
    if (!info) return;
    await navigator.clipboard.writeText(info.address);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const symbols = info?.currencies.map((c) => c.symbol).join(", ");

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-foreground/10">
        <div className="mx-auto flex max-w-2xl items-center gap-3 px-4 py-3">
          <Link href="/" className="text-sm text-foreground/60 hover:text-foreground">
            ← 마켓
          </Link>
          <h1 className="font-bold">입금하기</h1>
          <div className="ml-auto">
            <AccountMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
        {error && <p className="rounded-md bg-red-50 px-4 py-3 text-sm text-red-600">{error}</p>}

        {/* 내 입금 주소 */}
        <section className="rounded-xl border border-foreground/10 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">내 입금 주소</h2>
            {info && (
              <span className="rounded-full bg-eth/10 px-2.5 py-0.5 text-xs font-bold text-eth">
                {CHAIN_NAME[info.chainId] ?? `chain ${info.chainId}`}
              </span>
            )}
          </div>
          {info ? (
            <>
              {/* QR(지갑 앱으로 찍기) + 주소. 좁은 화면에서는 QR 이 위로 */}
              <div className="mt-3 flex flex-col items-center gap-4 sm:flex-row sm:items-stretch">
                <QrCode value={info.address} />
                <div className="flex w-full min-w-0 flex-col justify-center">
                  <p className="rounded-lg bg-foreground/5 px-4 py-3 font-mono text-sm break-all">{info.address}</p>
                  <div className="mt-3 flex gap-2">
                    <button onClick={copy} className="flex-1 rounded-md bg-primary py-2 text-sm font-bold text-white hover:opacity-90">
                      {copied ? "✓ 복사했어요" : "주소 복사"}
                    </button>
                    <a
                      href={addressUrl(info.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-md border border-foreground/15 px-4 py-2 text-sm hover:bg-foreground/5"
                    >
                      이더스캔
                    </a>
                  </div>
                  <p className="mt-2 text-xs text-foreground/50">휴대폰 지갑 앱으로 QR 을 찍으면 주소가 바로 들어가요</p>
                </div>
              </div>
              <ul className="mt-4 list-disc space-y-1 pl-5 text-xs text-foreground/60">
                <li>
                  이 주소로 <b className="text-foreground">{symbols || "등록된 토큰"}</b> 만 보내 주세요. ETH 나 다른 토큰은 적립되지 않아요.
                </li>
                <li>보낸 뒤 블록이 최종 확정(finalized)되면 약 15분 안에 포인트가 들어와요.</li>
                <li>이 주소는 내 계정 전용이에요. 여러 번 보내도 같은 주소를 쓰면 돼요.</li>
              </ul>
            </>
          ) : (
            !error && <p className="mt-3 text-sm text-foreground/50">불러오는 중...</p>
          )}
        </section>

        {/* 받는 토큰 */}
        {info && (
          <section className="rounded-xl border border-foreground/10 bg-white p-5 shadow-sm">
            <h2 className="font-semibold">받는 토큰</h2>
            {info.currencies.length === 0 ? (
              <p className="mt-3 text-sm text-foreground/50">아직 받는 토큰이 없어요</p>
            ) : (
              <ul className="mt-3 divide-y divide-foreground/10">
                {info.currencies.map((c) => (
                  <li key={c.address} className="flex items-center gap-3 py-2.5 text-sm">
                    <b className="w-16 shrink-0">{c.symbol}</b>
                    <a
                      href={addressUrl(c.address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-w-0 truncate font-mono text-xs text-blue-600 hover:underline"
                    >
                      {c.address}
                    </a>
                    <span className="ml-auto shrink-0 text-xs text-foreground/60">
                      1 {c.symbol} = <b className="text-primary">{c.pointRatio} P</b>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        {/* 최근 입금 */}
        <section className="space-y-3">
          <h2 className="font-semibold">최근 입금</h2>
          {deposits.length === 0 ? (
            <p className="text-sm text-foreground/50">아직 확인된 입금이 없어요</p>
          ) : (
            <ul className="divide-y divide-foreground/10 rounded-lg border border-foreground/10 bg-white">
              {deposits.map((d) => (
                <li key={d.targetId} className="flex items-center gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium">
                      {d.tokenAmount} {d.symbol}
                    </p>
                    <p className="truncate text-xs text-foreground/50">
                      {new Date(d.createdAt).toLocaleString("ko-KR")}
                      {d.txHash && (
                        <a href={txUrl(d.txHash)} target="_blank" rel="noopener noreferrer" className="ml-2 font-mono text-blue-600 hover:underline">
                          {d.txHash.slice(0, 10)}…
                        </a>
                      )}
                    </p>
                  </div>
                  <span className="ml-auto shrink-0 font-bold tabular-nums text-accent">+{d.points} P</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}
