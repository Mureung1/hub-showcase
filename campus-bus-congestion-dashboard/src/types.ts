export interface Stop {
  id: string;
  name: string;
  cx: number;
  cy: number;
  /** Congestion 0-100 for each hour of the day, index 0-23. */
  hours: number[];
}

export interface Campus {
  id: string;
  name: string;
  stops: Stop[];
}

export interface CongestionLevel {
  label: '여유' | '보통' | '혼잡';
  color: string;
  soft: string;
}
