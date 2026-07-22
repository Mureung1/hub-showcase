// "질문 하나 = cell 하나"를 만들어내는 순수 함수들. cellsForTopic()은 매 렌더마다
// 현재 state로부터 다시 계산되는 파생값이라, 값 하나가 바뀌면 이후 로직(추가 과목 루프,
// 반복 항목 루프)이 자동으로 다음 cell을 만들어낸다 — React 쪽 useEngine.ts가 그 결과를
// 그대로 그린다.
import {
  ADJ_DISPOSAL, ADJ_TYPES, ASSET_TYPES, DEP_METHODS, BS_GROUPS, IS_GROUPS, GLOSSARY,
  SECTION_PREP, TOPIC_META, resolveCore,
} from './catalog';
import type { BsIsGroup, PrepItem } from './catalog';
import type {
  TaxInputState, AssetRow, CarRow, AdjustmentRow, Shareholder,
} from './types';

export type CellKind = 'text' | 'number' | 'date-ymd' | 'select' | 'yesno' | 'shareholders' | 'info' | 'section-intro';
export interface SelectOpt { value: string; label: string; description?: string }

export interface FieldSeqItem {
  k: string;
  kind: CellKind;
  title: string;
  sub?: string;
  ph?: string;
  unit?: string;
  money?: boolean;
  skippable?: boolean;
  opts?: SelectOpt[];
  glossaryKey?: string;
  cond?: (row: any) => boolean;
}

export interface Cell {
  id: string;
  kind: CellKind;
  title: string;
  sub?: string;
  ph?: string;
  unit?: string;
  money?: boolean;
  skippable?: boolean;
  opts?: SelectOpt[];
  label: string;
  glossaryKey?: string;
  isGate?: boolean;
  prep?: PrepItem[]; // section-intro 전용 — 준비물 목록
  yesLabel?: string; // yesno 전용 — 기본 "네, 있어요"가 안 어울리는 질문용
  noLabel?: string;
  get: () => any;
  set: (v: any) => void;
  onGate?: (v: boolean) => void;
}

// ── path get/set (immutable) — mirrors the mockup's getPath/setPath ───────
export function getIn(obj: any, path: (string | number)[]): any {
  return path.reduce((cur, k) => (cur == null ? cur : cur[k]), obj);
}
export function setIn<T>(obj: T, path: (string | number)[], value: any): T {
  if (path.length === 0) return value;
  const [key, ...rest] = path;
  const cur: any = obj;
  const clone: any = Array.isArray(cur) ? [...cur] : { ...cur };
  clone[key] = setIn(cur ? cur[key] : undefined, rest, value);
  return clone;
}

// ── static field sequences ─────────────────────────────────────────────
// 회사명은 온보딩(PROFILE_FIELDS)으로 이동 — 연간 위저드에서는 선택된 회사가 이미 정해져 있다.
export const FY_FIELDS: (FieldSeqItem & { id: string; bind: (string | number)[] })[] = [
  { id: 'fy_start', k: 'start', kind: 'date-ymd', title: '사업연도 개시일은 언제인가요?', bind: ['fy', 'start'] },
  { id: 'fy_end', k: 'end', kind: 'date-ymd', title: '사업연도 종료일은 언제인가요?', bind: ['fy', 'end'] },
  {
    id: 'fy_mode', k: 'mode', kind: 'select', title: '어떻게 시작할까요?', bind: ['fy', 'mode'],
    opts: [
      { value: 'new', label: '새 사업연도', description: '처음부터 입력해요' },
      { value: 'carryover', label: '전기 이어서', description: '전기 자산·이월결손금을 자동이월해요' },
    ],
  },
];

