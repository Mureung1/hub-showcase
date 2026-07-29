import {
  getStorefrontDesign,
  type StorefrontDesignId,
  type StorefrontDesignSpec,
} from "./storefrontDesignCatalog";

export type StorefrontVariant = {
  categoryCode: string;
  label: string;
  wall: number;
  trim: number;
  roof: number;
  accent: number;
  flower: number;
  attachment:
    | "none"
    | "flower"
    | "coffee"
    | "meal"
    | "bakery"
    | "convenience"
    | "beauty"
    | "apparel"
    | "academy"
    | "lodging"
    | "sports";
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

const beautyVariant = {
  label: "LocalTwin Beauty",
  wall: 0xf1d7df,
  trim: 0xfffbf5,
  roof: 0xbc7892,
  accent: 0xc95787,
  flower: 0xf3c3d5,
  attachment: "beauty" as const,
};

const apparelVariant = {
  label: "LocalTwin Apparel",
  wall: 0xe2dcf2,
  trim: 0xfffcf6,
  roof: 0x826cba,
  accent: 0x7256b0,
  flower: 0xd8c5ef,
  attachment: "apparel" as const,
};

const academyVariant = {
  label: "LocalTwin Academy",
  wall: 0xcce8eb,
  trim: 0xfafffb,
  roof: 0x4f95a0,
  accent: 0x267e8f,
  flower: 0xb9e2dd,
  attachment: "academy" as const,
};

const lodgingVariant = {
  label: "LocalTwin Lodging",
  wall: 0xe9d9e5,
  trim: 0xfffbf8,
  roof: 0x9a6689,
  accent: 0x895274,
  flower: 0xead0df,
  attachment: "lodging" as const,
};

const sportsVariant = {
  label: "LocalTwin Sports",
  wall: 0xf0d7d1,
  trim: 0xfffcf7,
  roof: 0xbd6257,
  accent: 0xbe5044,
  flower: 0xf0c4b7,
  attachment: "sports" as const,
};

const serviceVariant = {
  label: "LocalTwin Service",
  wall: 0xd7e3dc,
  trim: 0xfffcf5,
  roof: 0x6f897b,
  accent: 0x467c62,
  flower: 0xc8dfcf,
  attachment: "none" as const,
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
  S20701: { categoryCode: "S20701", ...beautyVariant },
  S20702: { categoryCode: "S20702", ...beautyVariant },
  S20703: { categoryCode: "S20703", ...beautyVariant },
  G20901: { categoryCode: "G20901", ...apparelVariant },
  G20902: { categoryCode: "G20902", ...apparelVariant },
  G20905: { categoryCode: "G20905", ...apparelVariant },
  S20601: { categoryCode: "S20601", ...apparelVariant },
  P10501: { categoryCode: "P10501", ...academyVariant },
  P10603: { categoryCode: "P10603", ...sportsVariant },
  P10611: { categoryCode: "P10611", ...academyVariant },
  P10625: { categoryCode: "P10625", ...academyVariant },
  I10103: { categoryCode: "I10103", ...lodgingVariant },
  S20801: { categoryCode: "S20801", ...sportsVariant },
};

export function getStorefrontVariant(categoryCode: string) {
  const exactVariant = storefrontRegistry[categoryCode];
  if (exactVariant) return exactVariant;
  if (/^I2\d{4}$/.test(categoryCode)) {
    return { categoryCode, ...restaurantVariant };
  }
  if (/^S207/.test(categoryCode)) return { categoryCode, ...beautyVariant };
  if (/^(G209|S206)/.test(categoryCode)) return { categoryCode, ...apparelVariant };
  if (/^P10/.test(categoryCode)) return { categoryCode, ...academyVariant };
  if (/^I101/.test(categoryCode)) return { categoryCode, ...lodgingVariant };
  if (/^(S208|R104)/.test(categoryCode)) return { categoryCode, ...sportsVariant };
  return { categoryCode, ...serviceVariant };
}

export function hasStorefrontVariant(categoryCode: string | null): categoryCode is string {
  if (!categoryCode?.trim()) return false;
  return getStorefrontVariant(categoryCode).attachment !== "none";
}

export function storefrontVisualStatus(categoryCode: string | null) {
  return hasStorefrontVariant(categoryCode) ? "mapped" : "generic";
}

const designIdByAttachment: Partial<Record<StorefrontVariant["attachment"], StorefrontDesignId>> = {
  flower: "flower",
  coffee: "cafe",
  meal: "restaurant",
  bakery: "bakery",
  convenience: "convenience",
  beauty: "beauty",
  apparel: "apparel",
  academy: "academy",
  lodging: "lodging",
  sports: "sports",
};

export function getStorefrontDesignForVariant(
  variant: StorefrontVariant,
): StorefrontDesignSpec | null {
  const designId = designIdByAttachment[variant.attachment];
  return designId ? getStorefrontDesign(designId) : null;
}
