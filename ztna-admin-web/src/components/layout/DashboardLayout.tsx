import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Activity, Users, Server, LogOut, ClipboardList, Bell, ShieldAlert, X, CheckCheck } from 'lucide-react';
import api from '../../api';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '대시보드',
  '/users': '임직원 통제',
  '/devices': '단말 자산',
  '/logs': '접속 로그 감사',
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const title = PAGE_TITLES[location.pathname] || '대시보드';

  // 알림 센터 상태
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isBellOpen, setIsBellOpen] = useState(false);
  const [toastAlert, setToastAlert] = useState<any | null>(null);
  const knownLogIdsRef = useRef<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);
  const bellRef = useRef<HTMLDivElement>(null);

  // 알림 권한 요청 (브라우저 푸시)
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

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

  // 3초 주기로 로그 확인 및 70점 이상 고위험 알림 감지
  useEffect(() => {
    const pollHighRiskLogs = async () => {
      try {
        const res = await api.get('/admin/logs');
        const allLogs: any[] = res.data || [];
        
        // 70점 이상 고위험 로그 필터
        const highRiskLogs = allLogs.filter(l => l.risk_score >= 70);

        // localStorage에서 마지막으로 확인한 고위험 로그 ID (또는 확인 시점) 로드
        const lastReadId = parseInt(localStorage.getItem('ztna_last_read_log_id') || '0', 10);

        if (isFirstLoadRef.current) {
          // 첫 로딩 시: 모든 기존 고위험 로그를 known 목록에 등록
          highRiskLogs.forEach(l => knownLogIdsRef.current.add(l.id));
          setNotifications(highRiskLogs.slice(0, 20));
          
          // 마지막으로 확인한 ID보다 더 큰(최신) 로그만 안 읽은 개수로 산정
          const unread = highRiskLogs.filter(l => l.id > lastReadId);
          setUnreadCount(unread.length);
          isFirstLoadRef.current = false;
        } else {
          // 신규 발생한 70점 이상 로그 탐색
          const newAlerts = highRiskLogs.filter(l => !knownLogIdsRef.current.has(l.id));
          if (newAlerts.length > 0) {
            newAlerts.forEach(l => knownLogIdsRef.current.add(l.id));
            
            // 알림 목록 최상단에 추가
            setNotifications(prev => [...newAlerts, ...prev].slice(0, 20));
            
            // 마지막으로 확인한 ID보다 큰 신규 로그만 안 읽은 개수 증가
            const unreadNew = newAlerts.filter(l => l.id > lastReadId);
            setUnreadCount(prev => prev + unreadNew.length);

            // 가장 최근 경고를 토스트 팝업으로 표시
            const latest = newAlerts[0];
            setToastAlert(latest);

            // 브라우저 네이티브 알림
            if ('Notification' in window && Notification.permission === 'granted') {
              try {
                new Notification('🚨 [ZTNA 고위험 접속 경고]', {
                  body: `${latest.email || '미확인 사용자'} (위험도: ${latest.risk_score}점)\n${latest.reason || '고위험 감지'}`,
                  icon: '/favicon.ico'
                });
              } catch (_) {}
            }
          }
        }
      } catch (err) {
        // 비로그인 상태 등 에러 무시
      }
    };

    pollHighRiskLogs();
    const interval = setInterval(pollHighRiskLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  // 토스트 5초 후 자동 닫힘
  useEffect(() => {
    if (toastAlert) {
      const timer = setTimeout(() => setToastAlert(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [toastAlert]);

  const handleMarkAllRead = () => {
    // 현재 존재하는 모든 알림 중 가장 최신(가장 큰) 로그 ID를 last_read_id로 저장
    try {
      if (notifications.length > 0) {
        const maxId = Math.max(...notifications.map(n => n.id));
        localStorage.setItem('ztna_last_read_log_id', String(maxId));
      }
    } catch (_) {}
    setUnreadCount(0);
  };

  return (
    <div className="bg-canvas font-sans relative" style={{ display: 'flex', height: '100vh', width: '100vw', padding: '32px', gap: '40px', boxSizing: 'border-box', overflow: 'hidden' }}>
      
      {/* 🌟 실시간 고위험 접속 토스트 알림 팝업 */}
      {toastAlert && (
        <div 
          onClick={() => { navigate('/logs'); setToastAlert(null); }}
          className="fixed top-8 right-12 z-50 flex items-start gap-4 p-5 bg-card border-2 border-semantic-error shadow-2xl rounded-xl cursor-pointer animate-bounce-once transition-all hover:scale-105"
          style={{ maxWidth: '440px' }}
        >
          <div className="p-3 bg-red-100 text-semantic-error rounded-lg shrink-0 mt-0.5">
            <ShieldAlert size={28} />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <span className="font-extrabold text-semantic-error text-xl flex items-center gap-1.5">
                🚨 고위험 접속 감지 ({toastAlert.risk_score}점)
              </span>
              <button 
                onClick={(e) => { e.stopPropagation(); setToastAlert(null); }}
                className="text-muted hover:text-ink p-1 rounded transition-colors"
              >
                <X size={18} />
              </button>
            </div>
            <p className="font-bold text-ink text-base mt-1.5">{toastAlert.email || '알 수 없음'}</p>
            <p className="text-body text-sm mt-0.5 line-clamp-2">{toastAlert.reason || '보안 위협 감지'}</p>
            <div className="flex justify-between items-center mt-3 pt-2 border-t border-hairline text-xs text-muted">
              <span>{toastAlert.ip_address}</span>
              <span className="font-semibold text-primary underline">클릭하여 감사 로그 확인 →</span>
            </div>
          </div>
        </div>
      )}

      {/* Sidebar */}
      <aside className="bg-card rounded-xl border border-hairline flex flex-col text-ink shadow-sm z-10 shrink-0" style={{ width: '300px', height: '100%', overflow: 'hidden' }}>
        <div className="flex flex-col items-center pt-10 pb-8 border-b border-hairline shrink-0">
          <Shield size={54} className="text-primary mb-4" />
          <h2 className="text-ink tracking-tight" style={{ fontSize: '32px', fontWeight: 800 }}>ZTNA Admin</h2>
        </div>
        <nav className="flex-1 py-5 px-5 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {[
            { path: '/dashboard', icon: <Activity size={28} />, label: '대시보드' },
            { path: '/users', icon: <Users size={28} />, label: '임직원 통제' },
            { path: '/devices', icon: <Server size={28} />, label: '단말 자산' },
            { path: '/logs', icon: <ClipboardList size={28} />, label: '접속 로그 감사' },
          ].map(({ path, icon, label }) => (
            <button key={path} onClick={() => navigate(path)}
              className={`w-full flex items-center gap-4 px-4 py-4 rounded-lg transition-all ${isActive(path) ? 'bg-canvas text-ink border border-hairline shadow-sm' : 'text-body hover:bg-canvas-soft hover:text-ink border border-transparent'}`}>
              {icon} <span className="flex-1 text-left" style={{ fontSize: '22px', fontWeight: isActive(path) ? 700 : 500 }}>{label}</span>
            </button>
          ))}
        </nav>
        <div className="p-5 border-t border-hairline bg-canvas-soft shrink-0">
          <button onClick={() => { localStorage.removeItem('adminToken'); navigate('/login'); }}
            className="w-full flex items-center justify-center gap-3 px-4 py-4 bg-card border border-hairline text-muted hover:text-semantic-error hover:border-semantic-error/30 rounded-lg transition-all shadow-sm">
            <LogOut size={28} /> <span style={{ fontSize: '22px', fontWeight: 600 }}>로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main id="main-dashboard-content" className="flex-1 flex flex-col" style={{ gap: '24px', height: '100%', overflow: 'hidden' }}>
        <header className="flex items-center justify-between shrink-0 pt-2" style={{ paddingRight: '24px' }}>
          <div className="flex items-center" style={{ gap: '16px' }}>
            <h1 className="text-4xl font-bold text-ink tracking-tight">{title}</h1>
            <div className="h-5 w-px bg-muted/40"></div>
            <p className="text-body text-lg font-medium">네트워크 접근 통제 및 단말기 보안 현황을 간략히 확인할 수 있습니다.</p>
          </div>

          {/* 🔔 오른쪽 위 종모양 알림 센터 */}
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
                      onClick={handleMarkAllRead}
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
        </header>

        <div className="flex-1 overflow-y-auto bg-transparent pb-6 pr-4">
          {children}
        </div>
      </main>
    </div>
  );
}

