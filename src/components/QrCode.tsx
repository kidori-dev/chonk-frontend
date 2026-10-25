"use client";

import Image from "next/image";
import QRCode from "qrcode";
import { useEffect, useState } from "react";

/** 글자(주소 등)를 QR 코드 그림으로 보여준다. 휴대폰 지갑 앱으로 찍어 주소를 바로 넣을 수 있다 */
export default function QrCode({ value, size = 160 }: { value: string; size?: number }) {
  const [src, setSrc] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // 갈색 점(사이트 글자색) + 흰 바탕. 확대해도 깨지지 않게 크게 만든다
    QRCode.toDataURL(value, { margin: 1, width: size * 3, color: { dark: "#5b2e14", light: "#ffffff" } })
      .then((url) => !cancelled && setSrc(url))
      .catch(() => !cancelled && setSrc(null));
    return () => {
      cancelled = true;
    };
  }, [value, size]);

  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-lg border border-foreground/10 bg-white p-2"
      style={{ width: size + 18, height: size + 18 }}
    >
      {src ? (
        <Image src={src} alt="입금 주소 QR 코드" width={size} height={size} unoptimized />
      ) : (
        <span className="text-xs text-foreground/40">QR 만드는 중...</span>
      )}
    </div>
  );
}
