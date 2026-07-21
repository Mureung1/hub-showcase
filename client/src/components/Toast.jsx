import './Toast.css';

function Toast({ message }) {
  if (!message) return null;

  return <div className="toast">{message}</div>;
}

export default Toast;
