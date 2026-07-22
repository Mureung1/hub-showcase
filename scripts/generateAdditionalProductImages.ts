import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { ADDITIONAL_PRODUCT_SEEDS } from "../src/data/additionalProductCatalog";

const outputDirectory = resolve("public/products");
const startNumbers = { top: 31, bottom: 31, shoes: 21, accessories: 21 } as const;
const categoryInfo = {
  top: { emoji: "👚", label: "TOP" },
  bottom: { emoji: "👖", label: "BOTTOM" },
  shoes: { emoji: "👟", label: "SHOES" },
  accessories: { emoji: "👜", label: "ACCESSORY" },
} as const;

const escapeXml = (value: string) => value
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

await mkdir(outputDirectory, { recursive: true });

for (const [category, products] of Object.entries(ADDITIONAL_PRODUCT_SEEDS) as [keyof typeof ADDITIONAL_PRODUCT_SEEDS, typeof ADDITIONAL_PRODUCT_SEEDS[keyof typeof ADDITIONAL_PRODUCT_SEEDS]][]) {
  for (const [index, product] of products.entries()) {
    const number = startNumbers[category] + index;
    const id = `${category}-${String(number).padStart(3, "0")}`;
    const info = categoryInfo[category];
    const safeName = escapeXml(product.name);
    const safeColor = escapeXml(product.color);
    const accent = product.colorHex;
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="640" viewBox="0 0 480 640">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#faf8f3"/><stop offset="1" stop-color="${accent}" stop-opacity="0.18"/></linearGradient>
    <filter id="shadow"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-opacity="0.16"/></filter>
  </defs>
  <rect width="480" height="640" fill="url(#bg)"/>
  <circle cx="74" cy="72" r="34" fill="${accent}" opacity="0.28"/>
  <circle cx="412" cy="128" r="18" fill="${accent}" opacity="0.45"/>
  <circle cx="397" cy="430" r="46" fill="${accent}" opacity="0.16"/>
  <rect x="40" y="38" width="400" height="470" rx="30" fill="#fffdf9" stroke="#222" stroke-width="5" filter="url(#shadow)"/>
  <rect x="68" y="66" width="118" height="30" rx="15" fill="${accent}"/>
  <text x="127" y="87" text-anchor="middle" font-family="Arial,sans-serif" font-size="14" font-weight="700" fill="#1f1f1f">${info.label}</text>
  <text x="240" y="295" text-anchor="middle" font-size="116">${info.emoji}</text>
  <path d="M125 388 Q240 340 355 388" fill="none" stroke="${accent}" stroke-width="18" stroke-linecap="round" opacity="0.72"/>
  <circle cx="155" cy="388" r="16" fill="${accent}"/><circle cx="240" cy="365" r="16" fill="${accent}"/><circle cx="325" cy="388" r="16" fill="${accent}"/>
  <text x="240" y="446" text-anchor="middle" font-family="Arial,sans-serif" font-size="16" font-weight="700" fill="#555">${safeColor}</text>
  <rect x="40" y="530" width="400" height="76" rx="18" fill="#fff" stroke="#222" stroke-width="4"/>
  <text x="240" y="568" text-anchor="middle" font-family="Arial,'Malgun Gothic',sans-serif" font-size="18" font-weight="700" fill="#202020">${safeName}</text>
  <text x="240" y="592" text-anchor="middle" font-family="Arial,sans-serif" font-size="12" font-weight="700" letter-spacing="2" fill="#777">PMC SELECT · NEW COLLECTION</text>
</svg>`;
    await writeFile(resolve(outputDirectory, `${id}.svg`), svg, "utf8");
  }
}

console.log("Generated 100 additional product images in public/products.");
