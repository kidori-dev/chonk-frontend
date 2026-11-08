"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 블록 게임 화면(넓은 화면)에서 왼쪽 '지난 라운드' 목록의 아래 끝을 오른쪽 칸(배팅 + 내 자산)의 아래 끝에 맞춘다.
 * 넘치는 줄은 목록 안에서 스크롤한다. 모바일(1024px 미만)은 그대로 다 보여준다.
 * 페이지 격자는 lg:grid-rows-[auto_1fr] 여야 한다. 오른쪽 칸이 더 길 때 남는 높이가 위 칸(게임판)으로 가면 목록이 밀려 어긋난다
 *
 * ready: 목록이 화면에 그려졌는지 (불러오기 전에는 목록이 없는 페이지가 있다)
 */
export function useMatchHeight(ready = true) {
  const asideRef = useRef<HTMLElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [height, setHeight] = useState<number | null>(null);

  useEffect(() => {
    const aside = asideRef.current;
    const list = listRef.current;
    const grid = aside?.parentElement;
    if (!aside || !list || !grid) return;
    const wide = window.matchMedia("(min-width: 1024px)");

    const measure = () => {
      if (!wide.matches) return setHeight(null);
      // 오른쪽 칸은 sticky 라 스크롤하면 움직인다. 원래 자리(격자 맨 위)를 기준으로 계산한다
      const gridTop = grid.getBoundingClientRect().top + parseFloat(getComputedStyle(grid).paddingTop);
      const listTop = list.getBoundingClientRect().top - gridTop;
      setHeight(Math.max(240, Math.round(aside.offsetHeight - listTop)));
    };

    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(aside);
    observer.observe(grid);
    wide.addEventListener("change", measure);
    return () => {
      observer.disconnect();
      wide.removeEventListener("change", measure);
    };
  }, [ready]);

  return {
    asideRef,
    listRef,
    /** 목록(ul)에 넣는 style */
    listStyle: height ? { maxHeight: height } : undefined,
  };
}
