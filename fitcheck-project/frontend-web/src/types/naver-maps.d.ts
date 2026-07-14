export {};

declare global {
  interface Window {
    naver?: typeof naver;
  }

  namespace naver.maps {
    class LatLng {
      constructor(lat: number, lng: number);
      lat(): number;
      lng(): number;
    }

    class Map {
      constructor(
        element: string | HTMLElement,
        options?: {
          center?: LatLng;
          zoom?: number;
          minZoom?: number;
          zoomControl?: boolean;
          mapDataControl?: boolean;
        },
      );
      setCenter(latlng: LatLng): void;
      panTo(latlng: LatLng): void;
      destroy(): void;
    }

    class Marker {
      constructor(options: {
        position: LatLng;
        map?: Map | null;
        title?: string;
        icon?: {
          content?: string;
          anchor?: Point;
        };
        zIndex?: number;
      });
      setMap(map: Map | null): void;
      setIcon(icon: { content?: string; anchor?: Point }): void;
      setZIndex(zIndex: number): void;
      setPosition(latlng: LatLng): void;
      setTitle(title: string): void;
    }

    class Point {
      constructor(x: number, y: number);
    }

    class InfoWindow {
      constructor(options: { content: string });
      open(map: Map, marker: Marker): void;
      close(): void;
    }

    namespace Event {
      function addListener(
        target: Marker | Map,
        eventName: string,
        listener: (...args: unknown[]) => void,
      ): object;
      function removeListener(listener: object): void;
    }
  }
}
