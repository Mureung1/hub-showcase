// ============================================================================
// pages/ParkingLotDetail.jsx — 화면 3: 주차장 상세 (주소 "/parking-lots/:id")
// ----------------------------------------------------------------------------
// 검색 결과 카드를 누르면 오는 화면. URL의 :id로 백엔드 상세 API를 호출해
// 이름·주소·전화·기본정보·요금·운영시간을 보여준다.
//
// [useParams] URL "경로"의 가변 부분(:id)을 읽는 훅. /parking-lots/416 이면 id="416".
//   (검색은 ?destination= 라는 "쿼리스트링"이라 useSearchParams, 상세는 경로 조각이라 useParams)
//
// [백엔드 계약] 상세 API(GET /api/parking-lots/{id})가 주는 항목:
//   정적: name·address·tel·parkingKind·operType·totalSlots·payType·fee·operatingHours
//   실시간: realtimeInfo (있으면 { availableSlots, totalSlots, status, sourceUpdatedAt }, 없으면 null)
//   → realtimeInfo 가 null 이면 "실시간 정보 없음"으로 표시한다.
// ============================================================================

import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState, ErrorState } from '../components/ResultStates.jsx';
import { useParkingLotDetail } from '../hooks/useParkingLotDetail.js';
import { toRealtimeStatus } from '../utils/realtimeStatus.js';

// [enum → 한글 라벨] 백엔드가 주는 코드값(enum name)을 화면용 한글로 바꾼다.
//   백엔드 ParkingKind/OperType/PayType enum의 name() 값과 1:1로 대응.
const PARKING_KIND_LABEL = { OUTDOOR: '노외', ON_STREET: '노상' };
const OPER_TYPE_LABEL = {
  TIME_BASED: '시간제',
  RESIDENT_PRIORITY: '거주자우선',
  TIME_AND_RESIDENT: '시간제+거주자',
  BUS_ONLY: '버스전용',
  UNKNOWN: '정보 없음',
};
const PAY_TYPE_LABEL = { PAID: '유료', FREE: '무료' };

// [enum 라벨 조회] 매핑에 없는 값(백엔드가 새 코드 추가 등)이면 '정보 없음'으로 안전하게 표시.
function toLabel(labelMap, code) {
  return labelMap[code] ?? '정보 없음';
}

// [값 없음 표시] 값이 없을 때: 전화번호가 있으면 '전화 문의'(사용자를 다음 행동으로 안내),
//   없으면 '정보 없음'. 요금·운영시간 등 값이 비었을 때 공통으로 쓴다.
function fallbackText(tel) {
  return tel ? '전화 문의' : '정보 없음';
}

// [요금 값 있음?] 서울 API는 '미제공'을 null이 아니라 0으로 준다. 그래서 0·null 모두 '없음'으로 본다.
function hasValue(v) {
  return v != null && v > 0;
}

// [금액 → "1,000원"] toLocaleString(): 천 단위 콤마 자동(1000 → "1,000").
function toWon(won) {
  return `${won.toLocaleString()}원`;
}

// "0900" → "09:00" (앞 2자리 : 뒤 2자리)
function toHhmm(hhmm) {
  return `${hhmm.slice(0, 2)}:${hhmm.slice(2)}`;
}

// [순수 함수] HHMM 문자열 두 개 → 사람이 읽는 운영시간.
//   "0000"~"2400" → "24시간", 그 외 → "09:00 ~ 18:00", 값 없으면 "정보 없음".
function formatOperatingTime(start, end) {
  if (!start || !end) return '정보 없음';
  if (start === '0000' && end === '2400') return '24시간';
  return `${toHhmm(start)} ~ ${toHhmm(end)}`;
}

