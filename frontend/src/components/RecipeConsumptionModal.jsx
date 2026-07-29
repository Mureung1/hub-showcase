import { useMemo, useState } from "react";

import { createShoppingSearchUrl } from "../utils/savedRecipes.js";
import {
  buildRecipeConsumptionRows,
  getConsumptionRequestItems,
} from "../utils/recipeConsumption.js";

const statusMessages = {
  missing: "보유하지 않음",
  notTracked: "수량을 관리하지 않는 재료",
  unitMismatch: "보유 단위와 레시피 단위가 다름",
  insufficient: "보유 수량 부족",
};

export default function RecipeConsumptionModal({
  recipe,
  ingredients,
  isSubmitting,
  error,
  onClose,
  onConfirm,
}) {
  const initialRows = useMemo(
    () => buildRecipeConsumptionRows(recipe, ingredients),
    [ingredients, recipe],
  );
  const [rows, setRows] = useState(initialRows);
  const requestItems = getConsumptionRequestItems(rows);
  const readyRows = rows.filter((row) => row.status === "ready");
  const selectedCount = readyRows.filter((row) => row.selected).length;
  const unavailableCount = rows.length - readyRows.length;
  const allReadySelected = readyRows.length > 0 && selectedCount === readyRows.length;
  const hasInvalidSelection = rows.some((row) => row.selected && (
    !Number.isFinite(Number(row.amount))
    || Number(row.amount) <= 0
    || Number(row.amount) > row.availableQuantity
  ));

  const updateRow = (id, values) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...values } : row));
  };
  const toggleAllReady = () => {
    setRows((current) => current.map((row) => (
      row.status === "ready" ? { ...row, selected: !allReadySelected } : row
    )));
  };

  return <div className="modal-backdrop consumption-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}>
    <section className="consumption-modal" role="dialog" aria-modal="true" aria-labelledby="consumption-title">
      <div className="consumption-heading">
        <div><p className="eyebrow">COOKING COMPLETE</p><h2 id="consumption-title">사용한 재료를 정리해요</h2></div>
        <button className="modal-close" type="button" aria-label="재료 차감 닫기" onClick={onClose} disabled={isSubmitting}>×</button>
      </div>
      <div className="consumption-recipe-summary">
        <div className="consumption-recipe-icon" aria-hidden="true">✓</div>
        <div><span>완성한 메뉴</span><strong>{recipe.name}</strong></div>
        <p>1인분 기준 예상 사용량 · 실제 사용량에 맞게 조정하세요</p>
      </div>
      <div className="consumption-body">
        <div className="consumption-toolbar">
          <div className="consumption-stats">
            <span><strong>{selectedCount}</strong>개 선택</span>
            <span><strong>{readyRows.length}</strong>개 차감 가능</span>
            {unavailableCount > 0 && <span className="is-muted">{unavailableCount}개 확인 필요</span>}
          </div>
          <button type="button" className="select-all-action" onClick={toggleAllReady} disabled={readyRows.length === 0 || isSubmitting}>
            {allReadySelected ? "전체 해제" : "전체 선택"}
          </button>
        </div>
        <div className="consumption-list">
          {rows.map((row) => <div className={`consumption-row ${row.status} ${row.selected ? "is-selected" : ""}`} key={row.id}>
            <label>
              <input
                type="checkbox"
                checked={row.selected}
                disabled={row.status !== "ready" || isSubmitting}
                onChange={(event) => updateRow(row.id, { selected: event.target.checked })}
              />
              <span><strong>{row.name}</strong><small>{row.optional ? "선택 재료" : "필수 재료"}</small></span>
            </label>
            <div className="consumption-amount">
              {row.status === "ready" ? <>
                <div className="quantity-metric"><span>현재</span><strong>{row.availableQuantity}<em>{row.availableUnit}</em></strong></div>
                <div className="quantity-arrow" aria-hidden="true">−</div>
                <label className="usage-input"><span>사용</span><div><input aria-label={`${row.name} 사용량`} type="number" min="0.001" max={row.availableQuantity} step="any" inputMode="decimal" value={row.amount} disabled={!row.selected || isSubmitting} onChange={(event) => updateRow(row.id, { amount: event.target.value })} /><em>{row.unit}</em></div></label>
                <div className="quantity-arrow" aria-hidden="true">=</div>
                <div className="quantity-metric remaining"><span>남음</span><strong>{Math.max(0, row.availableQuantity - Number(row.amount || 0))}<em>{row.availableUnit}</em></strong><span className="sr-only">남음 {Math.max(0, row.availableQuantity - Number(row.amount || 0))}{row.availableUnit}</span></div>
              </> : <>
                <span className="consumption-status">{statusMessages[row.status]}</span>
                {row.status === "missing" && <a href={createShoppingSearchUrl(row.name)} target="_blank" rel="noreferrer">{row.name} 구매하기 ↗</a>}
              </>}
            </div>
          </div>)}
        </div>
        {error && <p className="consumption-error" role="alert">{error}</p>}
      </div>
      <div className="modal-actions consumption-actions">
        <button className="ghost-action" type="button" onClick={onClose} disabled={isSubmitting}>취소</button>
        <button type="button" onClick={() => onConfirm(requestItems)} disabled={isSubmitting || requestItems.length === 0 || hasInvalidSelection}>{isSubmitting ? "냉장고 반영 중..." : `${requestItems.length}개 재료 차감하기`}</button>
      </div>
    </section>
  </div>;
}
