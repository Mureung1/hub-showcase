import { newId, now, type Product } from "@sherpa/core";
import { db } from "./db";

// 등록됨/미등록 두 분기를 눈으로 확인하기 위한 seed 상품.
// 여기 없는 바코드를 스캔하면 '미등록' 분기로 갈라진다.
export const SEED_PRODUCTS: ReadonlyArray<
  Pick<Product, "barcode" | "name" | "category">
> = [
  { barcode: "8801234567890", name: "서울우유 1L", category: "유제품" },
  { barcode: "8809876543210", name: "농심 신라면 (5개입)", category: "가공식품" },
  { barcode: "8801111222333", name: "빙그레 바나나맛우유 240ml", category: "음료" },
];

// StrictMode의 이펙트 중복 실행 등으로 seed가 두 번 돌아도
// 안전하도록: (1) 세션 내 단일 실행 보장, (2) 이미 있는 barcode는 건너뜀.
let seeding: Promise<void> | null = null;

export function seedProducts(): Promise<void> {
  if (!seeding) seeding = runSeed();
  return seeding;
}

async function runSeed(): Promise<void> {
  const barcodes = SEED_PRODUCTS.map((p) => p.barcode);
  const existing = await db.products.where("barcode").anyOf(barcodes).toArray();
  const known = new Set(existing.map((p) => p.barcode));

  const t = now();
  const toAdd: Product[] = SEED_PRODUCTS.filter((p) => !known.has(p.barcode)).map(
    (p) => ({
      id: newId(),
      barcode: p.barcode,
      name: p.name,
      category: p.category,
      createdAt: t,
      updatedAt: t,
    })
  );

  if (toAdd.length > 0) await db.products.bulkAdd(toAdd);
}
