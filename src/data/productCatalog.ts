export type ProductCategory = "top" | "bottom" | "shoes" | "accessories";

export interface CatalogProduct {
  id: string; name: string; category: ProductCategory; colors: string[];
  seasons: string[]; styles: string[]; destinations: string[]; weather: string[];
  description: string; imageUrl: string; price: number; brand: string; catalogSource: true;
}

export const PRODUCT_CATALOG: CatalogProduct[] = [
  {
    "id": "top-001",
    "name": "화이트 오버핏 코튼 셔츠",
    "category": "top",
    "colors": [
      "White"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "casual",
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "화이트 오버핏 코튼 셔츠은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-001.svg",
    "price": 32900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-002",
    "name": "스카이블루 스트라이프 셔츠",
    "category": "top",
    "colors": [
      "Sky Blue"
    ],
    "seasons": [
      "spring",
      "summer"
    ],
    "styles": [
      "casual",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "스카이블루 스트라이프 셔츠은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-002.svg",
    "price": 36900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-003",
    "name": "아이보리 라운드넥 니트",
    "category": "top",
    "colors": [
      "Ivory"
    ],
    "seasons": [
      "spring",
      "autumn",
      "winter"
    ],
    "styles": [
      "casual",
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "아이보리 라운드넥 니트은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-003.svg",
    "price": 45900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-004",
    "name": "그레이 오버핏 맨투맨",
    "category": "top",
    "colors": [
      "Gray"
    ],
    "seasons": [
      "spring",
      "autumn",
      "winter"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "그레이 오버핏 맨투맨은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-004.svg",
    "price": 39900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-005",
    "name": "네이비 카라 니트",
    "category": "top",
    "colors": [
      "Navy"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "네이비 카라 니트은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-005.svg",
    "price": 49900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-006",
    "name": "블랙 크롭 반팔 티셔츠",
    "category": "top",
    "colors": [
      "Black"
    ],
    "seasons": [
      "summer"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 크롭 반팔 티셔츠은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-006.svg",
    "price": 21900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-007",
    "name": "화이트 베이직 반팔 티셔츠",
    "category": "top",
    "colors": [
      "White"
    ],
    "seasons": [
      "summer"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "화이트 베이직 반팔 티셔츠은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-007.svg",
    "price": 19900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-008",
    "name": "버터 옐로 카디건",
    "category": "top",
    "colors": [
      "Yellow"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "버터 옐로 카디건은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-008.svg",
    "price": 42900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-009",
    "name": "브라운 골지 긴팔 티셔츠",
    "category": "top",
    "colors": [
      "Brown"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "브라운 골지 긴팔 티셔츠은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-009.svg",
    "price": 27900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-010",
    "name": "블랙 터틀넥 니트",
    "category": "top",
    "colors": [
      "Black"
    ],
    "seasons": [
      "autumn",
      "winter"
    ],
    "styles": [
      "formal",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 터틀넥 니트은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-010.svg",
    "price": 38900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-011",
    "name": "민트 린넨 셔츠",
    "category": "top",
    "colors": [
      "Mint"
    ],
    "seasons": [
      "summer"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "민트 린넨 셔츠은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-011.svg",
    "price": 41900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-012",
    "name": "레드 체크 셔츠",
    "category": "top",
    "colors": [
      "Red"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "레드 체크 셔츠은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-012.svg",
    "price": 37900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-013",
    "name": "크림 후드 집업",
    "category": "top",
    "colors": [
      "Cream"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "casual",
      "workout"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "크림 후드 집업은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-013.svg",
    "price": 45900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-014",
    "name": "네이비 후드 티셔츠",
    "category": "top",
    "colors": [
      "Navy"
    ],
    "seasons": [
      "autumn",
      "winter"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "네이비 후드 티셔츠은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-014.svg",
    "price": 42900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-015",
    "name": "핑크 퍼프 블라우스",
    "category": "top",
    "colors": [
      "Pink"
    ],
    "seasons": [
      "spring",
      "summer"
    ],
    "styles": [
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "핑크 퍼프 블라우스은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-015.svg",
    "price": 44900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-016",
    "name": "라벤더 브이넥 니트",
    "category": "top",
    "colors": [
      "Lavender"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "라벤더 브이넥 니트은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-016.svg",
    "price": 41900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-017",
    "name": "카키 야상 셔츠 재킷",
    "category": "top",
    "colors": [
      "Khaki"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "카키 야상 셔츠 재킷은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-017.svg",
    "price": 59900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-018",
    "name": "베이지 트렌치 재킷",
    "category": "top",
    "colors": [
      "Beige"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "formal",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "베이지 트렌치 재킷은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-018.svg",
    "price": 89900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-019",
    "name": "블랙 싱글 블레이저",
    "category": "top",
    "colors": [
      "Black"
    ],
    "seasons": [
      "spring",
      "autumn",
      "winter"
    ],
    "styles": [
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 싱글 블레이저은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-019.svg",
    "price": 99000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-020",
    "name": "라이트그레이 울 코트",
    "category": "top",
    "colors": [
      "Light Gray"
    ],
    "seasons": [
      "winter"
    ],
    "styles": [
      "formal",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "라이트그레이 울 코트은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-020.svg",
    "price": 139000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-021",
    "name": "크림 숏 패딩",
    "category": "top",
    "colors": [
      "Cream"
    ],
    "seasons": [
      "winter"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "크림 숏 패딩은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-021.svg",
    "price": 119000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-022",
    "name": "블랙 레더 재킷",
    "category": "top",
    "colors": [
      "Black"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 레더 재킷은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-022.svg",
    "price": 109000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-023",
    "name": "데님 셔츠 재킷",
    "category": "top",
    "colors": [
      "Denim Blue"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "데님 셔츠 재킷은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-023.svg",
    "price": 69900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-024",
    "name": "오프화이트 케이블 니트",
    "category": "top",
    "colors": [
      "Off White"
    ],
    "seasons": [
      "autumn",
      "winter"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "오프화이트 케이블 니트은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-024.svg",
    "price": 54900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-025",
    "name": "그린 럭비 티셔츠",
    "category": "top",
    "colors": [
      "Green"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "그린 럭비 티셔츠은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-025.svg",
    "price": 46900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-026",
    "name": "블루 집업 니트",
    "category": "top",
    "colors": [
      "Blue"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블루 집업 니트은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-026.svg",
    "price": 52900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-027",
    "name": "차콜 기능성 집업",
    "category": "top",
    "colors": [
      "Charcoal"
    ],
    "seasons": [
      "spring",
      "autumn",
      "winter"
    ],
    "styles": [
      "workout",
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "차콜 기능성 집업은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-027.svg",
    "price": 58900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-028",
    "name": "화이트 슬리브리스 탑",
    "category": "top",
    "colors": [
      "White"
    ],
    "seasons": [
      "summer"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "화이트 슬리브리스 탑은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-028.svg",
    "price": 24900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-029",
    "name": "블랙 메시 스포츠 티셔츠",
    "category": "top",
    "colors": [
      "Black"
    ],
    "seasons": [
      "summer"
    ],
    "styles": [
      "workout"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 메시 스포츠 티셔츠은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-029.svg",
    "price": 29900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "top-030",
    "name": "베이지 플리스 재킷",
    "category": "top",
    "colors": [
      "Beige"
    ],
    "seasons": [
      "autumn",
      "winter"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "베이지 플리스 재킷은(는) 일상에서 활용하기 좋은 상의입니다.",
    "imageUrl": "/products/top-030.svg",
    "price": 69900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-001",
    "name": "연청 스트레이트 데님 팬츠",
    "category": "bottom",
    "colors": [
      "Light Blue"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "연청 스트레이트 데님 팬츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-001.svg",
    "price": 44900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-002",
    "name": "중청 와이드 데님 팬츠",
    "category": "bottom",
    "colors": [
      "Denim Blue"
    ],
    "seasons": [
      "spring",
      "autumn",
      "winter"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "중청 와이드 데님 팬츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-002.svg",
    "price": 47900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-003",
    "name": "흑청 부츠컷 데님 팬츠",
    "category": "bottom",
    "colors": [
      "Black Denim"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "흑청 부츠컷 데님 팬츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-003.svg",
    "price": 49900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-004",
    "name": "블랙 와이드 슬랙스",
    "category": "bottom",
    "colors": [
      "Black"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ],
    "styles": [
      "casual",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 와이드 슬랙스은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-004.svg",
    "price": 39900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-005",
    "name": "차콜 핀턱 와이드 팬츠",
    "category": "bottom",
    "colors": [
      "Charcoal"
    ],
    "seasons": [
      "spring",
      "autumn",
      "winter"
    ],
    "styles": [
      "formal",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "차콜 핀턱 와이드 팬츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-005.svg",
    "price": 47900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-006",
    "name": "베이지 코튼 롱스커트",
    "category": "bottom",
    "colors": [
      "Beige"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "베이지 코튼 롱스커트은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-006.svg",
    "price": 36900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-007",
    "name": "블랙 플리츠 미디 스커트",
    "category": "bottom",
    "colors": [
      "Black"
    ],
    "seasons": [
      "spring",
      "autumn",
      "winter"
    ],
    "styles": [
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 플리츠 미디 스커트은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-007.svg",
    "price": 42900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-008",
    "name": "아이보리 A라인 미니 스커트",
    "category": "bottom",
    "colors": [
      "Ivory"
    ],
    "seasons": [
      "spring",
      "summer"
    ],
    "styles": [
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "아이보리 A라인 미니 스커트은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-008.svg",
    "price": 35900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-009",
    "name": "카키 나일론 카고 팬츠",
    "category": "bottom",
    "colors": [
      "Khaki"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "casual",
      "workout"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "카키 나일론 카고 팬츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-009.svg",
    "price": 42900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-010",
    "name": "블랙 나일론 카고 팬츠",
    "category": "bottom",
    "colors": [
      "Black"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "casual",
      "workout"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 나일론 카고 팬츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-010.svg",
    "price": 42900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-011",
    "name": "그레이 조거 팬츠",
    "category": "bottom",
    "colors": [
      "Gray"
    ],
    "seasons": [
      "spring",
      "autumn",
      "winter"
    ],
    "styles": [
      "casual",
      "workout"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "그레이 조거 팬츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-011.svg",
    "price": 34900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-012",
    "name": "네이비 트레이닝 팬츠",
    "category": "bottom",
    "colors": [
      "Navy"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "workout",
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "네이비 트레이닝 팬츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-012.svg",
    "price": 37900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-013",
    "name": "화이트 린넨 와이드 팬츠",
    "category": "bottom",
    "colors": [
      "White"
    ],
    "seasons": [
      "summer"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "화이트 린넨 와이드 팬츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-013.svg",
    "price": 41900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-014",
    "name": "브라운 코듀로이 팬츠",
    "category": "bottom",
    "colors": [
      "Brown"
    ],
    "seasons": [
      "autumn",
      "winter"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "브라운 코듀로이 팬츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-014.svg",
    "price": 48900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-015",
    "name": "크림 니트 롱스커트",
    "category": "bottom",
    "colors": [
      "Cream"
    ],
    "seasons": [
      "autumn",
      "winter"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "크림 니트 롱스커트은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-015.svg",
    "price": 45900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-016",
    "name": "네이비 테니스 스커트",
    "category": "bottom",
    "colors": [
      "Navy"
    ],
    "seasons": [
      "spring",
      "summer"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "네이비 테니스 스커트은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-016.svg",
    "price": 33900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-017",
    "name": "블루 데님 미디 스커트",
    "category": "bottom",
    "colors": [
      "Denim Blue"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블루 데님 미디 스커트은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-017.svg",
    "price": 39900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-018",
    "name": "베이지 버뮤다 팬츠",
    "category": "bottom",
    "colors": [
      "Beige"
    ],
    "seasons": [
      "summer"
    ],
    "styles": [
      "casual",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "베이지 버뮤다 팬츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-018.svg",
    "price": 38900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-019",
    "name": "블랙 쇼츠",
    "category": "bottom",
    "colors": [
      "Black"
    ],
    "seasons": [
      "summer"
    ],
    "styles": [
      "casual",
      "workout"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 쇼츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-019.svg",
    "price": 29900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-020",
    "name": "그레이 체크 슬랙스",
    "category": "bottom",
    "colors": [
      "Gray"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "formal",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "그레이 체크 슬랙스은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-020.svg",
    "price": 49900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-021",
    "name": "브라운 플레어 스커트",
    "category": "bottom",
    "colors": [
      "Brown"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "브라운 플레어 스커트은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-021.svg",
    "price": 44900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-022",
    "name": "아이보리 코튼 팬츠",
    "category": "bottom",
    "colors": [
      "Ivory"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "아이보리 코튼 팬츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-022.svg",
    "price": 41900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-023",
    "name": "카멜 울 미디 스커트",
    "category": "bottom",
    "colors": [
      "Camel"
    ],
    "seasons": [
      "autumn",
      "winter"
    ],
    "styles": [
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "카멜 울 미디 스커트은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-023.svg",
    "price": 56900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-024",
    "name": "블랙 레더 미니 스커트",
    "category": "bottom",
    "colors": [
      "Black"
    ],
    "seasons": [
      "autumn",
      "winter"
    ],
    "styles": [
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 레더 미니 스커트은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-024.svg",
    "price": 49900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-025",
    "name": "올리브 퍼티그 팬츠",
    "category": "bottom",
    "colors": [
      "Olive"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "올리브 퍼티그 팬츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-025.svg",
    "price": 46900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-026",
    "name": "블루 워싱 데님 쇼츠",
    "category": "bottom",
    "colors": [
      "Blue"
    ],
    "seasons": [
      "summer"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블루 워싱 데님 쇼츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-026.svg",
    "price": 32900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-027",
    "name": "라이트그레이 스웨트 팬츠",
    "category": "bottom",
    "colors": [
      "Light Gray"
    ],
    "seasons": [
      "spring",
      "autumn",
      "winter"
    ],
    "styles": [
      "casual",
      "workout"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "라이트그레이 스웨트 팬츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-027.svg",
    "price": 35900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-028",
    "name": "블랙 레깅스",
    "category": "bottom",
    "colors": [
      "Black"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ],
    "styles": [
      "workout"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 레깅스은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-028.svg",
    "price": 29900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-029",
    "name": "베이지 치노 팬츠",
    "category": "bottom",
    "colors": [
      "Beige"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "casual",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "베이지 치노 팬츠은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-029.svg",
    "price": 43900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "bottom-030",
    "name": "와인 새틴 롱스커트",
    "category": "bottom",
    "colors": [
      "Wine"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "와인 새틴 롱스커트은(는) 일상에서 활용하기 좋은 하의입니다.",
    "imageUrl": "/products/bottom-030.svg",
    "price": 52900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-001",
    "name": "화이트 데일리 스니커즈",
    "category": "shoes",
    "colors": [
      "White"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "화이트 데일리 스니커즈은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-001.svg",
    "price": 59000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-002",
    "name": "블랙 캔버스 스니커즈",
    "category": "shoes",
    "colors": [
      "Black"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 캔버스 스니커즈은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-002.svg",
    "price": 49000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-003",
    "name": "그레이 러닝화",
    "category": "shoes",
    "colors": [
      "Gray"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "casual",
      "workout"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "그레이 러닝화은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-003.svg",
    "price": 79000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-004",
    "name": "화이트 러닝화",
    "category": "shoes",
    "colors": [
      "White"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "workout"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "화이트 러닝화은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-004.svg",
    "price": 85000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-005",
    "name": "블랙 페니 로퍼",
    "category": "shoes",
    "colors": [
      "Black"
    ],
    "seasons": [
      "spring",
      "autumn",
      "winter"
    ],
    "styles": [
      "formal",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 페니 로퍼은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-005.svg",
    "price": 69000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-006",
    "name": "브라운 페니 로퍼",
    "category": "shoes",
    "colors": [
      "Brown"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "formal",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "브라운 페니 로퍼은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-006.svg",
    "price": 72000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-007",
    "name": "블랙 메리제인 슈즈",
    "category": "shoes",
    "colors": [
      "Black"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 메리제인 슈즈은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-007.svg",
    "price": 65000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-008",
    "name": "아이보리 플랫 슈즈",
    "category": "shoes",
    "colors": [
      "Ivory"
    ],
    "seasons": [
      "spring",
      "summer"
    ],
    "styles": [
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "아이보리 플랫 슈즈은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-008.svg",
    "price": 59000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-009",
    "name": "블랙 첼시 부츠",
    "category": "shoes",
    "colors": [
      "Black"
    ],
    "seasons": [
      "autumn",
      "winter"
    ],
    "styles": [
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 첼시 부츠은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-009.svg",
    "price": 89000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-010",
    "name": "브라운 첼시 부츠",
    "category": "shoes",
    "colors": [
      "Brown"
    ],
    "seasons": [
      "autumn",
      "winter"
    ],
    "styles": [
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "브라운 첼시 부츠은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-010.svg",
    "price": 89000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-011",
    "name": "블랙 레인 부츠",
    "category": "shoes",
    "colors": [
      "Black"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 레인 부츠은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-011.svg",
    "price": 54900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-012",
    "name": "베이지 어그 부츠",
    "category": "shoes",
    "colors": [
      "Beige"
    ],
    "seasons": [
      "winter"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "베이지 어그 부츠은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-012.svg",
    "price": 79000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-013",
    "name": "화이트 플랫폼 스니커즈",
    "category": "shoes",
    "colors": [
      "White"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "화이트 플랫폼 스니커즈은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-013.svg",
    "price": 69000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-014",
    "name": "실버 발레 플랫",
    "category": "shoes",
    "colors": [
      "Silver"
    ],
    "seasons": [
      "spring",
      "summer"
    ],
    "styles": [
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "실버 발레 플랫은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-014.svg",
    "price": 69000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-015",
    "name": "블랙 스트랩 샌들",
    "category": "shoes",
    "colors": [
      "Black"
    ],
    "seasons": [
      "summer"
    ],
    "styles": [
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 스트랩 샌들은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-015.svg",
    "price": 59000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-016",
    "name": "브라운 레더 샌들",
    "category": "shoes",
    "colors": [
      "Brown"
    ],
    "seasons": [
      "summer"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "브라운 레더 샌들은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-016.svg",
    "price": 55000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-017",
    "name": "네이비 슬립온",
    "category": "shoes",
    "colors": [
      "Navy"
    ],
    "seasons": [
      "spring",
      "summer"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "네이비 슬립온은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-017.svg",
    "price": 49000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-018",
    "name": "카키 트레킹화",
    "category": "shoes",
    "colors": [
      "Khaki"
    ],
    "seasons": [
      "spring",
      "autumn"
    ],
    "styles": [
      "workout",
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "카키 트레킹화은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-018.svg",
    "price": 99000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-019",
    "name": "블랙 더비 슈즈",
    "category": "shoes",
    "colors": [
      "Black"
    ],
    "seasons": [
      "spring",
      "autumn",
      "winter"
    ],
    "styles": [
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 더비 슈즈은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-019.svg",
    "price": 89000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "shoes-020",
    "name": "크림 뮬 스니커즈",
    "category": "shoes",
    "colors": [
      "Cream"
    ],
    "seasons": [
      "spring",
      "summer"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "크림 뮬 스니커즈은(는) 일상에서 활용하기 좋은 신발입니다.",
    "imageUrl": "/products/shoes-020.svg",
    "price": 59000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-001",
    "name": "블랙 미니 크로스백",
    "category": "accessories",
    "colors": [
      "Black"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ],
    "styles": [
      "casual",
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 미니 크로스백은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-001.svg",
    "price": 39900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-002",
    "name": "브라운 숄더백",
    "category": "accessories",
    "colors": [
      "Brown"
    ],
    "seasons": [
      "spring",
      "autumn",
      "winter"
    ],
    "styles": [
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "브라운 숄더백은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-002.svg",
    "price": 59000,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-003",
    "name": "아이보리 캔버스 토트백",
    "category": "accessories",
    "colors": [
      "Ivory"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "아이보리 캔버스 토트백은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-003.svg",
    "price": 29900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-004",
    "name": "실버 미니 백",
    "category": "accessories",
    "colors": [
      "Silver"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "실버 미니 백은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-004.svg",
    "price": 45900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-005",
    "name": "블랙 나일론 백팩",
    "category": "accessories",
    "colors": [
      "Black"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ],
    "styles": [
      "casual",
      "workout"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 나일론 백팩은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-005.svg",
    "price": 49900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-006",
    "name": "심플 실버 목걸이",
    "category": "accessories",
    "colors": [
      "Silver"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ],
    "styles": [
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "심플 실버 목걸이은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-006.svg",
    "price": 25900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-007",
    "name": "골드 펜던트 목걸이",
    "category": "accessories",
    "colors": [
      "Gold"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ],
    "styles": [
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "골드 펜던트 목걸이은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-007.svg",
    "price": 28900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-008",
    "name": "실버 링 귀걸이",
    "category": "accessories",
    "colors": [
      "Silver"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "실버 링 귀걸이은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-008.svg",
    "price": 19900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-009",
    "name": "진주 귀걸이",
    "category": "accessories",
    "colors": [
      "Pearl"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ],
    "styles": [
      "formal",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "진주 귀걸이은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-009.svg",
    "price": 23900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-010",
    "name": "네이비 볼캡",
    "category": "accessories",
    "colors": [
      "Navy"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "casual",
      "workout"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "네이비 볼캡은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-010.svg",
    "price": 21900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-011",
    "name": "베이지 볼캡",
    "category": "accessories",
    "colors": [
      "Beige"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "베이지 볼캡은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-011.svg",
    "price": 21900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-012",
    "name": "블랙 비니",
    "category": "accessories",
    "colors": [
      "Black"
    ],
    "seasons": [
      "autumn",
      "winter"
    ],
    "styles": [
      "casual"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 비니은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-012.svg",
    "price": 19900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-013",
    "name": "베이지 머플러",
    "category": "accessories",
    "colors": [
      "Beige"
    ],
    "seasons": [
      "autumn",
      "winter"
    ],
    "styles": [
      "casual",
      "date",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "베이지 머플러은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-013.svg",
    "price": 29900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-014",
    "name": "그레이 울 머플러",
    "category": "accessories",
    "colors": [
      "Gray"
    ],
    "seasons": [
      "autumn",
      "winter"
    ],
    "styles": [
      "casual",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "그레이 울 머플러은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-014.svg",
    "price": 32900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-015",
    "name": "블랙 가죽 벨트",
    "category": "accessories",
    "colors": [
      "Black"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ],
    "styles": [
      "casual",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 가죽 벨트은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-015.svg",
    "price": 24900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-016",
    "name": "브라운 가죽 벨트",
    "category": "accessories",
    "colors": [
      "Brown"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ],
    "styles": [
      "casual",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "브라운 가죽 벨트은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-016.svg",
    "price": 24900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-017",
    "name": "투명 장우산",
    "category": "accessories",
    "colors": [
      "Clear"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ],
    "styles": [
      "casual",
      "formal"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "투명 장우산은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-017.svg",
    "price": 15900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-018",
    "name": "블랙 선글라스",
    "category": "accessories",
    "colors": [
      "Black"
    ],
    "seasons": [
      "spring",
      "summer"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "블랙 선글라스은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-018.svg",
    "price": 29900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-019",
    "name": "오프화이트 헤어밴드",
    "category": "accessories",
    "colors": [
      "Off White"
    ],
    "seasons": [
      "spring",
      "summer"
    ],
    "styles": [
      "casual",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "오프화이트 헤어밴드은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-019.svg",
    "price": 14900,
    "brand": "PMC Select",
    "catalogSource": true
  },
  {
    "id": "accessories-020",
    "name": "실버 손목시계",
    "category": "accessories",
    "colors": [
      "Silver"
    ],
    "seasons": [
      "spring",
      "summer",
      "autumn",
      "winter"
    ],
    "styles": [
      "formal",
      "date"
    ],
    "destinations": [
      "cafe",
      "school",
      "office",
      "party",
      "home"
    ],
    "weather": [
      "sun",
      "cloud",
      "rain",
      "snow"
    ],
    "description": "실버 손목시계은(는) 일상에서 활용하기 좋은 패션 소품입니다.",
    "imageUrl": "/products/accessories-020.svg",
    "price": 79000,
    "brand": "PMC Select",
    "catalogSource": true
  }
] as CatalogProduct[];

export const findCatalogProduct = (id: string) => PRODUCT_CATALOG.find((item) => item.id === id);
