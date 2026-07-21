import { DEMO_MARKETS, type ProductCatalog } from "./productCatalog";

export const submissionCatalog: ProductCatalog = {
  markets: DEMO_MARKETS,
  categories: [
    { name: "카페", codes: ["CS100010"] },
    { name: "음식점", codes: ["CS100001"] },
    { name: "베이커리", codes: ["CS100005"] },
    { name: "편의점", codes: ["CS300002"] },
  ],
  radii: [100, 300, 500],
};
