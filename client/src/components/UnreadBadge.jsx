function UnreadBadge({ count }) {
  if (!count) return null;

  return (
    <span aria-label={`읽지 않은 메시지 ${count}개`} className="unread-badge">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export default UnreadBadge;
