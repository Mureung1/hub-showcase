// 요즘 뉴스 카테고리 칩 — key(내부), label(표시), query(Gemini 검색 키워드)
export interface NewsCategory {
  key: string;
  label: string;
  query: string;
}

export const NEWS_CATEGORIES: NewsCategory[] = [
  { key: "market", label: "경제·시장", query: "한국 경제 시장 증시 물가 최신 뉴스" },
  { key: "tech", label: "IT·기술", query: "한국 IT 기술 인공지능 반도체 최신 뉴스" },
  { key: "sports", label: "스포츠", query: "한국 스포츠 최신 뉴스" },
  { key: "culture", label: "문화·연예", query: "한국 문화 연예 영화 음악 최신 뉴스" },
  { key: "society", label: "사회·생활", query: "한국 사회 생활 정책 최신 뉴스" },
];
