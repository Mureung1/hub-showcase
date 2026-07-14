// @ts-check

/**
 * @typedef {'asset' | 'liability' | 'equity' | 'revenue' | 'expense'} AccountType
 * @typedef {'debit' | 'credit'} Side
 * @typedef {'currentAsset' | 'nonCurrentAsset' | 'currentLiability' | 'nonCurrentLiability' | 'equity'} BsGroup
 * @typedef {'sales' | 'cogs' | 'sga' | 'nonOpRevenue' | 'nonOpExpense'} IsGroup
 * @typedef {{ code: string, name: string, type: AccountType, normalSide: Side, bsGroup: BsGroup | null, isGroup: IsGroup | null }} Account
 */

// 계정과목 마스터 — 더존식 3자리 코드를 따른다 (추후 국세청 표준재무제표 계정코드 매핑 대비).
// bsGroup: 재무상태표 표시 그룹 (손익 계정은 null)
// isGroup: 손익계산서 표시 그룹 (재무상태 계정은 null) — 단계 소계(매출총이익→영업이익→당기순이익)를 결정한다.
/** @type {Account[]} */
export const ACCOUNTS = [
  // 유동자산
  { code: '101', name: '현금', type: 'asset', normalSide: 'debit', bsGroup: 'currentAsset', isGroup: null },
  { code: '103', name: '보통예금', type: 'asset', normalSide: 'debit', bsGroup: 'currentAsset', isGroup: null },
  { code: '108', name: '외상매출금', type: 'asset', normalSide: 'debit', bsGroup: 'currentAsset', isGroup: null },
  { code: '120', name: '미수금', type: 'asset', normalSide: 'debit', bsGroup: 'currentAsset', isGroup: null },
  { code: '135', name: '부가세대급금', type: 'asset', normalSide: 'debit', bsGroup: 'currentAsset', isGroup: null },
  // 비유동자산
  { code: '212', name: '비품', type: 'asset', normalSide: 'debit', bsGroup: 'nonCurrentAsset', isGroup: null },
  { code: '232', name: '임차보증금', type: 'asset', normalSide: 'debit', bsGroup: 'nonCurrentAsset', isGroup: null },
  // 유동부채
  { code: '253', name: '미지급금', type: 'liability', normalSide: 'credit', bsGroup: 'currentLiability', isGroup: null },
  { code: '254', name: '예수금', type: 'liability', normalSide: 'credit', bsGroup: 'currentLiability', isGroup: null },
  { code: '255', name: '부가세예수금', type: 'liability', normalSide: 'credit', bsGroup: 'currentLiability', isGroup: null },
  { code: '260', name: '단기차입금', type: 'liability', normalSide: 'credit', bsGroup: 'currentLiability', isGroup: null },
  // 자본
  { code: '331', name: '자본금', type: 'equity', normalSide: 'credit', bsGroup: 'equity', isGroup: null },
  { code: '375', name: '이월이익잉여금', type: 'equity', normalSide: 'credit', bsGroup: 'equity', isGroup: null },
  // 수익
  { code: '401', name: '용역매출', type: 'revenue', normalSide: 'credit', bsGroup: null, isGroup: 'sales' },
  { code: '901', name: '이자수익', type: 'revenue', normalSide: 'credit', bsGroup: null, isGroup: 'nonOpRevenue' },
  // 비용 — 판매비와관리비
  { code: '801', name: '급여', type: 'expense', normalSide: 'debit', bsGroup: null, isGroup: 'sga' },
  { code: '811', name: '복리후생비', type: 'expense', normalSide: 'debit', bsGroup: null, isGroup: 'sga' },
  { code: '813', name: '기업업무추진비', type: 'expense', normalSide: 'debit', bsGroup: null, isGroup: 'sga' },
  { code: '819', name: '임차료', type: 'expense', normalSide: 'debit', bsGroup: null, isGroup: 'sga' },
  { code: '831', name: '지급수수료', type: 'expense', normalSide: 'debit', bsGroup: null, isGroup: 'sga' },
  { code: '833', name: '광고선전비', type: 'expense', normalSide: 'debit', bsGroup: null, isGroup: 'sga' },
  // 비용 — 영업외
  { code: '931', name: '이자비용', type: 'expense', normalSide: 'debit', bsGroup: null, isGroup: 'nonOpExpense' },
];

const byCode = new Map(ACCOUNTS.map((a) => [a.code, a]));

/**
 * @param {string} code
 * @returns {Account | null}
 */
export function getAccount(code) {
  return byCode.get(code) ?? null;
}
