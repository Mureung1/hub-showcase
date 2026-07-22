type ProductCategory = "top" | "bottom" | "shoes" | "accessories";

interface AdditionalProductSeed {
  name: string;
  color: string;
  colorHex: string;
}

interface AdditionalCatalogProduct {
  id: string;
  name: string;
  category: ProductCategory;
  colors: string[];
  seasons: string[];
  styles: string[];
  destinations: string[];
  weather: string[];
  description: string;
  imageUrl: string;
  price: number;
  brand: string;
  catalogSource: true;
}

export const ADDITIONAL_PRODUCT_SEEDS: Record<ProductCategory, AdditionalProductSeed[]> = {
  top: [
    { name: "세이지 린넨 밴드칼라 셔츠", color: "Sage Green", colorHex: "#91a889" },
    { name: "버터옐로 퍼프 슬리브 블라우스", color: "Butter Yellow", colorHex: "#f2d675" },
    { name: "라벤더 케이블 크롭 니트", color: "Lavender", colorHex: "#b9a5d6" },
    { name: "네이비 세일러 칼라 티셔츠", color: "Navy", colorHex: "#273652" },
    { name: "피치 핑크 시어서커 셔츠", color: "Peach Pink", colorHex: "#efaa9c" },
    { name: "차콜 하프집업 스웨트셔츠", color: "Charcoal", colorHex: "#4b4d52" },
    { name: "코발트 블루 브이넥 가디건", color: "Cobalt Blue", colorHex: "#315cb6" },
    { name: "크림 자수 레이스 블라우스", color: "Cream", colorHex: "#eee5cc" },
    { name: "민트 스트라이프 럭비 셔츠", color: "Mint", colorHex: "#9ed4c0" },
    { name: "테라코타 립드 터틀넥", color: "Terracotta", colorHex: "#bd6d52" },
    { name: "블랙 모크넥 슬림 티셔츠", color: "Black", colorHex: "#29282b" },
    { name: "로즈핑크 리본 타이 블라우스", color: "Rose Pink", colorHex: "#d98d9f" },
    { name: "오트밀 와플 헨리넥", color: "Oatmeal", colorHex: "#d8cbb5" },
    { name: "스카이블루 오픈칼라 셔츠", color: "Sky Blue", colorHex: "#8cc2dc" },
    { name: "와인 아가일 니트 베스트", color: "Wine", colorHex: "#73394a" },
    { name: "아이보리 프릴 칼라 블라우스", color: "Ivory", colorHex: "#f1eadc" },
    { name: "포레스트 그린 오버핏 후디", color: "Forest Green", colorHex: "#365c49" },
    { name: "레몬 배색 카라 니트", color: "Lemon", colorHex: "#eadb67" },
    { name: "블루 데님 웨스턴 셔츠", color: "Denim Blue", colorHex: "#6687ad" },
    { name: "코랄 스퀘어넥 골지 니트", color: "Coral", colorHex: "#df806e" },
    { name: "멜란지 그레이 래글런 맨투맨", color: "Melange Gray", colorHex: "#a8a8a6" },
    { name: "화이트 핀턱 코튼 블라우스", color: "White", colorHex: "#f5f4ef" },
    { name: "브릭 레드 크루넥 스웨트셔츠", color: "Brick Red", colorHex: "#9f5144" },
    { name: "파우더블루 앙고라 가디건", color: "Powder Blue", colorHex: "#adc9dc" },
    { name: "베이지 린넨 포켓 셔츠", color: "Beige", colorHex: "#cbb99e" },
    { name: "퍼플 보트넥 스트라이프 티", color: "Purple", colorHex: "#826da7" },
    { name: "카키 유틸리티 오버셔츠", color: "Khaki", colorHex: "#77765a" },
    { name: "블러시 핑크 랩 블라우스", color: "Blush Pink", colorHex: "#e1aeb2" },
    { name: "잉크 네이비 피케 폴로", color: "Ink Navy", colorHex: "#263247" },
    { name: "에크루 크로셰 반팔 니트", color: "Ecru", colorHex: "#dfd2b8" },
  ],
  bottom: [
    { name: "세이지 핀턱 와이드 슬랙스", color: "Sage Green", colorHex: "#91a889" },
    { name: "크림 플리츠 미디스커트", color: "Cream", colorHex: "#eee5cc" },
    { name: "라이트블루 배럴 데님", color: "Light Blue", colorHex: "#91b5d2" },
    { name: "차콜 카고 조거 팬츠", color: "Charcoal", colorHex: "#4b4d52" },
    { name: "버터옐로 A라인 미니스커트", color: "Butter Yellow", colorHex: "#f2d675" },
    { name: "브라운 코듀로이 스트레이트 팬츠", color: "Brown", colorHex: "#815f49" },
    { name: "네이비 테일러드 버뮤다 팬츠", color: "Navy", colorHex: "#273652" },
    { name: "라벤더 새틴 바이어스 스커트", color: "Lavender", colorHex: "#b9a5d6" },
    { name: "오프화이트 페인터 팬츠", color: "Off White", colorHex: "#e8e3d8" },
    { name: "블랙 머메이드 롱스커트", color: "Black", colorHex: "#29282b" },
    { name: "올리브 파라슈트 카고 팬츠", color: "Olive", colorHex: "#687052" },
    { name: "로즈핑크 트위드 미니스커트", color: "Rose Pink", colorHex: "#d98d9f" },
    { name: "인디고 셀비지 와이드 데님", color: "Indigo", colorHex: "#354e72" },
    { name: "카멜 벨티드 랩 스커트", color: "Camel", colorHex: "#b18459" },
    { name: "스카이블루 코튼 쇼츠", color: "Sky Blue", colorHex: "#8cc2dc" },
    { name: "와인 체크 플리츠 스커트", color: "Wine", colorHex: "#73394a" },
    { name: "그레이 헤링본 와이드 팬츠", color: "Gray", colorHex: "#85868a" },
    { name: "민트 테리 밴딩 쇼츠", color: "Mint", colorHex: "#9ed4c0" },
    { name: "코랄 린넨 플레어 스커트", color: "Coral", colorHex: "#df806e" },
    { name: "베이지 치노 테이퍼드 팬츠", color: "Beige", colorHex: "#cbb99e" },
    { name: "블루 스트라이프 파자마 팬츠", color: "Blue Stripe", colorHex: "#739ab9" },
    { name: "아이보리 니트 맥시스커트", color: "Ivory", colorHex: "#f1eadc" },
    { name: "브릭 레드 코튼 미니스커트", color: "Brick Red", colorHex: "#9f5144" },
    { name: "퍼플 나일론 트랙 팬츠", color: "Purple", colorHex: "#826da7" },
    { name: "에크루 프린지 데님 스커트", color: "Ecru", colorHex: "#dfd2b8" },
    { name: "초콜릿 레더 버뮤다 팬츠", color: "Chocolate", colorHex: "#5d4035" },
    { name: "파우더블루 코듀로이 팬츠", color: "Powder Blue", colorHex: "#adc9dc" },
    { name: "포레스트 체크 랩 스커트", color: "Forest Green", colorHex: "#365c49" },
    { name: "오렌지 드로스트링 스커트", color: "Orange", colorHex: "#df8a4d" },
    { name: "실버그레이 새틴 와이드 팬츠", color: "Silver Gray", colorHex: "#aeb2b7" },
  ],
  shoes: [
    { name: "세이지 스웨이드 메리제인", color: "Sage Green", colorHex: "#91a889" },
    { name: "버터옐로 캔버스 스니커즈", color: "Butter Yellow", colorHex: "#f2d675" },
    { name: "라벤더 리본 발레 플랫", color: "Lavender", colorHex: "#b9a5d6" },
    { name: "네이비 페니 로퍼", color: "Navy", colorHex: "#273652" },
    { name: "오프화이트 청키 러너", color: "Off White", colorHex: "#e8e3d8" },
    { name: "브라운 스웨이드 첼시부츠", color: "Brown", colorHex: "#815f49" },
    { name: "코랄 스트랩 샌들", color: "Coral", colorHex: "#df806e" },
    { name: "실버 메탈릭 슬링백", color: "Silver", colorHex: "#b9bdc4" },
    { name: "블랙 스퀘어토 뮬", color: "Black", colorHex: "#29282b" },
    { name: "민트 레트로 러닝화", color: "Mint", colorHex: "#9ed4c0" },
    { name: "와인 플랫폼 로퍼", color: "Wine", colorHex: "#73394a" },
    { name: "크림 셔링 앵클부츠", color: "Cream", colorHex: "#eee5cc" },
    { name: "스카이블루 하이탑 스니커즈", color: "Sky Blue", colorHex: "#8cc2dc" },
    { name: "카키 트레킹 샌들", color: "Khaki", colorHex: "#77765a" },
    { name: "로즈핑크 키튼힐 펌프스", color: "Rose Pink", colorHex: "#d98d9f" },
    { name: "그레이 니트 삭스부츠", color: "Gray", colorHex: "#85868a" },
    { name: "인디고 데님 슬립온", color: "Indigo", colorHex: "#354e72" },
    { name: "카멜 레더 글래디에이터 샌들", color: "Camel", colorHex: "#b18459" },
    { name: "화이트 미니멀 테니스화", color: "White", colorHex: "#f5f4ef" },
    { name: "퍼플 트레일 스니커즈", color: "Purple", colorHex: "#826da7" },
  ],
  accessories: [
    { name: "세이지 미니 버킷백", color: "Sage Green", colorHex: "#91a889" },
    { name: "버터옐로 실크 스카프", color: "Butter Yellow", colorHex: "#f2d675" },
    { name: "라벤더 비즈 숄더백", color: "Lavender", colorHex: "#b9a5d6" },
    { name: "네이비 울 베레모", color: "Navy", colorHex: "#273652" },
    { name: "코랄 아세테이트 선글라스", color: "Coral", colorHex: "#df806e" },
    { name: "실버 볼드 체인 네크리스", color: "Silver", colorHex: "#b9bdc4" },
    { name: "크림 퀼팅 크로스백", color: "Cream", colorHex: "#eee5cc" },
    { name: "민트 레더 카드지갑", color: "Mint", colorHex: "#9ed4c0" },
    { name: "와인 벨벳 헤어리본", color: "Wine", colorHex: "#73394a" },
    { name: "브라운 스퀘어 버클 벨트", color: "Brown", colorHex: "#815f49" },
    { name: "스카이블루 나일론 호보백", color: "Sky Blue", colorHex: "#8cc2dc" },
    { name: "로즈핑크 진주 드롭 이어링", color: "Rose Pink", colorHex: "#d98d9f" },
    { name: "블랙 미니멀 숄더백", color: "Black", colorHex: "#29282b" },
    { name: "오트밀 니트 바라클라바", color: "Oatmeal", colorHex: "#d8cbb5" },
    { name: "카키 유틸리티 슬링백", color: "Khaki", colorHex: "#77765a" },
    { name: "퍼플 에나멜 미니 파우치", color: "Purple", colorHex: "#826da7" },
    { name: "화이트 플라워 헤어클립", color: "White", colorHex: "#f5f4ef" },
    { name: "카멜 스웨이드 토트백", color: "Camel", colorHex: "#b18459" },
    { name: "포레스트 체크 머플러", color: "Forest Green", colorHex: "#365c49" },
    { name: "오렌지 레트로 디지털 워치", color: "Orange", colorHex: "#df8a4d" },
  ],
};

