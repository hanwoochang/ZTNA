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
      className="notif-card"
      onClick={() => { navigate('/logs'); onClose(); }}
      style={{
        position: 'fixed',
        top: '28px',
        right: '36px',
        zIndex: 9999,
        width: '420px',
        maxWidth: 'calc(100vw - 48px)',
        backgroundColor: '#ffffff',
        border: '2px solid #dc2626',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.25), 0 10px 10px -5px rgba(0, 0, 0, 0.12)',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        cursor: 'pointer'
      }}
    >
      <div
        className="notif-card"
        style={{
          padding: '12px',
          backgroundColor: '#fee2e2',
          color: '#dc2626',
          borderRadius: '12px',
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginTop: '2px'
        }}
      >
        <ShieldAlert size={28} color="#dc2626" />
      </div>
      <div className="notif-card" style={{ flex: 1, minWidth: 0 }}>
        <div
          className="notif-card"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '8px'
          }}
        >
          <span
            className="notif-text"
            style={{
              fontWeight: 800,
              color: '#dc2626',
              fontSize: '18px',
              lineHeight: '1.3'
            }}
          >
            고위험 접속 감지 ({alert.risk_score}점)
          </span>
          <button
            onClick={(e) => { e.stopPropagation(); onClose(); }}
            style={{
              backgroundColor: '#f3f4f6',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#4b5563',
              flexShrink: 0
            }}
            title="알림 닫기"
          >
            <X size={18} />
          </button>
        </div>
        <p
          className="notif-text"
          style={{
            margin: '8px 0 0 0',
            fontWeight: 700,
            color: '#111827',
            fontSize: '15px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}
        >
          {alert.email || '알 수 없음'}
        </p>
        <p
          className="notif-text"
          style={{
            margin: '4px 0 0 0',
            color: '#374151',
            fontSize: '14px',
            lineHeight: '1.45',
            wordBreak: 'keep-all'
          }}
        >
          {alert.reason || '보안 위협 감지'}
        </p>
        <div
          className="notif-card"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '12px',
            paddingTop: '10px',
            borderTop: '1px solid #e5e7eb',
            fontSize: '13px',
            color: '#6b7280'
          }}
        >
          <span className="notif-text" style={{ fontFamily: 'monospace', fontSize: '13px', color: '#6b7280' }}>
            {alert.ip_address}
          </span>
          <span className="notif-text" style={{ fontWeight: 700, color: '#f54e00', textDecoration: 'underline', fontSize: '13px' }}>
            클릭하여 감사 로그 확인 →
          </span>
        </div>
      </div>
    </div>
  );
}
