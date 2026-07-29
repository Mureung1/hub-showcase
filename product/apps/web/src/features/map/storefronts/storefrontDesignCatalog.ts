export type StorefrontDesignId =
  | "cafe"
  | "restaurant"
  | "bakery"
  | "convenience"
  | "beauty"
  | "apparel"
  | "academy"
  | "lodging"
  | "sports"
  | "flower";

export type StorefrontForm = "shop" | "wide" | "round" | "showroom" | "tower" | "greenhouse";

export type StorefrontDesignSpec = {
  id: StorefrontDesignId;
  code: string;
  label: string;
  form: StorefrontForm;
  width: number;
  depth: number;
  height: number;
  levels: number;
  wall: number;
  roof: number;
  accent: number;
  detail: number;
  description: string;
};

export const storefrontDesignCatalog: readonly StorefrontDesignSpec[] = [
  {
    id: "cafe",
    code: "I21201",
    label: "카페",
    form: "shop",
    width: 4.3,
    depth: 3.05,
    height: 2.55,
    levels: 1,
    wall: 0xf7edda,
    roof: 0x386a52,
    accent: 0xe8b56a,
    detail: 0xa86f4c,
    description: "사방 차양과 테라스, 갈색 원두가 그려진 둥근 옥상 커피잔",
  },
  {
    id: "restaurant",
    code: "I20101",
    label: "음식점",
    form: "wide",
    width: 4.8,
    depth: 3.4,
    height: 2.45,
    levels: 1,
    wall: 0xf1d0a2,
    roof: 0x934f3d,
    accent: 0xe37b43,
    detail: 0x5d382f,
    description: "넓은 처마와 모서리 등, 가운데 큰 그릇과 오른쪽 수저·젓가락",
  },
  {
    id: "bakery",
    code: "I21001",
    label: "베이커리",
    form: "shop",
    width: 4.45,
    depth: 3.15,
    height: 2.5,
    levels: 1,
    wall: 0xf3d8c2,
    roof: 0xa95f48,
    accent: 0xf0a765,
    detail: 0xffdf95,
    description: "따뜻한 진열창과 줄무늬 차양, 바구니에 세워 놓은 바게트 세 개",
  },
  {
    id: "convenience",
    code: "G20405",
    label: "편의점",
    form: "showroom",
    width: 4.65,
    depth: 3.35,
    height: 2.75,
    levels: 1,
    wall: 0xe8f2f6,
    roof: 0x4c779b,
    accent: 0x46a1d2,
    detail: 0xf09a4b,
    description: "밝은 유리 매장과 녹색·파랑·주황·보라의 자체 제작 chain-store band",
  },
  {
    id: "beauty",
    code: "S20701",
    label: "미용",
    form: "round",
    width: 4.15,
    depth: 4.15,
    height: 2.8,
    levels: 1,
    wall: 0xf1d8df,
    roof: 0xa96282,
    accent: 0xd66091,
    detail: 0xf5c4d7,
    description: "팔각형 salon과 세로 거울, 지붕 위에 눕힌 큰 가위",
  },
  {
    id: "apparel",
    code: "G20901",
    label: "의류",
    form: "showroom",
    width: 4.25,
    depth: 3.45,
    height: 3.05,
    levels: 1,
    wall: 0xe4def2,
    roof: 0x715da4,
    accent: 0x8d73c6,
    detail: 0xf7b7cb,
    description: "단차가 있는 쇼룸과 큰 유리창, 지붕 위에 펼쳐 놓은 옷",
  },
  {
    id: "academy",
    code: "P1",
    label: "학원",
    form: "tower",
    width: 3.65,
    depth: 3.25,
    height: 4.25,
    levels: 3,
    wall: 0xcde8ea,
    roof: 0x397f8a,
    accent: 0x54a8b4,
    detail: 0xf0c85d,
    description: "여러 교육 업종을 함께 나타내는 수직형 3층 건물과 독서대 위 열린 책",
  },
  {
    id: "lodging",
    code: "I10103",
    label: "숙박",
    form: "tower",
    width: 4.05,
    depth: 3.45,
    height: 4.45,
    levels: 3,
    wall: 0xeadde7,
    roof: 0x815675,
    accent: 0xb778a0,
    detail: 0xf0c4d9,
    description: "3층 객실과 둘레 발코니, 큰 이불과 headboard 쿠션이 있는 옥상 침대",
  },
  {
    id: "sports",
    code: "S20801",
    label: "스포츠",
    form: "wide",
    width: 4.85,
    depth: 3.65,
    height: 2.9,
    levels: 1,
    wall: 0xefd8d2,
    roof: 0xa94741,
    accent: 0xd75b4e,
    detail: 0x3c4542,
    description: "넓고 낮은 체육관과 수평 창, 큰 아령",
  },
  {
    id: "flower",
    code: "G21901",
    label: "꽃집",
    form: "greenhouse",
    width: 4.15,
    depth: 3.35,
    height: 2.25,
    levels: 1,
    wall: 0xc9dfca,
    roof: 0x63896c,
    accent: 0xef8fa5,
    detail: 0xffcf5c,
    description: "하늘색 투명창과 온실형 지붕, 갈색 화분 위 꽃",
  },
] as const;

export function getStorefrontDesign(id: StorefrontDesignId) {
  return storefrontDesignCatalog.find((design) => design.id === id) ?? storefrontDesignCatalog[0];
}
