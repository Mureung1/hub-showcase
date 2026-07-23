import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { saveEvents, checkDuplicate } from "../../api/analysisApi";
import "./AnalysisResultPage.css";

function AnalysisResultPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [analysisData, setAnalysisData] = useState(null);
  const [selectedEvents, setSelectedEvents] = useState({});
  const [editingEventId, setEditingEventId] = useState(null);
  const [editedData, setEditedData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  // Dashboard에서 전달된 실제 분석 결과를 받음
  useEffect(() => {
    if (location.state?.analysisData) {
      const data = location.state.analysisData;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAnalysisData(data);

      // 모든 일정을 기본으로 선택
      if (data.events) {
        const initialSelected = {};
        data.events.forEach((_, index) => {
          initialSelected[index] = true;
        });
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSelectedEvents(initialSelected);
      }
    }
    // location.state가 없으면 아무것도 로드하지 않음
  }, [location.state]);

  // 화면 이탈 경고 (수정 모드 활성화 시)
  useEffect(() => {
    if (editingEventId !== null) {
      const handleBeforeUnload = (e) => {
        e.preventDefault();
        e.returnValue = "";
        return "";
      };

      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [editingEventId]);

  function handleEventCheckboxChange(index) {
    setSelectedEvents((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }

  function handleSelectAll() {
    if (!analysisData || !analysisData.events) return;

    const allSelected = analysisData.events.every((_, index) => selectedEvents[index]);
    const newSelected = {};
    analysisData.events.forEach((_, index) => {
      newSelected[index] = !allSelected;
    });
    setSelectedEvents(newSelected);
  }

  function handleEditToggle(index) {
    if (editingEventId === index) {
      // 수정 모드 종료 (변경 사항 버림)
      setEditingEventId(null);
      setEditedData({});
    } else {
      // 수정 모드 시작 (현재 데이터를 임시 데이터로 복사)
      setEditingEventId(index);
      setEditedData({ ...analysisData.events[index] });
    }
  }

  function handleEditChange(field, value) {
    setEditedData((prev) => ({
      ...prev,
      [field]: value,
    }));
  }

  function validateEventData(data) {
    // 필수값 검증
    if (!data.name || data.name.trim() === "") {
      return "일정명은 필수입니다.";
    }

    // 날짜 검증
    if (data.startDate && data.endDate) {
      if (data.startDate > data.endDate) {
        return "시작날짜가 종료날짜보다 클 수 없습니다.";
      }
    }

    if (data.startDate && data.deadline) {
      if (data.startDate > data.deadline) {
        return "시작날짜가 마감일보다 클 수 없습니다.";
      }
    }

    if (data.endDate && data.deadline) {
      if (data.endDate > data.deadline) {
        return "종료날짜가 마감일보다 클 수 없습니다.";
      }
    }

    return null; // 검증 통과
  }

  function handleSaveEdit(index) {
    // 검증 수행
    const validationError = validateEventData(editedData);
    if (validationError) {
      setError(validationError);
      setTimeout(() => setError(""), 3000);
      return;
    }

    // 수정된 데이터를 실제 데이터에 반영
    const updatedEvents = [...analysisData.events];
    updatedEvents[index] = editedData;
    setAnalysisData((prev) => ({
      ...prev,
      events: updatedEvents,
    }));
    setEditingEventId(null);
    setEditedData({});
    setError(""); // 오류 메시지 초기화
  }

  function handleDeleteEvent(index) {
    // 일정 삭제 확인
    if (!window.confirm("이 일정을 삭제하시겠습니까?")) {
      return;
    }

    // 일정 삭제
    const updatedEvents = analysisData.events.filter((_, i) => i !== index);
    setAnalysisData((prev) => ({
      ...prev,
      events: updatedEvents,
    }));

    // 선택 상태 업데이트 (삭제된 항목 제거, 나머지 인덱스 재정렬)
    const updatedSelected = {};
    updatedEvents.forEach((_, i) => {
      updatedSelected[i] = selectedEvents[i] || false;
    });
    setSelectedEvents(updatedSelected);

    // 수정 모드 종료
    if (editingEventId === index) {
      setEditingEventId(null);
      setEditedData({});
    }
  }

  function handleAddEvent() {
    // 새 일정 객체 생성 (기본값)
    const newEvent = {
      name: "",
      startDate: null,
      endDate: null,
      deadline: null,
      time: {
        start: null,
        end: null,
      },
      location: null,
      deliverables: [],
      notes: null,
    };

    // 새 일정 추가
    const updatedEvents = [...analysisData.events, newEvent];
    setAnalysisData((prev) => ({
      ...prev,
      events: updatedEvents,
    }));

    // 새 일정을 수정 모드로 자동 활성화
    const newIndex = updatedEvents.length - 1;
    setEditingEventId(newIndex);
    setEditedData(newEvent);

    // 새 일정 선택 상태 추가 (기본값: true)
    setSelectedEvents((prev) => ({
      ...prev,
      [newIndex]: true,
    }));
  }

  async function handleSaveAllEvents() {
    // 선택된 일정 필터링
    const selectedEventsList = analysisData.events.filter((_, index) => selectedEvents[index]);

    if (selectedEventsList.length === 0) {
      setError("저장할 일정을 선택해주세요.");
      setTimeout(() => setError(""), 3000);
      return;
    }

    setIsSaving(true);
    setError("");
    setSuccess("");

    try {
      // 중복 검사
      try {
        const duplicateResult = await checkDuplicate(selectedEventsList);

        if (duplicateResult.hasDuplicates && duplicateResult.data.length > 0) {
          const duplicateList = duplicateResult.data
            .map(d => `${d.name} (${d.startDate})`)
            .join(", ");

          const confirmed = window.confirm(
            `다음 일정이 이미 등록되어 있습니다:\n${duplicateList}\n\n그래도 등록하시겠습니까?`
          );

          if (!confirmed) {
            setIsSaving(false);
            return;
          }
        }
      } catch (duplicateErr) {
        setError("중복 검사 중 오류가 발생했습니다.");
        setTimeout(() => setError(""), 3000);
        setIsSaving(false);
        return;
      }

      // 백엔드 API 호출
      await saveEvents(selectedEventsList);

      setSuccess(`${selectedEventsList.length}개의 일정이 저장되었습니다.`);
      setTimeout(() => setSuccess(""), 3000);
    } catch (err) {
      setError(err.message || "저장 중 오류가 발생했습니다.");
      setTimeout(() => setError(""), 3000);
    } finally {
      setIsSaving(false);
    }
  }

  if (error) {
    return (
      <section className="analysis-result-section">
        <div className="analysis-container">
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <p className="error-message">{error}</p>
            <button
              className="retry-button"
              onClick={() => navigate("/dashboard")}
            >
              Dashboard로 이동
            </button>
          </div>
        </div>
      </section>
    );
  }

  if (!analysisData) {
    return (
      <section className="analysis-result-section">
        <div className="analysis-container">
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <p style={{ fontSize: "16px", color: "var(--color-text-muted)", marginBottom: "20px" }}>
              분석 결과가 없습니다. 공지를 다시 분석해주세요.
            </p>
            <button
              onClick={() => navigate("/dashboard")}
              style={{
                padding: "10px 24px",
                backgroundColor: "var(--color-primary)",
                color: "white",
                border: "none",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: "600",
                cursor: "pointer",
                fontFamily: "Inter, Pretendard, sans-serif"
              }}
            >
              Dashboard로 이동
            </button>
          </div>
        </div>
      </section>
    );
  }

  const { notice, events } = analysisData;

  return (
    <section className="analysis-result-section">
      <div className="analysis-container">
        {/* 오류/성공 메시지 */}
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        {success && (
          <div className="success-message">
            {success}
          </div>
        )}

        {/* 공지 정보 표시 */}
        <div className="notice-info">
          <h2 className="notice-title">{notice.title}</h2>
          <p className="notice-summary">{notice.summary}</p>
        </div>

        {/* 일정 목록 */}
        <div className="events-section">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h3 className="events-title" style={{ margin: 0 }}>추출된 일정 ({events.length}개)</h3>
            {events.length > 0 && (
              <button
                className="select-all-button"
                onClick={handleSelectAll}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: "600",
                  color: "var(--color-primary)",
                  background: "none",
                  border: "1px solid var(--color-primary)",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                {events.every((_, i) => selectedEvents[i]) ? "모두 해제" : "모두 선택"}
              </button>
            )}
          </div>

          {events.length === 0 ? (
            <div className="no-events">
              <p>추출된 일정이 없습니다.</p>
              <button className="add-event-button" onClick={handleAddEvent}>
                + 일정 추가
              </button>
            </div>
          ) : (
            <div className="events-list">
              {events.map((event, index) => (
                <div key={index} className="event-card">
                  <div className="event-header">
                    <input
                      type="checkbox"
                      className="event-checkbox"
                      checked={selectedEvents[index] || false}
                      onChange={() => handleEventCheckboxChange(index)}
                    />
                    <span className="event-number">일정 {index + 1}</span>
                  </div>

                  <div className="event-content">
                    <div className="event-field">
                      <label>일정명</label>
                      {editingEventId === index ? (
                        <input
                          type="text"
                          value={editedData.name || ""}
                          onChange={(e) => handleEditChange("name", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid var(--color-border)",
                            borderRadius: "4px",
                            fontSize: "14px",
                            fontFamily: "Inter, Pretendard, sans-serif",
                          }}
                        />
                      ) : (
                        <p>{event.name}</p>
                      )}
                    </div>

                    <div className="event-row">
                      <div className="event-field">
                        <label>시작날짜</label>
                        {editingEventId === index ? (
                          <input
                            type="date"
                            value={editedData.startDate || ""}
                            onChange={(e) => handleEditChange("startDate", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid var(--color-border)",
                              borderRadius: "4px",
                              fontSize: "14px",
                            }}
                          />
                        ) : (
                          <p>{event.startDate || "정보 없음"}</p>
                        )}
                      </div>
                      <div className="event-field">
                        <label>종료날짜</label>
                        {editingEventId === index ? (
                          <input
                            type="date"
                            value={editedData.endDate || ""}
                            onChange={(e) => handleEditChange("endDate", e.target.value)}
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid var(--color-border)",
                              borderRadius: "4px",
                              fontSize: "14px",
                            }}
                          />
                        ) : (
                          <p>{event.endDate || "정보 없음"}</p>
                        )}
                      </div>
                    </div>

                    {editingEventId === index || event.time?.start || event.time?.end ? (
                      <div className="event-row">
                        <div className="event-field">
                          <label>시작시간</label>
                          {editingEventId === index ? (
                            <input
                              type="time"
                              value={editedData.time?.start || ""}
                              onChange={(e) =>
                                handleEditChange("time", {
                                  ...editedData.time,
                                  start: e.target.value,
                                })
                              }
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "1px solid var(--color-border)",
                                borderRadius: "4px",
                                fontSize: "14px",
                              }}
                            />
                          ) : (
                            <p>{event.time?.start || "-"}</p>
                          )}
                        </div>
                        <div className="event-field">
                          <label>종료시간</label>
                          {editingEventId === index ? (
                            <input
                              type="time"
                              value={editedData.time?.end || ""}
                              onChange={(e) =>
                                handleEditChange("time", {
                                  ...editedData.time,
                                  end: e.target.value,
                                })
                              }
                              style={{
                                width: "100%",
                                padding: "8px 12px",
                                border: "1px solid var(--color-border)",
                                borderRadius: "4px",
                                fontSize: "14px",
                              }}
                            />
                          ) : (
                            <p>{event.time?.end || "-"}</p>
                          )}
                        </div>
                      </div>
                    ) : null}

                    <div className="event-field">
                      <label>마감일</label>
                      {editingEventId === index ? (
                        <input
                          type="date"
                          value={editedData.deadline || ""}
                          onChange={(e) => handleEditChange("deadline", e.target.value)}
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid var(--color-border)",
                            borderRadius: "4px",
                            fontSize: "14px",
                          }}
                        />
                      ) : (
                        <p>{event.deadline || "정보 없음"}</p>
                      )}
                    </div>

                    <div className="event-field">
                      <label>장소</label>
                      {editingEventId === index ? (
                        <input
                          type="text"
                          value={editedData.location || ""}
                          onChange={(e) => handleEditChange("location", e.target.value)}
                          placeholder="장소를 입력하세요"
                          style={{
                            width: "100%",
                            padding: "8px 12px",
                            border: "1px solid var(--color-border)",
                            borderRadius: "4px",
                            fontSize: "14px",
                            fontFamily: "Inter, Pretendard, sans-serif",
                          }}
                        />
                      ) : (
                        <p>{event.location || "정보 없음"}</p>
                      )}
                    </div>

                    {event.deliverables.length > 0 && (
                      <div className="event-field">
                        <label>제출물</label>
                        <ul className="deliverables-list">
                          {event.deliverables.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {editingEventId === index || event.notes ? (
                      <div className="event-field">
                        <label>메모</label>
                        {editingEventId === index ? (
                          <textarea
                            value={editedData.notes || ""}
                            onChange={(e) => handleEditChange("notes", e.target.value)}
                            placeholder="메모를 입력하세요"
                            style={{
                              width: "100%",
                              padding: "8px 12px",
                              border: "1px solid var(--color-border)",
                              borderRadius: "4px",
                              fontSize: "14px",
                              fontFamily: "Inter, Pretendard, sans-serif",
                              minHeight: "60px",
                              resize: "vertical",
                            }}
                          />
                        ) : (
                          <p>{event.notes}</p>
                        )}
                      </div>
                    ) : null}
                  </div>

                  <div className="event-actions">
                    {editingEventId === index ? (
                      <>
                        <button
                          className="edit-button"
                          onClick={() => handleSaveEdit(index)}
                          style={{ backgroundColor: "var(--color-primary)", color: "white" }}
                        >
                          저장
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => handleEditToggle(index)}
                          style={{ backgroundColor: "var(--color-text-faint)", color: "white" }}
                        >
                          취소
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="edit-button"
                          onClick={() => handleEditToggle(index)}
                        >
                          수정
                        </button>
                        <button
                          className="delete-button"
                          onClick={() => handleDeleteEvent(index)}
                        >
                          삭제
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <button
            className="add-event-button"
            style={{ marginTop: "20px" }}
            onClick={handleAddEvent}
          >
            + 일정 추가
          </button>
        </div>

        {/* 저장 버튼 */}
        <div className="action-buttons">
          <button
            className="save-button"
            onClick={handleSaveAllEvents}
            disabled={isSaving}
          >
            {isSaving
              ? "저장 중..."
              : `저장하기 (${Object.values(selectedEvents).filter(Boolean).length}개 선택됨)`}
          </button>
          <button className="cancel-button" disabled={isSaving}>
            취소
          </button>
        </div>
      </div>
    </section>
  );
}

export default AnalysisResultPage;
