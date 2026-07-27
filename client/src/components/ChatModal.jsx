import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createMessage, listMessages } from "../api/messages";
import supabaseClient from "../api/supabaseClient";
import { useAuth } from "../context/AuthContext";

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  hour: "2-digit",
  minute: "2-digit",
});

const dateDividerFormatter = new Intl.DateTimeFormat("ko-KR", {
  year: "numeric",
  month: "long",
  day: "numeric",
  weekday: "long",
});

const toDateKey = (isoString) => {
  const date = new Date(isoString);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
};

const SCROLL_TOP_THRESHOLD = 80;
const SCROLL_BOTTOM_THRESHOLD = 120;

function ChatModal({ applicationId, otherPartyName, onClose }) {
  const { currentUser } = useAuth();
  const [messages, setMessages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [isLoadingInitial, setIsLoadingInitial] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [draftBody, setDraftBody] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const listRef = useRef(null);
  const seenMessageIds = useRef(new Set());
  const pendingScrollRestoreRef = useRef(null);

  // 과거 메시지를 위에 붙인 직후, 브라우저가 화면을 그리기 전에(paint 이전) 동기적으로
  // 스크롤 위치를 보정한다. requestAnimationFrame은 탭이 실제로 화면에 그려지고 있을 때만
  // 실행이 보장되는데, useLayoutEffect는 DOM 커밋 직후 항상 동기적으로 실행되어 더 안정적이다.
  useLayoutEffect(() => {
    const pending = pendingScrollRestoreRef.current;
    if (pending && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight - pending.previousScrollHeight;
      pendingScrollRestoreRef.current = null;
    }
  }, [messages]);

  const appendMessage = useCallback((message) => {
    if (seenMessageIds.current.has(message.id)) return;
    seenMessageIds.current.add(message.id);
    setMessages((current) => [...current, message]);
  }, []);

  // 최초 로딩: 가장 최근 메시지부터 시간 오름차순으로 표시한다.
  useEffect(() => {
    let isCancelled = false;

    setIsLoadingInitial(true);
    listMessages({ applicationId })
      .then((response) => {
        if (isCancelled) return;
        response.data.forEach((message) => seenMessageIds.current.add(message.id));
        setMessages(response.data);
        setHasMore(response.meta.hasMore);
        setCursor(response.meta.nextCursor);
      })
      .catch((error) => {
        if (!isCancelled) setErrorMessage(error.message);
      })
      .finally(() => {
        if (!isCancelled) setIsLoadingInitial(false);
      });

    return () => {
      isCancelled = true;
    };
  }, [applicationId]);

  // 최초 로딩이 끝나면 맨 아래(최신 메시지)로 스크롤한다.
  useEffect(() => {
    if (!isLoadingInitial && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoadingInitial]);

  // ESC로 닫기.
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  // 배경 스크롤 잠금.
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  // Realtime 구독: 상대방(또는 다른 탭의 나)이 보낸 메시지를 실시간으로 반영한다.
  useEffect(() => {
    if (!supabaseClient) return undefined;

    const channel = supabaseClient
      .channel(`messages:${applicationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `application_id=eq.${applicationId}`,
        },
        (payload) => {
          const row = payload.new;
          const isMe = row.sender_id === currentUser?.id;

          appendMessage({
            id: row.id,
            applicationId: row.application_id,
            senderId: row.sender_id,
            senderName: isMe ? currentUser?.name : otherPartyName,
            body: row.body,
            createdAt: row.created_at,
          });

          const list = listRef.current;
          if (list) {
            const distanceFromBottom = list.scrollHeight - list.scrollTop - list.clientHeight;
            if (distanceFromBottom < SCROLL_BOTTOM_THRESHOLD) {
              requestAnimationFrame(() => {
                list.scrollTop = list.scrollHeight;
              });
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applicationId, currentUser?.id, otherPartyName]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || !cursor) return;

    setIsLoadingMore(true);
    const list = listRef.current;
    const previousScrollHeight = list ? list.scrollHeight : 0;

    try {
      const response = await listMessages({ applicationId, cursor });
      response.data.forEach((message) => seenMessageIds.current.add(message.id));
      pendingScrollRestoreRef.current = { previousScrollHeight };
      setMessages((current) => [...response.data, ...current]);
      setHasMore(response.meta.hasMore);
      setCursor(response.meta.nextCursor);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoadingMore(false);
    }
  }, [applicationId, cursor, hasMore, isLoadingMore]);

  const handleScroll = (event) => {
    if (event.target.scrollTop < SCROLL_TOP_THRESHOLD) {
      loadMore();
    }
  };

  const handleSend = async (event) => {
    event.preventDefault();
    const body = draftBody.trim();
    if (!body) return;

    setIsSending(true);
    setErrorMessage("");

    try {
      const response = await createMessage({ applicationId, body });
      appendMessage(response.data);
      setDraftBody("");
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight;
      });
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsSending(false);
    }
  };

  const handleOverlayClick = (event) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <div className="chat-modal-overlay" onClick={handleOverlayClick} role="presentation">
      <section aria-label="채팅" className="card chat-modal" role="dialog">
        <header className="chat-modal-header">
          <h2 className="card-title">{otherPartyName ? `${otherPartyName}님과의 채팅` : "채팅"}</h2>
          <button
            aria-label="채팅 닫기"
            className="chat-modal-close"
            onClick={onClose}
            type="button"
          >
            <span aria-hidden="true">×</span>
          </button>
        </header>

        <div className="chat-modal-messages" onScroll={handleScroll} ref={listRef}>
          {isLoadingMore && <p className="chat-modal-loading-more">이전 메시지를 불러오는 중...</p>}

          {isLoadingInitial ? (
            <p className="chat-modal-status" role="status">
              메시지를 불러오는 중입니다.
            </p>
          ) : messages.length === 0 ? (
            <p className="chat-modal-status">아직 주고받은 메시지가 없습니다.</p>
          ) : (
            messages.map((message, index) => {
              const isMine = message.senderId === currentUser?.id;
              const dateKey = toDateKey(message.createdAt);
              const previousDateKey =
                index > 0 ? toDateKey(messages[index - 1].createdAt) : null;
              const showDateDivider = dateKey !== previousDateKey;

              return (
                <div key={message.id}>
                  {showDateDivider && (
                    <div className="chat-date-divider">
                      <span>{dateDividerFormatter.format(new Date(message.createdAt))}</span>
                    </div>
                  )}
                  <div className={`chat-message${isMine ? " chat-message-mine" : ""}`}>
                    <span className="chat-message-sender">{message.senderName}</span>
                    <p className="chat-message-body">{message.body}</p>
                    <span className="chat-message-time">
                      {dateTimeFormatter.format(new Date(message.createdAt))}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {errorMessage && (
          <p className="chat-modal-error" role="alert">
            {errorMessage}
          </p>
        )}

        <form className="chat-modal-form" onSubmit={handleSend}>
          <input
            aria-label="메시지 입력"
            className="field"
            disabled={isSending}
            onChange={(event) => setDraftBody(event.target.value)}
            placeholder="메시지를 입력하세요"
            type="text"
            value={draftBody}
          />
          <button
            className="button button-primary"
            disabled={isSending || !draftBody.trim()}
            type="submit"
          >
            전송
          </button>
        </form>
      </section>
    </div>
  );
}

export default ChatModal;
