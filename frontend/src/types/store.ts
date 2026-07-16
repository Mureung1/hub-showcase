export type StoreCategory = '음식점' | '카페'

export type Store = {
  id: string
  name: string
  category: StoreCategory
  categoryName: string
  phone: string
  address: string
  roadAddress: string
  longitude: number
  latitude: number
  distance: number
  placeUrl: string
  rating: number | null
  reviewCount: number
}
