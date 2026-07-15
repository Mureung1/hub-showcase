/**
 * 위경도(WGS84) → 기상청 단기예보 격자(nx, ny) 변환.
 *
 * 기상청 단기예보 API는 위경도가 아니라 Lambert Conformal Conic(LCC) 격자좌표를
 * 요구한다. 아래 상수·공식은 기상청이 배포하는 `dfs_xy_conv` 예제(가로 149 × 세로
 * 253 격자, 5km 간격)를 그대로 옮긴 것이다. 순수 함수라 단위테스트로 검증 가능하다.
 */

// ---- 기상청 LCC 투영 상수 (예제 그대로) -------------------------------------
const RE = 6371.00877; // 지구 반경 (km)
const GRID = 5.0; // 격자 간격 (km)
const SLAT1 = 30.0; // 표준 위도 1 (deg)
const SLAT2 = 60.0; // 표준 위도 2 (deg)
const OLON = 126.0; // 기준점 경도 (deg)
const OLAT = 38.0; // 기준점 위도 (deg)
const XO = 43; // 기준점 X좌표 (격자 단위)
const YO = 136; // 기준점 Y좌표 (격자 단위)

const DEGRAD = Math.PI / 180.0;
const PI4 = Math.PI * 0.25; // π/4

// 투영 파생값은 상수라 모듈 로드 시 한 번만 계산한다.
const re = RE / GRID;
const slat1 = SLAT1 * DEGRAD;
const slat2 = SLAT2 * DEGRAD;
const olon = OLON * DEGRAD;
const olat = OLAT * DEGRAD;

const sn =
  Math.log(Math.cos(slat1) / Math.cos(slat2)) /
  Math.log(Math.tan(PI4 + slat2 * 0.5) / Math.tan(PI4 + slat1 * 0.5));
const sf = (Math.pow(Math.tan(PI4 + slat1 * 0.5), sn) * Math.cos(slat1)) / sn;
const ro = (re * sf) / Math.pow(Math.tan(PI4 + olat * 0.5), sn);

export interface Grid {
  nx: number;
  ny: number;
}

/**
 * 위도·경도(십진수 도)를 기상청 격자 nx, ny로 변환한다.
 * @param lat 위도 (예: 부산 서면 35.1578)
 * @param lng 경도 (예: 부산 서면 129.0594)
 */
export function latLngToGrid(lat: number, lng: number): Grid {
  const ra = (re * sf) / Math.pow(Math.tan(PI4 + lat * DEGRAD * 0.5), sn);

  let theta = lng * DEGRAD - olon;
  if (theta > Math.PI) theta -= 2.0 * Math.PI;
  if (theta < -Math.PI) theta += 2.0 * Math.PI;
  theta *= sn;

  const nx = Math.floor(ra * Math.sin(theta) + XO + 0.5);
  const ny = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);

  return { nx, ny };
}
