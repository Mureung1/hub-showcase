"use client";

import { useEffect, useRef } from "react";
import { themeSoundSrc } from "@/app/lib/theme";

// T24: 화면에는 아무것도 안 그리고, 테마별 배경음만 관리하는 컴포넌트.
// enabled: 스피커 아이콘으로 켠 상태인지. volume: 0~1(감각 강도 다이얼 값을 그대로 씀).
// 브라우저 자동재생 정책 때문에 소리는 사용자가 스피커 아이콘을 눌러 enabled를 true로
// 바꾸는 그 클릭(사용자 동작) 시점에만 실제로 재생을 시작할 수 있다.
export default function ThemeSound({ theme, enabled, volume }) {
  const audioRef = useRef(null);
  const src = themeSoundSrc(theme);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = volume;
  }, [volume]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (enabled) {
      audio.play().catch(() => {
        // 사용자 동작 없이 자동재생이 막힌 경우: 스피커 아이콘을 다시 누르면 그때 재생된다.
      });
    } else {
      audio.pause();
    }
  }, [enabled, src]);

  return <audio ref={audioRef} src={src} loop aria-hidden="true" />;
}
