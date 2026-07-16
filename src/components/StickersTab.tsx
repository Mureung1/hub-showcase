import React, { useEffect, useState, useRef } from "react";
import { ClothingItem, StickerDiaryPage, StickerInstance } from "../types";
import { Sparkles, Trash2, Sliders, Info, RotateCcw, Layers, ArrowUp, ArrowDown, HelpCircle, Save, FolderOpen } from "lucide-react";

interface StickersTabProps {
  closet?: ClothingItem[];
  stickerDiaries: StickerDiaryPage[];
  onSaveStickerDiary: (page: StickerDiaryPage) => Promise<boolean>;
  onDeleteStickerDiary: (id: string) => Promise<boolean>;
}

// Custom defined sticker libraries for detailed doll dress-up
const DOLL_STICKERS = [
  { id: "doll-eunha", icon: "🧍‍♀️", name: "은하 돌 (Eunha Doll)" },
  { id: "doll-wooju", icon: "🧍‍♂️", name: "우주 돌 (Wooju Doll)" },
  { id: "doll-luna", icon: "🧑‍🎤", name: "루나 돌 (Luna Doll)" },
  { id: "hair-pink", icon: "💇‍♀️", name: "핑크 양갈래 (Twintails)" },
  { id: "hair-spiky", icon: "💇‍♂️", name: "네온 스파이키 (Spiky)" },
  { id: "hair-wavy", icon: "💇", name: "웨이브 숏컷 (Wavy Bob)" }
];

const CLOTHES_STICKERS = [
  { id: "c-dress", icon: "👗", name: "네온 멜빵 드레스" },
  { id: "c-tee", icon: "👕", name: "도트 그래픽 크롭티" },
  { id: "c-bomber", icon: "🧥", name: "사이버 핑크 봄버" },
  { id: "c-denim", icon: "👖", name: "와이드 카고 진" },
  { id: "c-shorts", icon: "🩳", name: "레트로 하이 숏" },
  { id: "c-sneakers", icon: "👟", name: "통굽 스니커즈" },
  { id: "c-boots", icon: "👢", name: "사이버 화이트 롱부츠" }
];

const ACC_STICKERS = [
  { id: "a-crown", icon: "👑", name: "네온 프린세스 왕관" },
  { id: "a-shades", icon: "🕶️", name: "해커 고글 안경" },
  { id: "a-catears", icon: "🐱", name: "고양이 귀 헤어핀" },
  { id: "a-ribbon", icon: "🎀", name: "왕 리본 머리띠" },
  { id: "a-bag", icon: "🎒", name: "홀로그램 백팩" },
  { id: "a-guitar", icon: "🎸", name: "일렉트로 신스 기타" },
  { id: "a-balloon", icon: "🎈", name: "하트 풍선" },
  { id: "a-headphones", icon: "🎧", name: "핑크 메카 헤드폰" }
];

const DECO_STICKERS = [
  { id: "d-heart", icon: "💖", name: "8-Bit 러브 하트" },
  { id: "d-star", icon: "⭐", name: "지지직 글리치 별" },
  { id: "d-pill", icon: "💊", name: "사이버 네온 알약" },
  { id: "d-pad", icon: "🎮", name: "레트로 게임 아케이드 패드" },
  { id: "d-invader", icon: "👾", name: "도트 에일리언" },
  { id: "d-ufo", icon: "🛸", name: "외계 우주선" },
  { id: "d-bolt", icon: "⚡", name: "번개 이펙트" },
  { id: "d-cat", icon: "🐈", name: "도트 픽셀 고양이" }
];

const PIXEL_PALETTE: Record<string, string> = {
  '.': 'transparent',
  'k': '#1e0b36', // deep dark border
  'w': '#ffffff', // white
  'p': '#ffafd2', // pastel pink
  'm': '#bd00ff', // neon magenta
  'c': '#00eefc', // neon cyan
  'l': '#dcbfff', // lavender / pastel purple
  'v': '#6c00d4', // violet
  'y': '#ffe066', // yellow
  'd': '#ffdfcc', // peach skin
  's': '#e5b79e', // shadow skin
  'r': '#ff6b6b', // red
  'b': '#4361ee', // cosmic blue
  'g': '#00f5d4', // cyber green
};

