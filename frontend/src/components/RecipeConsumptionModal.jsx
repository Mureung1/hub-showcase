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
  const hasInvalidSelection = rows.some((row) => row.selected && (
    !Number.isFinite(Number(row.amount))
    || Number(row.amount) <= 0
    || Number(row.amount) > row.availableQuantity
  ));

  const updateRow = (id, values) => {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...values } : row));
  };

  return <div className="modal-backdrop consumption-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !isSubmitting) onClose(); }}>
    <section className="consumption-modal" role="dialog" aria-modal="true" aria-labelledby="consumption-title">
      <div className="consumption-heading">
        <div><p className="eyebrow">Ingredient usage</p><h2 id="consumption-title">사용한 재료를 차감할까요?</h2></div>
        <button className="modal-close" type="button" aria-label="재료 차감 닫기" onClick={onClose} disabled={isSubmitting}>×</button>
      </div>
      <p className="consumption-description">{recipe.name} 1인분 기준 사용량이에요. 실제 사용량에 맞게 수정할 수 있습니다.</p>
      <div className="consumption-list">
        {rows.map((row) => <div className={`consumption-row ${row.status}`} key={row.id}>
          <label>
            <input
              type="checkbox"
              checked={row.selected}
              disabled={row.status !== "ready" || isSubmitting}
              onChange={(event) => updateRow(row.id, { selected: event.target.checked })}
            />
            <span><strong>{row.name}</strong>{row.optional && <small>선택 재료</small>}</span>
          </label>
          <div className="consumption-amount">
            {row.status === "ready" ? <>
              <span>보유 {row.availableQuantity}{row.availableUnit}</span>
              <label><span>사용</span><input type="number" min="0.001" max={row.availableQuantity} step="any" inputMode="decimal" value={row.amount} disabled={!row.selected || isSubmitting} onChange={(event) => updateRow(row.id, { amount: event.target.value })} /><em>{row.unit}</em></label>
              <strong>남음 {Math.max(0, row.availableQuantity - Number(row.amount || 0))}{row.availableUnit}</strong>
            </> : <>
              <span>{statusMessages[row.status]}</span>
              {row.status === "missing" && <a href={createShoppingSearchUrl(row.name)} target="_blank" rel="noreferrer">{row.name} 구매하기 ↗</a>}
            </>}
          </div>
        </div>)}
      </div>
      {error && <p className="consumption-error" role="alert">{error}</p>}
      <div className="modal-actions">
        <button className="ghost-action" type="button" onClick={onClose} disabled={isSubmitting}>취소</button>
        <button type="button" onClick={() => onConfirm(requestItems)} disabled={isSubmitting || requestItems.length === 0 || hasInvalidSelection}>{isSubmitting ? "차감 중..." : `${requestItems.length}개 재료 차감하기`}</button>
      </div>
    </section>
  </div>;
}