// "거의 고정" 프로필 — 온보딩에서 최초 1회 입력해 DB(회사·지배주주 테이블)에 저장하고,
// 연간 위저드는 'profile-confirm' 토픽에서 "작년과 같나요?"로 확인만 한다(아니오 → 재질문).
export const PROFILE_FIELDS: (FieldSeqItem & { id: string; bind: (string | number)[]; label: string })[] = [
  { id: 'pf_name', k: 'name', kind: 'text', title: '회사명을 알려주세요', ph: '예: ㈜예시임대', bind: ['fy', 'companyName'], label: '회사명' },
  { id: 'pf_year', k: '설립연도', kind: 'number', unit: '년', skippable: true, title: '설립연도는 언제인가요?', ph: '예: 2017', bind: ['company', '설립연도'], label: '설립연도' },
  { id: 'co_sme', k: '중소기업', kind: 'yesno', title: '중소기업에 해당하나요?', sub: '중소기업 기준검토표 판정 결과예요', bind: ['company', '중소기업'], label: '중소기업 해당', glossaryKey: '중소기업' },
  { id: 'co_rent', k: '부동산임대업주업', kind: 'yesno', title: '부동산임대업이 주업인가요?', sub: '소규모 임대법인 특례 판정에 쓰여요', bind: ['company', '부동산임대업주업'], label: '부동산임대업 주업', glossaryKey: '부동산임대업주업' },
  { id: 'co_emp', k: '상시근로자수', kind: 'number', unit: '명', title: '상시근로자수는 몇 명인가요?', bind: ['company', '상시근로자수'], label: '상시근로자수' },
  { id: 'co_share', k: '지배주주목록', kind: 'shareholders', title: '지배주주 지분율을 알려주세요', sub: '지배주주와 특수관계자를 각각 이름(또는 역할코드)과 지분율로 적어주세요', bind: ['company', '지배주주목록'], label: '지배주주 지분', glossaryKey: '지배주주 지분' },
];

// 매년 바뀌는 세액 관련 입력 — 연간 위저드의 'company' 토픽
export const COMPANY_FIELDS: (FieldSeqItem & { id: string; bind: (string | number)[]; label: string })[] = [
  { id: 'co_paid', k: '기납부세액', kind: 'number', money: true, skippable: true, title: '기납부세액이 있나요?', sub: '원천납부세액명세서 + 중간예납', bind: ['company', '기납부세액'], label: '기납부세액', glossaryKey: '기납부세액' },
  { id: 'co_loss', k: '이월결손금', kind: 'number', money: true, skippable: true, title: '이월결손금이 있나요?', sub: '자본금과적립금(갑)표 이월결손금 잔액', bind: ['company', '이월결손금'], label: '이월결손금', glossaryKey: '이월결손금' },
  { id: 'co_credit', k: '공제감면세액', kind: 'number', money: true, skippable: true, title: '세액공제·감면 받은 금액이 있나요?', bind: ['company', '공제감면세액'], label: '공제감면세액', glossaryKey: '공제감면세액' },
  { id: 'co_penalty', k: '가산세', kind: 'number', money: true, skippable: true, title: '가산세가 있나요?', bind: ['company', '가산세'], label: '가산세', glossaryKey: '가산세' },
  { id: 'co_donation', k: '기부금한도초과', kind: 'number', money: true, skippable: true, title: '기부금 한도초과액이 있나요?', bind: ['company', '기부금한도초과'], label: '기부금 한도초과', glossaryKey: '기부금 한도초과' },
  { id: 'co_receipt', k: '증빙불비', kind: 'number', money: true, skippable: true, title: '기업업무추진비 중 증빙불비 금액이 있나요?', sub: '건당 3만원 초과인데 적격증빙 없는 지출액', bind: ['company', '증빙불비'], label: '증빙불비 금액', glossaryKey: '증빙불비 금액' },
  { id: 'co_revenue', k: '수입금액', kind: 'number', money: true, skippable: true, title: '수입금액을 알려주세요', sub: '채우면 기업업무추진비 한도를 자동 계산해요 — 몰라도 건너뛸 수 있어요', bind: ['company', '수입금액'], label: '수입금액', glossaryKey: '수입금액' },
];

export const Q1_FIELDS: (FieldSeqItem & { id: string; bind?: (string | number)[]; label: string })[] = [
  { id: 'q1_a', k: '성실신고확인서', kind: 'yesno', title: '성실신고확인서가 첨부되어 있나요?', sub: '종이 결산보고서에 성실신고확인서가 함께 철되어 있는지 확인해주세요', bind: ['company', '성실신고확인서'], label: '성실신고확인서', glossaryKey: '성실신고확인서' },
  { id: 'q1_b', k: '세액감면', kind: 'yesno', title: '세액공제·감면을 받았나요?', bind: ['company', '세액감면'], label: '세액공제·감면', glossaryKey: '세액감면' },
  { id: 'q1_c', k: '매출3억초과', kind: 'yesno', title: '매출이 3억원을 넘나요?', bind: ['company', '매출3억초과'], label: '매출 3억 초과', glossaryKey: '매출3억초과' },
  { id: 'q1_result', k: 'result', kind: 'info', title: '판별 결과예요', label: '판별 결과' },
];

