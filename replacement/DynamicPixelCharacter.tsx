import React from "react";

interface DynamicPixelCharacterProps {
  bodyType?: "bunny" | "kitty" | "bear" | "elf" | "human";
  hairColorName?: string;
  accessoryType?: "coffee" | "gamepad" | "umbrella" | "shades" | "dumbbells" | "none";
}

const colors: Record<string, string> = {
  pink: "#ff5bd6", violet: "#a978ff", green: "#61f0bd",
  cyan: "#62eaff", yellow: "#ffe66d", orange: "#ffad66", grey: "#b9b7cf"
};

export default function DynamicPixelCharacter({
  hairColorName = "violet",
  accessoryType = "none"
}: DynamicPixelCharacterProps) {
  const accent = colors[hairColorName] ?? colors.violet;

  return (
    <div className="relative flex min-h-[270px] w-full items-center justify-center overflow-hidden">
      <div className="absolute h-44 w-44 rounded-full bg-secondary/10 blur-2xl" />
      <svg
        viewBox="0 0 240 280"
        role="img"
        aria-label="보라색 헤드폰을 착용한 귀여운 픽셀 우주복 캐릭터"
        className="relative z-10 h-auto w-full max-w-[230px] drop-shadow-[10px_12px_0_rgba(0,0,0,0.35)]"
        style={{ imageRendering: "pixelated" }}
      >
        <rect x="116" y="0" width="8" height="16" fill={accent} />
        <rect x="108" y="16" width="24" height="18" fill="#f4f0ff" />
        <rect x="54" y="52" width="18" height="78" fill="#6f45c9" />
        <rect x="168" y="52" width="18" height="78" fill="#6f45c9" />
        <rect x="68" y="34" width="104" height="18" fill="#8f64e8" />
        <rect x="84" y="24" width="72" height="14" fill="#a98bff" />
        <rect x="44" y="76" width="18" height="46" fill="#9b73f2" />
        <rect x="178" y="76" width="18" height="46" fill="#9b73f2" />
        <rect x="72" y="42" width="96" height="18" fill="#f7f4ff" />
        <rect x="60" y="58" width="120" height="82" fill="#f7f4ff" />
        <rect x="70" y="72" width="100" height="56" fill="#221434" />
        <rect x="80" y="80" width="80" height="40" fill="#fffaff" />
        <rect x="92" y="94" width="12" height="14" fill="#49326e" />
        <rect x="136" y="94" width="12" height="14" fill="#49326e" />
        <rect x="110" y="108" width="20" height="8" fill={accent} />
        <rect x="78" y="116" width="20" height="6" fill="#ff9fce" />
        <rect x="142" y="116" width="20" height="6" fill="#ff9fce" />
        <rect x="98" y="136" width="44" height="18" fill="#d8d1ec" />
        <rect x="104" y="140" width="32" height="12" fill={accent} />
        <rect x="72" y="150" width="96" height="70" fill="#f6f2ff" />
        <rect x="84" y="160" width="72" height="44" fill="#e9e3f6" />
        <rect x="94" y="168" width="52" height="22" fill="#2b193f" />
        <rect x="104" y="174" width="12" height="10" fill="#5ff0bd" />
        <rect x="122" y="174" width="14" height="10" fill={accent} />
        <rect x="48" y="158" width="24" height="58" fill="#f6f2ff" />
        <rect x="168" y="158" width="24" height="58" fill="#f6f2ff" />
        <rect x="40" y="176" width="16" height="34" fill="#d8d1ec" />
        <rect x="184" y="176" width="16" height="34" fill="#d8d1ec" />
        <rect x="72" y="220" width="96" height="18" fill="#3b2455" />
        <rect x="112" y="222" width="18" height="14" fill={accent} />
        <rect x="80" y="238" width="34" height="30" fill="#f6f2ff" />
        <rect x="126" y="238" width="34" height="30" fill="#f6f2ff" />
        <rect x="72" y="264" width="46" height="14" fill="#7053aa" />
        <rect x="122" y="264" width="46" height="14" fill="#7053aa" />

        {accessoryType === "coffee" && <>
          <rect x="194" y="176" width="24" height="30" fill="#e6c6a4" />
          <rect x="198" y="172" width="16" height="6" fill="#7b4326" />
        </>}
        {accessoryType === "gamepad" && <>
          <rect x="190" y="182" width="38" height="24" fill="#302044" />
          <rect x="196" y="190" width="12" height="5" fill="#63eaff" />
          <rect x="200" y="186" width="5" height="13" fill="#63eaff" />
        </>}
        {accessoryType === "umbrella" && <>
          <rect x="206" y="120" width="6" height="102" fill="#a98bff" />
          <path d="M176 126 L209 92 L234 126 Z" fill={accent} />
        </>}
        {accessoryType === "shades" && <>
          <rect x="82" y="88" width="30" height="14" fill="#211330" />
          <rect x="128" y="88" width="30" height="14" fill="#211330" />
          <rect x="112" y="92" width="16" height="5" fill="#211330" />
        </>}
      </svg>
    </div>
  );
}
