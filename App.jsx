import { useState } from "react";

// ============================================================
// React 화면 전환 - 9개 화면 전체 연결 버전
//
// 화면 흐름:
//   계약입력 → 타임라인 → 갱신선택 ┬ 갱신 → 갱신결과
//                                  └ 퇴거 → 퇴거결과
//             타임라인 → 반환확인 ┬ 받음 → 타임라인
//                                └ 못받음 → 미반환대응
//             타임라인 → 보관함 / 설정
//
// 지금 단계: "화면 전환"만 (값 입력·저장·계산은 다음 단계)
// ============================================================

export default function App() {
  // 현재 화면을 기억하는 상태. 시작은 "contract"
  const [screen, setScreen] = useState("contract");

  // ── 계약 정보 상태 (App으로 끌어올림 = 여러 화면이 공유) ──
  // 계약입력 화면에서 채우고, 타임라인 화면에서 꺼내 씀
  const [contract, setContract] = useState({
    startDate: "", // 계약 시작일
    endDate: "",   // 계약 만료일
    deposit: "",   // 보증금 (콤마 포함 문자열)
  });

  // ── 보관함 기록 상태 (배열) ──
  // 통보 완료 등이 일어날 때마다 여기에 기록이 쌓임
  const [records, setRecords] = useState([]);

  // 통보(갱신/퇴거)를 완료했는지 여부 → 타임라인 상태 표시에 사용
  const [notified, setNotified] = useState(false);

  // 새 기록을 맨 앞에 추가하는 함수
  const addRecord = (record) => {
    // 오늘 날짜를 "YYYY.MM.DD"로
    const today = new Date();
    const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;
    setRecords([{ ...record, date: dateStr }, ...records]); // 새 기록 맨 앞
  };

  // go: 화면을 바꾸는 함수 하나로 통일 (모든 화면에 넘겨줌)
  const go = (name) => setScreen(name);

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {screen === "contract" && (
          <ContractInput go={go} contract={contract} setContract={setContract} />
        )}
        {screen === "timeline" && <Timeline go={go} contract={contract} notified={notified} />}
        {screen === "decision" && <Decision go={go} />}
        {screen === "renew" && <RenewResult go={go} addRecord={addRecord} setNotified={setNotified} />}
        {screen === "leave" && <LeaveResult go={go} addRecord={addRecord} setNotified={setNotified} />}
        {screen === "returnCheck" && <ReturnCheck go={go} addRecord={addRecord} />}
        {screen === "unpaid" && <UnpaidAction go={go} addRecord={addRecord} />}
        {screen === "archive" && <Archive go={go} records={records} />}
        {screen === "settings" && <Settings go={go} />}
      </div>
      <p style={styles.debug}>현재 화면 상태: "{screen}"</p>
    </div>
  );
}

