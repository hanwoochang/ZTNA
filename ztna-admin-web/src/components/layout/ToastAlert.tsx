import { useNavigate } from 'react-router-dom';
import { ShieldAlert, X } from 'lucide-react';

interface ToastAlertProps {
  alert: any | null;
  onClose: () => void;
}

export function ToastAlert({ alert, onClose }: ToastAlertProps) {
  const navigate = useNavigate();
  if (!alert) return null;

  return (
    <div 
      onClick={() => { navigate('/logs'); onClose(); }}
      className="fixed top-8 right-12 z-50 flex items-start gap-4 p-5 bg-card border-2 border-semantic-error shadow-2xl rounded-xl cursor-pointer animate-bounce-once transition-all hover:scale-105"
      style={{ maxWidth: '440px' }}
    >
      <div className="p-3 bg-red-100 text-semantic-error rounded-lg shrink-0 mt-0.5">
        <ShieldAlert size={28} />
      </div>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <span className="font-extrabold text-semantic-error text-xl flex items-center gap-1.5">
            🚨 고위험 접속 감지 ({alert.risk_score}점)
          </span>
          <button 
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            className="text-muted hover:text-ink p-1 rounded transition-colors"
          >
            <X size={18} />
          </button>
        </div>
        <p className="font-bold text-ink text-base mt-1.5">{alert.email || '알 수 없음'}</p>
        <p className="text-body text-sm mt-0.5 line-clamp-2">{alert.reason || '보안 위협 감지'}</p>
        <div className="flex justify-between items-center mt-3 pt-2 border-t border-hairline text-xs text-muted">
          <span>{alert.ip_address}</span>
          <span className="font-semibold text-primary underline">클릭하여 감사 로그 확인 →</span>
        </div>
      </div>
    </div>
  );
}
