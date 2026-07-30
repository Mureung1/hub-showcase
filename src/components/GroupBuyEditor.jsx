import { useMemo, useRef, useState } from "react";
import { previewProduct } from "../services/groupBuysApi";
import { calculateFreeShippingTarget } from "../services/freeShippingTarget";
import LocationPicker from "./LocationPicker";
import ProductImage from "./ProductImage";

const initialForm = {
  name: "",
  category: "생활",
  targetPeople: 6,
  deadline: "내일 오후 6시",
  pickupLocation: "",
  pickupLatitude: null,
  pickupLongitude: null,
  unitPrice: 5000,
  shippingFee: 0,
  productUrl: "",
  imageUrl: "",
  freeShippingThreshold: "",
  perPersonQuantity: 1,
};

const supportedImageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

function prepareImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !supportedImageTypes.has(file.type)) {
      reject(new Error("JPG, PNG, WebP 이미지만 올릴 수 있어요."));
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      reject(new Error("이미지는 8MB 이하로 선택해 주세요."));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 900 / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(objectUrl);
      const result = canvas.toDataURL("image/webp", 0.76);
      if (result.length > 700_000) {
        reject(new Error("이미지를 더 작은 크기로 선택해 주세요."));
        return;
      }
      resolve(result);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("이미지 파일을 읽지 못했어요."));
    };
    image.src = objectUrl;
  });
}

function GroupBuyEditor({ editingItem, initialName = "", isSaving, onCancel, onSave }) {
  const imageInputRef = useRef(null);
  const [form, setForm] = useState(() => {
    const values = { ...initialForm, name: initialName, ...editingItem };
    return {
      ...values,
      productUrl: values.productUrl ?? "",
      imageUrl: values.imageUrl ?? "",
      freeShippingThreshold: values.freeShippingThreshold ?? "",
      perPersonQuantity: values.perPersonQuantity ?? 1,
      pickupLatitude: values.pickupLatitude ?? null,
      pickupLongitude: values.pickupLongitude ?? null,
    };
  });
  const [previewState, setPreviewState] = useState({ status: "idle", message: "" });
  const suggestedTarget = useMemo(() => calculateFreeShippingTarget({
    unitPrice: Number(form.unitPrice),
    perPersonQuantity: Number(form.perPersonQuantity),
    freeShippingThreshold: Number(form.freeShippingThreshold),
  }), [form.freeShippingThreshold, form.perPersonQuantity, form.unitPrice]);
  const pickupAddressLength = form.pickupLocation.trim().length;

  function change(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function selectImage(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    try {
      const imageUrl = await prepareImage(file);
      setForm((current) => ({ ...current, imageUrl }));
      setPreviewState({ status: "success", message: "선택한 이미지를 상품 사진으로 넣었어요." });
    } catch (error) {
      setPreviewState({ status: "error", message: error.message });
    }
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
      setPreviewState({ status: "success", message: product.warnings?.[0] || "불러온 내용은 자유롭게 수정할 수 있어요." });
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
      pickupLatitude: form.pickupLatitude,
      pickupLongitude: form.pickupLongitude,
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
          <div className="image-picker">
            <ProductImage category={form.category} className="editor-product-image" imageUrl={form.imageUrl} name={form.name || "상품"} />
            <button aria-label={form.imageUrl ? "상품 이미지 변경" : "상품 이미지 추가"} className="image-add-button" type="button" onClick={() => imageInputRef.current?.click()}>
              <b>+</b><span>{form.imageUrl ? "이미지 변경" : "이미지 추가"}</span>
            </button>
            <input ref={imageInputRef} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectImage} />
          </div>
          <div className="product-fields">
            <label>상품명<input name="name" required maxLength="80" placeholder="예: 단백질 쉐이크" value={form.name} onChange={change} /></label>
            <label>또는 이미지 주소<input name="imageUrl" type="text" placeholder="이미지 링크를 직접 넣어도 돼요" value={form.imageUrl.startsWith("data:") ? "" : form.imageUrl} onChange={change} /></label>
          </div>
        </div>

        <div className="field-row">
          <label>카테고리<select name="category" value={form.category} onChange={change}>{["생활", "식품", "간식", "문구", "기타"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>상품 단가<input name="unitPrice" type="number" min="100" required value={form.unitPrice} onChange={change} /></label>
        </div>
        <div className="field-row">
          <label>무료배송 기준<input name="freeShippingThreshold" type="number" min="0" placeholder="예: 50000" value={form.freeShippingThreshold ?? ""} onChange={change} /></label>
          <label>총 배송비<input name="shippingFee" type="number" min="0" required value={form.shippingFee} onChange={change} /></label>
        </div>

        {suggestedTarget && (
          <div className="shipping-suggestion">
            <div><span>무료배송 맞춤 추천</span><strong>최소 {suggestedTarget}명이 모이면 무료배송 금액을 넘어요.</strong><small>{Number(form.unitPrice).toLocaleString()}원 × {suggestedTarget}명</small></div>
            <button type="button" onClick={() => setForm((current) => ({ ...current, targetPeople: suggestedTarget, shippingFee: 0 }))}>{suggestedTarget}명으로 적용</button>
          </div>
        )}

        <div className="field-row">
          <label>목표 인원<input name="targetPeople" type="number" min="2" max="50" required value={form.targetPeople} onChange={change} /></label>
          <label>마감 시간<input name="deadline" required value={form.deadline} onChange={change} /></label>
        </div>
        <LocationPicker
          address={form.pickupLocation}
          inputId="group-buy-pickup-location"
          label="첫 출발 위치의 상세주소"
          latitude={form.pickupLatitude}
          longitude={form.pickupLongitude}
          onChange={(location) => setForm((current) => ({
            ...current,
            pickupLocation: location.address,
            pickupLatitude: location.latitude,
            pickupLongitude: location.longitude,
          }))}
        />
        <button className="primary-button" type="submit" disabled={isSaving || pickupAddressLength < 2 || pickupAddressLength > 80}>{isSaving ? "저장하는 중..." : editingItem ? "변경사항 저장" : "공동구매 만들기"}</button>
        <p className="form-note">참여자들의 출발 위치가 모이면 모두에게 편한 수령 장소 후보를 정할 수 있어요.</p>
      </form>
    </aside>
  );
}

export default GroupBuyEditor;
