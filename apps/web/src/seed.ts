import { newId, now, type Lot, type Product } from "@sherpa/core";
import { db } from "./db";
import { addDaysISO, todayISO } from "./lib/date";

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

// 재고/유통기한 화면이 첫 로드에 비지 않도록 데모 Lot을 시드한다(지남/임박/여유가 섞이게).
// 오늘(new Date()) 기준 상대 유통기한. 이미 Lot이 하나라도 있으면(실제 입고 포함) 건너뛴다.
const SEED_LOTS: ReadonlyArray<{ barcode: string; offsetDays: number; quantity: number }> = [
  { barcode: "8801234567890", offsetDays: -1, quantity: 4 }, // 서울우유: 지남 + 재고부족
  { barcode: "8801234567890", offsetDays: 2, quantity: 6 }, //           임박
  { barcode: "8809876543210", offsetDays: 20, quantity: 30 }, // 신라면: 여유
  { barcode: "8801111222333", offsetDays: 5, quantity: 8 }, // 바나나우유: (기준따라)임박
  { barcode: "8801111222333", offsetDays: 40, quantity: 12 }, //           여유
];

let seedingLots: Promise<void> | null = null;

export function seedLots(): Promise<void> {
  if (!seedingLots) seedingLots = runSeedLots();
  return seedingLots;
}

async function runSeedLots(): Promise<void> {
  if ((await db.lots.count()) > 0) return; // 이미 Lot 있음(실제 입고 포함) → 데모 시드 안 함

  const today = todayISO();
  const barcodes = [...new Set(SEED_LOTS.map((l) => l.barcode))];
  const products = await db.products.where("barcode").anyOf(barcodes).toArray();
  const idByBarcode = new Map(products.map((p) => [p.barcode, p.id]));

  const t = now();
  const lots: Lot[] = [];
  for (const s of SEED_LOTS) {
    const productId = idByBarcode.get(s.barcode);
    if (!productId) continue; // 상품 시드 실패 시 방어
    lots.push({
      id: newId(),
      productId,
      expiryDate: addDaysISO(today, s.offsetDays),
      quantity: s.quantity,
      inboundAt: t,
      updatedAt: t,
    });
  }
  if (lots.length > 0) await db.lots.bulkAdd(lots);
}
