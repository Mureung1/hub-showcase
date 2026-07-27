export type Item = {
  id: number;
  title: string | null;
  summary: string | null;
  content: string | null;
  original_url: string | null;
  image_url: string | null;
  source_platform: string | null;
  category_main: string | null;
  category_sub: string | null;
  is_archived: boolean;
  archived_at: string | null;
  created_at: string;
};

export type DeleteItemResponse = {
  success: true;
  id: number;
};

export type ArchiveItemResponse = Item;

const searchableItemFields: Array<keyof Item> = [
  "title",
  "summary",
  "content",
  "original_url",
  "source_platform",
  "category_main",
  "category_sub",
];

export function matchesItemSearch(item: Item, query: string) {
  const normalizedQuery = query.trim().toLocaleLowerCase("ko");
  if (!normalizedQuery) return true;

  return searchableItemFields.some((field) => {
    const value = item[field];
    return typeof value === "string"
      ? value.toLocaleLowerCase("ko").includes(normalizedQuery)
      : false;
  });
}

export const apiBaseUrl = (
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:4000"
).replace(/\/$/, "");

export async function readApiError(
  response: Response,
  fallback = "API 요청에 실패했습니다."
) {
  const body = await response.json().catch(() => null);
  return typeof body?.error === "string" ? body.error : fallback;
}

export function getRequestErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;
  return error.message === "Failed to fetch"
    ? "API 서버에 연결할 수 없습니다. Express 서버와 CORS 설정을 확인해주세요."
    : error.message;
}
