import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../hooks/useAuth";
import Ticket from "../components/Ticket";
import "./WalletPage.css";

/**
 * 식사권 지갑 — 로그인한 학생이 받은 식사권을 티켓으로 보여준다.
 *  - tickets에서 내 것(student_id = 나)만 조회
 *  - 각 티켓의 잔여 = total_count − ticket_redemptions 기록 수 (CLAUDE.md 규칙)
 *  - 잔여가 있으면 "사용하기" → 사장님 확인 화면(TicketRedeemPage)으로
 *  - 잔여 0이면 dim 처리 (다 쓴 티켓)
 */
export default function WalletPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTickets() {
      if (!user) return;

      // 1. 내 티켓 조회
      const { data: myTickets } = await supabase
        .from("tickets")
        .select("*")
        .eq("student_id", user.id)
        .order("issued_at", { ascending: false });

      const list = myTickets ?? [];

      // 2. 각 티켓의 사용 기록 수를 세서 잔여 계산
      const withRemaining = await Promise.all(
        list.map(async (t) => {
          const { count } = await supabase
            .from("ticket_redemptions")
            .select("*", { count: "exact", head: true })
            .eq("ticket_id", t.id);
          const used = count ?? 0;
          return { ...t, used, remaining: (t.total_count ?? 0) - used };
        })
      );

      setTickets(withRemaining);
      setLoading(false);
    }
    loadTickets();
  }, [user]);

  if (loading) {
    return (
      <section className="wallet">
        <h1 className="sec-title">내 식사권 지갑 👛</h1>
        <p className="wallet-empty">불러오는 중이에요…</p>
      </section>
    );
  }

  return (
    <section className="wallet">
      <h1 className="sec-title">내 식사권 지갑 👛</h1>

      {tickets.length === 0 ? (
        <p className="wallet-empty">
          아직 받은 식사권이 없어요.<br />
          재능 요청을 완료하면 식사권이 여기에 담겨요.
        </p>
      ) : (
        <>
          <div className="wallet-list">
            {tickets.map((t) => {
              const soldOut = t.remaining <= 0;
              return (
                <div key={t.id} className="wallet-item">
                  <Ticket
                    count={t.remaining}
                    label={t.menu_name}
                    dim={soldOut}
                  />
                  {soldOut ? (
                    <p className="wallet-soldout">다 쓴 식사권이에요</p>
                  ) : (
                    <button
                      className="wallet-use-btn"
                      onClick={() => navigate(`/wallet/redeem/${t.id}`)}
                    >
                      사용하기
                    </button>
                  )}
                </div>
              );
            })}
          </div>
          <p className="wallet-warmth">
            🤝 이 식사권들은 헬퍼님의 재능으로 만들어졌어요
          </p>
        </>
      )}
    </section>
  );
}