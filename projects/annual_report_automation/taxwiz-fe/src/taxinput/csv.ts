// taxengine/loader.py가 그대로 읽는 CSV 7종을 생성한다 — data/templates/*.csv와
// 헤더·컬럼 순서를 동일하게 맞춰서, 여기서 받은 파일을 data/private/<사업연도>/에
// 넣으면 기존 CLI(reproduce/scenario)가 바로 돌아간다.
import { BS_GROUPS, IS_GROUPS, resolveCore } from './catalog';
import type { TaxInputState } from './types';

function esc(v: string | number | boolean): string {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function row(cells: (string | number | boolean)[]): string {
  return cells.map(esc).join(',');
}
function b(v: boolean): string { return v ? 'true' : 'false'; }

// company.csv — 구분 없이 앞 계정에 익금산입(가산) 식 표기를 쓰는 건 UI 편의용 라벨이라,
// adjustments.csv로 내보낼 땐 engine이 실제로 매칭하는 순수 구분값으로 되돌린다.
const ADJ_LABEL_TO_ENGINE: Record<string, string> = {
  '익금산입(가산)': '익금산입',
  '손금불산입(가산)': '손금불산입',
  '손금산입(차감)': '손금산입',
  '익금불산입(차감)': '익금불산입',
};

export function buildCompanyCsv(data: TaxInputState): string {
  const c = data.company;
  const 지분합계 = c.지배주주목록.reduce((s, r) => s + Number(r.비율 || 0), 0);
  const lines = [
    'key,value,설명',
    row(['사업연도개시일', data.fy.start, '']),
    row(['사업연도종료일', data.fy.end, '']),
    row(['중소기업', c.중소기업 === null ? '' : b(c.중소기업), '']),
    row(['부동산임대업주업', c.부동산임대업주업 === null ? '' : b(c.부동산임대업주업), '']),
    row(['상시근로자수', c.상시근로자수, '']),
    row(['지배주주지분율', c.지배주주목록.length ? 지분합계 : '', '']),
    row(['기납부세액', c.기납부세액 || 0, '']),
    row(['이월결손금', c.이월결손금 || 0, '']),
    row(['공제감면세액', c.공제감면세액 || 0, '']),
    row(['가산세', c.가산세 || 0, '']),
    row(['기부금한도초과', c.기부금한도초과 || 0, '']),
    row(['수입금액', c.수입금액, '']),
    row(['기업업무추진비_증빙불비금액', c.증빙불비 || 0, '']),
  ];
  return lines.join('\n');
}

export function buildBalanceSheetCsv(data: TaxInputState): string {
  const isRental = data.company.부동산임대업주업 === true;
  const lines = ['대분류,중분류,계정,구분,금액'];
  BS_GROUPS.forEach((g) => {
    const 대분류 = g.label.replace('재무상태표 · ', '');
    resolveCore(g, isRental).forEach((name) => {
      const 구분 = (g.kindOverride && g.kindOverride[name]) || g.kind;
      lines.push(row([대분류, '', name, 구분, data.bs[name] || 0]));
    });
    (data.bsExtra[g.key] || []).forEach((r) => {
      if (!r.명.trim()) return;
      lines.push(row([대분류, '', r.명, g.kind, r.금액 || 0]));
    });
  });
  return lines.join('\n');
}

export function buildIncomeStatementCsv(data: TaxInputState): string {
  const isRental = data.company.부동산임대업주업 === true;
  const lines = ['대분류,계정,구분,금액'];
  IS_GROUPS.forEach((g) => {
    const 대분류 = g.label.replace('손익계산서 · ', '');
    resolveCore(g, isRental).forEach((name) => {
      lines.push(row([대분류, name, g.kind, data.is[name] || 0]));
    });
    (data.isExtra[g.key] || []).forEach((r) => {
      if (!r.명.trim()) return;
      lines.push(row([대분류, r.명, g.kind, r.금액 || 0]));
    });
  });
  return lines.join('\n');
}

export function buildAssetsCsv(data: TaxInputState): string {
  const lines = ['명,구분,취득일,취득가,기초누계,회사계상액,방법,내용연수,전기이월부인액,업무용승용차'];
  data.assets.forEach((a) => {
    lines.push(row([a.명, a.구분, a.취득일, a.취득가 || 0, a.기초누계 || 0, a.회사계상액 || 0, a.방법, a.내용연수, a.전기이월부인액 || 0, b(a.업무용승용차)]));
  });
  return lines.join('\n');
}

export function buildCarsCsv(data: TaxInputState): string {
  const lines = ['명,감가상각비,기타관련비용,전용보험가입,운행기록부작성,업무사용비율'];
  data.cars.forEach((c) => {
    lines.push(row([c.명, c.감가상각비 || 0, c.기타관련비용 || 0, b(c.전용보험가입), b(c.운행기록부작성), c.업무사용비율 || 0]));
  });
  return lines.join('\n');
}

export function buildAdjustmentsCsv(data: TaxInputState): string {
  const lines = ['과목,구분,금액,소득처분,근거'];
  data.adjustments.forEach((a) => {
    if (!a.과목.trim()) return;
    lines.push(row([a.과목, ADJ_LABEL_TO_ENGINE[a.구분] || a.구분, a.금액 || 0, a.소득처분, a.근거]));
  });
  return lines.join('\n');
}

export function buildAnswerCsv(): string {
  // 정답지(별지3 실제값 대조용)는 이 위저드에서 아직 수집하지 않는다 — 있으면 대조,
  // 없어도 계산 자체는 되는 선택 파일이라 빈 템플릿만 내보낸다.
  return [
    'key,value,설명',
    '각사업연도소득,,',
    '과세표준,,',
    '산출세액,,',
    '차감납부세액,,',
    '지방소득세,,',
  ].join('\n');
}

export function downloadCsv(filename: string, content: string): void {
  // 엑셀이 여는 CSV의 한글 깨짐을 막는 UTF-8 BOM (taxengine/loader.py도 utf-8-sig로 읽음)
  const blob = new Blob(['﻿', content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
