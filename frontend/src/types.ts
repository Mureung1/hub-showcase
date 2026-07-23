export type Gender = 'male' | 'female' | 'other';

export type Screen = 'home' | 'analysis' | 'overlap' | 'recommend' | 'detail';

export const SCREEN_ORDER: Screen[] = ['home', 'analysis', 'overlap', 'recommend', 'detail'];

export interface Product {
  id: number;
  name: string;
  companyName: string | null;
  price: number | null;
  haccpCertified: boolean;
  smartstoreUrl: string | null;
  testReportUrl: string | null;
  matchCount: number;
  matchedIngredientNames: string[];
}
