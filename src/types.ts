export type CategoryType = 'top' | 'bottom' | 'shoes' | 'accessories';

export interface ClothingItem {
  id: string;
  name: string;
  category: CategoryType;
  colors: string[];
  imageUrl: string;
  isCustom?: boolean;
}

export type WeatherType = 'sun' | 'cloud' | 'rain' | 'snow';
export type DestinationType = 'cafe' | 'school' | 'office' | 'party' | 'home';
export type SituationType = 'date' | 'workout' | 'casual' | 'formal';

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
