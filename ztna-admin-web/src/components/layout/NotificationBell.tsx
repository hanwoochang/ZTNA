import { useRef, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, ShieldAlert, CheckCheck } from 'lucide-react';

interface NotificationBellProps {
  notifications: any[];
  unreadCount: number;
  onMarkAllRead: () => void;
}

export function NotificationBell({ notifications, unreadCount, onMarkAllRead }: NotificationBellProps) {
  const [isBellOpen, setIsBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // 외부 클릭 시 드롭다운 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(event.target as Node)) {
        setIsBellOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative notif-container" ref={bellRef} style={{ zIndex: 100, marginRight: '16px', marginTop: '6px' }}>
      <button 
        onClick={() => setIsBellOpen(prev => !prev)}
        style={{
          position: 'relative',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          backgroundColor: '#ffffff',
          border: '1px solid #e5e7eb',
          cursor: 'pointer',
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
        }}
        title="고위험 보안 알림"
      >
        <Bell size={28} className={unreadCount > 0 ? 'text-semantic-error animate-pulse' : 'text-body'} />
        {unreadCount > 0 && (
          <span 
            className="notif-badge"
            style={{
              position: 'absolute',
              top: '-6px',
              right: '-4px',
              backgroundColor: '#dc2626',
              color: '#ffffff',
              fontSize: '12px',
              fontWeight: '800',
              lineHeight: '1',
              padding: '3px 6px',
              borderRadius: '9999px',
              border: '2px solid #ffffff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
              pointerEvents: 'none'
            }}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 드롭다운 창 */}
      {isBellOpen && (
        <div 
          className="notif-dropdown"
          style={{
            position: 'absolute',
            top: '64px',
            right: '0px',
            width: '460px',
            maxHeight: '560px',
            backgroundColor: '#ffffff',
            border: '1px solid #e5e7eb',
            borderRadius: '20px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08)',
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}
        >
          {/* 헤더 */}
          <div 
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '16px 20px',
              backgroundColor: '#f9fafb',
              borderBottom: '1px solid #e5e7eb'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldAlert size={22} className="text-semantic-error" />
              <span style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>고위험 보안 알림</span>
            </div>
            {unreadCount > 0 && (
              <button 
                onClick={onMarkAllRead}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '13px',
                  fontWeight: '600',
                  color: '#6b7280',
                  backgroundColor: 'transparent',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                <CheckCheck size={16} /> 모두 읽음
              </button>
            )}
          </div>

          {/* 알림 리스트 */}
          <div style={{ flex: 1, overflowY: 'auto', maxHeight: '420px' }}>
            {notifications.length > 0 ? (
              notifications.map(item => (
                <div 
                  key={item.id}
                  onClick={() => {
                    setIsBellOpen(false);
                    navigate('/logs');
                  }}
                  style={{
                    padding: '16px 20px',
                    borderBottom: '1px solid #f3f4f6',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fef2f2')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '15px', fontWeight: '700', color: '#111827', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.email}
                    </span>
                    <span style={{ fontSize: '12px', fontWeight: '800', color: '#dc2626', backgroundColor: '#fee2e2', padding: '2px 8px', borderRadius: '6px' }}>
                      {item.risk_score}점 · {item.action_taken === 'DENY' ? '차단' : 'OTP'}
                    </span>
                  </div>
                  <p style={{ margin: 0, fontSize: '13px', color: '#4b5563', lineHeight: '1.4' }}>
                    {item.reason || '고위험 접속'}
                  </p>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: '#9ca3af', fontFamily: 'monospace', marginTop: '2px' }}>
                    <span>{item.ip_address}</span>
                    <span>{new Date(item.created_at).toLocaleString([], { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                </div>
              ))
            ) : (
              <div style={{ padding: '48px 20px', textAlign: 'center', color: '#9ca3af', fontSize: '15px', fontWeight: '500' }}>
                최근 감지된 70점 이상 고위험 알림이 없습니다.
              </div>
            )}
          </div>

          {/* 푸터 */}
          <div style={{ padding: '14px', backgroundColor: '#f9fafb', borderTop: '1px solid #e5e7eb', textAlign: 'center' }}>
            <button 
              onClick={() => {
                setIsBellOpen(false);
                navigate('/logs');
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '14px',
                fontWeight: '700',
                color: '#f54e00',
                cursor: 'pointer'
              }}
            >
              전체 접속 로그 감사 페이지로 이동 →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
