import { useEffect, useRef } from "react";
import supabaseClient from "../api/supabaseClient";

// 페이지 전체에서 채널 하나로 messages INSERT를 구독한다. RLS(messages_select_participants)가
// 신청 참여자 본인에게 오는 이벤트만 걸러주므로, 별도 필터 없이 구독해도 안전하다.
// currentUserId가 보낸 메시지와, 현재 열려 있는 채팅방(openApplicationId)의 메시지는
// 배지 증가 대상에서 제외한다 — 여닫는 시점에 읽음 처리로 이미 0이 되기 때문이다.
function useUnreadMessageRealtime({ currentUserId, openApplicationId, onUnreadMessage }) {
  const openApplicationIdRef = useRef(openApplicationId);
  const onUnreadMessageRef = useRef(onUnreadMessage);

  useEffect(() => {
    openApplicationIdRef.current = openApplicationId;
  }, [openApplicationId]);

  useEffect(() => {
    onUnreadMessageRef.current = onUnreadMessage;
  }, [onUnreadMessage]);

  useEffect(() => {
    if (!supabaseClient || !currentUserId) return undefined;

    const channel = supabaseClient
      .channel(`unread-messages:${currentUserId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new;
          if (row.sender_id === currentUserId) return;
          if (row.application_id === openApplicationIdRef.current) return;

          onUnreadMessageRef.current(row.application_id);
        },
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [currentUserId]);
}

export default useUnreadMessageRealtime;
