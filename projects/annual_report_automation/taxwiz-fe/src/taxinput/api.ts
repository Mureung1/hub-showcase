// taxengine/api/main.py(FastAPI)를 호출하는 얇은 클라이언트.
// 요청 바디 필드명은 taxengine/api/schemas.py와 1:1로 맞춘다 — CSV/DB/API가 전부 같은
// 한글 키 계약을 쓴다는 그 프로젝트 전역 원칙을 FE에서도 그대로 따른다.
import { BS_GROUPS, IS_GROUPS, resolveCore } from './catalog';
import type { TaxInputState } from './types';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

const ADJ_LABEL_TO_ENGINE: Record<string, string> = {
  '익금산입(가산)': '익금산입',
  '손금불산입(가산)': '손금불산입',
  '손금산입(차감)': '손금산입',
  '익금불산입(차감)': '익금불산입',
};

function n(v: string | number | undefined | null): number {
  return Number(v || 0);
}
function nOrUndef(v: string | number | undefined | null): number | undefined {
  return v === '' || v == null ? undefined : Number(v);
}

interface FiscalYearPayload {
  회사: Record<string, unknown>;
  손익계산서: { 계정: string; 구분: string; 금액: number }[];
  재무상태표: { 계정: string; 구분: string; 금액: number }[];
  자산대장: Record<string, unknown>[];
  차량대장: Record<string, unknown>[];
  조정: Record<string, unknown>[];
}

export function buildFiscalYearPayload(data: TaxInputState): FiscalYearPayload {
  const isRental = data.company.부동산임대업주업 === true;
  const c = data.company;

  const 재무상태표: FiscalYearPayload['재무상태표'] = [];
  BS_GROUPS.forEach((g) => {
    resolveCore(g, isRental).forEach((name) => {
      const 구분 = (g.kindOverride && g.kindOverride[name]) || g.kind;
      재무상태표.push({ 계정: name, 구분, 금액: n(data.bs[name]) });
    });
    (data.bsExtra[g.key] || []).forEach((r) => {
      if (r.명.trim()) 재무상태표.push({ 계정: r.명, 구분: g.kind, 금액: n(r.금액) });
    });
  });

  const 손익계산서: FiscalYearPayload['손익계산서'] = [];
  IS_GROUPS.forEach((g) => {
    resolveCore(g, isRental).forEach((name) => {
      손익계산서.push({ 계정: name, 구분: g.kind, 금액: n(data.is[name]) });
    });
    (data.isExtra[g.key] || []).forEach((r) => {
      if (r.명.trim()) 손익계산서.push({ 계정: r.명, 구분: g.kind, 금액: n(r.금액) });
    });
  });

  const 지분합계 = c.지배주주목록.reduce((s, r) => s + n(r.비율), 0);

  return {
    회사: {
      사업연도개시일: data.fy.start,
      사업연도종료일: data.fy.end,
      중소기업: c.중소기업 === true,
      부동산임대업주업: c.부동산임대업주업 === true,
      상시근로자수: nOrUndef(c.상시근로자수),
      지배주주지분율: c.지배주주목록.length ? 지분합계 : undefined,
      기납부세액: n(c.기납부세액),
      이월결손금: n(c.이월결손금),
      공제감면세액: n(c.공제감면세액),
      가산세: n(c.가산세),
      기부금한도초과: n(c.기부금한도초과),
      수입금액: nOrUndef(c.수입금액),
      기업업무추진비_증빙불비금액: n(c.증빙불비),
    },
    손익계산서,
    재무상태표,
    자산대장: data.assets.map((a) => ({
      명: a.명, 구분: a.구분, 취득일: a.취득일, 취득가: n(a.취득가), 기초누계: n(a.기초누계),
      회사계상액: nOrUndef(a.회사계상액), 방법: a.방법, 내용연수: n(a.내용연수),
      전기이월부인액: n(a.전기이월부인액), 업무용승용차: a.업무용승용차,
    })),
    차량대장: data.cars.map((cr) => ({
      명: cr.명, 감가상각비: n(cr.감가상각비), 기타관련비용: n(cr.기타관련비용),
      전용보험가입: cr.전용보험가입, 운행기록부작성: cr.운행기록부작성,
      업무사용비율: nOrUndef(cr.업무사용비율),
    })),
    조정: data.adjustments.filter((a) => a.과목.trim()).map((a) => ({
      과목: a.과목, 구분: ADJ_LABEL_TO_ENGINE[a.구분] || a.구분, 금액: n(a.금액),
      소득처분: a.소득처분, 근거: a.근거 || undefined,
    })),
  };
}

export interface CalcResult {
  스냅샷id: number;
  각사업연도소득: number;
  과세표준: number;
  산출세액: number;
  차감납부세액: number;
  총납부세액: number;
}

export class ApiError extends Error {
  checks?: { name: string; ok: boolean; detail: string }[];
  constructor(message: string, checks?: { name: string; ok: boolean; detail: string }[]) {
    super(message);
    this.checks = checks;
  }
}

async function asJson(res: Response) {
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const detail = body?.detail;
    if (detail && typeof detail === 'object' && Array.isArray(detail.checks)) {
      throw new ApiError(detail.message || '요청이 거부됐어요', detail.checks);
    }
    throw new ApiError(typeof detail === 'string' ? detail : `요청이 실패했어요 (HTTP ${res.status})`);
  }
  return body;
}

/** 회사 생성 → 사업연도 생성(=입력 전체 제출) → 계산 실행까지 한 번에 — 매번 새 회사/사업연도를
 * 만든다. API에 "기존 사업연도 수정" 엔드포인트가 없어서, 재계산은 항상 새로 만들고 새로 계산한다. */
export async function submitAndCalculate(data: TaxInputState): Promise<CalcResult> {
  const companyRes = await fetch(`${API_BASE}/companies`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 회사명: data.fy.companyName || '이름 없는 회사' }),
  });
  const company = await asJson(companyRes);

  const fyRes = await fetch(`${API_BASE}/companies/${company.id}/fiscal-years`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildFiscalYearPayload(data)),
  });
  const fiscalYear = await asJson(fyRes);

  const calcRes = await fetch(`${API_BASE}/fiscal-years/${fiscalYear.id}/calculate`, { method: 'POST' });
  return asJson(calcRes);
}
