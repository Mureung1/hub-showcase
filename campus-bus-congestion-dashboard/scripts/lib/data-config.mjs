export const DEFAULT_MONTH = '202509';
export const DEFAULT_STOP_OPERATION_DATE = '20250801';

export const SUPPORTED_CAMPUS_REGIONS = Object.freeze({
  'kangwon-chuncheon': { ctpvCd: '51', sggCd: '51110', label: '강원특별자치도 춘천시' },
  'knu-daegu': { ctpvCd: '27', sggCd: '27230', label: '대구광역시 북구' },
  'gnu-gajwa': { ctpvCd: '48', sggCd: '48170', label: '경상남도 진주시' },
  'pnu-jangjeon': { ctpvCd: '26', sggCd: '26410', label: '부산광역시 금정구' },
  'snu-gwanak': { ctpvCd: '11', sggCd: '11620', label: '서울특별시 관악구' },
  'jnu-yongbong': { ctpvCd: '29', sggCd: '29170', label: '광주광역시 북구' },
  'jbnu-jeonju': { ctpvCd: '52', sggCd: '52113', label: '전북특별자치도 전주시 덕진구' },
  'jejunu-ara': { ctpvCd: '50', sggCd: '50110', label: '제주특별자치도 제주시' },
  'cnu-daejeon': { ctpvCd: '30', sggCd: '30200', label: '대전광역시 유성구' },
  'cbnu-gaesin': { ctpvCd: '43', sggCd: '43112', label: '충청북도 청주시 서원구' },
});

export const DIRECTIONAL_CAMPUS_CONFIGS = Object.freeze({
  'kangwon-chuncheon': {
    route: ['osm-node-8446123910', 'osm-node-8446123642', 'osm-node-8446123644'],
    directions: {
      a: { endpointStopId: 'osm-node-8446123910', label: '강원대정문 방향' },
      c: { endpointStopId: 'osm-node-8446123644', label: '중앙도서관 방향' },
    },
  },
  'knu-daegu': {
    route: ['osm-node-8246940160', 'osm-node-8251323189', 'osm-node-8251323187'],
    directions: {
      a: { endpointStopId: 'osm-node-8246940160', label: '북문 방향' },
      c: { endpointStopId: 'osm-node-8251323187', label: '정문 방향' },
    },
  },
  'gnu-gajwa': {
    route: ['osm-node-9355291206', 'osm-node-9355291204', 'osm-node-9355290533'],
    directions: {
      a: { endpointStopId: 'osm-node-9355291206', label: '가좌캠퍼스정문 방향' },
      c: { endpointStopId: 'osm-node-9355290533', label: '사대부설중고교 방향' },
    },
  },
  'pnu-jangjeon': {
    route: ['pnu-shuttle-busan-university-station', 'osm-node-5033898890', 'pnu-shuttle-dawn-field-library'],
    directions: {
      a: { endpointStopId: 'pnu-shuttle-busan-university-station', label: '부산대역 방향' },
      c: { endpointStopId: 'pnu-shuttle-dawn-field-library', label: '새벽벌도서관 방향' },
    },
  },
  'snu-gwanak': {
    route: ['osm-node-357899513', 'osm-node-357899388', 'osm-node-11560054597'],
    directions: {
      a: { endpointStopId: 'osm-node-357899513', label: '서울대입구역 방향' },
      c: { endpointStopId: 'osm-node-11560054597', label: '기숙사삼거리 방향' },
    },
  },
  'jnu-yongbong': {
    route: ['osm-node-13199974255', 'osm-node-9352302501', 'osm-node-9352302461'],
    directions: {
      a: { endpointStopId: 'osm-node-13199974255', label: '전남대사거리 방향' },
      c: { endpointStopId: 'osm-node-9352302461', label: '대신파크 방향' },
    },
  },
  'jbnu-jeonju': {
    route: ['osm-node-4247734744', 'osm-node-4247734748', 'osm-node-4247734753'],
    directions: {
      a: { endpointStopId: 'osm-node-4247734744', label: '전북은행본점 방향' },
      c: { endpointStopId: 'osm-node-4247734753', label: '덕진성당 방향' },
    },
  },
  'jejunu-ara': {
    route: ['osm-node-11338570540', 'osm-node-11338570532', 'osm-node-11338570535'],
    directions: {
      a: { endpointStopId: 'osm-node-11338570540', label: '제주대학교 방향' },
      c: { endpointStopId: 'osm-node-11338570535', label: '제주대학교병원 방향' },
    },
  },
  'cnu-daejeon': {
    route: ['osm-node-12141510069', 'osm-node-12778500235', 'osm-node-5674035548'],
    directions: {
      a: { endpointStopId: 'osm-node-12141510069', label: '충남대학교 방향' },
      c: { endpointStopId: 'osm-node-5674035548', label: '도서관 방향' },
    },
  },
  'cbnu-gaesin': {
    route: ['osm-node-6403450088', 'osm-node-12324240640', 'osm-node-12324240641'],
    directions: {
      a: { endpointStopId: 'osm-node-6403450088', label: '충북대학교 방향' },
      c: { endpointStopId: 'osm-node-12324240641', label: '후문 방향' },
    },
  },
});

export function readOption(name, fallback) {
  const argument = process.argv.slice(2).find((value) => value.startsWith(`--${name}=`));
  return argument ? argument.slice(name.length + 3) : fallback;
}

export function assertMonth(month) {
  if (!/^\d{6}$/.test(month)) {
    throw new Error(`기준 월은 YYYYMM 형식이어야 합니다: ${month}`);
  }
}

export function assertOperationDate(date) {
  if (!/^\d{8}$/.test(date)) {
    throw new Error(`운행일자는 YYYYMMDD 형식이어야 합니다: ${date}`);
  }
}

export function installCliErrorHandler(label) {
  const fail = (error) => {
    console.error(`[${label}] 실패: ${error?.message ?? error}`);
    process.exit(1);
  };
  process.on('uncaughtException', fail);
  process.on('unhandledRejection', fail);
}
