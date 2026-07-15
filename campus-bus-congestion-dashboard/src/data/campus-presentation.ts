export interface CampusPresentation {
  shortName: string;
  location: string;
  primary: string;
  sourceUrl: string;
  markImage: string;
  markSurface?: 'light' | 'brand' | 'blend';
  markCrop?: 'round-symbol' | 'wide-symbol' | 'compact-symbol';
  markOffset?: {
    x?: string;
    y?: string;
    scale?: number;
  };
}

export const campusPresentation: Record<string, CampusPresentation> = {
  'kangwon-chuncheon': {
    shortName: '강원대',
    location: '강원 · 춘천',
    primary: '#0047BB',
    sourceUrl: 'https://www.kangwon.ac.kr/ko/conts/921/web.do',
    markImage: '/campus-marks/kangwon-chuncheon.webp',
    markCrop: 'compact-symbol',
    markOffset: { y: '1px', scale: 1.08 },
  },
  'knu-daegu': {
    shortName: '경북대',
    location: '대구 · 북구',
    primary: '#C3202B',
    sourceUrl: 'https://www.knu.ac.kr/wbbs/wbbs/download/KNU_Character%28Mark%29_Manual.pdf',
    markImage: '/campus-marks/knu-daegu.jpg',
    markSurface: 'blend',
  },
  'gnu-gajwa': {
    shortName: '경상국립대',
    location: '경남 · 진주',
    primary: '#0054A6',
    sourceUrl: 'https://www.gnu.ac.kr/main/cm/cntnts/cntntsView.do?cntntsId=1198&mi=1369',
    markImage: '/campus-marks/gnu-gajwa.png',
    markOffset: { y: '1px' },
  },
  'pnu-jangjeon': {
    shortName: '부산대',
    location: '부산 · 금정',
    primary: '#143F90',
    sourceUrl: 'https://www.pusan.ac.kr/kor/CMS/Contents/Contents.do?mCode=MN157',
    markImage: '/campus-marks/pnu-jangjeon.jpg',
    markSurface: 'blend',
    markOffset: { y: '-3px', scale: 1.03 },
  },
  'snu-gwanak': {
    shortName: '서울대',
    location: '서울 · 관악',
    primary: '#003478',
    sourceUrl: 'https://identity.snu.ac.kr/color/1',
    markImage: '/campus-marks/snu-gwanak.png',
    markCrop: 'round-symbol',
    markOffset: { y: '2px' },
  },
  'jnu-yongbong': {
    shortName: '전남대',
    location: '광주 · 북구',
    primary: '#2F6B45',
    sourceUrl: 'https://global.jnu.ac.kr/About/Overview/Symbols/CNU_UI',
    markImage: '/campus-marks/jnu-yongbong.svg',
    markOffset: { x: '5px', y: '1px' },
  },
  'jbnu-jeonju': {
    shortName: '전북대',
    location: '전북 · 전주',
    primary: '#00539B',
    sourceUrl: 'https://www.jbnu.ac.kr/web/intro/university/sub05.do',
    markImage: '/campus-marks/jbnu-jeonju.jpg',
    markSurface: 'blend',
    markOffset: { y: '3px', scale: 1.04 },
  },
  'jejunu-ara': {
    shortName: '제주대',
    location: '제주 · 아라',
    primary: '#007C8A',
    sourceUrl: 'https://www.jejunu.ac.kr/promotion/designcenter/ui.htm',
    markImage: '/campus-marks/jejunu-ara.png',
    markOffset: { x: '3px', y: '1px' },
  },
  'cnu-daejeon': {
    shortName: '충남대',
    location: '대전 · 유성',
    primary: '#1B365D',
    sourceUrl: 'https://plus.cnu.ac.kr/html/kr/sub01/sub01_010503_06.html',
    markImage: '/campus-marks/cnu-daejeon.png',
  },
  'cbnu-gaesin': {
    shortName: '충북대',
    location: '충북 · 청주',
    primary: '#92234E',
    sourceUrl: 'https://cbnuwww.chungbuk.ac.kr/site/70th/sub.do?key=1819',
    markImage: '/campus-marks/cbnu-gaesin.png',
  },
};

export const fallbackCampusPresentation: CampusPresentation = {
  shortName: '캠퍼스',
  location: '대한민국',
  primary: '#3157D5',
  sourceUrl: 'https://www.openstreetmap.org/copyright',
  markImage: '',
};
