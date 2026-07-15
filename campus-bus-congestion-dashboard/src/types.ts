export interface Stop {
  id: string;
  name: string;
  cx?: number;
  cy?: number;
  lat?: number;
  lon?: number;
  osmType?: 'node' | 'way';
  osmId?: number;
  verification?: {
    kind: 'official-route';
    label: string;
    url: string;
  };
  /** Congestion 0-100 for each hour of the day, index 0-23. */
  hours?: number[];
}

export interface Campus {
  id: string;
  name: string;
  stops: Stop[];
  mapImage?: string;
  sourceFile?: string;
  boundary?: {
    osmType: 'way' | 'relation';
    osmId: number;
    query: string;
    bounds: [number, number, number, number];
  };
}

export interface CongestionLevel {
  label: '여유' | '보통' | '혼잡';
  color: string;
  soft: string;
}
