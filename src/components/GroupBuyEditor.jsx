import { useMemo, useState } from "react";
import { previewProduct } from "../services/groupBuysApi";
import { calculateFreeShippingTarget } from "../services/freeShippingTarget";
import ProductImage from "./ProductImage";

const initialForm = {
  name: "",
  category: "생활",
  targetPeople: 6,
  deadline: "내일 오후 6시",
  pickupLocation: "",
  unitPrice: 5000,
  shippingFee: 0,
  productUrl: "",
  imageUrl: "",
  freeShippingThreshold: "",
  perPersonQuantity: 1,
};

function GroupBuyEditor({ editingItem, initialName = "", isSaving, onCancel, onSave }) {
  const [form, setForm] = useState(() => {
    const values = { ...initialForm, name: initialName, ...editingItem };
    return {
      ...values,
      productUrl: values.productUrl ?? "",
      imageUrl: values.imageUrl ?? "",
      freeShippingThreshold: values.freeShippingThreshold ?? "",
      perPersonQuantity: values.perPersonQuantity ?? 1,
    };
  });
  const [previewState, setPreviewState] = useState({ status: "idle", message: "" });
  const suggestedTarget = useMemo(() => calculateFreeShippingTarget({
    unitPrice: Number(form.unitPrice),
    perPersonQuantity: Number(form.perPersonQuantity),
    freeShippingThreshold: Number(form.freeShippingThreshold),
  }), [form.freeShippingThreshold, form.perPersonQuantity, form.unitPrice]);

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function loadProduct() {
    if (!form.productUrl.trim()) {
      setPreviewState({ status: "error", message: "상품 링크를 먼저 입력해 주세요." });
      return;
    }
    setPreviewState({ status: "loading", message: "상품 정보를 확인하고 있어요." });
    try {
      const product = await previewProduct(form.productUrl.trim());
      setForm((current) => ({
        ...current,
        productUrl: product.sourceUrl || current.productUrl,
        name: product.title || current.name,
        imageUrl: product.imageUrl || current.imageUrl,
        unitPrice: product.unitPrice || current.unitPrice,
      }));
      setPreviewState({ status: "success", message: "불러온 내용은 자유롭게 수정할 수 있어요." });
    } catch (error) {
      setPreviewState({ status: "error", message: `${error.message} 직접 입력해서 계속 작성할 수 있어요.` });
    }
  }

  function submit(event) {
    event.preventDefault();
    onSave({
      ...form,
      name: form.name.trim(),
      productUrl: String(form.productUrl ?? "").trim() || null,
      imageUrl: String(form.imageUrl ?? "").trim() || null,
      targetPeople: Number(form.targetPeople),
      unitPrice: Number(form.unitPrice),
      shippingFee: Number(form.shippingFee),
      freeShippingThreshold: form.freeShippingThreshold === "" ? null : Number(form.freeShippingThreshold),
      perPersonQuantity: Number(form.perPersonQuantity),
    });
  }

  return (
    <aside className="editor-panel link-editor">
      <div className="panel-heading">
        <div><span className="kicker">{editingItem ? "EDIT" : "NEW"}</span><h2>{editingItem ? "공동구매 수정" : "새 공동구매"}</h2></div>
        <button aria-label="작성 취소" className="icon-button" type="button" onClick={onCancel}>×</button>
      </div>
      <form className="editor-form" onSubmit={submit}>
        <section className="link-import">
          <div>
            <strong>상품 링크로 빠르게 작성하기</strong>
            <p>링크를 붙여 넣으면 상품명, 이미지, 가격을 가능한 만큼 채워드려요.</p>
          </div>
          <div className="link-input-row">
            <input aria-label="상품 링크" name="productUrl" placeholder="https://..." type="url" value={form.productUrl} onChange={change} />
            <button type="button" disabled={previewState.status === "loading"} onClick={loadProduct}>
              {previewState.status === "loading" ? "불러오는 중" : "상품 정보 불러오기"}
            </button>
          </div>
          {previewState.message && <p className={`preview-message ${previewState.status}`}>{previewState.message}</p>}
        </section>

        <div className="product-form-grid">
          <ProductImage category={form.category} className="editor-product-image" imageUrl={form.imageUrl} name={form.name || "상품"} />
          <div className="product-fields">
            <label>상품명<input name="name" required maxLength="80" placeholder="예: 단백질 쉐이크" value={form.name} onChange={change} /></label>
            <label>대표 이미지 주소<input name="imageUrl" type="url" placeholder="자동 입력되거나 직접 넣을 수 있어요" value={form.imageUrl} onChange={change} /></label>
          </div>
        </div>

        <div className="field-row">
          <label>카테고리<select name="category" value={form.category} onChange={change}>{["생활", "식품", "간식", "문구", "기타"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>상품 단가<input name="unitPrice" type="number" min="100" required value={form.unitPrice} onChange={change} /></label>
        </div>
        <div className="field-row three">
          <label>1인당 수량<input name="perPersonQuantity" type="number" min="1" max="100" required value={form.perPersonQuantity} onChange={change} /></label>
          <label>무료배송 기준<input name="freeShippingThreshold" type="number" min="0" placeholder="예: 50000" value={form.freeShippingThreshold ?? ""} onChange={change} /></label>
          <label>총 배송비<input name="shippingFee" type="number" min="0" required value={form.shippingFee} onChange={change} /></label>
        </div>

        {suggestedTarget && (
          <div className="shipping-suggestion">
            <div><span>무료배송 맞춤 추천</span><strong>최소 {suggestedTarget}명이 모이면 무료배송 금액을 넘어요.</strong><small>{Number(form.unitPrice).toLocaleString()}원 × {form.perPersonQuantity}개 × {suggestedTarget}명</small></div>
            <button type="button" onClick={() => setForm((current) => ({ ...current, targetPeople: suggestedTarget, shippingFee: 0 }))}>{suggestedTarget}명으로 적용</button>
          </div>
        )}

        <div className="field-row">
          <label>목표 인원<input name="targetPeople" type="number" min="2" max="50" required value={form.targetPeople} onChange={change} /></label>
          <label>마감 시간<input name="deadline" required value={form.deadline} onChange={change} /></label>
        </div>
        <label>첫 출발 위치<input name="pickupLocation" required maxLength="80" placeholder="예: 우리 학교 북문" value={form.pickupLocation} onChange={change} /></label>
        <button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? "저장하는 중..." : editingItem ? "변경사항 저장" : "공동구매 만들기"}</button>
        <p className="form-note">참여자들의 출발 위치가 모이면 모두에게 편한 수령 장소 후보를 정할 수 있어요.</p>
      </form>
    </aside>
  );
}

export default GroupBuyEditor;
