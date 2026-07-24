import { useCallback, useEffect, useRef, useState } from "react";
import { getUsers } from "../services/usersService";
import type { SwimUser } from "../services/usersService";

interface UserListProps {
  accessToken: string;
  apiBaseUrl: string;
}

function UserAvatar({ user }: { user: SwimUser }) {
  if (user.avatarUrl) {
    return <img className="user-avatar" src={user.avatarUrl} alt="" />;
  }

  return (
    <span className="user-avatar user-avatar-fallback" aria-hidden="true">
      {user.nickname.slice(0, 1)}
    </span>
  );
}

export function UserList({ accessToken, apiBaseUrl }: UserListProps) {
  const [users, setUsers] = useState<SwimUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState<string | null>("");
  const activeRequestRef = useRef<AbortController | null>(null);

  const retry = useCallback(() => setRetryKey((current) => current + 1), []);

  useEffect(() => {
    activeRequestRef.current?.abort();
    const normalizedSearch = searchInput.trim();

    if (normalizedSearch.length === 0) {
      setDebouncedSearch("");
      return;
    }

    if (normalizedSearch.length < 2) {
      setDebouncedSearch(null);
      setIsLoading(false);
      setErrorMessage("");
      return;
    }

    setIsLoading(true);
    const timeoutId = window.setTimeout(() => {
      setDebouncedSearch(normalizedSearch);
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (debouncedSearch === null) return;

    const controller = new AbortController();
    activeRequestRef.current = controller;
    setIsLoading(true);
    setErrorMessage("");

    getUsers(apiBaseUrl, accessToken, debouncedSearch, controller.signal)
      .then((nextUsers) => {
        if (!controller.signal.aborted) setUsers(nextUsers);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        setErrorMessage(error instanceof Error ? error.message : "사용자 목록을 불러오지 못했어요.");
      })
      .finally(() => {
        if (activeRequestRef.current === controller) {
          activeRequestRef.current = null;
        }
        if (!controller.signal.aborted) setIsLoading(false);
      });

    return () => controller.abort();
  }, [accessToken, apiBaseUrl, debouncedSearch, retryKey]);

  const normalizedSearch = searchInput.trim();
  const isSearchTooShort = normalizedSearch.length === 1;
  const hasSearchQuery = Boolean(debouncedSearch);

  return (
    <section className="people-section" aria-labelledby="people-title">
      <div className="section-heading records-heading">
        <div>
          <span>People through music</span>
          <h2 id="people-title">함께 헤엄치는 사람들</h2>
        </div>
        {!isLoading && !errorMessage && <strong>{users.length}</strong>}
      </div>

      <div className="people-search">
        <label htmlFor="people-search-input">닉네임으로 찾기</label>
        <input
          id="people-search-input"
          type="search"
          maxLength={20}
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-invalid={isSearchTooShort}
          aria-describedby="people-search-help"
          placeholder="함께 음악을 나눌 사람을 찾아보세요"
        />
        <p id="people-search-help">
          {isSearchTooShort
            ? "검색어는 2자 이상 입력해 주세요."
            : "닉네임의 일부만 입력해도 찾을 수 있어요."}
        </p>
      </div>

      {isLoading ? (
        <div className="people-state" role="status">
          {normalizedSearch ? "닉네임을 찾는 중..." : "사람들을 불러오는 중..."}
        </div>
      ) : isSearchTooShort ? (
        <div className="people-state">
          <strong>조금 더 입력해 주세요.</strong>
          <p>닉네임 두 글자부터 검색할 수 있어요.</p>
        </div>
      ) : errorMessage ? (
        <div className="people-state" role="alert">
          <strong>사람들을 불러오지 못했어요.</strong>
          <p>{errorMessage}</p>
          <button className="retry-button" type="button" onClick={retry}>다시 시도</button>
        </div>
      ) : users.length === 0 ? (
        <div className="people-state">
          <strong>{hasSearchQuery ? "일치하는 사람을 찾지 못했어요." : "아직 함께할 사람이 없어요."}</strong>
          <p>
            {hasSearchQuery
              ? "다른 닉네임이나 더 짧은 검색어로 다시 찾아보세요."
              : "새로운 사용자가 음악 일기를 시작하면 이곳에서 만날 수 있어요."}
          </p>
        </div>
      ) : (
        <ul className="user-list">
          {users.map((user) => (
            <li className="user-card" key={user.nickname}>
              <UserAvatar user={user} />
              <div>
                <strong>{user.nickname}</strong>
                <p>{user.bio || "음악으로 하루를 기록하고 있어요."}</p>
              </div>
              <span className={user.isFollowing ? "follow-status is-following" : "follow-status"}>
                {user.isFollowing ? "팔로잉" : "새로운 사람"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
