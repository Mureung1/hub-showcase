import { AlertCircle, X } from 'lucide-react';

export default function ErrorBanner({ message, onClose, autoClose = true }) {
  if (!message) return null;

  // autoClose 설정시 3초 후 자동 닫기
  if (autoClose) {
    setTimeout(() => onClose?.(), 3000);
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-2xl mb-6">
      <AlertCircle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-red-800 mb-1">오류 발생</p>
        <p className="text-sm text-red-700">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-red-500 hover:text-red-700 transition-colors flex-shrink-0"
        aria-label="닫기"
      >
        <X size={18} />
      </button>
    </div>
  );
}
