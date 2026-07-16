export type StorefrontVariant = {
  categoryCode: string;
  label: string;
  wall: number;
  trim: number;
  roof: number;
  accent: number;
  flower: number;
  attachment: "none" | "flower";
};

const genericVariant: StorefrontVariant = {
  categoryCode: "generic",
  label: "Local shop",
  wall: 0xd9d8cf,
  trim: 0xf5f1e8,
  roof: 0x7b8179,
  accent: 0x5e6c61,
  flower: 0xe9a9b7,
  attachment: "none",
};

const flowerVariant = {
  label: "LocalTwin Flower",
  wall: 0xb9d8bc,
  trim: 0xfff4dc,
  roof: 0x65886d,
  accent: 0xf28f9d,
  flower: 0xffcf5c,
  attachment: "flower" as const,
};

export const storefrontRegistry: Record<string, StorefrontVariant> = {
  G21901: {
    categoryCode: "G21901",
    ...flowerVariant,
  },
  CS300028: {
    categoryCode: "CS300028",
    ...flowerVariant,
  },
};

export function getStorefrontVariant(categoryCode: string) {
  return storefrontRegistry[categoryCode] ?? genericVariant;
}

export function hasStorefrontVariant(categoryCode: string | null): categoryCode is string {
  return categoryCode !== null && categoryCode in storefrontRegistry;
}
