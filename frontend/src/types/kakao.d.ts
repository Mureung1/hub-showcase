type KakaoLatLng = object

type KakaoMapOptions = {
  center: KakaoLatLng
  level?: number
}

interface KakaoMapsNamespace {
  load(callback: () => void): void
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng
  Map: new (container: HTMLElement, options: KakaoMapOptions) => object
}

interface Window {
  kakao: {
    maps: KakaoMapsNamespace
  }
}
