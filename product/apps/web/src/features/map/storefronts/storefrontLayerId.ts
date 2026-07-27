export function storefrontLayerId(storeId: string) {
  return `localtwin-storefront-${storeId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