// ── 화면 1: 계약 입력 (제어 컴포넌트) ──
// contract(현재 값), setContract(값 바꾸는 도구)를 App에서 받아옴
function ContractInput({ go, contract, setContract }) {
  // 입력이 바뀔 때 contract 상태의 해당 항목만 업데이트하는 함수
  // 예: update("startDate", "2024-03-01")
  const update = (key, value) => {
    setContract({ ...contract, [key]: value }); // 기존 값 유지하고 하나만 교체
  };

  // 보증금 입력: 숫자만 남기고 천 단위 콤마 붙이기
  const onDepositChange = (e) => {
    const raw = e.target.value.replace(/[^0-9]/g, "");
    update("deposit", raw ? Number(raw).toLocaleString("ko-KR") : "");
  };

  // 타임라인 만들기 누를 때 간단 검증
  const handleSubmit = () => {
    if (!contract.startDate || !contract.endDate) {
      alert("계약 시작일과 만료일을 입력해주세요.");
      return;
    }
    if (new Date(contract.endDate) <= new Date(contract.startDate)) {
      alert("만료일은 시작일보다 나중이어야 해요.");
      return;
    }
    go("timeline");
  };

  return (
    <div>
      <div style={styles.header}>
        <span style={styles.title}>계약 정보 입력</span>
        <span style={styles.step}>1 / 1 단계</span>
      </div>
      <p style={styles.desc}>계약 날짜와 보증금을 입력하면 일정이 자동으로 만들어져요.</p>

      <label style={styles.label}>계약 시작일</label>
      <input
        type="date"
        style={styles.input}
        value={contract.startDate}                       /* 상태 → 화면 */
        onChange={(e) => update("startDate", e.target.value)} /* 화면 → 상태 */
      />

      <label style={styles.label}>계약 만료일</label>
      <input
        type="date"
        style={styles.input}
        value={contract.endDate}
        onChange={(e) => update("endDate", e.target.value)}
      />

      <label style={styles.label}>보증금 액수</label>
      <input
        type="text"
        inputMode="numeric"
        placeholder="150,000,000"
        style={styles.input}
        value={contract.deposit}
        onChange={onDepositChange}
      />
      {/* 입력한 금액을 '○○만원 / ○○억 ○○만원'으로 읽기 쉽게 표시 */}
      {contract.deposit && (
        <div style={styles.depositWord}>{formatKoreanMoney(contract.deposit)}</div>
      )}

      <button style={styles.primaryBtn} onClick={handleSubmit}>
        타임라인 만들기
      </button>
    </div>
  );
}

// ── 날짜 계산 도우미 함수 ──
// 만료일(YYYY-MM-DD)을 기준으로 n개월 전 날짜를 구해서 "YYYY.MM.DD"로 반환
function monthsBefore(dateStr, n) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  d.setMonth(d.getMonth() - n); // n개월 빼기
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

// 계약 기간의 절반 시점(보증보험 마감) 계산
function midPoint(startStr, endStr) {
  if (!startStr || !endStr) return "-";
  const s = new Date(startStr).getTime();
  const e = new Date(endStr).getTime();
  const mid = new Date((s + e) / 2);
  const y = mid.getFullYear();
  const m = String(mid.getMonth() + 1).padStart(2, "0");
  const day = String(mid.getDate()).padStart(2, "0");
  return `${y}.${m}.${day}`;
}

// "YYYY-MM-DD" → "YYYY.MM.DD" 표시용 변환
function dotDate(dateStr) {
  if (!dateStr) return "-";
  return dateStr.replaceAll("-", ".");
}

// 원 단위 금액(콤마 포함 문자열)을 "○억 ○만원"으로 변환
// 예: "150,000,000" → "1억 5,000만원",  "15,000,000" → "1,500만원"
function formatKoreanMoney(depositStr) {
  const won = Number(depositStr.replace(/[^0-9]/g, ""));
  if (!won) return "";
  const man = Math.floor(won / 10000); // 만원 단위로
  if (man === 0) return `${won.toLocaleString("ko-KR")}원`;
  const eok = Math.floor(man / 10000); // 억 단위
  const restMan = man % 10000;         // 나머지 만원
  if (eok > 0) {
    return restMan > 0
      ? `${eok}억 ${restMan.toLocaleString("ko-KR")}만원`
      : `${eok}억원`;
  }
  return `${man.toLocaleString("ko-KR")}만원`;
}

