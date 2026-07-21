export type ProductCategory = "top" | "bottom" | "shoes" | "accessories";

export interface CatalogProduct {
    id: string;
    name: string;
    category: ProductCategory;
    colors: string[];
    seasons: Array<"spring" | "summer" | "autumn" | "winter">;
    styles: Array<"casual" | "date" | "formal" | "workout">;
    destinations: Array<"cafe" | "school" | "office" | "party" | "home">;
    weather: Array<"sun" | "cloud" | "rain" | "snow">;
    description: string;
    imageUrl: string;
    price?: number;
    shopName?: string;
    shoppingUrl?: string;
}

export const PRODUCT_CATALOG: CatalogProduct[] = [
    {
        id: "top-001",
        name: "화이트 오버핏 코튼 셔츠",
        category: "top",
        colors: ["White"],
        seasons: ["spring", "summer", "autumn"],
        styles: ["casual", "date", "formal"],
        destinations: ["cafe", "school", "office"],
        weather: ["sun", "cloud"],
        description: "깔끔한 인상을 주며 데님, 슬랙스, 스커트와 모두 잘 어울리는 기본 셔츠",
        imageUrl: "/products/top-001.jpg",
        price: 32900
    },
    {
        id: "top-002",
        name: "그레이 오버핏 맨투맨",
        category: "top",
        colors: ["Gray"],
        seasons: ["spring", "autumn", "winter"],
        styles: ["casual"],
        destinations: ["cafe", "school", "home"],
        weather: ["cloud", "rain", "snow"],
        description: "편안한 착용감과 자연스러운 실루엣을 갖춘 데일리 맨투맨",
        imageUrl: "/products/top-002.jpg",
        price: 39900
    },
    {
        id: "top-003",
        name: "아이보리 라운드넥 니트",
        category: "top",
        colors: ["Ivory"],
        seasons: ["spring", "autumn", "winter"],
        styles: ["casual", "date", "formal"],
        destinations: ["cafe", "school", "office"],
        weather: ["cloud", "snow"],
        description: "부드러운 색감으로 차분하고 따뜻한 분위기를 연출하는 기본 니트",
        imageUrl: "/products/top-003.jpg",
        price: 45900
    },
    {
        id: "top-004",
        name: "네이비 카라 니트",
        category: "top",
        colors: ["Navy"],
        seasons: ["spring", "autumn"],
        styles: ["date", "formal"],
        destinations: ["cafe", "office", "party"],
        weather: ["sun", "cloud"],
        description: "단정한 카라 디자인으로 데이트와 오피스룩에 활용하기 좋은 니트",
        imageUrl: "/products/top-004.jpg",
        price: 49900
    },
    {
        id: "top-005",
        name: "블랙 크롭 반팔 티셔츠",
        category: "top",
        colors: ["Black"],
        seasons: ["summer"],
        styles: ["casual", "date"],
        destinations: ["cafe", "school", "party"],
        weather: ["sun"],
        description: "여름철 가볍게 입기 좋고 하이웨이스트 하의와 잘 어울리는 반팔 티셔츠",
        imageUrl: "/products/top-005.jpg",
        price: 21900
    },

    {
        id: "bottom-001",
        name: "연청 스트레이트 데님 팬츠",
        category: "bottom",
        colors: ["Light Blue"],
        seasons: ["spring", "summer", "autumn"],
        styles: ["casual", "date"],
        destinations: ["cafe", "school", "party"],
        weather: ["sun", "cloud"],
        description: "다양한 상의와 쉽게 매치할 수 있는 기본 스트레이트 핏 데님",
        imageUrl: "/products/bottom-001.jpg",
        price: 44900
    },
    {
        id: "bottom-002",
        name: "블랙 와이드 슬랙스",
        category: "bottom",
        colors: ["Black"],
        seasons: ["spring", "summer", "autumn", "winter"],
        styles: ["casual", "formal"],
        destinations: ["school", "office", "party"],
        weather: ["sun", "cloud", "rain"],
        description: "단정함과 편안함을 동시에 갖춘 활용도 높은 와이드 슬랙스",
        imageUrl: "/products/bottom-002.jpg",
        price: 39900
    },
    {
        id: "bottom-003",
        name: "베이지 코튼 롱스커트",
        category: "bottom",
        colors: ["Beige"],
        seasons: ["spring", "summer", "autumn"],
        styles: ["casual", "date"],
        destinations: ["cafe", "school", "party"],
        weather: ["sun", "cloud"],
        description: "부드럽고 편안한 분위기를 연출해 카페나 데이트에 잘 어울리는 스커트",
        imageUrl: "/products/bottom-003.jpg",
        price: 36900
    },
    {
        id: "bottom-004",
        name: "차콜 핀턱 와이드 팬츠",
        category: "bottom",
        colors: ["Charcoal"],
        seasons: ["spring", "autumn", "winter"],
        styles: ["formal", "date"],
        destinations: ["office", "cafe", "party"],
        weather: ["cloud", "snow"],
        description: "핀턱 디테일로 실루엣이 깔끔해 격식 있는 일정에 활용하기 좋은 팬츠",
        imageUrl: "/products/bottom-004.jpg",
        price: 47900
    },
    {
        id: "bottom-005",
        name: "블랙 나일론 카고 팬츠",
        category: "bottom",
        colors: ["Black"],
        seasons: ["spring", "summer", "autumn"],
        styles: ["casual", "workout"],
        destinations: ["school", "home", "party"],
        weather: ["sun", "cloud", "rain"],
        description: "활동성이 좋고 스트리트한 분위기를 더해주는 가벼운 카고 팬츠",
        imageUrl: "/products/bottom-005.jpg",
        price: 42900
    },

    {
        id: "shoes-001",
        name: "화이트 데일리 스니커즈",
        category: "shoes",
        colors: ["White"],
        seasons: ["spring", "summer", "autumn", "winter"],
        styles: ["casual", "date"],
        destinations: ["cafe", "school", "office", "party"],
        weather: ["sun", "cloud"],
        description: "대부분의 코디에 자연스럽게 어울리는 활용도 높은 기본 스니커즈",
        imageUrl: "/products/shoes-001.jpg",
        price: 59000
    },
    {
        id: "shoes-002",
        name: "블랙 페니 로퍼",
        category: "shoes",
        colors: ["Black"],
        seasons: ["spring", "autumn", "winter"],
        styles: ["formal", "date"],
        destinations: ["office", "cafe", "party"],
        weather: ["sun", "cloud"],
        description: "단정하고 클래식한 인상을 주어 오피스와 격식 있는 일정에 적합한 로퍼",
        imageUrl: "/products/shoes-002.jpg",
        price: 69000
    },
    {
        id: "shoes-003",
        name: "그레이 러닝화",
        category: "shoes",
        colors: ["Gray"],
        seasons: ["spring", "summer", "autumn"],
        styles: ["casual", "workout"],
        destinations: ["school", "home"],
        weather: ["sun", "cloud"],
        description: "가볍고 쿠셔닝이 좋아 이동량이 많거나 운동하는 날에 적합한 러닝화",
        imageUrl: "/products/shoes-003.jpg",
        price: 79000
    },
    {
        id: "shoes-004",
        name: "브라운 첼시 부츠",
        category: "shoes",
        colors: ["Brown"],
        seasons: ["autumn", "winter"],
        styles: ["date", "formal"],
        destinations: ["cafe", "office", "party"],
        weather: ["cloud", "snow"],
        description: "가을과 겨울 코디에 안정감 있는 분위기를 더해주는 첼시 부츠",
        imageUrl: "/products/shoes-004.jpg",
        price: 89000
    },
    {
        id: "shoes-005",
        name: "블랙 레인 부츠",
        category: "shoes",
        colors: ["Black"],
        seasons: ["spring", "summer", "autumn"],
        styles: ["casual"],
        destinations: ["school", "office", "cafe"],
        weather: ["rain"],
        description: "비 오는 날 발을 보호하면서도 심플한 디자인을 유지하는 레인 부츠",
        imageUrl: "/products/shoes-005.jpg",
        price: 54900
    },

    {
        id: "accessories-001",
        name: "블랙 미니 크로스백",
        category: "accessories",
        colors: ["Black"],
        seasons: ["spring", "summer", "autumn", "winter"],
        styles: ["casual", "date", "formal"],
        destinations: ["cafe", "school", "office", "party"],
        weather: ["sun", "cloud"],
        description: "필수 소지품을 간단히 수납할 수 있는 실용적인 미니 크로스백",
        imageUrl: "/products/accessories-001.jpg",
        price: 39900
    },
    {
        id: "accessories-002",
        name: "심플 실버 목걸이",
        category: "accessories",
        colors: ["Silver"],
        seasons: ["spring", "summer", "autumn", "winter"],
        styles: ["date", "formal"],
        destinations: ["cafe", "office", "party"],
        weather: ["sun", "cloud"],
        description: "과하지 않게 포인트를 더해주는 미니멀한 실버 목걸이",
        imageUrl: "/products/accessories-002.jpg",
        price: 25900
    },
    {
        id: "accessories-003",
        name: "네이비 볼캡",
        category: "accessories",
        colors: ["Navy"],
        seasons: ["spring", "summer", "autumn"],
        styles: ["casual", "workout"],
        destinations: ["school", "home", "cafe"],
        weather: ["sun"],
        description: "햇빛을 가리고 캐주얼한 분위기를 더해주는 데일리 볼캡",
        imageUrl: "/products/accessories-003.jpg",
        price: 21900
    },
    {
        id: "accessories-004",
        name: "베이지 머플러",
        category: "accessories",
        colors: ["Beige"],
        seasons: ["autumn", "winter"],
        styles: ["casual", "date", "formal"],
        destinations: ["cafe", "school", "office"],
        weather: ["cloud", "snow"],
        description: "보온성과 부드러운 색감을 더해주는 가을·겨울용 머플러",
        imageUrl: "/products/accessories-004.jpg",
        price: 29900
    },
    {
        id: "accessories-005",
        name: "투명 장우산",
        category: "accessories",
        colors: ["Clear"],
        seasons: ["spring", "summer", "autumn", "winter"],
        styles: ["casual", "formal"],
        destinations: ["cafe", "school", "office"],
        weather: ["rain"],
        description: "비 오는 날 시야를 확보하면서 어떤 코디에도 무난하게 어울리는 장우산",
        imageUrl: "/products/accessories-005.jpg",
        price: 15900
    }
];

export function getProductsByCategory(category: ProductCategory): CatalogProduct[] {
    return PRODUCT_CATALOG.filter((product) => product.category === category);
}

export function findProductById(id: string): CatalogProduct | undefined {
    return PRODUCT_CATALOG.find((product) => product.id === id);
}