export const ASSET_SEQ: FieldSeqItem[] = [
  { k: '명', kind: 'text', title: '자산 이름이 뭔가요?', ph: '예: 본사 건물' },
  { k: '구분', kind: 'select', title: '자산 구분을 선택하세요', opts: ASSET_TYPES.map((v) => ({ value: v, label: v })) },
  { k: '취득일', kind: 'date-ymd', title: '취득일이 언제인가요?' },
  { k: '취득가', kind: 'number', money: true, title: '취득가는 얼마인가요?' },
  { k: '기초누계', kind: 'number', money: true, skippable: true, title: '기초 감가상각누계액이 있나요?', sub: '작년까지 쌓인 금액 — 첫 해면 0이에요', glossaryKey: '기초누계' },
  { k: '회사계상액', kind: 'number', money: true, title: '올해 회사계상액은 얼마인가요?', sub: '장부에 실제로 적은 감가상각비' },
  { k: '방법', kind: 'select', title: '상각 방법은 무엇인가요?', opts: DEP_METHODS.map((v) => ({ value: v, label: v })) },
  { k: '내용연수', kind: 'number', unit: '년', title: '내용연수는 몇 년인가요?' },
  { k: '전기이월부인액', kind: 'number', money: true, skippable: true, title: '전기이월부인액이 있나요?', sub: '자본금과적립금(을)표 누적 유보 — 첫 해면 0', glossaryKey: '전기이월부인액' },
  { k: '업무용승용차', kind: 'yesno', title: '업무용승용차인가요?', sub: '맞으면 5년 정액상각이 강제돼요' },
];

export const CAR_SEQ: FieldSeqItem[] = [
  { k: '명', kind: 'text', title: '차량 이름/코드가 뭔가요?', ph: '예: 차량01' },
  { k: '감가상각비', kind: 'number', money: true, title: '이 차량의 감가상각비는 얼마인가요?' },
  { k: '기타관련비용', kind: 'number', money: true, title: '기타 관련비용은 얼마인가요?', sub: '유류비+보험료+수선비+자동차세+통행료 등 합계' },
  { k: '전용보험가입', kind: 'yesno', title: '업무전용자동차보험에 가입했나요?', sub: '미가입이면 전액 손금불산입돼요', glossaryKey: '업무전용보험' },
  { k: '운행기록부작성', kind: 'yesno', title: '운행기록부를 작성했나요?', sub: '작성하면 업무사용비율만큼 인정돼요', glossaryKey: '운행기록부' },
  { k: '업무사용비율', kind: 'number', unit: '%', skippable: true, title: '업무사용비율은 몇 %인가요?', cond: (row: CarRow) => row.운행기록부작성 === true },
];

export const ADJ_SEQ: FieldSeqItem[] = [
  { k: '과목', kind: 'text', title: '조정 과목이 뭔가요?', ph: '예: 세금과공과(과태료)' },
  { k: '구분', kind: 'select', title: '어떤 조정인가요?', opts: ADJ_TYPES.map((v) => ({ value: v, label: v })), glossaryKey: 'adj_구분' },
  { k: '금액', kind: 'number', money: true, title: '금액은 얼마인가요?' },
  { k: '소득처분', kind: 'select', title: '소득처분은 무엇인가요?', opts: ADJ_DISPOSAL.map((v) => ({ value: v, label: v })), glossaryKey: 'adj_소득처분' },
  { k: '근거', kind: 'text', skippable: true, title: '근거 조문을 적어주시겠어요?', ph: '예: 법인세법 §21' },
];

