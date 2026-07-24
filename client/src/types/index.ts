export interface Paper {
  paperId: string;
  title: string;
  authors: string;
  channel: string;
  year: number;
  matchScore: number;
  url?: string;
  insights: PaperInsights;
}

export interface PaperInsights {
  background: string;
  coreMethod: string;
  quantitativeResult: string;
}

export interface CurationData {
  papers: Paper[];
}

export interface CurationProfile {
  major: string;
  channels: string[];
  keywords: string[];
}

export interface CurationResponse {
  status: string;
  data: CurationData;
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
