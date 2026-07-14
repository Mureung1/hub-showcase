import React from "react";

// Extremely cute 16x16 hand-crafted pastel retro pixel graphics
const AVATAR_PALETTE: Record<string, string> = {
  '.': 'transparent',
  'k': '#2d144d', // Soft dark lavender outline (warmer than harsh black)
  'w': '#ffffff', // Snow white fur/body
  'p': '#ffccd5', // Pastel candy pink (blush / ears)
  'l': '#e2d5ff', // Fairy lavender
  'd': '#fff0e8', // Pure milky peach skin
  'y': '#ffe699', // Honey yellow
  'c': '#bdf4ff', // Cyber mint cyan
  'e': '#4f1a8c', // Deep cute violet eyes
  'r': '#ff6680', // Sweet strawberry red
};

export const CUTE_AVATAR_DATA: Record<string, { size: number; name: string; grid: string[] }> = {
  "cute-bunny": {
    size: 16,
    name: "볼빵빵 민트 아기토끼 (Mint Bunny)",
    grid: [
      "....kk....kk....",
      "...kcck..kcck...",
      "...kcpk..kcpk...",
      "..kccppkkppcck..",
      ".kcccccccccccck.",
      "kcccccccccccccck",
      "kcceccccccccceck",
      "kcecckkcckkcceck",
      "kcccccckkcccccck",
      "kccppccccccppcck",
      ".kcccccrrccccck.",
      "..kcccccccccck..",
      "...kkcccccckk...",
      ".....kkkkkk.....",
      "................",
      "................"
    ]
  },
  "cute-kitty": {
    size: 16,
    name: "초롱초롱 하얀 아기냥이 (Chorong Kitty)",
    grid: [
      "..kk........kk..",
      ".kwwk......kwwk.",
      "kwwppkkkkkkppwwk",
      "kwwwwwwwwwwwwwwk",
      "kwwwwwwwwwwwwwwk",
      "kwweewwwwwweewwk",
      "kweeeekwwkweeeek",
      "kwwwwwwkkwwwwwwk",
      "kwwppwwwwwwppwwk",
      ".kwwwwwrrwwwwwk.",
      "..kwwkkwwkkwwk..",
      "...kwwwwwwwwk...",
      "....kkkkkkkk....",
      "................",
      "................",
      "................"
    ]
  },
  "cute-poodle": {
    size: 16,
    name: "버터컵 뽀송 아기푸들 (Buttercup Puppy)",
    grid: [
      ".....kkkkkk.....",
      "...kkyyyyyykk...",
      "..kyyyyyyyyyyyk.",
      ".kyykkkkkkkkkyyk",
      "kyykwwyyyywwkyyk",
      "kyyewwyyyywwewyk",
      "kyywwkkwwkkwwyyk",
      "kyyyyykkyyyyyyyk",
      "kyyppwwwwwwppyyk",
      ".kyyyyyyryyyyyk.",
      "..kyyyyyyyyyyk..",
      "...kyyyyyyyyk...",
      "....kyyyyyyk....",
      ".....kkkkkk.....",
      "................",
      "................"
    ]
  },
  "cute-bear": {
    size: 16,
    name: "하트뿜뿜 핑크 아기곰 (Pinky Bear)",
    grid: [
      "..kkkk......kkkk",
      ".kppppk....kppppk",
      "kppwwppkkkkppwwpk",
      "kppppppppppppppk",
      "kppppppppppppppk",
      "kppeeppppppeeppk",
      "kpeeeekppkeeeepk",
      "kppppppkkppppppk",
      "kppwwppppppwwppk",
      ".kppppprrpppppk.",
      "..kppprrrrpppk..",
      "...kpprrrrkpp...",
      "....kkkkkkkk....",
      "................",
      "................",
      "................"
    ]
  },
  "cute-fairy": {
    size: 16,
    name: "은하수 라벤더 요정돌 (Galaxy Fairy)",
    grid: [
      "....kkkkkkkk....",
      "..kkllllllllkk..",
      ".kllllllllllllk.",
      "kllllllllllllllk",
      "kllyyddddddyyllk",
      "kllddwwddwwddllk",
      "kllddeeddeeddllk",
      "kllddddddddddllk",
      "kllddppddppddllk",
      ".klddddrrddddlk.",
      "..klddddddddlk..",
      ".kkkllllllllkkk.",
      "kwwkllllllllkwwk",
      ".kkkkkkkkkkkkkk.",
      "................",
      "................"
    ]
  }
};

interface AvatarRendererProps {
  avatarUrl: string;
  size?: number;
  className?: string;
}

export default function AvatarRenderer({ avatarUrl, size = 64, className = "" }: AvatarRendererProps) {
  // If it is one of our gorgeous custom pixel avatar IDs
  if (CUTE_AVATAR_DATA[avatarUrl]) {
    const data = CUTE_AVATAR_DATA[avatarUrl];
    const gridSize = data.size;

    // Build efficient vector path per color
    const colorPaths: Record<string, string> = {};
    for (let y = 0; y < gridSize; y++) {
      for (let x = 0; x < gridSize; x++) {
        const char = data.grid[y]?.[x];
        if (char && char !== '.' && AVATAR_PALETTE[char]) {
          if (!colorPaths[char]) {
            colorPaths[char] = "";
          }
          colorPaths[char] += `M${x},${y}h1v1h-1z `;
        }
      }
    }

    return (
      <svg
        viewBox={`0 0 ${gridSize} ${gridSize}`}
        width={size}
        height={size}
        style={{ imageRendering: "pixelated" }}
        className={`select-none pointer-events-none shrink-0 ${className}`}
      >
        {Object.entries(colorPaths).map(([char, pathData]) => (
          <path
            key={char}
            d={pathData}
            fill={AVATAR_PALETTE[char]}
          />
        ))}
      </svg>
    );
  }

  // Fallback to standard image rendering for legacy or external images
  return (
    <img
      src={avatarUrl}
      alt="User Avatar"
      width={size}
      height={size}
      className={`object-cover rounded-none shrink-0 ${className}`}
      onError={(e) => {
        // Safe fallback to first cute avatar if link fails
        const target = e.target as HTMLImageElement;
        target.style.display = "none";
      }}
    />
  );
}
