export type Screen = 'home' | 'analysis' | 'overlap' | 'recommend' | 'detail';

export const SCREEN_ORDER: Screen[] = ['home', 'analysis', 'overlap', 'recommend', 'detail'];

export interface Product {
  id: number;
  name: string;
  companyName: string;
  price: number;
}
