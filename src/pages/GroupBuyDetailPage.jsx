import { useEffect, useState } from "react";
import LocationPicker from "../components/LocationPicker";
import PickupVoteMap from "../components/PickupVoteMap";
import ProductImage from "../components/ProductImage";
import { advanceStage, cancelGroupBuyParticipation, finalizePickup, getGroupBuy, joinGroupBuy, votePickup } from "../services/groupBuysApi";
import { calculateSettlement } from "../services/settlement";

const stages = ["모집 중", "결제 대기", "주문 완료", "배송 중", "수령 가능", "정산 완료"];
function GroupBuyDetailPage({ groupBuyId, onNavigate, user }) {
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [joinLocation, setJoinLocation] = useState({ address: "", latitude: null, longitude: null });
  const [message, setMessage] = useState("");
  const [isCancelling, setIsCancelling] = useState(false);
  useEffect(() => { getGroupBuy(groupBuyId).then(setItem).catch(() => setMessage("공동구매를 불러오지 못했어요.")); }, [groupBuyId]);
  if (!item) return <main className="workspace"><div className="detail-loading">{message || "공동구매 정보를 불러오는 중…"}</div></main>;
  const percent = Math.min(100, Math.round(item.currentPeople / item.targetPeople * 100));
  const canVote = item.userJoined && item.status === "closed" && !item.finalPickup;

  async function participate() {
    if (!user) { onNavigate("/login"); return; }
    try {
      const next = await joinGroupBuy(item.id, {
        latitude: joinLocation.latitude,
        longitude: joinLocation.longitude,
        quantity,
        startLocation: joinLocation.address,
      });
      setItem(next);
      localStorage.setItem("campus-cart-joined", JSON.stringify([...new Set([...JSON.parse(localStorage.getItem("campus-cart-joined") ?? "[]"), item.id])]));
      setMessage("참여가 완료됐어요. 모집이 달성되면 장소 투표가 열립니다.");
    } catch (error) { setMessage(error.message); }
  }
  async function cancelParticipation() {
    if (!window.confirm("이 공동구매 참여를 취소할까요?")) return;
    setIsCancelling(true);
    try {
      const next = await cancelGroupBuyParticipation(item.id);
      setItem(next);
      const joinedIds = JSON.parse(localStorage.getItem("campus-cart-joined") ?? "[]");
      localStorage.setItem("campus-cart-joined", JSON.stringify(joinedIds.filter((id) => id !== item.id)));
      setMessage("공동구매 참여를 취소했어요.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsCancelling(false);
    }
  }
  async function vote(candidate) { try { setItem(await votePickup(item.id, candidate)); setMessage(`${candidate}에 투표했어요.`); } catch (error) { setMessage(error.message); } }
  async function nextStage() { try { setItem(await advanceStage(item.id)); setMessage("진행 단계가 변경됐어요."); } catch (error) { setMessage(error.message); } }
  async function confirmPickup() { try { setItem(await finalizePickup(item.id)); setMessage("최다 득표 장소를 최종 수령지로 확정했어요."); } catch (error) { setMessage(error.message); } }

  return <main className="workspace detail-page">
    <button className="back-button" type="button" onClick={() => onNavigate("/group-buys")}>← 공동구매 목록</button>
    <section className="detail-hero">
      <ProductImage category={item.category} className="product-visual" imageUrl={item.imageUrl} name={item.name} />
      <div className="detail-copy"><div className="detail-meta"><span className="state-chip">{item.status === "open" ? "모집 중" : "모집 완료"}</span><span>{item.hostName} 개설</span></div><h1>{item.name}</h1><p>{item.deadline} 마감 · {item.pickupLocation}</p><div className="price-line"><strong>{item.unitPrice.toLocaleString()}원</strong><span>1개 예상 가격</span></div><div className="detail-progress"><div><strong>{item.currentPeople}명 참여</strong><span>목표 {item.targetPeople}명</span></div><div className="progress-line"><span style={{ width: `${percent}%` }} /></div><small>{item.status === "closed" ? "목표 달성 · 수령 장소 투표가 열렸어요" : `${percent}% 달성 · ${item.targetPeople - item.currentPeople}명 더 모이면 완료`}</small></div></div>
    </section>
    {message && <div className="detail-toast">{message}</div>}
    <section className="stage-section"><div className="detail-section-title"><div><span className="kicker">PROGRESS</span><h2>공동구매 진행 단계</h2></div>{item.isOwner && item.finalPickup && item.stage !== stages.at(-1) && <button type="button" onClick={nextStage}>다음 단계로 변경</button>}</div><div className="stage-track">{stages.map((stage, index) => <div className={index <= stages.indexOf(item.stage) ? "done" : ""} key={stage}><i>{index < stages.indexOf(item.stage) ? "✓" : index + 1}</i><span>{stage}</span></div>)}</div></section>
    <div className="detail-grid">
      <section className="participate-panel"><div className="detail-section-title"><div><span className="kicker">JOIN</span><h2>참여 수량과 금액</h2></div></div>
        {item.isOwner ? <div className="owner-notice"><strong>내가 개설한 공동구매예요</strong><p>참여 현황을 확인하고 모집 진행 단계를 관리할 수 있어요.</p></div> : item.userJoined ? <><div className="owner-notice"><strong>참여가 완료됐어요</strong><p>신청한 수량과 예상 정산 금액을 아래에서 확인할 수 있어요.</p>{!item.finalPickup && item.stage === "모집 중" && <button className="danger" disabled={isCancelling} type="button" onClick={cancelParticipation}>{isCancelling ? "취소 처리 중..." : "참여 취소"}</button>}</div><SettlementSummary item={item} quantity={item.userQuantity || 1} joined /></> : <><label>참여 수량<div className="quantity-stepper"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><strong>{quantity}</strong><button type="button" onClick={() => setQuantity(Math.min(10, quantity + 1))}>＋</button></div></label><LocationPicker address={joinLocation.address} inputId="join-start-location" label="내 출발 위치의 상세주소" latitude={joinLocation.latitude} longitude={joinLocation.longitude} onChange={setJoinLocation} /><SettlementSummary item={item} quantity={quantity} /><button className="primary-button" disabled={joinLocation.address.trim().length < 2 || joinLocation.address.trim().length > 80} type="button" onClick={participate}>이 조건으로 참여하기</button></>}
      </section>
      <section className="vote-panel"><div className="detail-section-title"><div><span className="kicker">PICKUP VOTE</span><h2>공동 수령지 투표</h2></div></div><p className="section-copy">참여자의 출발 위치를 비교해 모두가 만나기 편한 후보를 보여줍니다.</p><PickupVoteMap candidates={item.pickupCandidateDetails ?? []} disabled={!canVote} selectedName={item.userVote} onVote={vote} /><div className="vote-list">{item.pickupCandidates.map((candidate, index) => { const count = item.votes[candidate] || 0; const selected = item.userVote === candidate; const hasMapPin = (item.pickupCandidateDetails ?? []).some((detail) => detail.name === candidate && detail.latitude !== null); return <button className={selected ? "selected" : ""} disabled={!canVote} type="button" key={candidate} onClick={() => vote(candidate)}><span><i>{hasMapPin ? index + 1 : ""}</i>{candidate}{selected ? " · 내 선택" : ""}</span><strong>{count}표</strong></button>; })}</div>{!item.userJoined && <p className="vote-lock">공동구매에 참여하면 투표 권한이 생겨요.</p>}{item.userJoined && item.status !== "closed" && <p className="vote-lock">목표 인원이 모이면 투표가 열려요.</p>}{item.finalPickup && <div className="pickup-confirmed"><span>최종 수령 장소</span><strong>{item.finalPickup}</strong></div>}{item.isOwner && item.status === "closed" && !item.finalPickup && <button className="primary-button finalize-button" type="button" onClick={confirmPickup}>최다 득표 장소로 확정</button>}<div className="participant-preview"><strong>참여자 위치</strong>{item.participants.slice(-4).map((person, index) => <p key={`${person.nickname}-${person.startLocation}-${index}`}><span>{person.nickname}</span><b>{person.quantity}개 · {person.startLocation}</b></p>)}</div></section>
    </div>
  </main>;
}

function SettlementSummary({ item, quantity, joined = false }) {
  const settlement = calculateSettlement({ ...item, quantity });
  return <div className={`payment-summary${joined ? " joined" : ""}`}><span>신청 수량</span><strong>{quantity}개</strong><span>상품 금액</span><strong>{settlement.productAmount.toLocaleString()}원</strong><span>예상 배송비 분담</span><strong>{settlement.shippingShare.toLocaleString()}원</strong><b>{joined ? "내 예상 정산 금액" : "결제 예정 금액"}</b><em>{settlement.totalAmount.toLocaleString()}원</em>{joined && <small>목표 인원이 모두 모였을 때를 기준으로 계산한 예상 금액이에요.</small>}</div>;
}

export default GroupBuyDetailPage;