const PIXEL_ART_DATA: Record<string, { size: number; grid: string[] }> = {
  "doll-eunha": {
    size: 16,
    grid: [
      "......kkkk......",
      "....kkddddkk....",
      "...kddddddddk...",
      "...kddwwddwwk...",
      "...kddkkddkkk...",
      "...kddddddddk...",
      "....kkddddkk....",
      ".....kllllk.....",
      "....kllllllk....",
      "....klddddlk....",
      "....klddddlk....",
      "....klddddlk....",
      "....klddddlk....",
      "....kppkkppk....",
      "....kppkkppk....",
      "....kkkkkkkk...."
    ]
  },
  "doll-wooju": {
    size: 16,
    grid: [
      "......kkkk......",
      "....kkddddkk....",
      "...kddddddddk...",
      "...kddwwddwwk...",
      "...kddkkddkkk...",
      "...kddddddddk...",
      "....kkddddkk....",
      ".....kcccck.....",
      "....kcccccck....",
      "....klddddlk....",
      "....klddddlk....",
      "....klddddlk....",
      "....klddddlk....",
      "....kcckkcck....",
      "....kcckkcck....",
      "....kkkkkkkk...."
    ]
  },
  "doll-luna": {
    size: 16,
    grid: [
      "......kkkk......",
      "....kksssskk....",
      "...kssssssssk...",
      "...ksswwsswwk...",
      "...ksskksskkk...",
      "...kssssssssk...",
      "....kksssskk....",
      ".....kmmmmk.....",
      "....kmmmmmmk....",
      "....klsssslk....",
      "....klsssslk....",
      "....klsssslk....",
      "....klsssslk....",
      "....kyykkyyk....",
      "....kyykkyyk....",
      "....kkkkkkkk...."
    ]
  },
  "hair-pink": {
    size: 16,
    grid: [
      "....kkkkkkkk....",
      "..kkppppppppkk..",
      ".kppppppppppppk.",
      "kppppppppppppppk",
      "kppkkppppppkkppk",
      "kk.k........k.kk",
      "kk.k........k.kk",
      "..kpppp..ppppk..",
      "..kppp....pppk..",
      "..kkkk....kkkk..",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "hair-spiky": {
    size: 16,
    grid: [
      "....kk..kk......",
      "...kcckccck.....",
      "..kcccccccck....",
      ".kcccccccccck...",
      "kcccccccccccck..",
      "kcckkcccckkcck..",
      "kk.k......k.kk..",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "hair-wavy": {
    size: 16,
    grid: [
      "......kkkk......",
      "....kkllllkk....",
      "...kllllllllk...",
      "..kllllllllllk..",
      ".kllllllllllllk.",
      "kllkkllllkklllk.",
      "kll.k......k.llk",
      "kk..k......k..kk",
      "....k......k....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "c-dress": {
    size: 16,
    grid: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      ".....kkkkkk.....",
      "....kvmppvvk....",
      "....kvmppvvk....",
      "....kvvvvvvk....",
      "....kvvvvvvk....",
      "....kvvvvvvk....",
      "....kkkkkkkk....",
      "................",
      "................",
      "................"
    ]
  },
  "c-tee": {
    size: 16,
    grid: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      ".....kkkkkk.....",
      "....kwwccwwk....",
      "....kwwccwwk....",
      ".....kkkkkk.....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "c-bomber": {
    size: 16,
    grid: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "....kkkkkkkk....",
      "...kppppppppk...",
      "..kppppppppppk..",
      "..kppkkkkkkppk..",
      "..kppk....kppk..",
      "...kk......kk...",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "c-denim": {
    size: 16,
    grid: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "....kkkkkkkk....",
      "....kbbkkbbk....",
      "....kbbkkbbk....",
      "....kbbkkbbk....",
      "....kbbkkbbk....",
      "....kkkkkkkk....",
      "................",
      "................"
    ]
  },
  "c-shorts": {
    size: 16,
    grid: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "....kkkkkkkk....",
      "....kcckkcck....",
      "....kkkkkkkk....",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "c-sneakers": {
    size: 16,
    grid: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "....kwwkkwwk....",
      "....kppkkppk....",
      "....kkkkkkkk...."
    ]
  },
  "c-boots": {
    size: 16,
    grid: [
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "....kwwkkwwk....",
      "....kwwkkwwk....",
      "....kwwkkwwk....",
      "....kmvkkvvk....",
      "....kmvkkvvk....",
      "....kkkkkkkk...."
    ]
  },
  "a-crown": {
    size: 16,
    grid: [
      "................",
      "......kkkk......",
      "....kykkkyky....",
      "....kyyykyyy....",
      "....kyyykyyy....",
      "....kkkkkkkk....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "a-shades": {
    size: 16,
    grid: [
      "................",
      "................",
      "................",
      "....kkkkkkkk....",
      "...kcccccccck...",
      "...kcckkkkcck...",
      "....kk....kk....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "a-catears": {
    size: 16,
    grid: [
      "................",
      "..kk........kk..",
      ".kppk......kppk.",
      "kkkkkk....kkkkkk",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "a-ribbon": {
    size: 16,
    grid: [
      "................",
      "....kk....kk....",
      "...kmmkkkkmmk...",
      "..kmmmmmmmmmmk..",
      "...kmmmmmmmmk...",
      "....kkkkkkkk....",
      ".....kk..kk.....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "a-bag": {
    size: 16,
    grid: [
      "................",
      "......kkkk......",
      ".....kcccck.....",
      "....kcccccck....",
      "....kcccccck....",
      "....kcccccck....",
      "....kcccccck....",
      ".....kkkkkk.....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "a-guitar": {
    size: 16,
    grid: [
      "..........kk....",
      ".........kcck...",
      "........kcck....",
      ".......kmmk.....",
      "......kmmk......",
      ".....kmmk.......",
      "....kwwk........",
      "...kwwk.........",
      "..kwwk..........",
      ".kkkk...........",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "a-balloon": {
    size: 16,
    grid: [
      "......kkkk......",
      "....kkppppkk....",
      "...kppppppppk...",
      "...kppppppppk...",
      "....kppppppk....",
      ".....kppppk.....",
      "......kppk......",
      ".......kk.......",
      ".......kk.......",
      "......kk........",
      ".....kk.........",
      ".....kk.........",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "a-headphones": {
    size: 16,
    grid: [
      "......kkkk......",
      "....kkllllkk....",
      "...kllllllllk...",
      "..kllllllllllk..",
      ".klkk......kklk.",
      "kppk........kppk",
      "kppk........kppk",
      "kkkk........kkkk",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "d-heart": {
    size: 16,
    grid: [
      "................",
      "..kkkk....kkkk..",
      ".kppppkk..kppppk",
      "kppppppppppppppk",
      "kppppppppppppppk",
      "kppppppppppppppk",
      ".kppppppppppppk.",
      "..kppppppppppk..",
      "...kppppppppk...",
      "....kppppppk....",
      ".....kppppk.....",
      "......kppk......",
      ".......kk.......",
      "................",
      "................",
      "................"
    ]
  },
  "d-star": {
    size: 16,
    grid: [
      ".......kk.......",
      "......kyyk......",
      ".....kyyyyk.....",
      "..kkkkkkkkkkkk..",
      "...kyyyyyyyyk...",
      "....kyyyyyyk....",
      ".....kyyyyk.....",
      "....kyykkbyk....",
      "...kyyk..kyyk...",
      "..kyyk....kyyk..",
      "..kk........kk..",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "d-pill": {
    size: 16,
    grid: [
      "................",
      "......kkkk......",
      "....kkppppkk....",
      "...kppppppppk...",
      "...kppppppppk...",
      "...kppkkkkppk...",
      "...kcckkkkcck...",
      "...kcccccccck...",
      "...kcccccccck...",
      "....kkcccckk....",
      "......kkkk......",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "d-pad": {
    size: 16,
    grid: [
      "....kkkkkkkk....",
      "...kcccccccck...",
      "...kcllllclck...",
      "...kcllllclck...",
      "...kcllllclck...",
      "...kcccccccck...",
      "...kcppkkppck...",
      "...kcllkkllck...",
      "...kcllkkllck...",
      "...kcllkkllck...",
      "....kkkkkkkk....",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "d-invader": {
    size: 16,
    grid: [
      "................",
      "...kk......kk...",
      "....kk....kk....",
      "....kkkkkkkk....",
      "...kkkcckkcckkk.",
      "..kkkkkkkkkkkkkk",
      "..kk.kkkkkkkk.kk",
      "..kk.k.kkkk.k.kk",
      ".....kk..kk.....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "d-ufo": {
    size: 16,
    grid: [
      "................",
      "......kkkk......",
      ".....kcccck.....",
      "....kcccccck....",
      "...kkkkkkkkkk...",
      "..kmmmmmmmmmmk..",
      ".kmmmmmmmmmmmmk.",
      "..kkkkkkkkkkkk..",
      "....kk....kk....",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "d-bolt": {
    size: 16,
    grid: [
      "........kk......",
      ".......kcyk.....",
      "......kccyk.....",
      ".....kccyk......",
      "....kcckkkk.....",
      "......kyyck.....",
      ".....kyyck......",
      "....kyyck.......",
      "...kyyck........",
      "...kkkk.........",
      "................",
      "................",
      "................",
      "................",
      "................",
      "................"
    ]
  },
  "d-cat": {
    size: 16,
    grid: [
      "................",
      "..kkkk....kkkk..",
      ".kllllkk..kllllk",
      "kllllllllllllllk",
      "kllllwllllwllllk",
      "kllllkkllkkllllk",
      "kllllllllllllllk",
      ".kllllppppllllk.",
      "..kllllllllllk..",
      "...kkkkkkkkkk...",
      "....kllllkk.....",
      "....kllllk......",
      "....kkkkkk......",
      "................",
      "................",
      "................"
    ]
  }
};

interface PixelArtProps {
  id?: string;
  size?: number;
  fallbackEmoji?: string;
}

const PixelArt: React.FC<PixelArtProps> = ({ id, size = 64, fallbackEmoji }) => {
  if (!id || !PIXEL_ART_DATA[id]) {
    return <span style={{ fontSize: `${size * 0.8}px` }}>{fallbackEmoji}</span>;
  }

  const data = PIXEL_ART_DATA[id];
  const gridSize = data.size;

  // Group coordinates by color to build single path per color (highly efficient)
  const colorPaths: Record<string, string> = {};
  for (let y = 0; y < gridSize; y++) {
    for (let x = 0; x < gridSize; x++) {
      const char = data.grid[y]?.[x];
      if (char && char !== '.' && PIXEL_PALETTE[char]) {
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
      className="select-none pointer-events-none"
    >
      {Object.entries(colorPaths).map(([char, pathData]) => (
        <path
          key={char}
          d={pathData}
          fill={PIXEL_PALETTE[char]}
        />
      ))}
    </svg>
  );
};

export default function StickersTab({ closet = [], stickerDiaries, onSaveStickerDiary, onDeleteStickerDiary }: StickersTabProps) {
  // Tabs for the shelf drawers
  const [drawerTab, setDrawerTab] = useState<"dolls" | "clothes" | "acc" | "deco" | "closet">("dolls");

  const [diaryTitle, setDiaryTitle] = useState("");
  const [activeDiaryId, setActiveDiaryId] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [placedStickers, setPlacedStickers] = useState<StickerInstance[]>([
    { id: "init-doll-1", stickerId: "doll-eunha", icon: "🧍‍♀️", name: "은하 돌 (Eunha Doll)", x: 50, y: 55, scale: 2.0, rotation: 0, flip: false },
    { id: "init-hair-1", stickerId: "hair-pink", icon: "💇‍♀️", name: "핑크 양갈래 (Twintails)", x: 50, y: 26, scale: 1.8, rotation: 0, flip: false },
    { id: "init-star-1", stickerId: "d-heart", icon: "💖", name: "8-Bit 러브 하트", x: 22, y: 20, scale: 1.2, rotation: 15, flip: false },
    { id: "init-ufo-1", stickerId: "d-ufo", icon: "🛸", name: "외계 우주선", x: 78, y: 18, scale: 1.1, rotation: -10, flip: true }
  ]);

  const [activeStickerId, setActiveStickerId] = useState<string | null>(null);
  const [scaleInput, setScaleInput] = useState<number>(1.0);
  const [rotationInput, setRotationInput] = useState<number>(0);

  // Background guide model display in center of board
  const [mannequinGuide, setMannequinGuide] = useState<"none" | "eunha" | "wooju">("none");

  const boardRef = useRef<HTMLDivElement>(null);
  const dragInfoRef = useRef<{ stickerId: string; startX: number; startY: number; initX: number; initY: number } | null>(null);

  // Spawn new sticker onto board
  const handleAddSticker = (icon: string, name: string, isImage = false, templateId?: string) => {
    const defaultScale = name.includes("Doll") || name.includes("돌") ? 2.0 : 1.2;
    const newSticker: StickerInstance = {
      id: "sticker-inst-" + Date.now() + Math.random().toString(36).substr(2, 4),
      stickerId: templateId,
      icon,
      name,
      x: 35 + Math.random() * 30, // Random spawn area near center
      y: 30 + Math.random() * 30,
      scale: defaultScale,
      rotation: 0,
      flip: false,
      isImage
    };
    setPlacedStickers([...placedStickers, newSticker]);
    setActiveStickerId(newSticker.id);
    setScaleInput(defaultScale);
    setRotationInput(0);
  };

  // Drag interaction handlers
  const handleStickerMouseDown = (e: React.MouseEvent, sticker: StickerInstance) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveStickerId(sticker.id);
    setScaleInput(sticker.scale);
    setRotationInput(sticker.rotation || 0);

    if (boardRef.current) {
      dragInfoRef.current = {
        stickerId: sticker.id,
        startX: e.clientX,
        startY: e.clientY,
        initX: sticker.x,
        initY: sticker.y
      };
    }
  };

  const handleBoardMouseMove = (e: React.MouseEvent) => {
    if (!dragInfoRef.current || !boardRef.current) return;

    const drag = dragInfoRef.current;
    const rect = boardRef.current.getBoundingClientRect();

    const deltaX = e.clientX - drag.startX;
    const deltaY = e.clientY - drag.startY;

    // Convert pixels to percentage coordinate relative to the board
    const percentDeltaX = (deltaX / rect.width) * 100;
    const percentDeltaY = (deltaY / rect.height) * 100;

    const newX = Math.min(Math.max(drag.initX + percentDeltaX, 1), 99);
    const newY = Math.min(Math.max(drag.initY + percentDeltaY, 1), 99);

    setPlacedStickers(prev =>
      prev.map(s => (s.id === drag.stickerId ? { ...s, x: newX, y: newY } : s))
    );
  };

  const handleBoardMouseUp = () => {
    dragInfoRef.current = null;
  };

  const handleDeleteSticker = (id: string) => {
    setPlacedStickers(placedStickers.filter(s => s.id !== id));
    if (activeStickerId === id) {
      setActiveStickerId(null);
    }
  };

  const handleClearBoard = () => {
    setPlacedStickers([]);
    setActiveStickerId(null);
  };

  // Adjust properties of selected sticker
  const handleScaleChange = (val: number) => {
    setScaleInput(val);
    if (activeStickerId) {
      setPlacedStickers(prev =>
        prev.map(s => (s.id === activeStickerId ? { ...s, scale: val } : s))
      );
    }
  };

  const handleRotationChange = (val: number) => {
    setRotationInput(val);
    if (activeStickerId) {
      setPlacedStickers(prev =>
        prev.map(s => (s.id === activeStickerId ? { ...s, rotation: val } : s))
      );
    }
  };

  const handleToggleFlip = () => {
    if (activeStickerId) {
      setPlacedStickers(prev =>
        prev.map(s => (s.id === activeStickerId ? { ...s, flip: !s.flip } : s))
      );
    }
  };

  // Layer Ordering Operations (Essential for stacking clothes on dolls)
  const handleBringToFront = () => {
    if (!activeStickerId) return;
    const target = placedStickers.find(s => s.id === activeStickerId);
    if (!target) return;
    const filtered = placedStickers.filter(s => s.id !== activeStickerId);
    // Push target to the end so it renders last (on top)
    setPlacedStickers([...filtered, target]);
  };

  const handleSendToBack = () => {
    if (!activeStickerId) return;
    const target = placedStickers.find(s => s.id === activeStickerId);
    if (!target) return;
    const filtered = placedStickers.filter(s => s.id !== activeStickerId);
    // Unshift target to the beginning so it renders first (underneath everything)
    setPlacedStickers([target, ...filtered]);
  };

  const handleSaveDiaryPage = async () => {
    const title = diaryTitle.trim();

    if (!title) {
      setSaveMessage("저장할 다이어리 이름을 입력해주세요.");
      return;
    }

    if (placedStickers.length === 0) {
      setSaveMessage("스티커를 하나 이상 배치한 뒤 저장해주세요.");
      return;
    }

    setIsSaving(true);
    setSaveMessage(null);

    const now = new Date().toISOString();
    const existingPage = stickerDiaries.find(page => page.id === activeDiaryId);

    const page: StickerDiaryPage = {
      id: existingPage?.id || `sticker-diary-${Date.now()}`,
      title,
      mannequinGuide,
      stickers: placedStickers,
      createdAt: existingPage?.createdAt || now,
      updatedAt: now,
    };

    const success = await onSaveStickerDiary(page);

    if (success) {
      setActiveDiaryId(page.id);
      setSaveMessage(existingPage ? "다이어리를 수정 저장했어요! 💾" : "새 스티커 다이어리를 저장했어요! 💖");
    } else {
      setSaveMessage("저장에 실패했어요. 로그인 상태와 데이터베이스를 확인해주세요.");
    }

    setIsSaving(false);
  };

  const handleLoadDiaryPage = (page: StickerDiaryPage) => {
    setActiveDiaryId(page.id);
    setDiaryTitle(page.title);
    setPlacedStickers(page.stickers);
    setMannequinGuide(page.mannequinGuide);
    setActiveStickerId(null);
    setSaveMessage(`'${page.title}' 다이어리를 불러왔어요.`);
  };

  const handleCreateNewDiary = () => {
    setActiveDiaryId(null);
    setDiaryTitle("");
    setPlacedStickers([]);
    setMannequinGuide("none");
    setActiveStickerId(null);
    setSaveMessage("새 다이어리 페이지를 시작했어요.");
  };

  const handleDeleteDiaryPage = async (id: string) => {
    if (!window.confirm("이 스티커 다이어리를 삭제할까요?")) return;

    const success = await onDeleteStickerDiary(id);

    if (success) {
      if (activeDiaryId === id) {
        handleCreateNewDiary();
      }
      setSaveMessage("스티커 다이어리를 삭제했어요.");
    } else {
      setSaveMessage("삭제에 실패했어요.");
    }
  };

  useEffect(() => {
    if (activeDiaryId && !stickerDiaries.some(page => page.id === activeDiaryId)) {
      setActiveDiaryId(null);
    }
  }, [activeDiaryId, stickerDiaries]);

  const activeStickerObj = placedStickers.find(s => s.id === activeStickerId);

  return (
    <div className="space-y-6 pb-12">
      {/* Title block with doll dress-up header */}
      <div className="bg-surface border-4 border-primary p-4 shadow-[5px_5px_0_0_#000] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="font-headline-lg text-xl font-bold text-primary flex items-center gap-2 tracking-wide">
            💅 DOLL_DRESSUP_STUDIO.EXE (인형 옷입히기 다이어리)
          </h2>
          <p className="font-body-md text-xs text-on-surface-variant mt-1">
            원하는 인형 몸통을 소환하고 가발, 옷, 패션 소품 및 <b>내 진짜 옷장 아이템</b>을 가져와 레이어로 쌓아 나만의 8비트 코디 인형극을 해보세요!
          </p>
        </div>
        {/* Toggle options for backdrop mannequin guide */}
        <div className="flex items-center space-x-2 bg-surface-container-low p-1.5 border-2 border-outline-variant text-xs">
          <span className="font-mono text-[10px] text-on-surface-variant font-bold uppercase shrink-0">마네킹 보조 가이드:</span>
          <button
            onClick={() => setMannequinGuide("none")}
            className={`px-2 py-1 font-bold ${mannequinGuide === "none" ? "bg-primary text-on-primary" : "text-on-surface hover:bg-surface-container-high"}`}
          >
            없음
          </button>
          <button
            onClick={() => setMannequinGuide("eunha")}
            className={`px-2 py-1 font-bold ${mannequinGuide === "eunha" ? "bg-secondary text-on-secondary-fixed" : "text-on-surface hover:bg-surface-container-high"}`}
          >
            은하(🧍‍♀️)
          </button>
          <button
            onClick={() => setMannequinGuide("wooju")}
            className={`px-2 py-1 font-bold ${mannequinGuide === "wooju" ? "bg-secondary text-on-secondary-fixed" : "text-on-surface hover:bg-surface-container-high"}`}
          >
            우주(🧍‍♂️)
          </button>
        </div>
      </div>

      <div className="bg-surface border-4 border-secondary shadow-[5px_5px_0_0_#000] p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3 lg:items-end">
          <div className="flex-1">
            <label className="block font-label-sm text-[10px] text-secondary uppercase font-bold mb-1">
              Diary Page Name [다이어리 이름]
            </label>
            <input
              type="text"
              value={diaryTitle}
              onChange={(e) => setDiaryTitle(e.target.value)}
              placeholder="예: 여름 데이트 코디, 축제 스타일링"
              className="w-full bg-surface-container-highest border-2 border-secondary px-3 py-2 text-sm font-bold text-on-surface focus:outline-none focus:border-primary"
            />
          </div>

          <button
            type="button"
            onClick={handleSaveDiaryPage}
            disabled={isSaving}
            className="px-5 py-2.5 bg-primary text-on-primary border-2 border-black font-bold text-xs shadow-[3px_3px_0_0_#000] disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save size={14} />
            {isSaving ? "저장 중..." : activeDiaryId ? "현재 페이지 수정 저장" : "새 다이어리 저장"}
          </button>

          <button
            type="button"
            onClick={handleCreateNewDiary}
            className="px-5 py-2.5 bg-surface-container border-2 border-outline text-on-surface font-bold text-xs shadow-[3px_3px_0_0_#000]"
          >
            새 페이지 만들기
          </button>
        </div>

        {saveMessage && (
          <p className="text-xs font-bold text-secondary bg-surface-container-low border border-secondary/40 px-3 py-2">
            {saveMessage}
          </p>
        )}

        <div>
          <div className="flex items-center gap-2 mb-2 text-xs font-bold text-on-surface-variant uppercase">
            <FolderOpen size={14} />
            저장된 스티커 다이어리 ({stickerDiaries.length})
          </div>

          {stickerDiaries.length === 0 ? (
            <div className="border-2 border-dashed border-outline-variant p-4 text-center text-xs text-on-surface-variant">
              아직 저장된 스티커 다이어리가 없어. 캐릭터를 꾸민 뒤 이름을 입력하고 저장해봐!
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {stickerDiaries.map((page) => (
                <div
                  key={page.id}
                  className={`border-2 p-3 flex items-center justify-between gap-2 ${activeDiaryId === page.id
                      ? "border-primary bg-primary/10"
                      : "border-outline-variant bg-surface-container-low"
                    }`}
                >
                  <button
                    type="button"
                    onClick={() => handleLoadDiaryPage(page)}
                    className="min-w-0 flex-1 text-left"
                  >
                    <p className="font-bold text-sm text-on-surface truncate">{page.title}</p>
                    <p className="text-[10px] text-on-surface-variant">
                      스티커 {page.stickers.length}개 · {new Date(page.updatedAt).toLocaleDateString()}
                    </p>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteDiaryPage(page.id)}
                    className="p-1.5 border border-error text-error hover:bg-error/10"
                    title="저장된 다이어리 삭제"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Drawer Container: Sticker Drawers & Inspector Controls */}
        <div className="lg:col-span-5 space-y-6">
          {/* Main Sticker shelf box */}
          <div className="bg-surface border-4 border-primary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col">
            {/* Drawer Header Tabs */}
            <div className="bg-primary text-on-primary border-b-4 border-primary grid grid-cols-5 text-center font-bold text-[10px] uppercase font-mono">
              <button
                onClick={() => setDrawerTab("dolls")}
                className={`py-2 border-r border-primary-container cursor-pointer transition-colors ${drawerTab === "dolls" ? "bg-surface text-primary" : "hover:bg-primary-container"}`}
              >
                🧍‍♀️ 인형/헤어
              </button>
              <button
                onClick={() => setDrawerTab("clothes")}
                className={`py-2 border-r border-primary-container cursor-pointer transition-colors ${drawerTab === "clothes" ? "bg-surface text-primary" : "hover:bg-primary-container"}`}
              >
                👗 의류
              </button>
              <button
                onClick={() => setDrawerTab("acc")}
                className={`py-2 border-r border-primary-container cursor-pointer transition-colors ${drawerTab === "acc" ? "bg-surface text-primary" : "hover:bg-primary-container"}`}
              >
                👑 소품
              </button>
              <button
                onClick={() => setDrawerTab("deco")}
                className={`py-2 border-r border-primary-container cursor-pointer transition-colors ${drawerTab === "deco" ? "bg-surface text-primary" : "hover:bg-primary-container"}`}
              >
                💖 데코
              </button>
              <button
                onClick={() => setDrawerTab("closet")}
                className={`py-2 cursor-pointer transition-colors flex flex-col justify-center items-center ${drawerTab === "closet" ? "bg-surface text-[#00ffcc]" : "hover:bg-primary-container text-secondary"}`}
              >
                <span>👚 내옷장</span>
              </button>
            </div>

            {/* Shelf Items Area */}
            <div className="p-4 bg-surface bg-notebook min-h-[260px] max-h-[360px] overflow-y-auto">
              {drawerTab === "dolls" && (
                <div className="grid grid-cols-3 gap-3">
                  {DOLL_STICKERS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleAddSticker(item.icon, item.name, false, item.id)}
                      className="bg-surface-container border-2 border-outline hover:border-secondary p-2.5 flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all text-center shadow-[2px_2px_0_0_#000]"
                    >
                      <div className="w-12 h-12 flex items-center justify-center filter drop-shadow-[2px_2px_0px_rgba(0,0,0,0.4)]">
                        <PixelArt id={item.id} size={40} fallbackEmoji={item.icon} />
                      </div>
                      <span className="font-label-sm text-[8px] text-on-surface mt-1 font-bold truncate w-full">{item.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              )}

              {drawerTab === "clothes" && (
                <div className="grid grid-cols-3 gap-3">
                  {CLOTHES_STICKERS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleAddSticker(item.icon, item.name, false, item.id)}
                      className="bg-surface-container border-2 border-outline hover:border-secondary p-2.5 flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all text-center shadow-[2px_2px_0_0_#000]"
                    >
                      <div className="w-12 h-12 flex items-center justify-center filter drop-shadow-[2px_2px_0px_rgba(0,0,0,0.4)]">
                        <PixelArt id={item.id} size={40} fallbackEmoji={item.icon} />
                      </div>
                      <span className="font-label-sm text-[8px] text-on-surface mt-1 font-bold truncate w-full">{item.name.substring(0, 7)}</span>
                    </button>
                  ))}
                </div>
              )}

              {drawerTab === "acc" && (
                <div className="grid grid-cols-3 gap-3">
                  {ACC_STICKERS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleAddSticker(item.icon, item.name, false, item.id)}
                      className="bg-surface-container border-2 border-outline hover:border-secondary p-2.5 flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all text-center shadow-[2px_2px_0_0_#000]"
                    >
                      <div className="w-12 h-12 flex items-center justify-center filter drop-shadow-[2px_2px_0px_rgba(0,0,0,0.4)]">
                        <PixelArt id={item.id} size={40} fallbackEmoji={item.icon} />
                      </div>
                      <span className="font-label-sm text-[8px] text-on-surface mt-1 font-bold truncate w-full">{item.name.substring(0, 7)}</span>
                    </button>
                  ))}
                </div>
              )}

              {drawerTab === "deco" && (
                <div className="grid grid-cols-3 gap-3">
                  {DECO_STICKERS.map(item => (
                    <button
                      key={item.id}
                      onClick={() => handleAddSticker(item.icon, item.name, false, item.id)}
                      className="bg-surface-container border-2 border-outline hover:border-secondary p-2.5 flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all text-center shadow-[2px_2px_0_0_#000]"
                    >
                      <div className="w-12 h-12 flex items-center justify-center filter drop-shadow-[2px_2px_0px_rgba(0,0,0,0.4)]">
                        <PixelArt id={item.id} size={40} fallbackEmoji={item.icon} />
                      </div>
                      <span className="font-label-sm text-[8px] text-on-surface mt-1 font-bold truncate w-full">{item.name.split(" ")[0]}</span>
                    </button>
                  ))}
                </div>
              )}

              {drawerTab === "closet" && (
                <div className="space-y-3">
                  <div className="bg-surface-container-low border border-[#00ffcc]/30 p-2 text-center text-[10px] text-[#00ffcc] uppercase font-mono font-bold leading-normal">
                    🛰️ 옷장에서 내 실제 옷 가져오기 // IMPORT FROM CLOSET
                  </div>
                  {closet.length === 0 ? (
                    <div className="p-6 text-center text-on-surface-variant font-semibold text-xs bg-surface-container-low border-2 border-dashed border-outline-variant">
                      옷장에 등록된 옷이 없습니다!<br />
                      [Closet] 탭에서 먼저 나만의 코디 옷을 등록해보세요.
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2.5">
                      {closet.map((item) => (
                        <button
                          key={item.id}
                          onClick={() => handleAddSticker(item.imageUrl, item.name, true)}
                          className="bg-surface-container-low border-2 border-outline-variant hover:border-[#00ffcc] p-1.5 flex flex-col items-center justify-center cursor-pointer hover:scale-105 active:scale-95 transition-all text-center shadow-[2px_2px_0_0_#000]"
                          title={`${item.name} (${item.category})`}
                        >
                          <div className="w-12 h-12 bg-[#160231] border border-outline-variant p-0.5 rounded-none overflow-hidden mb-1 flex items-center justify-center">
                            <img src={item.imageUrl} alt={item.name} className="w-full h-full object-contain" referrerPolicy="no-referrer" />
                          </div>
                          <span className="font-label-sm text-[7px] text-on-surface truncate w-full font-bold">{item.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Expanded Layer & Layout Inspector Controls for selected item */}
          {activeStickerObj && (
            <div className="bg-surface border-4 border-secondary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col">
              <div className="bg-secondary text-on-secondary-fixed px-3 py-1.5 flex justify-between items-center border-b-4 border-secondary font-bold font-label-sm text-xs">
                <span>ITEM_INSPECTOR.EXE: {activeStickerObj.name}</span>
                <button
                  onClick={() => setActiveStickerId(null)}
                  className="w-5 h-5 border border-on-secondary-fixed bg-surface flex items-center justify-center text-[9px] font-bold"
                >
                  X
                </button>
              </div>

              <div className="p-4 bg-surface-container space-y-4">
                {/* 1. Scale slider */}
                <div className="space-y-1">
                  <label className="font-label-sm text-xs text-secondary uppercase flex justify-between">
                    <span>Sticker scale [크기 조절]</span>
                    <span className="font-bold">{scaleInput.toFixed(1)}x</span>
                  </label>
                  <input
                    type="range"
                    min="0.3"
                    max="3.0"
                    step="0.1"
                    value={scaleInput}
                    onChange={(e) => handleScaleChange(parseFloat(e.target.value))}
                    className="w-full h-2 bg-surface rounded-none border border-outline appearance-none cursor-pointer accent-secondary"
                  />
                </div>

                {/* 2. Rotation slider */}
                <div className="space-y-1">
                  <label className="font-label-sm text-xs text-[#00ffcc] uppercase flex justify-between">
                    <span>Rotate [회전 조절]</span>
                    <span className="font-bold">{rotationInput}°</span>
                  </label>
                  <input
                    type="range"
                    min="-180"
                    max="180"
                    step="5"
                    value={rotationInput}
                    onChange={(e) => handleRotationChange(parseInt(e.target.value))}
                    className="w-full h-2 bg-surface rounded-none border border-outline appearance-none cursor-pointer accent-[#00ffcc]"
                  />
                </div>

                {/* 3. Horizontal Flip Mirror Option */}
                <div className="flex space-x-2">
                  <button
                    onClick={handleToggleFlip}
                    className={`flex-1 py-1.5 border-2 border-black text-xs font-bold font-mono shadow-[2px_2px_0_0_#000] cursor-pointer transition-all ${activeStickerObj.flip ? "bg-[#00eefc] text-black" : "bg-surface text-on-surface"}`}
                  >
                    🔄 좌우 반전: {activeStickerObj.flip ? "켜짐" : "꺼짐"}
                  </button>
                </div>

                {/* 4. Layer Ordering Buttons */}
                <div className="space-y-1.5">
                  <span className="font-label-sm text-[10px] text-on-surface-variant uppercase font-bold block">레이어 깊이 제어 (LAYER ORDER):</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={handleBringToFront}
                      className="py-1.5 bg-surface border-2 border-outline-variant hover:border-secondary hover:text-secondary text-xs font-bold flex items-center justify-center gap-1 shadow-[2px_2px_0_0_#000] cursor-pointer"
                      title="맨 위로 올리기"
                    >
                      <ArrowUp size={12} />
                      <span>맨 위로 올리기</span>
                    </button>
                    <button
                      onClick={handleSendToBack}
                      className="py-1.5 bg-surface border-2 border-outline-variant hover:border-secondary hover:text-secondary text-xs font-bold flex items-center justify-center gap-1 shadow-[2px_2px_0_0_#000] cursor-pointer"
                      title="맨 밑으로 보내기"
                    >
                      <ArrowDown size={12} />
                      <span>맨 밑으로 보내기</span>
                    </button>
                  </div>
                </div>

                {/* Action panel metrics */}
                <div className="bg-surface-container-low border border-outline-variant p-2.5 font-label-sm text-[9px] text-on-surface-variant leading-relaxed">
                  <p>COORDINATES: X={activeStickerObj.x.toFixed(0)}%, Y={activeStickerObj.y.toFixed(0)}%</p>
                  <p>FLIP_STATE: {activeStickerObj.flip ? "MIRRORED" : "NORMAL"} | ROT: {activeStickerObj.rotation}°</p>
                </div>

                {/* Delete button */}
                <button
                  onClick={() => handleDeleteSticker(activeStickerObj.id)}
                  className="w-full py-2 bg-error text-on-error border-2 border-black font-headline-md text-xs font-bold uppercase flex items-center justify-center gap-1 shadow-[2px_2px_0_0_#000] hover:translate-x-[1px] cursor-pointer"
                >
                  <Trash2 size={12} />
                  <span>선택된 옷/스티커 삭제 (DELETE)</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Giant Interactive Board & Dressup Stage Canvas */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="bg-surface border-4 border-primary shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col h-full">
            {/* Window title bar */}
            <div className="bg-primary text-on-primary px-3 py-2 flex justify-between items-center border-b-4 border-primary">
              <span className="font-label-sm text-xs font-bold uppercase flex items-center gap-1.5">
                <Sliders size={14} />
                <span>INTERACTIVE_STICKER_BOARD.EXE [코디 모눈판]</span>
              </span>
              <button
                onClick={handleClearBoard}
                className="bg-surface text-primary border-2 border-primary px-2 py-0.5 font-label-sm text-[9px] hover:bg-surface-variant font-bold uppercase cursor-pointer"
              >
                모두 비우기 (CLEAR)
              </button>
            </div>

            {/* Interactive Canvas Grid Frame */}
            <div
              ref={boardRef}
              onMouseMove={handleBoardMouseMove}
              onMouseUp={handleBoardMouseUp}
              onMouseLeave={handleBoardMouseUp}
              className="relative w-full aspect-[4/3] border-2 border-primary bg-surface-container-lowest overflow-hidden dither-bg cursor-crosshair select-none flex items-center justify-center"
              style={{ backgroundImage: "radial-gradient(#514255 15%, transparent 15%)", backgroundSize: "20px 20px" }}
            >
              {/* Optional Fixed Mannequin Guide overlay in center */}
              {mannequinGuide === "eunha" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-10 scale-[2.2]">
                  <PixelArt id="doll-eunha" size={120} fallbackEmoji="🧍‍♀️" />
                  <div className="absolute bottom-2 bg-[#160231] px-2 py-0.5 border border-outline-variant text-[9px] font-bold text-on-surface-variant uppercase tracking-widest scale-[0.45]">
                    가이드 가상 마네킹: 은하
                  </div>
                </div>
              )}
              {mannequinGuide === "wooju" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20 z-10 scale-[2.2]">
                  <PixelArt id="doll-wooju" size={120} fallbackEmoji="🧍‍♂️" />
                  <div className="absolute bottom-2 bg-[#160231] px-2 py-0.5 border border-outline-variant text-[9px] font-bold text-on-surface-variant uppercase tracking-widest scale-[0.45]">
                    가이드 가상 마네킹: 우주
                  </div>
                </div>
              )}

              {placedStickers.length === 0 ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-outline-variant space-y-2 pointer-events-none z-10">
                  <span className="text-5xl animate-bounce">💅</span>
                  <p className="font-headline-md text-sm uppercase text-secondary font-bold tracking-widest">DRESS-UP ROOM CANVAS EMPTY</p>
                  <p className="font-body-md text-xs text-on-surface-variant max-w-sm">
                    왼쪽의 [인형/헤어] 탭에서 은하/우주 모델 몸통을 클릭해 불러오고, 가발이나 옷을 얹거나, [내 옷장] 탭의 고유 의상을 클릭해 소환해 보세요!
                  </p>
                </div>
              ) : (
                placedStickers.map((sticker) => {
                  const isActive = activeStickerId === sticker.id;
                  return (
                    <div
                      key={sticker.id}
                      onMouseDown={(e) => handleStickerMouseDown(e, sticker)}
                      className={`absolute select-none cursor-move transition-transform duration-75 ${isActive ? "ring-2 ring-secondary ring-offset-2 ring-offset-background z-40 scale-105" : "z-20 hover:scale-[1.03]"
                        }`}
                      style={{
                        left: `${sticker.x}%`,
                        top: `${sticker.y}%`,
                        transform: `translate(-50%, -50%) scale(${sticker.scale}) rotate(${sticker.rotation || 0}deg) scaleX(${sticker.flip ? -1 : 1})`,
                        transformOrigin: "center center"
                      }}
                    >
                      {sticker.isImage ? (
                        <div className="w-24 h-24 p-0.5 border-2 border-dashed border-primary/20 bg-black/30 pointer-events-none select-none flex items-center justify-center">
                          <img
                            src={sticker.icon}
                            alt={sticker.name}
                            className="w-full h-full object-contain pointer-events-none select-none"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                      ) : (
                        <div className="w-16 h-16 md:w-20 md:h-20 flex items-center justify-center filter select-none pointer-events-none">
                          <PixelArt id={sticker.stickerId} size={72} fallbackEmoji={sticker.icon} />
                        </div>
                      )}

                      {/* Name tags of selected sticker items shown for quick feedback */}
                      {isActive && (
                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-1 bg-surface-container border border-secondary px-1.5 py-0.5 rounded-none text-[8px] text-secondary font-mono uppercase font-bold whitespace-nowrap z-50">
                          {sticker.name}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Instruction Footer tip with cool design */}
            <div className="bg-surface-container-low p-3 border-t border-outline-variant flex items-start gap-2 font-label-sm text-[10px] text-on-surface-variant">
              <Info size={14} className="text-primary shrink-0 mt-0.5" />
              <div className="space-y-0.5 leading-normal">
                <p className="font-bold text-secondary">💡 인형 옷입히기 조작 TIP:</p>
                <p>1. 스티커 보관함에서 인형 몸통을 클릭해 배치한 뒤 원하는 크기로 키웁니다.</p>
                <p>2. 원하는 가발이나 옷, 혹은 <b>[내 옷장]</b>의 사진 옷을 클릭해 모눈판에 소환합니다.</p>
                <p>3. 소환된 옷을 드래그해 몸 위에 얹어 맞추고, <b>크기 조절(Scale) 슬라이더</b>나 <b>회전(Rotate)</b>을 정교하게 맞춥니다.</p>
                <p>4. 순서가 꼬였다면 인스펙터의 <b>[맨 위로 올리기]</b> / <b>[맨 밑으로 보내기]</b> 버튼을 통해 레이어 순서를 조정하세요!</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}