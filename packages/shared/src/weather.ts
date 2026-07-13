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
  /** 강수확률 (%). 소스에 없으면 0. */
  precipitationProb: number;
  /** 강수 여부 (앙상블 보수적 채택 판단에 사용). */
  isPrecipitating: boolean;
  /** 정규화된 하늘/강수 상태. */
  condition: WeatherCondition;
}