// [순수 함수] 백엔드 갱신시각(ISO 문자열) → "09:41" (시:분).
//   실시간 데이터를 "언제 잰 값인지" 사용자에게 보여준다. 값 없으면 빈 문자열.
function formatUpdatedTime(isoString) {
  if (!isoString) return '';
  const time = new Date(isoString);
  const hh = String(time.getHours()).padStart(2, '0');
  const mm = String(time.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

/** 화면 3: 주차장 상세 (/parking-lots/:id) */
function ParkingLotDetail() {
  const navigate = useNavigate();
  const { id } = useParams(); // URL의 :id (문자열)

  // 검색 훅과 같은 방식으로 상태를 구조분해로 받는다.
  const { data, isLoading, isError, error, isFetching, refetch } =
    useParkingLotDetail(id);

  const isNotFound = error?.response?.status === 404; // 없는 주차장(404)인지

  // 뒤로가기(목록으로). navigate(-1)은 브라우저 히스토리에서 한 칸 뒤 → 왔던 검색 결과로 돌아간다.
  const goBack = () => navigate(-1);

  // ── 상태별 화면 분기 (상단 바는 어느 상태든 공통으로 보여준다) ──
  if (isLoading) {
    return (
      <>
        <TopBar onBack={goBack} />
        <div className="state" role="status">불러오는 중…</div>
      </>
    );
  }
  if (isNotFound) {
    return (
      <>
        <TopBar onBack={goBack} />
        <EmptyState title="주차장을 찾을 수 없어요" sub="목록에서 다시 선택해 주세요" />
      </>
    );
  }
  if (isError) {
    return (
      <>
        <TopBar onBack={goBack} />
        <ErrorState onRetry={() => refetch()} isRetrying={isFetching} />
      </>
    );
  }

  // ── 여기부턴 성공(data 있음) ── 필요한 값들을 구조분해로 꺼낸다.
  const { name, address, tel, parkingKind, operType, totalSlots, payType, fee, operatingHours, realtimeInfo } = data;

  return (
    <>
      <TopBar onBack={goBack} />

      <h1 className="detail-title">{name}</h1>
      {/* address가 있을 때만(&&) 주소 줄을 그린다 */}
      {address && <p className="detail-addr">{address}</p>}

      {/* 실시간 카드: realtimeInfo 가 있으면 가용 대수·상태를, 없으면 "정보 없음"을 보여준다. */}
      <RealtimeCard realtimeInfo={realtimeInfo} />

      <div className="info-card">
        <h3>기본 정보</h3>
        <InfoRow label="종류" value={toLabel(PARKING_KIND_LABEL, parkingKind)} />
        <InfoRow label="운영구분" value={toLabel(OPER_TYPE_LABEL, operType)} />
        <InfoRow label="요금" value={toLabel(PAY_TYPE_LABEL, payType)} />
        <InfoRow label="총 주차면수" value={totalSlots != null ? `${totalSlots}면` : null} />
        {tel && <InfoRow label="전화번호" value={tel} />}
      </div>

      <div className="info-card">
        <h3>요금 정보</h3>
        {/* 무료 주차장은 요금 항목을 나열하지 않고 '무료'만.
            유료는 각 줄마다 값이 있으면 표시, 없으면(0·null) 전화 문의/정보 없음.
            요금(fee)·시간(minutes)은 쌍이라 둘 다 있어야 "기본 30분 1,000원"으로 보여준다. */}
        {payType === 'FREE' ? (
          <InfoRow label="요금" value="무료" />
        ) : (
          <>
            <InfoRow
              label={hasValue(fee?.basicMinutes) ? `기본 ${fee.basicMinutes}분` : '기본 요금'}
              value={hasValue(fee?.basicFee) && hasValue(fee?.basicMinutes) ? toWon(fee.basicFee) : fallbackText(tel)}
            />
            <InfoRow
              label={hasValue(fee?.extraUnitMin) ? `추가 ${fee.extraUnitMin}분` : '추가 요금'}
              value={hasValue(fee?.extraUnitFee) && hasValue(fee?.extraUnitMin) ? toWon(fee.extraUnitFee) : fallbackText(tel)}
            />
            <InfoRow
              label="일 최대"
              value={hasValue(fee?.dayMaxFee) ? toWon(fee.dayMaxFee) : fallbackText(tel)}
            />
          </>
        )}
      </div>

      <div className="info-card">
        <h3>운영시간</h3>
        <InfoRow label="평일" value={formatOperatingTime(operatingHours?.weekdayStart, operatingHours?.weekdayEnd)} />
        <InfoRow label="주말" value={formatOperatingTime(operatingHours?.weekendStart, operatingHours?.weekendEnd)} />
        <InfoRow label="공휴일" value={formatOperatingTime(operatingHours?.holidayStart, operatingHours?.holidayEnd)} />
      </div>
    </>
  );
}

// 실시간 주차 가능 대수 카드.
// realtimeInfo 가 null 이면(실시간 미제공) "정보 없음" 카드를, 있으면 가용 대수·상태·갱신시각을 보여준다.
function RealtimeCard({ realtimeInfo }) {
  // 실시간 데이터가 없는 주차장 → 회색 "정보 없음" 카드.
  if (!realtimeInfo) {
    return (
      <div className="rt-card rt-card--none">
        <div className="rt-head">실시간 주차 가능 대수</div>
        <div className="rt-none-text">실시간 정보를 제공하지 않는 주차장이에요</div>
      </div>
    );
  }

  // status(SPACIOUS 등) → { label 한글, modifier 색클래스 }.
  const { availableSlots, totalSlots, status, sourceUpdatedAt } = realtimeInfo;
  const realtimeStatus = toRealtimeStatus(status);

  return (
    <div className="rt-card">
      <div className="rt-head">실시간 주차 가능 대수</div>
      {/* 상태색(modifier)에 따라 숫자 색이 바뀐다: 여유=초록 / 보통=노랑 / 혼잡·만차=빨강 */}
      <div className={`rt-num rt-num--${realtimeStatus.modifier}`}>
        {availableSlots}
        <span className="rt-unit">면 {realtimeStatus.label}</span>
        <span className="rt-total">/ 총 {totalSlots}면</span>
      </div>
      {/* 갱신시각: 이 실시간 값을 언제(공공데이터 기준) 잰 것인지 */}
      {sourceUpdatedAt && (
        <div className="rt-updated">공공데이터 기준 {formatUpdatedTime(sourceUpdatedAt)} 업데이트</div>
      )}
      <p className="rt-note">실제 현장 상황과 차이가 있을 수 있어요</p>
    </div>
  );
}

// 상단 뒤로가기 바. 작은 컴포넌트로 분리해 로딩/에러 등 여러 상태 화면과 공유한다.
function TopBar({ onBack }) {
  return (
    <div className="topbar">
      <button type="button" className="back" onClick={onBack}>
        &lsaquo; 목록으로
      </button>
    </div>
  );
}

// 라벨-값 한 줄(정보 카드의 각 행). value가 없으면 '-'로 표시.
function InfoRow({ label, value }) {
  return (
    <div className="info-row">
      <span className="label">{label}</span>
      <span className="value">{value ?? '-'}</span>
    </div>
  );
}

export default ParkingLotDetail;
