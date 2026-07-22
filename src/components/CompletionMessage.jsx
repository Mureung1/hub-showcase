import "./CompletionMessage.css";

const COMPLETION_TEXT = "완료했어요! 오늘도 한 걸음 나아갔어요.";

function CompletionMessage() {
  return <p className="completion-message">{COMPLETION_TEXT}</p>;
}

export default CompletionMessage;