const seasons = [
  ["spring", "summer"],
  ["spring", "autumn"],
  ["autumn", "winter"],
  ["spring", "summer", "autumn", "winter"],
];
const styles = [["casual", "date"], ["formal", "date"], ["casual", "workout"], ["casual", "formal"]];
const destinations = [["cafe", "school"], ["office", "cafe"], ["party", "cafe"], ["home", "school", "cafe"]];

const categoryLabels: Record<ProductCategory, string> = {
  top: "상의",
  bottom: "하의",
  shoes: "신발",
  accessories: "패션 소품",
};

const startNumbers: Record<ProductCategory, number> = { top: 31, bottom: 31, shoes: 21, accessories: 21 };

export const ADDITIONAL_PRODUCT_CATALOG: AdditionalCatalogProduct[] = (
  Object.entries(ADDITIONAL_PRODUCT_SEEDS) as [ProductCategory, AdditionalProductSeed[]][]
).flatMap(([category, products]) => products.map((product, index) => {
  const productNumber = startNumbers[category] + index;
  const id = `${category}-${String(productNumber).padStart(3, "0")}`;
  return {
    id,
    name: product.name,
    category,
    colors: [product.color],
    seasons: seasons[index % seasons.length],
    styles: styles[index % styles.length],
    destinations: destinations[index % destinations.length],
    weather: index % 5 === 0 ? ["sun", "cloud", "rain"] : ["sun", "cloud", "rain", "snow"],
    description: `${product.name}은(는) ${product.color} 컬러와 감각적인 디테일이 돋보이는 ${categoryLabels[category]}입니다.`,
    imageUrl: `/products/${id}.svg`,
    price: 24900 + ((index * 7000 + productNumber * 1300) % 95000),
    brand: "PMC Select",
    catalogSource: true,
  };
}));
