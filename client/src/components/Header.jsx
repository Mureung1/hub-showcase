import './Header.css';
import UserSelect from './UserSelect';

function Header({ members, currentMemberId, onChangeCurrentMember, currentPage, onChangePage }) {
  const isTasksPage = currentPage === 'tasks';
  const title = isTasksPage ? '할 일' : '회의시간 매칭';
  const subtitle = isTasksPage
    ? `우리 팀 · 팀원 ${members.length}명`
    : '가능한 시간을 클릭해서 선택해주세요';

  return (
    <header className="page-header">
      <div className="page-header-top">
        <div>
          <h1>{title}</h1>
          <p className="subtitle">{subtitle}</p>
        </div>
        <UserSelect
          members={members}
          currentMemberId={currentMemberId}
          onChange={onChangeCurrentMember}
        />
      </div>

      <nav className="page-tabs">
        <button
          type="button"
          className={`page-tab${isTasksPage ? ' active' : ''}`}
          onClick={() => onChangePage('tasks')}
        >
          태스크
        </button>
        <button
          type="button"
          className={`page-tab${!isTasksPage ? ' active' : ''}`}
          onClick={() => onChangePage('meeting')}
        >
          회의시간
        </button>
      </nav>
    </header>
  );
}

export default Header;
