import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getMentors } from "../api/mentors";
import MentorApplicationBar from "../components/MentorApplicationBar";
import MentorCard from "../components/MentorCard";
import MentorSearchFilter from "../components/MentorSearchFilter";
import { useAuth } from "../context/AuthContext";
import { routePaths } from "../routes/routePaths";
import { initialMentorFilters } from "../utils/mentorFilters";

function toMentorViewModel(mentor) {
  return { ...mentor, keywords: mentor.researchFields };
}

function MentorListPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout } = useAuth();
  const [selectedMentorIds, setSelectedMentorIds] = useState(
    () => location.state?.mentorIds ?? [],
  );
  const [draftFilters, setDraftFilters] = useState(initialMentorFilters);
  const [appliedFilters, setAppliedFilters] = useState(initialMentorFilters);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [mentorToFocusId, setMentorToFocusId] = useState(null);
  const [selectionLimitNoticeVersion, setSelectionLimitNoticeVersion] = useState(0);
  const [filteredMentors, setFilteredMentors] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const mentorCacheRef = useRef(new Map());

  const loadMentors = useCallback(async (filters) => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await getMentors(filters);
      const mentors = response.data.map(toMentorViewModel);

      mentors.forEach((mentor) => mentorCacheRef.current.set(mentor.id, mentor));
      setFilteredMentors(mentors);
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMentors(appliedFilters);
  }, [appliedFilters, loadMentors]);

  const selectedMentors = useMemo(
    () => selectedMentorIds
      .map((mentorId) => mentorCacheRef.current.get(mentorId))
      .filter(Boolean),
    // filteredMentors 갱신 시 캐시가 채워지므로 의존성에 포함한다.
    [selectedMentorIds, filteredMentors],
  );

  useEffect(() => {
    if (!mentorToFocusId) return;

    const mentorCard = document.getElementById(`mentor-card-${mentorToFocusId}`);
    if (!mentorCard) return;

    mentorCard.scrollIntoView({ behavior: "smooth", block: "center" });
    mentorCard.focus({ preventScroll: true });
    setMentorToFocusId(null);
  }, [filteredMentors, mentorToFocusId]);

  useEffect(() => {
    if (!selectionLimitNoticeVersion) return undefined;

    const closeTimer = window.setTimeout(() => {
      setSelectionLimitNoticeVersion(0);
    }, 3000);

    return () => window.clearTimeout(closeTimer);
  }, [selectionLimitNoticeVersion]);

  const handleFilterChange = (name, value) => {
    setDraftFilters((currentFilters) => ({ ...currentFilters, [name]: value }));
  };

  const handleSearch = (event) => {
    event.preventDefault();
    setAppliedFilters({ ...draftFilters });
  };

  const handleFilterReset = () => {
    setDraftFilters(initialMentorFilters);
    setAppliedFilters(initialMentorFilters);
  };

  const handleLogout = async () => {
    await logout();
    navigate(routePaths.landing, { replace: true });
  };

  const handleMentorSelect = (mentorId, isSelected) => {
    if (
      isSelected
      && !selectedMentorIds.includes(mentorId)
      && selectedMentorIds.length >= 3
    ) {
      setSelectionLimitNoticeVersion((currentVersion) => currentVersion + 1);
      return;
    }

    setSelectedMentorIds((currentIds) => {
      if (!isSelected) {
        return currentIds.filter((id) => id !== mentorId);
      }

      if (currentIds.includes(mentorId) || currentIds.length >= 3) {
        return currentIds;
      }

      return [...currentIds, mentorId];
    });
  };

  const handleSelectedMentorClick = (mentorId) => {
    if (!filteredMentors.some((mentor) => mentor.id === mentorId)) {
      handleFilterReset();
    }

    setMentorToFocusId(mentorId);
  };

  const handleApplicationStart = () => {
    navigate(routePaths.menteeApplicationNew, {
      state: { mentorIds: selectedMentorIds },
    });
  };

  return (
    <div className="mentor-list-page">
      <header className="page-header mentor-list-header">
        <div>
          <p className="eyebrow">멘티 로그인 화면</p>
          <h1 className="page-title">멘토 프로필 목록</h1>
        </div>
        <div className="mentor-list-header-actions">
          <Link className="button button-neutral" to={routePaths.menteeMyPage}>
            개인 정보
          </Link>
          <Link className="button button-neutral" to={routePaths.menteeApplications}>
            면담 신청 목록
          </Link>
          <button className="button button-soft mentor-logout-button" onClick={handleLogout} type="button">
            로그아웃
          </button>
        </div>
      </header>

      <main className="page-container mentor-list-container">
        <MentorSearchFilter
          filters={draftFilters}
          isOpen={isFilterOpen}
          onChange={handleFilterChange}
          onReset={handleFilterReset}
          onSubmit={handleSearch}
          onToggle={() => setIsFilterOpen((currentValue) => !currentValue)}
          resultCount={filteredMentors.length}
        />

        <p className="mentor-result-summary" aria-live="polite">
          검색 결과 <strong>{filteredMentors.length}명</strong>
        </p>

        {errorMessage && (
          <div className="card mentor-empty-state" role="alert">
            <p className="muted-text">{errorMessage}</p>
          </div>
        )}

        {isLoading ? (
          <div className="card mentor-empty-state" role="status">
            멘토 목록을 불러오는 중입니다.
          </div>
        ) : (
          <section className="stack" aria-label="멘토 목록">
            {filteredMentors.map((mentor) => (
              <MentorCard
                key={mentor.id}
                mentor={mentor}
                selected={selectedMentorIds.includes(mentor.id)}
                onSelect={(isSelected) => handleMentorSelect(mentor.id, isSelected)}
              />
            ))}
            {filteredMentors.length === 0 && !errorMessage && (
              <div className="card mentor-empty-state">
                <h2 className="card-title">조건에 맞는 멘토가 없습니다.</h2>
                <p className="muted-text">검색어나 필터 조건을 바꾸거나 초기화해 주세요.</p>
                <button className="button button-soft" onClick={handleFilterReset} type="button">
                  검색 조건 초기화
                </button>
              </div>
            )}
          </section>
        )}
      </main>

      <MentorApplicationBar
        onApply={handleApplicationStart}
        onMentorClick={handleSelectedMentorClick}
        selectedMentors={selectedMentors}
      />

      {selectionLimitNoticeVersion > 0 && (
        <div
          aria-atomic="true"
          className="card mentor-selection-alert"
          role="alert"
        >
          <p>최대 3명의 멘토까지만 선택할 수 있습니다.</p>
          <button
            className="button button-primary"
            onClick={() => setSelectionLimitNoticeVersion(0)}
            type="button"
          >
            확인
          </button>
        </div>
      )}
    </div>
  );
}

export default MentorListPage;
