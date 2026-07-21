import './Header.css';
import UserSelect from './UserSelect';

function Header({ members, currentMemberId, onChangeCurrentMember }) {
  return (
    <header className="page-header">
      <div>
        <h1>할 일</h1>
        <p className="subtitle">우리 팀 · 팀원 {members.length}명</p>
      </div>
      <UserSelect
        members={members}
        currentMemberId={currentMemberId}
        onChange={onChangeCurrentMember}
      />
    </header>
  );
}

export default Header;