// ── 화면 2: 타임라인 (홈) - 여러 곳으로 가는 허브 ──
// App에서 contract(계약 정보)를 받아서, 계산된 날짜를 표시
function Timeline({ go, contract, notified }) {
  // 받은 계약 정보로 각 시점 날짜를 실제 계산
  // notified가 true면 '갱신 결정'을 완료(done)로 표시
  const points = [
    { name: "보증보험 마감", date: midPoint(contract.startDate, contract.endDate), state: "done" },
    { name: "갱신 결정", date: monthsBefore(contract.endDate, 6), state: notified ? "done" : "active" },
    { name: "통보 마지노선", date: monthsBefore(contract.endDate, 2), state: "" },
    { name: "계약 만료", date: dotDate(contract.endDate), state: "" },
  ];

  // 계약 기간 요약 문구
  const periodText =
    contract.startDate && contract.endDate
      ? `${dotDate(contract.startDate)} ~ ${dotDate(contract.endDate)} · 보증금 ${formatKoreanMoney(contract.deposit) || "-"}`
      : "계약 정보 없음";

  return (
    <div>
      <div style={styles.header}>
        <div>
          <div style={styles.title}>내 계약 타임라인</div>
          <div style={styles.sub}>{periodText}</div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={styles.ghostBtn} onClick={() => go("archive")}>보관함</button>
          <button style={styles.ghostBtn} onClick={() => go("settings")}>설정</button>
        </div>
      </div>

      <div style={styles.banner}>
        <div>
          <div style={styles.bannerTitle}>다가오는 할 일</div>
          <div style={styles.bannerDesc}>
            갱신 결정 시점: {monthsBefore(contract.endDate, 6)}
          </div>
        </div>
        <button style={styles.bannerBtn} onClick={() => go("decision")}>결정하러 가기</button>
      </div>

      <div style={styles.timelineRow}>
        {points.map((p, i) => (
          <div key={i} style={styles.point}>
            <div style={{ ...styles.dot, ...(p.state === "done" ? styles.dotDone : {}), ...(p.state === "active" ? styles.dotActive : {}) }} />
            <div style={styles.pointName}>{p.name}</div>
            <div style={styles.pointDate}>{p.date}</div>
          </div>
        ))}
      </div>

      {/* 만료일 시나리오 확인용 (임시): 반환확인 화면으로 */}
      <button style={{ ...styles.ghostBtn, marginTop: 20, width: "100%" }} onClick={() => go("returnCheck")}>
        (데모) 만료일 · 반환 확인으로 가기
      </button>
    </div>
  );
}

// ── 화면 3: 갱신 선택 (갱신/퇴거로 분기) ──
function Decision({ go }) {
  return (
    <div>
      <div style={styles.backRow}>
        <button style={styles.ghostBtn} onClick={() => go("timeline")}>← 타임라인으로</button>
      </div>
      <div style={styles.center}>
        <div style={styles.qIcon}>📅</div>
        <div style={styles.qTitle}>계약 만료가 6개월 남았어요</div>
        <div style={styles.qDesc}>이 집에서 계속 사실 건가요, 나가실 건가요?</div>
      </div>
      <div style={styles.choices}>
        {/* 갱신 → renew, 퇴거 → leave 로 분기 */}
        <button style={styles.choice} onClick={() => go("renew")}>
          <div style={styles.choiceIcon}>🏠</div>
          <div style={styles.choiceTitle}>갱신할래요</div>
          <div style={styles.choiceSub}>계속 살고 싶어요</div>
        </button>
        <button style={styles.choice} onClick={() => go("leave")}>
          <div style={styles.choiceIcon}>🚪</div>
          <div style={styles.choiceTitle}>나갈래요</div>
          <div style={styles.choiceSub}>이사 나갈 거예요</div>
        </button>
      </div>
    </div>
  );
}

