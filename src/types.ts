export type CategoryType = 'top' | 'bottom' | 'shoes' | 'accessories';

export interface ClothingItem {
  id: string;
  name: string;
  category: CategoryType;
  colors: string[];
  imageUrl: string;
  isCustom?: boolean;
  shoppingUrl?: string;
  shopName?: string;
  description?: string;
}

export type WeatherType = string;
export type DestinationType = string;
export type SituationType = string;

export interface SavedOutfit {
  id: string;
  weather: WeatherType;
  destination: DestinationType;
  situation: SituationType;
  items: {
    top?: ClothingItem;
    bottom?: ClothingItem;
    shoes?: ClothingItem;
    accessories?: ClothingItem;
  };
  stylistNote: string;
  savedAt: string; // ISO date string
}

export interface UserProfile {
  username: string;
  avatarUrl: string;
  vaporMode: boolean;
  scanlineIntensity: number;
}

export interface CalendarEvent {
  date: string; // YYYY-MM-DD
  outfitId: string;
}


export interface StickerInstance {
  id: string;
  stickerId?: string;
  icon: string;
  name: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  flip: boolean;
  isImage?: boolean;
}

export interface StickerDiaryPage {
  id: string;
  title: string;
  mannequinGuide: "none" | "eunha" | "wooju";
  stickers: StickerInstance[];
  createdAt: string;
  updatedAt: string;
}