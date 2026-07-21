import { useState } from 'react';
import './UserSelect.css';

function UserSelect({ members, currentMemberId, onChange }) {
  const [isOpen, setIsOpen] = useState(false);

  const currentMember = members.find((m) => m.id === currentMemberId) ?? null;
  const name = currentMember ? currentMember.name : '-';
  const initial = currentMember ? currentMember.name.slice(0, 1) : '-';

  function handleSelect(memberId) {
    onChange(memberId);
    setIsOpen(false);
  }

  return (
    <div className="user-select">
      <button
        type="button"
        className="user-select-trigger"
        onClick={() => setIsOpen((open) => !open)}
      >
        <span className="avatar">{initial}</span>
        <span className="user-select-name">{name}</span>
        <span className="user-select-chevron">▾</span>
      </button>

      {isOpen && (
        <>
          <div className="user-select-backdrop" onClick={() => setIsOpen(false)} />
          <div className="user-select-menu">
            {members.map((member) => (
              <button
                key={member.id}
                type="button"
                className="user-select-option"
                onClick={() => handleSelect(member.id)}
              >
                {member.name}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default UserSelect;
