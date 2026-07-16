export type StorefrontVariant = {
  categoryCode: string;
  label: string;
  wall: number;
  trim: number;
  roof: number;
  accent: number;
  flower: number;
  attachment: "none" | "flower" | "coffee" | "meal" | "bakery" | "convenience";
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

const cafeVariant = {
  label: "LocalTwin Cafe",
  wall: 0xc5dbc8,
  trim: 0xfff4dc,
  roof: 0x66836d,
  accent: 0x3f8e68,
  flower: 0xf4c66f,
  attachment: "coffee" as const,
};

const restaurantVariant = {
  label: "LocalTwin Restaurant",
  wall: 0xf2d5ac,
  trim: 0xfff4dc,
  roof: 0xa66f4d,
  accent: 0xe78345,
  flower: 0xf4c66f,
  attachment: "meal" as const,
};

const bakeryVariant = {
  label: "LocalTwin Bakery",
  wall: 0xf0d4bd,
  trim: 0xfff8e8,
  roof: 0xb87655,
  accent: 0xe6a56c,
  flower: 0xffdc82,
  attachment: "bakery" as const,
};

const convenienceVariant = {
  label: "LocalTwin Convenience",
  wall: 0xc7dbea,
  trim: 0xf7fbff,
  roof: 0x6687a7,
  accent: 0x4c91c6,
  flower: 0xf1a65c,
  attachment: "convenience" as const,
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
  I21201: {
    categoryCode: "I21201",
    ...cafeVariant,
  },
  I21001: {
    categoryCode: "I21001",
    ...bakeryVariant,
  },
  G20405: {
    categoryCode: "G20405",
    ...convenienceVariant,
  },
};

export function getStorefrontVariant(categoryCode: string) {
  const exactVariant = storefrontRegistry[categoryCode];
  if (exactVariant) return exactVariant;
  if (/^I2\d{4}$/.test(categoryCode)) {
    return { categoryCode, ...restaurantVariant };
  }
  return genericVariant;
}

export function hasStorefrontVariant(categoryCode: string | null): categoryCode is string {
  return categoryCode !== null && getStorefrontVariant(categoryCode).categoryCode !== "generic";
}
