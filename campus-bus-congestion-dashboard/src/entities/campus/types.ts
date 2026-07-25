export type DirectionKey = 'a' | 'c';
export type UsageStatus = 'ready' | 'unsupported-region' | 'unmapped' | 'no-data';

export interface PublicStopData {
  ctpvCd: string;
  sggCd: string;
  sttnId: string;
  sourceName: string;
}

export interface DirectionUsage {
  status: UsageStatus;
  period: string;
  fetchedAt: string;
  boardings: number[];
  alightings: number[];
  totals: number[];
  hours?: number[];
  campusReferenceP95?: number;
}

export interface DirectionalStopData {
  publicData?: PublicStopData;
  usage: DirectionUsage;
}

export interface CampusDirections {
  route: [string, string, string];
  directions: Record<DirectionKey, {
    endpointStopId: string;
    label: string;
  }>;
}

export interface RoadRoute {
  status: 'ready' | 'no-route' | 'error';
  source: 'osrm' | 'manual-osm';
  profile: 'driving';
  fetchedAt: string;
  stopIds: string[];
  coordinates: [number, number][];
  distanceMeters: number;
  waypointDistancesMeters?: number[];
  message?: string;
}

export interface Stop {
  id: string;
  name: string;
  cx?: number;
  cy?: number;
  labelOffset?: { x: number; y: number };
  lat?: number;
  lon?: number;
  osmType?: 'node' | 'way';
  osmId?: number;
  verification?: {
    kind: 'official-route';
    label: string;
    url: string;
  };
  publicData?: PublicStopData;
  usage?: {
    status: UsageStatus;
    period: string;
    fetchedAt: string;
    boardings: number[];
    alightings: number[];
    totals: number[];
    campusReferenceP95?: number;
    aggregation?: 'single-stop' | 'sum-exact-name-platforms';
    sourceCount?: number;
  };
  /** Relative stop usage concentration, 0-100 for each hour, index 0-23. */
  hours?: number[];
  directions?: Partial<Record<DirectionKey, DirectionalStopData>>;
}

export interface Campus {
  id: string;
  name: string;
  stops: Stop[];
  mapImage?: string;
  sourceFile?: string;
  mapViewport?: {
    bounds: [number, number, number, number];
  };
  boundary?: {
    osmType: 'way' | 'relation';
    osmId: number;
    query: string;
    bounds: [number, number, number, number];
  };
  roadRoute?: RoadRoute;
  directionConfig?: CampusDirections;
}

export interface CongestionLevel {
  label: '여유' | '보통' | '혼잡';
  color: string;
  soft: string;
}
