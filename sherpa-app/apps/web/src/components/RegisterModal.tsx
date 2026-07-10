import { useState } from "react";
import { CATEGORIES } from "../categories";
import type { ScanLine } from "../session/types";

interface RegisterModalProps {
  line: ScanLine; // 편집 대상 pending 행
  onSave: (name: string, category: string) => void;
  onClose: () => void;
}

// pending 행을 편집하는 창(에디터, 저장소 아님). Product 마스터 필드만 받는다 —
// 이름·카테고리·바코드. 유통기한/Lot 수량은 여기서 받지 않음(별도 리뷰 단계, 범위 밖).
//
// 이름 필드는 autofocus 하지 않는다: 모달이 열려도 document 스캔 리스너가 계속 도는
// non-blocking 구조에서, 포커스된 입력이 없어야 스캐너 버스트 첫 글자가 이름 필드로
// 새지 않는다(2번째 글자부터는 useScanner가 capture-preventDefault로 이미 차단).
export function RegisterModal({ line, onSave, onClose }: RegisterModalProps) {
  const [name, setName] = useState(line.productName);
  const [category, setCategory] = useState(line.category || CATEGORIES[0]);
  const canSave = name.trim() !== "";

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="상품 등록"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="modal__title">상품 등록</h2>

        <label className="field">
          <span className="field__label">바코드</span>
          <input
            className="field__input field__input--mono"
            value={line.barcode}
            readOnly
          />
        </label>

        <label className="field">
          <span className="field__label">상품명</span>
          <input
            className="field__input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="상품명을 입력하세요"
          />
        </label>

        <label className="field">
          <span className="field__label">카테고리</span>
          <select
            className="field__input"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        <div className="modal__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            취소
          </button>
          <button
            type="button"
            className="btn btn--cta"
            disabled={!canSave}
            onClick={() => onSave(name.trim(), category)}
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
