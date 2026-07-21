type KakaoLatLng = {
  getLat(): number
  getLng(): number
}

type KakaoMarker = {
  setMap(map: KakaoMapInstance | null): void
}

type KakaoMapInstance = {
  panTo(position: KakaoLatLng): void
  setBounds(bounds: KakaoLatLngBounds): void
}

type KakaoLatLngBounds = {
  extend(position: KakaoLatLng): void
}

type KakaoPlaceResult = {
  id: string
  place_name: string
  category_name: string
  category_group_code: string
  phone: string
  address_name: string
  road_address_name: string
  x: string
  y: string
  place_url: string
  distance: string
}

type KakaoPagination = {
  hasNextPage: boolean
}

type KakaoPlacesOptions = {
  category_group_code?: 'FD6' | 'CE7'
  location?: KakaoLatLng
  radius?: number
  size?: number
  page?: number
  sort?: string
}

type KakaoPlacesCallback = (
  result: KakaoPlaceResult[],
  status: string,
  pagination: KakaoPagination,
) => void

type KakaoPlaces = {
  keywordSearch(
    keyword: string,
    callback: KakaoPlacesCallback,
    options?: KakaoPlacesOptions,
  ): void
  categorySearch(
    categoryCode: 'FD6' | 'CE7',
    callback: KakaoPlacesCallback,
    options?: KakaoPlacesOptions,
  ): void
}

type KakaoMapOptions = {
  center: KakaoLatLng
  level?: number
}

interface KakaoMapsNamespace {
  load(callback: () => void): void
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng
  Map: new (container: HTMLElement, options: KakaoMapOptions) => KakaoMapInstance
  Marker: new (options: {
    map?: KakaoMapInstance
    position: KakaoLatLng
    title?: string
  }) => KakaoMarker
  InfoWindow: new (options?: { content?: string }) => {
    open(map: KakaoMapInstance, marker: KakaoMarker): void
    close(): void
    setContent(content: string): void
  }
  LatLngBounds: new () => KakaoLatLngBounds
  event: {
    addListener(target: object, type: string, callback: () => void): void
  }
  services: {
    Places: new () => KakaoPlaces
    Status: {
      OK: string
      ZERO_RESULT: string
      ERROR: string
    }
    SortBy: {
      DISTANCE: string
    }
  }
}

interface Window {
  kakao: {
    maps: KakaoMapsNamespace
  }
}
