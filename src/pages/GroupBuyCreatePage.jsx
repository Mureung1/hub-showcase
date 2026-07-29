import { useState } from "react";
import GroupBuyEditor from "../components/GroupBuyEditor";
import { createGroupBuy } from "../services/groupBuysApi";

function GroupBuyCreatePage({ onNavigate, user }) {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const initialName = sessionStorage.getItem("campus-cart-draft-name") ?? "";

  async function save(input) {
    if (!user) {
      onNavigate("/login");
      return;
    }
    setIsSaving(true);
    setError("");
    try {
      const created = await createGroupBuy(input);
      sessionStorage.removeItem("campus-cart-draft-name");
      onNavigate(`/group-buys/${created.id}`);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="workspace create-page">
      <button className="back-button" type="button" onClick={() => onNavigate("/group-buys")}>← 공동구매 목록으로 돌아가기</button>
      <section className="create-heading">
        <div><span className="kicker">NEW GROUP BUY</span><h1>사고 싶은 상품을<br />함께 구매해 볼까요?</h1></div>
        <p>상품 링크를 넣으면 기본 정보를 먼저 채워드려요.<br />무료배송에 필요한 인원도 계산해 볼 수 있습니다.</p>
      </section>
      {error && <div className="error-banner"><span>{error}</span></div>}
      <div className="create-form-wrap">
        <GroupBuyEditor initialName={initialName} isSaving={isSaving} onCancel={() => onNavigate("/group-buys")} onSave={save} />
      </div>
    </main>
  );
}

export default GroupBuyCreatePage;