export function blankAsset(): AssetRow {
  return { 명: '', 구분: '비품', 취득일: '', 취득가: '', 기초누계: '', 회사계상액: '', 방법: '정액', 내용연수: '5', 전기이월부인액: '', 업무용승용차: false };
}
export function blankCar(): CarRow {
  return { 명: '', 감가상각비: '', 기타관련비용: '', 전용보험가입: false, 운행기록부작성: false, 업무사용비율: '' };
}
export function blankAdj(): AdjustmentRow {
  return { 과목: '', 구분: ADJ_TYPES[1], 금액: '', 소득처분: '기타사외유출', 근거: '' };
}
function blankExtra(): { 명: string; 금액: string } { return { 명: '', 금액: '' }; }

// ── generic dispatch surface the cell generators write through ─────────
export interface EngineIO {
  data: TaxInputState;
  setPath: (path: (string | number)[], value: any) => void;
  pushAt: (path: (string | number)[], value: any) => void;
  gateAnswers: Record<string, boolean>;
  setGateAnswer: (id: string, v: boolean) => void;
}

function wrapBoundField(f: FieldSeqItem & { id: string; bind?: (string | number)[]; label?: string }, io: EngineIO): Cell {
  if (f.kind === 'info') {
    return {
      id: f.id, kind: f.kind, title: f.title, sub: f.sub, label: f.label || f.title,
      get: () => io.gateAnswers[f.id], set: (v: boolean) => io.setGateAnswer(f.id, v),
    };
  }
  const bind = f.bind!;
  return {
    id: f.id, kind: f.kind, title: f.title, sub: f.sub, ph: f.ph, unit: f.unit, money: f.money,
    skippable: f.skippable, opts: f.opts, label: f.label || f.title, glossaryKey: f.glossaryKey,
    get: () => getIn(io.data, bind),
    set: (v: any) => io.setPath(bind, v),
  };
}

function genGroupCells(prefix: string, group: BsIsGroup, extraKey: 'bsExtra' | 'isExtra', storeKey: 'bs' | 'is', io: EngineIO): Cell[] {
  const isRental = io.data.company.부동산임대업주업 === true;
  const coreList = resolveCore(group, isRental);
  const cells: Cell[] = coreList.map((name) => {
    const kind = (group.kindOverride && group.kindOverride[name]) || group.kind;
    const glossKey = name.replace(/\(.+\)$/, '');
    return {
      id: `${prefix}_${name}`, kind: 'number', money: true, skippable: true,
      title: kind === '수익' || kind === '비용' ? `${name} 금액이 얼마인가요?` : `${name} 잔액이 얼마인가요?`,
      label: name, glossaryKey: GLOSSARY[glossKey] ? glossKey : undefined,
      get: () => io.data[storeKey][name], set: (v: string) => io.setPath([storeKey, name], v),
    };
  });

  // "더 있나요?" 게이트는 항상 자기 내용 바로 뒤에 붙고, "예"는 항상 그 뒤로만
  // 새 이름/금액 쌍을 이어붙인다 — 절대 게이트보다 앞에 끼워넣지 않는다. 그래서
  // 매 커밋마다 frontier를 그냥 +1 하면 되는 단순한 규칙이 그대로 성립한다.
  const extra = io.data[extraKey][group.key] || [];
  let round = 0;
  const pushMoreGate = (firstRound: boolean) => {
    const gid = `${prefix}_more${round}`;
    cells.push({
      id: gid, kind: 'yesno', isGate: true, label: gid,
      title: firstRound ? `${group.label}에 추가할 과목이 더 있나요?` : '추가할 과목이 더 있으신가요?',
      get: () => io.gateAnswers[gid], set: (v: boolean) => io.setGateAnswer(gid, v),
      onGate: (v: boolean) => { if (v) io.pushAt([extraKey, group.key], blankExtra()); },
    });
    round += 1;
  };
  pushMoreGate(true);
  extra.forEach((row, idx) => {
    cells.push({
      id: `${prefix}_ex${idx}_name`, kind: 'text', title: '추가할 과목명이 뭔가요?', label: '추가 과목',
      get: () => row.명, set: (v: string) => io.setPath([extraKey, group.key, idx, '명'], v),
    });
    cells.push({
      id: `${prefix}_ex${idx}_amt`, kind: 'number', money: true, skippable: true,
      title: `${row.명 || '그 과목'}의 금액은 얼마인가요?`, label: `${row.명 || '추가 과목'} 금액`,
      get: () => row.금액, set: (v: string) => io.setPath([extraKey, group.key, idx, '금액'], v),
    });
    pushMoreGate(false);
  });
  return cells;
}

