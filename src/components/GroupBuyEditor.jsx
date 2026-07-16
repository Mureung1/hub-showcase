const initialForm = { name: "", category: "생활", targetPeople: 6, deadline: "내일 오후 6시", pickupLocation: "장소 투표 예정", unitPrice: 5000, shippingFee: 3000 };

function GroupBuyEditor({ editingItem, formVersion, isSaving, onCancel, onSave, suggestedPickup }) {
  const values = editingItem ?? { ...initialForm, pickupLocation: suggestedPickup || initialForm.pickupLocation };

  function submit(event) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    onSave({
      name: data.get("name"),
      category: data.get("category"),
      targetPeople: Number(data.get("targetPeople")),
      deadline: data.get("deadline"),
      pickupLocation: data.get("pickupLocation"),
      unitPrice: Number(data.get("unitPrice")),
      shippingFee: Number(data.get("shippingFee")),
    });
  }

  return (
    <aside className="editor-panel">
      <div className="panel-heading">
        <div><span className="kicker">{editingItem ? "EDIT" : "NEW"}</span><h2>{editingItem ? "공동구매 수정" : "새 공동구매"}</h2></div>
        {editingItem && <button className="icon-button" type="button" onClick={onCancel}>×</button>}
      </div>
      <form className="editor-form" key={`${editingItem?.id ?? suggestedPickup ?? "new"}-${formVersion}`} onSubmit={submit}>
        <label>상품명<input name="name" defaultValue={values.name} placeholder="예: 생수 2L 12병" required maxLength="80" /></label>
        <div className="field-row">
          <label>카테고리<select name="category" defaultValue={values.category}>{["생활", "식품", "간식", "문구", "기타"].map((item) => <option key={item}>{item}</option>)}</select></label>
          <label>목표 인원<input name="targetPeople" type="number" min="2" max="50" defaultValue={values.targetPeople} required /></label>
        </div>
        <label>마감 시간<input name="deadline" defaultValue={values.deadline} required /></label>
        <label>수령 장소<input name="pickupLocation" defaultValue={values.pickupLocation} required /></label>
        <div className="field-row">
          <label>상품 단가<input name="unitPrice" type="number" min="100" defaultValue={values.unitPrice} required /></label>
          <label>총 배송비<input name="shippingFee" type="number" min="0" defaultValue={values.shippingFee} required /></label>
        </div>
        <button className="primary-button" type="submit" disabled={isSaving}>{isSaving ? "저장하는 중…" : editingItem ? "변경사항 저장" : "공동구매 만들기"}</button>
        <p className="form-note">등록한 공동구매는 바로 목록에서 확인할 수 있어요.</p>
      </form>
    </aside>
  );
}

export default GroupBuyEditor;