// ── 화면 4: 갱신 결과 ──
function RenewResult({ go, addRecord, setNotified }) {
  // 선택한 통보 방법들(여러 개 가능 → 배열)
  const [methods, setMethods] = useState([]);
  const [done, setDone] = useState(false);

  // 방법을 하나 이상 골라야 하고, 완료 체크도 해야 저장 가능
  const canSave = methods.length > 0 && done;

  // 버튼 토글: 이미 있으면 빼고, 없으면 넣기
  const toggleMethod = (m) => {
    if (methods.includes(m)) {
      setMethods(methods.filter((x) => x !== m)); // 빼기
    } else {
      setMethods([...methods, m]); // 넣기
    }
  };

  const handleSave = () => {
    // 선택한 방법들을 쉼표로 이어서 기록에 저장
    addRecord({ icon: "🏠", title: "갱신 통보 완료", sub: `${methods.join(", ")}으로 통보` });
    setNotified(true); // 타임라인의 '갱신 결정'을 완료로 바꿈
    go("timeline");
  };

  const methodOptions = ["문자·카톡", "내용증명", "직접 얘기"];

  return (
    <div>
      <div style={styles.backRow}>
        <button style={styles.ghostBtn} onClick={() => go("decision")}>← 선택 다시 하기</button>
      </div>
      <div style={styles.titleRow}><span style={{ fontSize: 22 }}>🏠</span><span style={styles.title}>갱신하기로 하셨네요</span></div>
      <div style={styles.stepsGuide}>
        <div style={styles.sgTitle}>이렇게 진행하면 돼요</div>
        <div style={styles.sgItem}><span style={styles.sgNum}>1</span> 집주인에게 "갱신하겠다"고 통보해요</div>
        <div style={styles.sgItem}><span style={styles.sgNum}>2</span> 문자·카톡이면 캡처, 내용증명이면 영수증 보관</div>
        <div style={styles.sgItem}><span style={styles.sgNum}>3</span> 아래에서 통보 완료 표시를 남겨요</div>
      </div>
      <a href="https://www.easylaw.go.kr" target="_blank" rel="noopener noreferrer" style={styles.link}>
        정확한 문구·양식 확인하기 · 생활법령정보 ↗
      </a>

      {/* 통보 방법 선택 - 여러 개 선택 가능 */}
      <div style={styles.sectionLabel}>어떤 방법으로 통보하셨나요? <span style={styles.multiHint}>(여러 개 선택 가능)</span></div>
      <div style={styles.methodRow}>
        {methodOptions.map((m) => (
          <button
            key={m}
            style={methods.includes(m) ? { ...styles.methodBtn, ...styles.methodPicked } : styles.methodBtn}
            onClick={() => toggleMethod(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {/* 완료 체크 */}
      <label style={styles.doneCheck}>
        <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />
        <span>통보 완료했어요</span>
      </label>

      <button
        style={canSave ? styles.primaryBtn : { ...styles.primaryBtn, ...styles.btnDisabled }}
        onClick={handleSave}
        disabled={!canSave}
      >
        저장하고 타임라인으로
      </button>
    </div>
  );
}

// ── 화면 5: 퇴거 결과 ──
function LeaveResult({ go, addRecord, setNotified }) {
  const [methods, setMethods] = useState([]);
  const [done, setDone] = useState(false);
  const canSave = methods.length > 0 && done;

  const toggleMethod = (m) => {
    if (methods.includes(m)) {
      setMethods(methods.filter((x) => x !== m));
    } else {
      setMethods([...methods, m]);
    }
  };

  const handleSave = () => {
    addRecord({ icon: "🚪", title: "퇴거 통보 완료", sub: `${methods.join(", ")}으로 통보` });
    setNotified(true); // 타임라인의 '갱신 결정'을 완료로 바꿈
    go("timeline");
  };

  const methodOptions = ["문자·카톡", "내용증명", "직접 얘기"];

  return (
    <div>
      <div style={styles.backRow}>
        <button style={styles.ghostBtn} onClick={() => go("decision")}>← 선택 다시 하기</button>
      </div>
      <div style={styles.titleRow}><span style={{ fontSize: 22 }}>🚪</span><span style={styles.title}>나가기로 하셨네요</span></div>
      <div style={styles.warnBox}>
        <b>만료 2개월 전까지</b> 나가겠다는 의사를 꼭 알려야 해요. 안 그러면 계약이 자동 연장될 수 있어요.
      </div>
      <div style={styles.sectionLabel}>나갈 때 꼭 확인하세요</div>
      <div style={styles.noticeGroup}>
        <div style={styles.noticeItem}>
          <span style={styles.noticeDot} />
          <div>
            <div style={styles.noticeTitleDanger}>보증금 받기 전엔 전입신고 옮기지 않기</div>
            <div style={styles.noticeDesc}>미리 옮기면 보증금 지킬 권리(대항력)를 잃을 수 있어요</div>
          </div>
        </div>
        <div style={styles.noticeItem}>
          <span style={styles.noticeDot} />
          <div>
            <div style={styles.noticeTitle}>새 집 잔금일과 보증금 받는 날 맞추기</div>
            <div style={styles.noticeDesc}>두 날짜가 어긋나면 목돈이 잠깐 비어버릴 수 있어요</div>
          </div>
        </div>
        <div style={styles.noticeItem}>
          <span style={styles.noticeDot} />
          <div>
            <div style={styles.noticeTitle}>등기부등본 다시 확인하기</div>
            <div style={styles.noticeDesc}>근저당 등이 새로 잡혔는지 이사 전에 점검해요</div>
          </div>
        </div>
      </div>

      {/* 통보 방법 선택 - 여러 개 선택 가능 */}
      <div style={{ ...styles.sectionLabel, marginTop: 20 }}>어떤 방법으로 통보하셨나요? <span style={styles.multiHint}>(여러 개 선택 가능)</span></div>
      <div style={styles.methodRow}>
        {methodOptions.map((m) => (
          <button
            key={m}
            style={methods.includes(m) ? { ...styles.methodBtn, ...styles.methodPicked } : styles.methodBtn}
            onClick={() => toggleMethod(m)}
          >
            {m}
          </button>
        ))}
      </div>

      {/* 완료 체크 */}
      <label style={styles.doneCheck}>
        <input type="checkbox" checked={done} onChange={(e) => setDone(e.target.checked)} />
        <span>통보 완료했어요</span>
      </label>

      <button
        style={canSave ? styles.primaryBtn : { ...styles.primaryBtn, ...styles.btnDisabled }}
        onClick={handleSave}
        disabled={!canSave}
      >
        저장하고 타임라인으로
      </button>
    </div>
  );
}

// ── 화면 6: 반환 확인 (받음/못받음 분기) ──
function ReturnCheck({ go, addRecord }) {
  // 받았어요 → 반환 완료 기록 남기고 타임라인으로
  const handleReceived = () => {
    addRecord({ icon: "💰", title: "보증금 반환 완료", sub: "만료일에 보증금 수령" });
    go("timeline");
  };
  return (
    <div>
      <div style={styles.backRow}>
        <button style={styles.ghostBtn} onClick={() => go("timeline")}>← 타임라인으로</button>
      </div>
      <div style={styles.center}>
        <div style={styles.qIcon}>💵</div>
        <div style={styles.qTitle}>오늘은 계약 만료일이에요</div>
        <div style={styles.qDesc}>집주인에게 보증금을 돌려받으셨나요?</div>
      </div>
      <div style={styles.choices}>
        <button style={styles.choice} onClick={handleReceived}>
          <div style={styles.choiceIcon}>✅</div>
          <div style={styles.choiceTitle}>받았어요</div>
          <div style={styles.choiceSub}>보증금을 돌려받았어요</div>
        </button>
        <button style={styles.choice} onClick={() => go("unpaid")}>
          <div style={styles.choiceIcon}>⚠️</div>
          <div style={styles.choiceTitle}>아직이에요</div>
          <div style={styles.choiceSub}>아직 못 받았어요</div>
        </button>
      </div>
    </div>
  );
}

// ── 화면 7: 미반환 대응 ──
function UnpaidAction({ go, addRecord }) {
  const handleSave = () => {
    addRecord({ icon: "🛡️", title: "미반환 대응 확인", sub: "임차권등기명령 안내 확인" });
    go("archive");
  };
  return (
    <div>
      <div style={styles.backRow}>
        <button style={styles.ghostBtn} onClick={() => go("returnCheck")}>← 이전으로</button>
      </div>
      <div style={styles.titleRow}><span style={{ fontSize: 22 }}>🛡️</span><span style={styles.title}>보증금을 아직 못 받으셨군요</span></div>
      <div style={styles.keyWarn}>
        <div style={styles.keyWarnTitle}>⚠️ 이사보다 '임차권등기명령'이 먼저예요</div>
        <p style={{ fontSize: 12, color: "#6b6558", lineHeight: 1.6, margin: 0 }}>
          등기가 끝나기 전에 이사하면 보증금 받을 권리(대항력)를 잃을 수 있어요.
        </p>
      </div>
      <a href="https://ecfs.scourt.go.kr" target="_blank" rel="noopener noreferrer" style={styles.link}>
        1. 임차권등기명령 신청 · 대법원 전자소송 ↗
      </a>
      <a href="https://www.klac.or.kr" target="_blank" rel="noopener noreferrer" style={styles.link}>
        2. 무료 법률상담 · 대한법률구조공단 ↗
      </a>
      <a href="https://www.khug.or.kr/jeonse" target="_blank" rel="noopener noreferrer" style={styles.link}>
        3. 전세사기 피해자 지원 · HUG ↗
      </a>
      <button style={{ ...styles.primaryBtn, marginTop: 8 }} onClick={handleSave}>확인했어요, 보관함에 기록</button>
    </div>
  );
}

// ── 화면 8: 보관함 ──
// App에서 records(기록 배열)를 받아서 표시
function Archive({ go, records }) {
  return (
    <div>
      <div style={styles.header}>
        <span style={styles.title}>보관함</span>
        <button style={styles.ghostBtn} onClick={() => go("timeline")}>← 타임라인으로</button>
      </div>

      {records.length === 0 ? (
        // 기록이 하나도 없을 때: 빈 화면 안내
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>📦</div>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 8 }}>아직 보관된 게 없어요</div>
          <div style={{ fontSize: 13, color: "#6b6558", lineHeight: 1.7 }}>
            갱신·퇴거 통보를 완료하면 여기에 자동으로 기록돼요.
          </div>
        </div>
      ) : (
        // 기록이 있을 때: 목록으로 표시
        <>
          {records.map((r, i) => (
            <div key={i} style={styles.record}>
              <div style={styles.recordIcon}>{r.icon}</div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{r.title}</div>
                <div style={{ fontSize: 12, color: "#6b6558", marginTop: 2 }}>{r.sub}</div>
              </div>
              <div style={{ fontSize: 12, color: "#999" }}>{r.date}</div>
            </div>
          ))}
          <div style={styles.disclaimer}>ℹ️ 이 기록은 참고용 메모예요. 법적 증빙 효력을 보장하지는 않아요.</div>
        </>
      )}
    </div>
  );
}

// ── 화면 9: 설정 ──
function Settings({ go }) {
  return (
    <div>
      <div style={styles.header}>
        <span style={styles.title}>설정</span>
        <button style={styles.ghostBtn} onClick={() => go("timeline")}>← 타임라인으로</button>
      </div>
      {["내 계약 관리", "알림 시점 조절", "개인정보 처리방침"].map((m, i) => (
        <div key={i} style={styles.menuItem}><span>{m}</span><span style={{ color: "#b4b2a9" }}>›</span></div>
      ))}
      <div style={styles.disclaimerBox}>
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 8 }}>⚠️ 꼭 알아두세요</div>
        <p style={{ fontSize: 12, color: "#6b6558", lineHeight: 1.7, margin: 0 }}>
          이 앱은 법률 자문이 아닌 일정 안내 서비스입니다. 정확한 법적 판단은 공식 기관이나 전문가를 통해 확인해주세요.
        </p>
      </div>
    </div>
  );
}

// ============================================================
// 스타일
// ============================================================
const styles = {
  page: { minHeight: "100vh", background: "#f0ede6", display: "flex", flexDirection: "column", alignItems: "center", padding: "40px 20px", fontFamily: "-apple-system, 'Noto Sans KR', sans-serif", color: "#2a2724" },
  card: { width: "100%", maxWidth: 560, background: "#fff", border: "1px solid #e5e2da", borderRadius: 12, padding: 32, boxSizing: "border-box" },
  debug: { marginTop: 16, fontSize: 12, color: "#999", background: "#fff", padding: "6px 12px", borderRadius: 20, border: "1px solid #e5e2da" },
  header: { display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #eeece5", paddingBottom: 16, marginBottom: 20 },
  title: { fontSize: 18, fontWeight: 700 },
  sub: { fontSize: 12, color: "#999", marginTop: 3 },
  step: { fontSize: 12, color: "#999" },
  desc: { fontSize: 14, color: "#6b6558", lineHeight: 1.6, marginBottom: 20 },
  label: { display: "block", fontSize: 13, color: "#6b6558", margin: "12px 0 6px" },
  input: { width: "100%", height: 44, padding: "0 12px", border: "1px solid #d5cdbb", borderRadius: 8, fontSize: 15, boxSizing: "border-box" },
  depositWord: { fontSize: 13, color: "#35586b", marginTop: 8, fontWeight: 500 },
  primaryBtn: { width: "100%", height: 48, marginTop: 24, background: "#35586b", color: "#fff", border: "none", borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: "pointer" },
  ghostBtn: { padding: "8px 14px", background: "#fff", border: "1px solid #d5cdbb", borderRadius: 8, fontSize: 13, color: "#6b6558", cursor: "pointer" },
  banner: { display: "flex", alignItems: "center", gap: 12, background: "#fbf3e2", borderRadius: 8, padding: 16, marginBottom: 26 },
  bannerTitle: { fontSize: 14, fontWeight: 700, color: "#8a5a1a" },
  bannerDesc: { fontSize: 13, color: "#a06f2a", marginTop: 3 },
  bannerBtn: { marginLeft: "auto", height: 38, padding: "0 16px", background: "#b07a2a", color: "#fff", border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" },
  timelineRow: { display: "flex", justifyContent: "space-between" },
  point: { display: "flex", flexDirection: "column", alignItems: "center", width: "22%", textAlign: "center" },
  dot: { width: 22, height: 22, borderRadius: "50%", background: "#fff", border: "2px solid #b4b2a9" },
  dotDone: { background: "#3f6e4f", border: "2px solid #3f6e4f" },
  dotActive: { background: "#b07a2a", border: "2px solid #b07a2a" },
  pointName: { fontSize: 12, fontWeight: 500, color: "#6b6558", marginTop: 10 },
  pointDate: { fontSize: 11, color: "#999", marginTop: 2 },
  backRow: { marginBottom: 16 },
  titleRow: { display: "flex", alignItems: "center", gap: 10, marginBottom: 16 },
  center: { textAlign: "center", padding: "24px 0 28px" },
  qIcon: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 56, height: 56, borderRadius: "50%", background: "#fbf3e2", fontSize: 28, marginBottom: 16 },
  qTitle: { fontSize: 20, fontWeight: 700 },
  qDesc: { fontSize: 14, color: "#6b6558", marginTop: 8 },
  choices: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 },
  choice: { display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "28px 16px", background: "#fff", border: "1px solid #d5cdbb", borderRadius: 12, cursor: "pointer" },
  choiceIcon: { fontSize: 32 },
  choiceTitle: { fontSize: 16, fontWeight: 700 },
  choiceSub: { fontSize: 12, color: "#6b6558" },
  stepsGuide: { background: "#eef3f6", borderRadius: 12, padding: "16px 18px", marginBottom: 20 },
  sgTitle: { fontSize: 13, fontWeight: 700, color: "#35586b", marginBottom: 12 },
  sgItem: { display: "flex", alignItems: "center", gap: 10, fontSize: 13, color: "#35586b", marginBottom: 10 },
  sgNum: { flexShrink: 0, width: 20, height: 20, borderRadius: "50%", background: "#35586b", color: "#fff", fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center" },
  link: { display: "block", padding: "12px 14px", background: "#eef3f6", borderRadius: 8, fontSize: 13, color: "#35586b", textDecoration: "none", marginBottom: 10 },
  warnBox: { background: "#fbf3e2", borderRadius: 8, padding: "12px 14px", fontSize: 12, color: "#a06f2a", lineHeight: 1.6, marginBottom: 20 },
  sectionLabel: { fontSize: 13, fontWeight: 700, marginBottom: 10 },
  checkItem: { display: "flex", alignItems: "center", gap: 10, padding: 14, border: "1px solid #eeece5", borderRadius: 8, fontSize: 13, marginBottom: 8, cursor: "pointer" },
  checkDanger: { border: "1.5px solid #d99a9a", color: "#b83232", fontWeight: 500 },
  noticeGroup: { border: "1px solid #eeece5", borderRadius: 12, padding: 18, marginBottom: 16, display: "flex", flexDirection: "column", gap: 16 },
  noticeItem: { display: "flex", gap: 10, alignItems: "flex-start" },
  noticeDot: { flexShrink: 0, width: 6, height: 6, borderRadius: "50%", background: "#b4b2a9", marginTop: 6 },
  noticeTitle: { fontSize: 13, fontWeight: 500, color: "#2a2724" },
  noticeTitleDanger: { fontSize: 13, fontWeight: 500, color: "#b83232" },
  noticeDesc: { fontSize: 12, color: "#6b6558", marginTop: 3, lineHeight: 1.5 },
  methodRow: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 16 },
  multiHint: { fontSize: 12, fontWeight: 400, color: "#999" },
  methodBtn: { padding: 10, background: "#fff", border: "1px solid #d5cdbb", borderRadius: 8, fontSize: 13, color: "#2a2724", cursor: "pointer" },
  methodPicked: { background: "#35586b", color: "#fff", border: "1px solid #35586b" },
  doneCheck: { display: "flex", alignItems: "center", gap: 10, padding: 14, border: "1px solid #d5cdbb", borderRadius: 8, fontSize: 14, fontWeight: 500, marginBottom: 16, cursor: "pointer" },
  btnDisabled: { background: "#cfcabf", cursor: "not-allowed", marginTop: 0 },
  keyWarn: { border: "1.5px solid #d99a9a", borderRadius: 12, padding: "16px 18px", marginBottom: 20 },
  keyWarnTitle: { fontSize: 14, fontWeight: 700, color: "#b83232", marginBottom: 8 },
  record: { display: "flex", gap: 12, padding: 14, border: "1px solid #eeece5", borderRadius: 8, marginBottom: 10, alignItems: "center" },
  recordIcon: { flexShrink: 0, width: 36, height: 36, borderRadius: "50%", background: "#f5f3ee", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 },
  disclaimer: { display: "flex", gap: 8, padding: 12, background: "#f7f5f0", borderRadius: 8, fontSize: 12, color: "#6b6558", lineHeight: 1.6, marginTop: 12 },
  menuItem: { display: "flex", alignItems: "center", justifyContent: "space-between", padding: 14, border: "1px solid #eeece5", borderRadius: 8, fontSize: 13, marginBottom: 8 },
  disclaimerBox: { border: "1px solid #eeece5", borderRadius: 12, padding: "16px 18px", background: "#f7f5f0", marginTop: 14 },
};
