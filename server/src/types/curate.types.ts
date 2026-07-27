export interface DbPaper {
  user_id: string | null;
  paper_id: string;
  title: string;
  authors: string;
  channel: string;
  year: number;
  match_score: number;
  url?: string | null;
  created_at: string;
}

export interface PaperPayload {
  paperId: string;
  title: string;
  authors: string;
  channel: string;
  year: number;
  matchScore: number;
  userId: string;
  url?: string;
}

export interface LibraryItem {
  userId: string;
  paperId: string;
  title: string;
  authors: string;
  channel: string;
  year: number;
  matchScore: number;
  url?: string;
  createdAt: string;
}

export interface S2RawPaper {
  paperId: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  citationCount?: number;
  url?: string;
  venue?: string;
}

export interface CurateInput {
  major: string;
  keywords: string[];
  query: string;
}

export interface QueryTransformResult {
  searchKeyword: string;
  reasoning?: string;
}

export interface CuratedPaper {
  paperId: string;
  title: string;
  authors: string[];
  channel: string;
  year: number;
  matchScore: number;
  url?: string;
  ovgBreakdown: {
    originality: number;
    validity: number;
    generalizability: number;
  };
  reasoning: string;
  insights: {
    background: string;
    coreMethod: string;
    quantitativeResult: string;
  };
}
