import { useState } from 'react';
import './TeamJoin.css';
import { getTeamByCode } from '../api/teams';
import { getMembers } from '../api/members';

function TeamJoin({ onJoin }) {
  const [step, setStep] = useState('code');
  const [code, setCode] = useState('');
  const [team, setTeam] = useState(null);
  const [members, setMembers] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleJoinCode() {
    const trimmedCode = code.trim();
    if (!trimmedCode) return;

    setLoading(true);
    setError('');
    try {
      const foundTeam = await getTeamByCode(trimmedCode);
      const teamMembers = await getMembers(foundTeam.id);
      setTeam(foundTeam);
      setMembers(teamMembers);
      setStep('select');
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || '존재하지 않는 초대코드입니다.');
    } finally {
      setLoading(false);
    }
  }

  function handleBackToCode() {
    setStep('code');
    setTeam(null);
    setMembers([]);
    setCode('');
    setError('');
  }

  function handleSelectMember(memberId) {
    onJoin(team.id, memberId);
  }

  if (step === 'select') {
    return (
      <div className="team-join-card">
        <p className="team-join-welcome">
          <strong>{team.name}</strong>팀에 입장했어요
        </p>
        <div className="team-join-member-list">
          {members.map((member) => (
            <button
              key={member.id}
              type="button"
              className="team-join-member-option"
              onClick={() => handleSelectMember(member.id)}
            >
              <span className="team-join-avatar">{member.name.slice(0, 1)}</span>
              <span>{member.name}</span>
            </button>
          ))}
        </div>
        <button type="button" className="team-join-back-link" onClick={handleBackToCode}>
          다른 코드 입력
        </button>
      </div>
    );
  }

  return (
    <div className="team-join-card">
      <div className="team-join-field">
        <label className="team-join-field-label" htmlFor="inviteCode">초대코드</label>
        <input
          id="inviteCode"
          type="text"
          className="team-join-input"
          placeholder="예: TEAM01"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
      </div>
      {error && <div className="team-join-error">{error}</div>}
      <button
        type="button"
        className="team-join-submit-btn"
        onClick={handleJoinCode}
        disabled={loading}
      >
        {loading ? '확인 중...' : '입장'}
      </button>
    </div>
  );
}

export default TeamJoin;
