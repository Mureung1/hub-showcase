import { useEffect, useMemo, useState } from "react";
import { advanceStage, finalizePickup, getGroupBuy, joinGroupBuy, votePickup } from "../services/groupBuysApi";

const stages = ["모집 중", "결제 대기", "주문 완료", "배송 중", "수령 가능", "정산 완료"];
const origins = ["생활관 1동", "생활관 3동", "공학관", "인문관", "경영관", "중앙도서관", "학생회관", "정문"];

function GroupBuyDetailPage({ groupBuyId, onNavigate, user }) {
  const [item, setItem] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [startLocation, setStartLocation] = useState(origins[0]);
  const [message, setMessage] = useState("");
  useEffect(() => { getGroupBuy(groupBuyId).then(setItem).catch(() => setMessage("공동구매를 불러오지 못했어요.")); }, [groupBuyId]);
  const total = useMemo(() => item ? item.unitPrice * quantity + Math.ceil(item.shippingFee / Math.max(item.targetPeople, item.currentPeople)) : 0, [item, quantity]);
  if (!item) return <main className="workspace"><div className="detail-loading">{message || "공동구매 정보를 불러오는 중…"}</div></main>;
  const percent = Math.min(100, Math.round(item.currentPeople / item.targetPeople * 100));
  const canVote = item.userJoined && item.status === "closed" && !item.finalPickup;

  async function participate() {
    if (!user) { onNavigate("/login"); return; }
    try {
      const next = await joinGroupBuy(item.id, { quantity, startLocation });
      setItem(next);
      localStorage.setItem("campus-cart-joined", JSON.stringify([...new Set([...JSON.parse(localStorage.getItem("campus-cart-joined") ?? "[]"), item.id])]));
      setMessage("참여가 완료됐어요. 모집이 달성되면 장소 투표가 열립니다.");
    } catch (error) { setMessage(error.message); }
  }
  async function vote(candidate) { try { setItem(await votePickup(item.id, candidate)); setMessage(`${candidate}에 투표했어요.`); } catch (error) { setMessage(error.message); } }
  async function nextStage() { try { setItem(await advanceStage(item.id)); setMessage("진행 단계가 변경됐어요."); } catch (error) { setMessage(error.message); } }
  async function confirmPickup() { try { setItem(await finalizePickup(item.id)); setMessage("최다 득표 장소를 최종 수령지로 확정했어요."); } catch (error) { setMessage(error.message); } }

  return <main className="workspace detail-page">
    <button className="back-button" type="button" onClick={() => onNavigate("/group-buys")}>← 공동구매 목록</button>
    <section className="detail-hero">
      <div className="product-visual"><span>{item.category}</span><strong>{item.name.slice(0, 1)}</strong><small>CAMPUS CART</small></div>
      <div className="detail-copy"><div className="detail-meta"><span className="state-chip">{item.status === "open" ? "모집 중" : "모집 완료"}</span><span>{item.hostName} 개설</span></div><h1>{item.name}</h1><p>{item.deadline} 마감 · {item.pickupLocation}</p><div className="price-line"><strong>{item.unitPrice.toLocaleString()}원</strong><span>1개 예상 가격</span></div><div className="detail-progress"><div><strong>{item.currentPeople}명 참여</strong><span>목표 {item.targetPeople}명</span></div><div className="progress-line"><span style={{ width: `${percent}%` }} /></div><small>{item.status === "closed" ? "목표 달성 · 수령 장소 투표가 열렸어요" : `${percent}% 달성 · ${item.targetPeople - item.currentPeople}명 더 모이면 완료`}</small></div></div>
    </section>
    {message && <div className="detail-toast">{message}</div>}
    <section className="stage-section"><div className="detail-section-title"><div><span className="kicker">PROGRESS</span><h2>공동구매 진행 단계</h2></div>{item.isOwner && item.finalPickup && item.stage !== stages.at(-1) && <button type="button" onClick={nextStage}>다음 단계로 변경</button>}</div><div className="stage-track">{stages.map((stage, index) => <div className={index <= stages.indexOf(item.stage) ? "done" : ""} key={stage}><i>{index < stages.indexOf(item.stage) ? "✓" : index + 1}</i><span>{stage}</span></div>)}</div></section>
    <div className="detail-grid">
      <section className="participate-panel"><div className="detail-section-title"><div><span className="kicker">JOIN</span><h2>참여 수량과 금액</h2></div></div>
        {item.isOwner ? <div className="owner-notice"><strong>내가 개설한 공동구매예요</strong><p>참여 현황을 확인하고 모집 진행 단계를 관리할 수 있어요.</p></div> : item.userJoined ? <div className="owner-notice"><strong>참여가 완료됐어요</strong><p>한 사람당 한 번만 참여할 수 있습니다. 오른쪽에서 장소 투표 상태를 확인하세요.</p></div> : <><label>참여 수량<div className="quantity-stepper"><button type="button" onClick={() => setQuantity(Math.max(1, quantity - 1))}>−</button><strong>{quantity}</strong><button type="button" onClick={() => setQuantity(Math.min(10, quantity + 1))}>＋</button></div></label><label>내 출발 위치<select value={startLocation} onChange={(event) => setStartLocation(event.target.value)}>{origins.map((place) => <option key={place}>{place}</option>)}</select></label><div className="payment-summary"><span>상품 금액</span><strong>{(item.unitPrice * quantity).toLocaleString()}원</strong><span>예상 배송비 분담</span><strong>{Math.ceil(item.shippingFee / Math.max(item.targetPeople, item.currentPeople)).toLocaleString()}원</strong><b>결제 예정 금액</b><em>{total.toLocaleString()}원</em></div><button className="primary-button" type="button" onClick={participate}>이 조건으로 참여하기</button></>}
      </section>
      <section className="vote-panel"><div className="detail-section-title"><div><span className="kicker">PICKUP VOTE</span><h2>공동 수령지 투표</h2></div><button type="button" onClick={() => onNavigate("/pickup")}>계산 방식 보기</button></div><p className="section-copy">참여자 출발 위치의 평균 이동 거리가 짧은 후보예요. 모집 완료 후 참여자만 한 표를 행사할 수 있습니다.</p><div className="vote-list">{item.pickupCandidates.map((candidate) => { const count = item.votes[candidate] || 0; const selected = item.userVote === candidate; return <button className={selected ? "selected" : ""} disabled={!canVote} type="button" key={candidate} onClick={() => vote(candidate)}><span><i />{candidate}{selected ? " · 내 선택" : ""}</span><strong>{count}표</strong></button>; })}</div>{!item.userJoined && <p className="vote-lock">공동구매에 참여하면 투표 권한이 생겨요.</p>}{item.userJoined && item.status !== "closed" && <p className="vote-lock">목표 인원이 모이면 투표가 열려요.</p>}{item.finalPickup && <div className="pickup-confirmed"><span>최종 수령 장소</span><strong>{item.finalPickup}</strong></div>}{item.isOwner && item.status === "closed" && !item.finalPickup && <button className="primary-button finalize-button" type="button" onClick={confirmPickup}>최다 득표 장소로 확정</button>}<div className="participant-preview"><strong>참여자 위치</strong>{item.participants.slice(-4).map((person) => <p key={person.id}><span>{person.nickname}</span><b>{person.quantity}개 · {person.startLocation}</b></p>)}</div></section>
    </div>
  </main>;
}

export default GroupBuyDetailPage;
