import React from "react";

interface DynamicPixelCharacterProps {
  bodyType?: "bunny" | "kitty" | "bear" | "elf" | "human";
  topColorName?: string[];
  bottomColorName?: string[];
  shoesColorName?: string[];
  accessoryType?: "coffee" | "gamepad" | "umbrella" | "shades" | "dumbbells" | "none";
  hairColorName?: string;
  className?: string;
  size?: number;
}

// Convert a generic color name or array of names to a hex color
function getHexColor(colorNames: string[] | string | undefined, defaultHex: string): string {
  if (!colorNames) return defaultHex;
  const nameStr = (Array.isArray(colorNames) ? colorNames.join(" ") : colorNames).toLowerCase();

  if (nameStr.includes("pink") || nameStr.includes("핑크")) return "#ff55aa";
  if (nameStr.includes("violet") || nameStr.includes("purple") || nameStr.includes("보라") || nameStr.includes("퍼플")) return "#9d00ff";
  if (nameStr.includes("acid green") || nameStr.includes("electric green") || nameStr.includes("green") || nameStr.includes("초록") || nameStr.includes("그린")) return "#39ff14";
  if (nameStr.includes("cyan") || nameStr.includes("holo blue") || nameStr.includes("blue") || nameStr.includes("블루") || nameStr.includes("파랑")) return "#00eefc";
  if (nameStr.includes("yellow") || nameStr.includes("gold") || nameStr.includes("노랑") || nameStr.includes("옐로우")) return "#ffe633";
  if (nameStr.includes("black") || nameStr.includes("matt black") || nameStr.includes("dark") || nameStr.includes("블랙") || nameStr.includes("검정")) return "#1a1625";
  if (nameStr.includes("silver") || nameStr.includes("white") || nameStr.includes("화이트") || nameStr.includes("실버") || nameStr.includes("흰색")) return "#eeeeee";
  if (nameStr.includes("grey") || nameStr.includes("gray") || nameStr.includes("회색") || nameStr.includes("그레이")) return "#7e788a";
  if (nameStr.includes("red") || nameStr.includes("crimson") || nameStr.includes("빨강")) return "#ff3355";
  if (nameStr.includes("orange") || nameStr.includes("apricot") || nameStr.includes("오렌지")) return "#ff8833";
  
  return defaultHex;
}

