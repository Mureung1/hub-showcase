// taxengine(taxengine/loader.py, data/templates/*.csv)이 읽는 모양과 1:1로 맞춘 데이터 모델.
// 필드명은 의도적으로 한글 그대로 — 리포 전체(로더/엔진/DB) 컨벤션과 CSV 내보내기 호환을 위해서다.

export interface FYInfo {
  companyName: string;
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  mode: 'new' | 'carryover' | '';
}

export interface Shareholder {
  명: string;
  비율: string;
}

export interface CompanyProfile {
  중소기업: boolean | null;
  부동산임대업주업: boolean | null;
  상시근로자수: string;
  지배주주목록: Shareholder[];
  기납부세액: string;
  이월결손금: string;
  공제감면세액: string;
  가산세: string;
  기부금한도초과: string;
  증빙불비: string;
  수입금액: string;
  성실신고확인서: boolean | null;
  세액감면: boolean | null;
  매출3억초과: boolean | null;
}

export type AccountValues = Record<string, string>;
export interface ExtraAccountRow {
  명: string;
  금액: string;
}
export type ExtraAccounts = Record<string, ExtraAccountRow[]>; // groupKey -> rows

export type AssetType = '건축물' | '차량운반구' | '비품' | '기계장치';
export type DepMethod = '정액' | '정률';

export interface AssetRow {
  명: string;
  구분: AssetType;
  취득일: string;
  취득가: string;
  기초누계: string;
  회사계상액: string;
  방법: DepMethod;
  내용연수: string;
  전기이월부인액: string;
  업무용승용차: boolean;
}

export interface CarRow {
  명: string;
  감가상각비: string;
  기타관련비용: string;
  전용보험가입: boolean;
  운행기록부작성: boolean;
  업무사용비율: string;
}

export type AdjType = '익금산입(가산)' | '손금불산입(가산)' | '손금산입(차감)' | '익금불산입(차감)';
export type AdjDisposal = '유보' | '기타사외유출' | '상여' | '배당' | '기타';

export interface AdjustmentRow {
  과목: string;
  구분: AdjType;
  금액: string;
  소득처분: AdjDisposal;
  근거: string;
}

export interface TaxInputState {
  fy: FYInfo;
  company: CompanyProfile;
  bs: AccountValues;
  bsExtra: ExtraAccounts;
  is: AccountValues;
  isExtra: ExtraAccounts;
  assets: AssetRow[];
  cars: CarRow[];
  adjustments: AdjustmentRow[];
}

export function createInitialState(): TaxInputState {
  return {
    fy: { companyName: '', start: '', end: '', mode: '' },
    company: {
      중소기업: null,
      부동산임대업주업: null,
      상시근로자수: '',
      지배주주목록: [],
      기납부세액: '',
      이월결손금: '',
      공제감면세액: '',
      가산세: '',
      기부금한도초과: '',
      증빙불비: '',
      수입금액: '',
      성실신고확인서: null,
      세액감면: null,
      매출3억초과: null,
    },
    bs: {},
    bsExtra: {},
    is: {},
    isExtra: {},
    assets: [],
    cars: [],
    adjustments: [],
  };
}
