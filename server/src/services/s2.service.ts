import { S2RawPaper } from '../types/curate.types.js';

export async function fetchS2Papers(searchKeyword: string, limit: number = 50): Promise<S2RawPaper[]> {
  const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
  const encodedQuery = encodeURIComponent(searchKeyword);
  const fields = 'paperId,title,authors,abstract,year,citationCount,url,openAccessPdf,venue';
  const url = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodedQuery}&fields=${fields}&year=2025-2026&sort=citationCount:desc&limit=${limit}`;

  const headers: Record<string, string> = {
    'User-Agent': 'ScholarFinder-Agent/1.0 (academic-research-tool)'
  };
  if (apiKey) {
    headers['x-api-key'] = apiKey;
  }

  let fetchResponse: Response | null = null;
  let attempts = 0;
  const maxAttempts = 5;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      fetchResponse = await fetch(url, { headers });
      if (fetchResponse.status === 429) {
        if (attempts >= maxAttempts) {
          const rateLimitError: any = new Error('S2_RATE_LIMIT_EXCEEDED');
          rateLimitError.statusCode = 429;
          throw rateLimitError;
        }
        const delayMs = Math.min(3000 * Math.pow(2, attempts - 1), 20000);
        console.warn(`⚠️ [S2 API 429 Limit] IP Rate Limit 감지됨. 지수 백오프 대기 중... (${(delayMs / 1000).toFixed(1)}초 대기, 시도 ${attempts}/${maxAttempts})`);
        await new Promise(r => setTimeout(r, delayMs));
        continue;
      }
      if (fetchResponse.ok) break;
    } catch (err: any) {
      if (err.message === 'S2_RATE_LIMIT_EXCEEDED' || attempts >= maxAttempts) throw err;
      const delayMs = Math.min(2000 * Math.pow(2, attempts - 1), 10000);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }

  if (!fetchResponse || !fetchResponse.ok) {
    if (fetchResponse && fetchResponse.status === 429) {
      const rateLimitError: any = new Error('S2_RATE_LIMIT_EXCEEDED');
      rateLimitError.statusCode = 429;
      throw rateLimitError;
    }
    throw new Error(`Semantic Scholar API Error: ${fetchResponse ? fetchResponse.status : 'No Response'}`);
  }

  const data = (await fetchResponse.json()) as { data?: any[] };
  const rawList = data.data || [];

  return rawList.map((item: any, idx: number) => {
    const paperId = item.paperId || `s2-${idx + 1}`;
    const title = item.title ? String(item.title).replace(/\s+/g, ' ').trim() : 'Untitled Paper';

    let authorsList: string[] = [];
    if (Array.isArray(item.authors)) {
      authorsList = item.authors.map((a: any) => String(a.name || '').trim()).filter(Boolean);
    }
    if (authorsList.length === 0) authorsList = ['Unknown Author'];

    const abstract = item.abstract ? String(item.abstract).replace(/\s+/g, ' ').trim() : 'No abstract provided.';
    const year = typeof item.year === 'number' ? item.year : 2025;
    const citationCount = typeof item.citationCount === 'number' ? item.citationCount : 0;
    const paperUrl = item.openAccessPdf?.url || item.url || (item.paperId ? `https://www.semanticscholar.org/paper/${item.paperId}` : '');
    const paperVenue = item.venue ? String(item.venue).trim() : '';

    return {
      paperId,
      title,
      authors: authorsList,
      abstract,
      year,
      citationCount,
      url: paperUrl,
      venue: paperVenue
    };
  });
}
