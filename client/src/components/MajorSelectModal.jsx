import { useState, useMemo } from 'react';
import { MAJOR_DATA } from '../data/majorData';
import './MajorSelectModal.css';

export default function MajorSelectModal({ onConfirm }) {
  const [college, setCollege] = useState('');
  const [department, setDepartment] = useState('');
  const [major, setMajor] = useState('');
  const [track, setTrack] = useState('');

  const departments = useMemo(
    () => (college ? Object.keys(MAJOR_DATA[college]) : []),
    [college]
  );
  const majors = useMemo(
    () => (college && department ? Object.keys(MAJOR_DATA[college][department]) : []),
    [college, department]
  );
  const majorInfo = college && department && major
    ? MAJOR_DATA[college][department][major]
    : null;

  const handleCollegeChange = (e) => {
    setCollege(e.target.value);
    setDepartment('');
    setMajor('');
    setTrack('');
  };

  const handleDepartmentChange = (e) => {
    setDepartment(e.target.value);
    setMajor('');
    setTrack('');
  };

  const handleMajorChange = (e) => {
    setMajor(e.target.value);
    setTrack('');
  };

  const canConfirm = majorInfo && (!majorInfo.hasTracks || track);

  const handleConfirm = () => {
    const trackInfo = majorInfo.hasTracks ? majorInfo.tracks[track] : null;
    onConfirm({
      college,
      department,
      major,
      totalCredits: majorInfo.totalCredits,
      majorCredits: majorInfo.majorCredits,
      track: track || null,
      trackInfo,
    });
  };

  return (
    <div className="major-modal-overlay">
      <div className="major-modal">
        <h2 className="major-modal-title">학과 정보를 선택해주세요</h2>
        <p className="major-modal-sub">
          선택하신 학과의 졸업요건을 자동으로 불러와요.
        </p>

        <div className="major-field">
          <label>단과대학</label>
          <select value={college} onChange={handleCollegeChange}>
            <option value="">선택하세요</option>
            {Object.keys(MAJOR_DATA).map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div className="major-field">
          <label>학부</label>
          <select value={department} onChange={handleDepartmentChange} disabled={!college}>
            <option value="">선택하세요</option>
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        <div className="major-field">
          <label>학과(전공)</label>
          <select value={major} onChange={handleMajorChange} disabled={!department}>
            <option value="">선택하세요</option>
            {majors.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>

        {majorInfo?.hasTracks && (
          <div className="major-field">
            <label>트랙</label>
            <select value={track} onChange={(e) => setTrack(e.target.value)}>
              <option value="">선택하세요</option>
              {Object.entries(majorInfo.tracks).map(([key, t]) => (
                <option key={key} value={key}>{t.name}</option>
              ))}
            </select>
          </div>
        )}

        {majorInfo && (
          <div className="major-preview">
            <div className="major-preview-row">
              <span>총 졸업학점</span>
              <strong>{majorInfo.totalCredits}학점</strong>
            </div>
            <div className="major-preview-row">
              <span>전공학점</span>
              <strong>{majorInfo.majorCredits}학점</strong>
            </div>
            {track && majorInfo.tracks[track].requirements.map((req, i) => (
              <div className="major-preview-row" key={i}>
                <span>{req.label}</span>
                <strong>{req.type === 'binary' ? '필수' : `${req.value}${req.unit}`}</strong>
              </div>
            ))}
          </div>
        )}

        <button
          type="button"
          className="major-confirm-btn"
          disabled={!canConfirm}
          onClick={handleConfirm}
        >
          확인
        </button>
      </div>
    </div>
  );
}