export default function DynamicPixelCharacter({
  bodyType = "human",
  topColorName,
  bottomColorName,
  shoesColorName,
  accessoryType = "none",
  hairColorName = "cyan",
  className = "",
  size = 200
}: DynamicPixelCharacterProps) {
  
  const cTop = getHexColor(topColorName, "#ff55aa"); // top
  const cBottom = getHexColor(bottomColorName, "#1a1625"); // bottom
  const cShoes = getHexColor(shoesColorName, "#9d00ff"); // shoes
  
  // Body colors based on type
  let bodyColor = "#ffdfd0"; // skin
  let bodyOutline = "#2d144d";
  let blushColor = "#ff94a2";
  
  if (bodyType === "bunny" || bodyType === "kitty") {
    bodyColor = "#ffffff";
    blushColor = "#ffccd5";
  } else if (bodyType === "bear") {
    bodyColor = "#fcd5e5"; // soft pastel pink bear
    blushColor = "#ff9dbd";
  } else if (bodyType === "elf") {
    bodyColor = "#ffeada";
    blushColor = "#ffb0ba";
  }

  // Hair color mapping
  const cHair = getHexColor(hairColorName, "#ffe699");

  // Build 24x24 pixel grid dynamically
  const grid: string[][] = Array(24).fill(null).map(() => Array(24).fill("."));

  // Helper to color pixels safely
  const setPixel = (x: number, y: number, color: string) => {
    if (x >= 0 && x < 24 && y >= 0 && y < 24) {
      grid[y][x] = color;
    }
  };

  const drawRect = (x1: number, y1: number, x2: number, y2: number, color: string) => {
    for (let y = y1; y <= y2; y++) {
      for (let x = x1; x <= x2; x++) {
        setPixel(x, y, color);
      }
    }
  };

  // 1. EAR TYPES (bunny, kitty, bear, elf)
  if (bodyType === "bunny") {
    // Left long ear
    drawRect(6, 1, 7, 5, bodyOutline);
    drawRect(6, 2, 6, 5, bodyColor);
    drawRect(7, 2, 7, 4, "#ffcbd3"); // pink inner ear

    // Right long ear
    drawRect(16, 1, 17, 5, bodyOutline);
    drawRect(17, 2, 17, 5, bodyColor);
    drawRect(16, 2, 16, 4, "#ffcbd3");
  } else if (bodyType === "kitty") {
    // Left triangular cat ear
    drawRect(5, 3, 7, 5, bodyOutline);
    setPixel(6, 4, "#ffcbd3");
    setPixel(6, 5, bodyColor);
    setPixel(7, 5, bodyColor);

    // Right triangular cat ear
    drawRect(16, 3, 18, 5, bodyOutline);
    setPixel(17, 4, "#ffcbd3");
    setPixel(16, 5, bodyColor);
    setPixel(17, 5, bodyColor);
  } else if (bodyType === "bear") {
    // Left round bear ear
    drawRect(5, 3, 7, 5, bodyOutline);
    drawRect(6, 4, 7, 5, bodyColor);
    setPixel(6, 4, "#ff9dbd");

    // Right round bear ear
    drawRect(16, 3, 18, 5, bodyOutline);
    drawRect(16, 4, 17, 5, bodyColor);
    setPixel(17, 4, "#ff9dbd");
  } else if (bodyType === "elf") {
    // Pointy left ear
    setPixel(4, 9, bodyOutline);
    setPixel(5, 9, bodyOutline);
    setPixel(5, 10, bodyColor);
    // Pointy right ear
    setPixel(19, 9, bodyOutline);
    setPixel(18, 9, bodyOutline);
    setPixel(18, 10, bodyColor);
  }

  // 2. HAIR (back & bangs)
  // Hair Outline
  drawRect(5, 5, 18, 11, bodyOutline);
  // Hair fill
  drawRect(6, 6, 17, 10, cHair);
  // Bangs detail over face
  drawRect(7, 7, 16, 8, cHair);
  setPixel(7, 9, cHair);
  setPixel(16, 9, cHair);
  setPixel(11, 9, cHair);

  // 3. FACE & HEAD
  // Face area boundary
  drawRect(7, 8, 16, 12, bodyColor);
  // Face Outline below hair
  drawRect(6, 9, 6, 12, bodyOutline);
  drawRect(17, 9, 17, 12, bodyOutline);
  drawRect(7, 13, 16, 13, bodyOutline); // chin outline

  // Eyes (Violet cute retro glow)
  setPixel(9, 10, "#2d144d");
  setPixel(14, 10, "#2d144d");
  setPixel(9, 11, "#9d00ff"); // spark
  setPixel(14, 11, "#9d00ff");

  // Blush
  setPixel(8, 11, blushColor);
  setPixel(15, 11, blushColor);
  
  // Mouth
  setPixel(11, 11, "#ff8899");
  setPixel(12, 11, "#ff8899");

  // 4. TOP (Clothing: Shirt, jacket, sleeves)
  // Neck
  drawRect(11, 13, 12, 13, bodyColor);
  
  // Shirt Body
  drawRect(7, 14, 16, 18, bodyOutline);
  drawRect(8, 14, 15, 17, cTop);

  // Left sleeve/arm
  drawRect(5, 14, 6, 17, bodyOutline);
  drawRect(5, 14, 6, 16, cTop);
  drawRect(5, 17, 6, 17, bodyColor); // hand

  // Right sleeve/arm
  drawRect(17, 14, 18, 17, bodyOutline);
  drawRect(17, 14, 18, 16, cTop);
  drawRect(17, 17, 18, 17, bodyColor); // hand

  // 5. BOTTOM (Skirts/Pants)
  drawRect(7, 18, 16, 21, bodyOutline);
  // Color the bottom
  drawRect(8, 18, 15, 20, cBottom);
  
  // Pant legs split detail
  setPixel(11, 20, bodyOutline);
  setPixel(12, 20, bodyOutline);

  // 6. SHOES
  drawRect(8, 21, 10, 23, bodyOutline);
  drawRect(13, 21, 15, 23, bodyOutline);
  drawRect(8, 22, 9, 22, cShoes);
  drawRect(14, 22, 15, 22, cShoes);

  // 7. ACCESSORY ITEMS ON TOP
  if (accessoryType === "coffee") {
    // Draw cute tiny coffee cup in right hand area
    drawRect(18, 15, 20, 18, bodyOutline);
    drawRect(19, 16, 20, 17, "#ffffff"); // cup
    setPixel(19, 15, "#a06030"); // coffee steam/foam
  } else if (accessoryType === "gamepad") {
    // Retro mint/grey gameboy in front
    drawRect(10, 15, 13, 18, bodyOutline);
    drawRect(11, 15, 12, 17, "#c1ffea"); // screen/body
    setPixel(11, 16, "#403a4a"); // button
  } else if (accessoryType === "umbrella") {
    // Cozy umbrella overhead
    drawRect(1, 4, 13, 8, bodyOutline);
    drawRect(2, 5, 12, 7, "#00eefc"); // blue umbrella dome
    // Shaft
    drawRect(6, 8, 6, 16, "#7e788a");
    // Hook handle
    setPixel(5, 16, "#7e788a");
  } else if (accessoryType === "shades") {
    // Sleek cyber shades over eyes
    drawRect(8, 9, 15, 10, "#1a1625");
    drawRect(9, 9, 14, 9, "#00ffcc"); // glowing cyan neon visor lines
  } else if (accessoryType === "dumbbells") {
    // Cute dumbbells in hands
    drawRect(3, 15, 4, 18, bodyOutline);
    setPixel(3, 16, "#7e788a");
    setPixel(4, 16, "#7e788a");
    setPixel(3, 15, "#1a1625");
    setPixel(3, 17, "#1a1625");
  }

  // Generate SVG path coordinate string dynamically
  const colorPaths: Record<string, string> = {};
  for (let y = 0; y < 24; y++) {
    for (let x = 0; x < 24; x++) {
      const color = grid[y][x];
      if (color !== ".") {
        if (!colorPaths[color]) {
          colorPaths[color] = "";
        }
        colorPaths[color] += `M${x},${y}h1v1h-1z `;
      }
    }
  }

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        style={{ imageRendering: "pixelated" }}
        className="select-none pointer-events-none drop-shadow-[4px_4px_0px_rgba(0,0,0,0.3)]"
      >
        {Object.entries(colorPaths).map(([color, pathData]) => (
          <path key={color} d={pathData} fill={color} />
        ))}
      </svg>
    </div>
  );
}
