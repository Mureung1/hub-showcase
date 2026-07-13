import { useAppStore } from '../../hooks/useAppStore';
import './Toast.css';

export default function Toast() {
  const { toast } = useAppStore();
  if (!toast) return null;
  return <div className="toast">{toast}</div>;
}
