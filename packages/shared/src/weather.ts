/** 날씨 소스 (앙상블 구성원). */
export type WeatherSource = "kma" | "owm";

/** 내부 정규화 날씨 상태. 각 소스의 코드는 이 enum으로 매핑한다. */
export type WeatherCondition =
  | "clear" // 맑음
  | "cloudy" // 구름많음
  | "overcast" // 흐림
  | "rain" // 비
  | "shower" // 소나기
  | "snow" // 눈
  | "sleet"; // 비/눈

/**
 * 소스별로 통일된 단일 관측(예보) 결과.
 * 기상청·OpenWeatherMap이 각각 이 형태로 반환하고, 앙상블(1-4)이 병합한다.
 */
export interface NormalizedWeather {
  source: WeatherSource;
  /** 예보 기준 시각 (소스 원본 기준, "YYYY-MM-DDTHH:mm" 로컬). */
  baseDateTime: string;
  /** 기온 (℃). */
  tempC: number;
  /** 습도 (%). */
  humidity: number;
  /** 시간당 강수량 (mm). */
  precipitationMm: number;
  /** 강수확률 (%). 소스가 제공하지 않으면 null (0과 구분 — 앙상블에서 결측 제외). */
  precipitationProb: number | null;
  /** 강수 여부 (앙상블 보수적 채택 판단에 사용). */
  isPrecipitating: boolean;
  /** 정규화된 하늘/강수 상태. */
  condition: WeatherCondition;
}

/**
 * 여러 소스를 병합한 앙상블 결과.
 * 수치는 소스별 가중 평균, 강수 여부는 보수적 채택(하나라도 강수면 강수).
 */
export interface EnsembleWeather {
  tempC: number;
  humidity: number;
  precipitationMm: number;
  /** 강수확률 (%). 모든 소스가 미제공이면 null (예: 기상청 장애 → OWM만 남을 때). */
  precipitationProb: number | null;
  isPrecipitating: boolean;
  condition: WeatherCondition;
  /** 병합에 실제로 사용된 소스 목록. */
  sources: WeatherSource[];
  /** 사용된 소스 수 (한쪽 장애 시 폴백 표기용). */
  sourceCount: number;
  /**
   * 데모용 고정 날씨(DEMO_WEATHER)로 만들어졌으면 true. 실제 API를 부르지 않았다는 뜻.
   *
   * 화면이 "N개 소스 평균" 배지를 그대로 띄우면 안 되므로 반드시 표기에 반영한다 —
   * 고정값을 실측인 척하지 않는다(README 스코프 원칙과 동일). 평상시엔 undefined.
   */
  seeded?: boolean;
}
