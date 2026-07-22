// ============================================================================
// pages/ParkingLotDetail.jsx — 화면 3: 주차장 상세 (주소 "/parking-lots/:id")
// ----------------------------------------------------------------------------
// 검색 결과 카드를 누르면 오는 화면. URL의 :id로 백엔드 상세 API를 호출해
// 이름·주소·전화·기본정보·요금·운영시간을 보여준다.
//
// [useParams] URL "경로"의 가변 부분(:id)을 읽는 훅. /parking-lots/416 이면 id="416".
//   (검색은 ?destination= 라는 "쿼리스트링"이라 useSearchParams, 상세는 경로 조각이라 useParams)
// [실시간 여유 대수는 아직 백엔드(OA-21709) 미구현 → 이번엔 정적 정보만. 실시간 카드는 TODO.]
// ============================================================================

import { useNavigate, useParams } from 'react-router-dom';
import { EmptyState, ErrorState } from '../components/ResultStates.jsx';
import { useParkingLotDetail } from '../hooks/useParkingLotDetail.js';

// [enum → 한글 라벨] 백엔드가 주는 코드값(enum name)을 화면용 한글로 바꾼다.
//   백엔드 ParkingKind/OperType/PayType enum의 name() 값과 1:1로 대응.
const PARKING_KIND_LABEL = { OUTDOOR: '노외', ON_STREET: '노상' };
const OPER_TYPE_LABEL = {
  TIME_BASED: '시간제',
  RESIDENT_PRIORITY: '거주자우선',
  TIME_AND_RESIDENT: '시간제+거주자',
};
const PAY_TYPE_LABEL = { PAID: '유료', FREE: '무료' };

// [순수 함수] 금액(숫자) → "1,000원". 값이 없으면 '-'.
//   toLocaleString(): 천 단위 콤마 자동(1000 → "1,000").
function formatWon(won) {
  if (won == null) return '-';
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
  const { name, address, tel, parkingKind, operType, totalSlots, payType, fee, operatingHours } = data;

  return (
    <>
      <TopBar onBack={goBack} />

      <h1 className="detail-title">{name}</h1>
      {/* address가 있을 때만(&&) 주소 줄을 그린다 */}
      {address && <p className="detail-addr">{address}</p>}

      {/* TODO: 실시간 주차 가능 대수 카드 — 백엔드 실시간(OA-21709) 연동 후 추가 */}

      <div className="info-card">
        <h3>기본 정보</h3>
        <InfoRow label="종류" value={PARKING_KIND_LABEL[parkingKind]} />
        <InfoRow label="운영구분" value={OPER_TYPE_LABEL[operType]} />
        <InfoRow label="요금" value={PAY_TYPE_LABEL[payType]} />
        <InfoRow label="총 주차면수" value={totalSlots != null ? `${totalSlots}면` : null} />
        {tel && <InfoRow label="전화" value={tel} />}
      </div>

      <div className="info-card">
        <h3>요금 정보</h3>
        {/* fee 객체의 각 필드로 요금 행 구성. fee?.x = fee가 없으면 에러 없이 undefined */}
        <InfoRow label={`기본 ${fee?.basicMinutes ?? '-'}분`} value={formatWon(fee?.basicFee)} />
        <InfoRow label={`추가 ${fee?.extraUnitMin ?? '-'}분`} value={formatWon(fee?.extraUnitFee)} />
        <InfoRow label="일 최대" value={formatWon(fee?.dayMaxFee)} />
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
