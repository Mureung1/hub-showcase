import { useState, useEffect } from 'react';
import axios from 'axios';
import './RecordForm.css';

const API_BASE = 'http://localhost:4000/api'; // http 꼭 유지! (SSL 에러 방지)
const USER_ID = 'test-user-1'; // 지금은 임시 고정값, 나중에 로그인 연동 시 교체 예정

function RecordForm() {
  // 졸업요건 입력값
  const [reqTotal, setReqTotal] = useState('');
  const [reqMajor, setReqMajor] = useState('');
  const [reqGeneral, setReqGeneral] = useState('');
  const [submittedReq, setSubmittedReq] = useState(null);

  // 이수내역 입력값
  const [progTotal, setProgTotal] = useState('');
  const [progMajor, setProgMajor] = useState('');
  const [progGeneral, setProgGeneral] = useState('');

  // 서버에서 불러온 저장 데이터
  const [savedRecord, setSavedRecord] = useState(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [modalStep, setModalStep] = useState(null);

  // 화면이 처음 뜰 때, 이미 저장된 데이터가 있는지 확인
  useEffect(() => {
    fetchRecord();
  }, []);

  const fetchRecord = async () => {
    try {
      const res = await axios.get(`${API_BASE}/records/${USER_ID}`);
      setSavedRecord(res.data);
    } catch (err) {
      // 404면 아직 저장된 데이터가 없는 것 (정상적인 첫 방문 상태)
      setSavedRecord(null);
    }
  };

  const handleSubmitReq = () => {
    setSubmittedReq({
      total: reqTotal || '130',
      major: reqMajor || '51',
      general: reqGeneral || '30',
    });
    setModalStep('progress');
  };

  const handleSubmitProgress = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      await axios.post(`${API_BASE}/records`, {
        userId: USER_ID,
        totalCredits: Number(progTotal) || 0,
        majorCredits: Number(progMajor) || 0,
        generalCredits: Number(progGeneral) || 0,
      });
      await fetchRecord(); // 저장 후 다시 조회해서 화면 갱신
      setModalStep(null);
    } catch (err) {
      setErrorMsg('저장에 실패했어요. 잠시 후 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="record-form-wrap">
      <div className="record-summary">
        <button className="cta" onClick={() => setModalStep('grad')}>
          졸업요건 입력하기
        </button>
        <button className="cta" onClick={() => setModalStep('progress')}>
          이수학점 입력하기
        </button>
      </div>

      {submittedReq && (
        <div className="req-summary-bar">
          <span>목표 총 {submittedReq.total}학점</span>
          <span className="req-summary-sep">|</span>
          <span>전공 {submittedReq.major}학점</span>
          <span className="req-summary-sep">|</span>
          <span>교양 {submittedReq.general}학점</span>
        </div>
      )}

      {savedRecord && (
        <div className="req-summary-bar">
          <span>✅ 저장된 이수 총 {savedRecord.total_credits}학점</span>
          <span className="req-summary-sep">|</span>
          <span>전공 {savedRecord.major_credits}학점</span>
          <span className="req-summary-sep">|</span>
          <span>교양 {savedRecord.general_credits}학점</span>
        </div>
      )}

      {errorMsg && <p style={{ color: 'red', textAlign: 'center' }}>{errorMsg}</p>}

      {/* 졸업요건 입력 모달 */}
      {modalStep === 'grad' && (
        <div className="req-modal-overlay" onClick={() => setModalStep(null)}>
          <div className="req-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="req-modal-close" onClick={() => setModalStep(null)} aria-label="닫기">
              ✕
            </button>
            <h2 className="req-modal-title">졸업요건을 입력해주세요</h2>
            <p className="req-modal-sub">입력한 요건은 아래 요약 바에서 확인하고 언제든 다시 수정할 수 있어요.</p>
            <div className="req-field">
              <label htmlFor="reqTotalInput">총 이수 학점</label>
              <input id="reqTotalInput" type="number" value={reqTotal} onChange={(e) => setReqTotal(e.target.value)} placeholder="예: 130" />
            </div>
            <div className="req-field">
              <label htmlFor="reqMajorInput">전공 이수 학점</label>
              <input id="reqMajorInput" type="number" value={reqMajor} onChange={(e) => setReqMajor(e.target.value)} placeholder="예: 51" />
            </div>
            <div className="req-field">
              <label htmlFor="reqGeneralInput">교양 이수 학점</label>
              <input id="reqGeneralInput" type="number" value={reqGeneral} onChange={(e) => setReqGeneral(e.target.value)} placeholder="예: 30" />
            </div>
            <button type="button" className="cta req-modal-submit" onClick={handleSubmitReq}>
              적용하기
            </button>
          </div>
        </div>
      )}

      {/* 이수내역 입력 모달 */}
      {modalStep === 'progress' && (
        <div className="req-modal-overlay" onClick={() => setModalStep(null)}>
          <div className="req-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="req-modal-close" onClick={() => setModalStep(null)} aria-label="닫기">
              ✕
            </button>
            <h2 className="req-modal-title">지금까지 들은 학점을 기입해주세요</h2>
            <p className="req-modal-sub">입력한 이수학점은 저장되어 다음에 다시 접속해도 유지돼요.</p>
            <div className="req-field">
              <label htmlFor="progTotalInput">총 이수 학점</label>
              <input id="progTotalInput" type="number" value={progTotal} onChange={(e) => setProgTotal(e.target.value)} placeholder="예: 84" />
            </div>
            <div className="req-field">
              <label htmlFor="progMajorInput">전공 이수 학점</label>
              <input id="progMajorInput" type="number" value={progMajor} onChange={(e) => setProgMajor(e.target.value)} placeholder="예: 36" />
            </div>
            <div className="req-field">
              <label htmlFor="progGeneralInput">교양 이수 학점</label>
              <input id="progGeneralInput" type="number" value={progGeneral} onChange={(e) => setProgGeneral(e.target.value)} placeholder="예: 20" />
            </div>
            <button type="button" className="cta req-modal-submit" onClick={handleSubmitProgress} disabled={loading}>
              {loading ? '저장 중...' : '적용하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RecordForm;