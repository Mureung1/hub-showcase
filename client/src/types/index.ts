export interface Paper {
  id: string;
  paperId?: string;
  title: string;
  authors: string;
  channel: string;
  year: number;
  matchScore: number;
  insights?: string[];
}

export interface PaperInsights {
  background: string;
  coreMethod: string;
  quantitativeResult: string;
}

export interface CurationData {
  papers: Paper[];
  insights: PaperInsights;
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
