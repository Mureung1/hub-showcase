export interface OverlapRow {
  ingredient_id: number;
  ingredient_name: string;
  upper_limit_mg: number | string | null;
  rda_mg?: number | string | null;
  total_amount_mg: number | string | null;
}

export interface OverlapResult {
  ingredientId: number;
  ingredientName: string;
  totalAmountMg: number | null;
  upperLimitMg: number | null;
  rdaMg: number | null;
  isExceeded: boolean;
  message: string;
}

export function buildOverlapResult(row: OverlapRow): OverlapResult {
  const totalAmountMg = row.total_amount_mg === null ? null : Number(row.total_amount_mg);
  const upperLimitMg = row.upper_limit_mg === null ? null : Number(row.upper_limit_mg);
  const rdaMg = row.rda_mg == null ? null : Number(row.rda_mg);
  const isExceeded = totalAmountMg !== null && upperLimitMg !== null && totalAmountMg > upperLimitMg;

  const rdaNote = rdaMg !== null && totalAmountMg !== null ? ` (권장섭취량 ${rdaMg}mg 대비 섭취 중)` : "";

  const message =
    totalAmountMg === null || upperLimitMg === null
      ? `${row.ingredient_name}은(는) 상한 섭취량 기준이 없어 초과 여부를 판단할 수 없어요.`
      : isExceeded
        ? `${row.ingredient_name}을(를) ${totalAmountMg}mg 드시고 있어요. 상한 섭취량(${upperLimitMg}mg)을 초과해서 부작용 위험이 있어요.${rdaNote}`
        : `${row.ingredient_name}을(를) ${totalAmountMg}mg 드시고 있어요. 상한 섭취량(${upperLimitMg}mg) 이내예요.${rdaNote}`;

  return {
    ingredientId: row.ingredient_id,
    ingredientName: row.ingredient_name,
    totalAmountMg,
    upperLimitMg,
    rdaMg,
    isExceeded,
    message,
  };
}
