import { CheckCircle, X } from 'lucide-react';

export default function SuccessBanner({ message, onClose, autoClose = true }) {
  if (!message) return null;

  // autoClose 설정시 3초 후 자동 닫기
  if (autoClose) {
    setTimeout(() => onClose?.(), 3000);
  }

  return (
    <div className="flex items-start gap-3 p-4 bg-green-50 border border-green-200 rounded-2xl mb-6">
      <CheckCircle size={20} className="text-green-600 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        <p className="text-sm font-semibold text-green-800">{message}</p>
      </div>
      <button
        onClick={onClose}
        className="text-green-500 hover:text-green-700 transition-colors flex-shrink-0"
        aria-label="닫기"
      >
        <X size={18} />
      </button>
    </div>
  );
}
