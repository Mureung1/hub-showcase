export type Category = 'top' | 'bottom' | 'outer' | 'acc';

export interface ClothesItem {
  id: string;
  name: string;
  image: string;
  category: Category;
  dateAdded: string;
  tag?: string;
  isFavorite?: boolean;
}

export interface DiaryEntry {
  id: string;
  date: string;
  title: string;
  recommendationText: string;
  outfitIds: string[]; // references to ClothesItem.id
  mood?: string;
}

export interface UserProfile {
  name: string;
  subtitle: string;
  avatar: string;
}

export type TabType = 'today' | 'wardrobe' | 'inspiration' | 'diary' | 'settings';

export interface SelectionCriteria {
  weather: string;
  place: string;
  situation: string;
}
