import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { redeemTicket } from "../lib/api";
import Ticket from "../components/Ticket";
import "./TicketRedeemPage.css";

/**
 * ⑨ 식사권 사용확인 — 사장님 PIN 확인 방식
 *  학생이 지갑에서 "사용하기" → 이 화면 진입 → 학생이 사장님께 화면을 보여줌
 *  → 사장님이 눈앞에서 PIN 6자리 입력 → server가 대조 후 1장 차감
 */
export default function TicketRedeemPage() {
  const { ticketId } = useParams();
  const navigate = useNavigate();

  const [ticket, setTicket] = useState(null);
  const [remaining, setRemaining] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const [pin, setPin] = useState("");

  async function load() {
    setLoading(true);
    const { data: t } = await supabase
      .from("tickets")
      .select("*")
      .eq("id", ticketId)
      .single();

    if (!t) {
      setError("식사권을 찾을 수 없어요.");
      setLoading(false);
      return;
    }
    setTicket(t);

    const { count } = await supabase
      .from("ticket_redemptions")
      .select("*", { count: "exact", head: true })
      .eq("ticket_id", ticketId);
    setRemaining((t.total_count ?? 0) - (count ?? 0));
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ticketId]);

  async function handleRedeem() {
    setError("");

    if (pin.length !== 6) {
      setError("PIN 6자리를 입력해 주세요.");
      return;
    }

    setBusy(true);
    try {
      const result = await redeemTicket(ticketId, pin); // server가 PIN 대조 + 차감 판단
      setRemaining(result.remaining);
      setDone(true);
    } catch (e) {
      setError(e.message);
      setPin(""); // 틀리면 비워서 다시 입력하게
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <section className="redeem"><p className="redeem-empty">불러오는 중이에요…</p></section>;
  }
  if (!ticket) {
    return <section className="redeem"><p className="redeem-empty">{error}</p></section>;
  }

  return (
    <section className="redeem">
      <h1 className="sec-title">식사권 사용확인 🍽️</h1>

      <div className="redeem-card">
        <Ticket count={remaining} label={ticket.menu_name} dim={done || remaining <= 0} />

        {done ? (
          <>
            <p className="redeem-done">✅ 사용 완료! 맛있게 드세요</p>
            <p className="redeem-sub">남은 식사권 {remaining}장</p>
            <button className="redeem-back" onClick={() => navigate("/wallet")}>
              지갑으로 돌아가기
            </button>
          </>
        ) : (
          <>
            <div className="redeem-guide">
              📱 이 화면을 <strong>사장님께 보여드리고</strong>, 사장님이 직접 PIN 6자리를 눌러주세요.
            </div>

            <input
              className="redeem-pin"
              type="password"
              inputMode="numeric"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="••••••"
              disabled={busy || remaining <= 0}
            />

            {error && <p className="redeem-error">{error}</p>}

            <button
              className="redeem-btn"
              onClick={handleRedeem}
              disabled={busy || remaining <= 0}
            >
              {busy ? "확인 중이에요…" : "사장님 확인 (1장 사용)"}
            </button>
            <button className="redeem-cancel" onClick={() => navigate("/wallet")}>
              취소
            </button>
          </>
        )}
      </div>
    </section>
  );
}