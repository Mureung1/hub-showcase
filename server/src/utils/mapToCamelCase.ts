import { DbPaper, LibraryItem } from '../types/curate.types.js';

export function mapToCamelCase(dbPaper: DbPaper): LibraryItem;
export function mapToCamelCase(dbPaper: DbPaper[]): LibraryItem[];
export function mapToCamelCase(dbPaper: DbPaper | DbPaper[]): LibraryItem | LibraryItem[] | null {
  if (!dbPaper) return null;
  if (Array.isArray(dbPaper)) {
    return dbPaper.map(item => ({
      userId: item.user_id || '',
      paperId: item.paper_id,
      title: item.title,
      authors: item.authors,
      channel: item.channel,
      year: item.year,
      matchScore: item.match_score,
      url: item.url || '',
      createdAt: item.created_at
    }));
  }
  return {
    userId: dbPaper.user_id || '',
    paperId: dbPaper.paper_id,
    title: dbPaper.title,
    authors: dbPaper.authors,
    channel: dbPaper.channel,
    year: dbPaper.year,
    matchScore: dbPaper.match_score,
    url: dbPaper.url || '',
    createdAt: dbPaper.created_at
  };
}
