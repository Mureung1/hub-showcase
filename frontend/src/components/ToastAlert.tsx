interface ToastMessage {
  id: string;
  message: string;
}

interface ToastAlertProps {
  toasts: ToastMessage[];
}

export default function ToastAlert({ toasts }: ToastAlertProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className="toasts-container"
      style={{
        position: 'fixed',
        bottom: '40px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 3000,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
      }}
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="toast-alert show"
          style={{ position: 'relative', bottom: '0', left: '0', transform: 'none' }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
