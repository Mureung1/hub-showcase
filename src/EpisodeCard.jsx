// props로 받은 episode 데이터를 그대로 그리기만 하는 화면 컴포넌트.
// 자기 state는 없고, 클릭되면 onSelect(episode)로 부모에게 알리기만 한다.
function EpisodeCard({ episode, onSelect }) {
  return (
    <div
      className={`ep-card${episode.submerged ? ' submerged' : ''}`}
      onClick={() => onSelect(episode)}
    >
      <div className="ep-chip-row">
        <span className="ep-chip">
          {episode.time} · Topic: {episode.topic}
        </span>
      </div>
      <div className="ep-preview">{episode.preview}</div>
      {episode.submerged && (
        <div className="ep-summary">{episode.summary} — submerged</div>
      )}
    </div>
  );
}

export default EpisodeCard;