function genRepeatable<TRow>(
  arrKey: 'assets' | 'cars' | 'adjustments',
  seq: FieldSeqItem[],
  labels: { introTitle: string; introSub: string; unit: string; blank: () => TRow },
  io: EngineIO,
): Cell[] {
  const introId = `${arrKey}_intro`;
  const cells: Cell[] = [{
    id: introId, kind: 'yesno', isGate: true, title: labels.introTitle, sub: labels.introSub, label: introId,
    get: () => io.gateAnswers[introId], set: (v: boolean) => io.setGateAnswer(introId, v),
    onGate: (v: boolean) => { if (v) io.pushAt([arrKey], labels.blank()); },
  }];
  const rows = io.data[arrKey] as unknown as any[];
  rows.forEach((row, idx) => {
    seq.forEach((f) => {
      if (f.cond && !f.cond(row)) return;
      cells.push({
        id: `${arrKey}_i${idx}_${f.k}`, kind: f.kind, money: f.money, unit: f.unit, skippable: f.skippable,
        title: f.title, sub: f.sub, ph: f.ph, opts: f.opts, label: f.k, glossaryKey: f.glossaryKey,
        get: () => row[f.k], set: (v: any) => io.setPath([arrKey, idx, f.k], v),
      });
    });
    const moreId = `${arrKey}_more${idx}`;
    cells.push({
      id: moreId, kind: 'yesno', isGate: true, label: moreId,
      title: `${idx + 1}번째 ${labels.unit}까지 입력했어요. ${labels.unit}가 더 있으신가요?`,
      get: () => io.gateAnswers[moreId], set: (v: boolean) => io.setGateAnswer(moreId, v),
      onGate: (v: boolean) => { if (v) io.pushAt([arrKey], labels.blank()); },
    });
  });
  return cells;
}

// 연간 위저드의 "작년과 같나요?" 확인 게이트 — 아니오라고 답하면 프로필 질문(회사명 제외)이
// 그 자리에서 다시 나타난다. 수정된 값은 제출 시 PATCH /companies/{id}로 반영된다(api.ts).
function genProfileConfirm(io: EngineIO): Cell[] {
  const gid = 'profile_confirm';
  const c = io.data.company;
  const 요약 = [
    c.중소기업 == null ? null : `중소기업 ${c.중소기업 ? 'O' : 'X'}`,
    c.부동산임대업주업 == null ? null : `부동산임대업 ${c.부동산임대업주업 ? 'O' : 'X'}`,
    c.상시근로자수 !== '' ? `상시근로자 ${c.상시근로자수}명` : null,
    c.지배주주목록.length ? `지배주주 ${c.지배주주목록.length}명` : null,
  ].filter(Boolean).join(' · ');
  const cells: Cell[] = [{
    id: gid, kind: 'yesno', isGate: true, label: '프로필 확인',
    title: '회사 프로필이 그대로인가요?',
    sub: (요약 ? `저장된 프로필: ${요약} — ` : '') + '"아니요"를 누르면 다시 물어봐요',
    yesLabel: '네, 그대로예요', noLabel: '아니요, 바뀌었어요',
    get: () => io.gateAnswers[gid], set: (v: boolean) => io.setGateAnswer(gid, v),
  }];
  if (io.gateAnswers[gid] === false) {
    // 회사명(pf_name)은 제외 — 회사 이름 변경은 홈 화면 몫이지 연간 입력 흐름이 아니다
    cells.push(...PROFILE_FIELDS.filter((f) => f.id !== 'pf_name').map((f) => wrapBoundField(f, io)));
  }
  return cells;
}

/** 섹션의 첫 토픽이면 "미리 준비할 것" 카드 셀을 돌려준다(없으면 null).
 * cellsForTopic 앞에 붙는 의사 셀 — 기존 frontier/뒤로가기 스테이트머신에 그대로 편입되어
 * "뒤로 가서 준비물 다시 보기"가 공짜로 된다. useEngine.ts의 cellsFor()가 호출한다. */
export function sectionIntroCellFor(topicKey: string, topicOrder: string[], io: EngineIO): Cell | null {
  const section = TOPIC_META[topicKey]?.section;
  if (!section) return null;
  const prep = SECTION_PREP[section];
  if (!prep) return null;
  const firstTopicOfSection = topicOrder.find((k) => TOPIC_META[k]?.section === section);
  if (firstTopicOfSection !== topicKey) return null;
  const id = `prep_${section}`;
  return {
    id, kind: 'section-intro', prep, label: `${section} 준비물`,
    title: '미리 준비하면 좋아요',
    sub: '지금 없어도 괜찮아요 — 해당 질문에서 건너뛸 수 있어요.',
    get: () => io.gateAnswers[id],
    set: () => io.setGateAnswer(id, true),
  };
}

export function cellsForTopic(topicKey: string, io: EngineIO): Cell[] {
  if (topicKey === 'fy') return FY_FIELDS.map((f) => wrapBoundField(f, io));
  if (topicKey === 'profile') return PROFILE_FIELDS.map((f) => wrapBoundField(f, io));
  if (topicKey === 'profile-confirm') return genProfileConfirm(io);
  if (topicKey === 'company') return COMPANY_FIELDS.map((f) => wrapBoundField(f, io));
  if (topicKey === 'q1') return Q1_FIELDS.map((f) => wrapBoundField(f, io));
  if (topicKey.startsWith('bs:')) {
    const g = BS_GROUPS.find((x) => x.key === topicKey.slice(3))!;
    return genGroupCells(topicKey, g, 'bsExtra', 'bs', io);
  }
  if (topicKey.startsWith('is:')) {
    const g = IS_GROUPS.find((x) => x.key === topicKey.slice(3))!;
    return genGroupCells(topicKey, g, 'isExtra', 'is', io);
  }
  if (topicKey === 'assets') return genRepeatable('assets', ASSET_SEQ, { introTitle: '자산대장을 입력할까요?', introSub: '없으면 건너뛰어도 괜찮아요.', unit: '자산', blank: blankAsset }, io);
  if (topicKey === 'cars') return genRepeatable('cars', CAR_SEQ, { introTitle: '업무용승용차가 있나요?', introSub: '법인 명의 승용차가 없다면 건너뛰어도 괜찮아요.', unit: '차량', blank: blankCar }, io);
  if (topicKey === 'adj') return genRepeatable('adjustments', ADJ_SEQ, { introTitle: '세무조정할 항목이 있나요?', introSub: '⚠️ 감가상각·기부금·추진비·승용차 한도초과는 앞 단계 입력으로 자동 계산되니 여기 넣지 마세요.', unit: '조정', blank: blankAdj }, io);
  return [];
}

// ── live sums (validation status bar + review counts) ──────────────────
export function resolveCoreSafe(g: BsIsGroup, isRental: boolean): string[] { return resolveCore(g, isRental); }

export function bsSumKind(data: TaxInputState, kind: string): number {
  const isRental = data.company.부동산임대업주업 === true;
  let t = 0;
  BS_GROUPS.forEach((g) => {
    resolveCore(g, isRental).forEach((name) => {
      const k = (g.kindOverride && g.kindOverride[name]) || g.kind;
      if (k === kind) t += Number(data.bs[name] || 0);
    });
  });
  Object.keys(data.bsExtra).forEach((gk) => {
    const g = BS_GROUPS.find((x) => x.key === gk)!;
    (data.bsExtra[gk] || []).forEach((row) => { if (g.kind === kind) t += Number(row.금액 || 0); });
  });
  return t;
}
export function isSumKind(data: TaxInputState, kind: string): number {
  const isRental = data.company.부동산임대업주업 === true;
  let t = 0;
  IS_GROUPS.forEach((g) => {
    resolveCore(g, isRental).forEach((name) => { if (g.kind === kind) t += Number(data.is[name] || 0); });
  });
  Object.keys(data.isExtra).forEach((gk) => {
    const g = IS_GROUPS.find((x) => x.key === gk)!;
    (data.isExtra[gk] || []).forEach((row) => { if (g.kind === kind) t += Number(row.금액 || 0); });
  });
  return t;
}
export function shareholderSum(rows: Shareholder[]): number {
  return rows.reduce((s, r) => s + Number(r.비율 || 0), 0);
}
