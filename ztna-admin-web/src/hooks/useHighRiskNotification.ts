import { useState, useEffect, useRef } from 'react';
import api from '../api';

export function useHighRiskNotification() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [toastAlert, setToastAlert] = useState<any | null>(null);
  const knownLogIdsRef = useRef<Set<number>>(new Set());
  const isFirstLoadRef = useRef(true);

  // 알림 권한 요청 (브라우저 푸시)
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  // 3초 주기로 로그 확인 및 70점 이상 고위험 알림 감지
  useEffect(() => {
    const pollHighRiskLogs = async () => {
      try {
        const res = await api.get('/admin/logs');
        const allLogs: any[] = res.data || [];
        const highRiskLogs = allLogs.filter(l => l.risk_score >= 70);
        const lastReadId = parseInt(localStorage.getItem('ztna_last_read_log_id') || '0', 10);

        if (isFirstLoadRef.current) {
          highRiskLogs.forEach(l => knownLogIdsRef.current.add(l.id));
          setNotifications(highRiskLogs.slice(0, 20));
          const unread = highRiskLogs.filter(l => l.id > lastReadId);
          setUnreadCount(unread.length);
          isFirstLoadRef.current = false;
        } else {
          const newAlerts = highRiskLogs.filter(l => !knownLogIdsRef.current.has(l.id));
          if (newAlerts.length > 0) {
            newAlerts.forEach(l => knownLogIdsRef.current.add(l.id));
            setNotifications(prev => [...newAlerts, ...prev].slice(0, 20));
            
            const unreadNew = newAlerts.filter(l => l.id > lastReadId);
            setUnreadCount(prev => prev + unreadNew.length);

            const latest = newAlerts[0];
            setToastAlert(latest);

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

  const markAllRead = () => {
    try {
      if (notifications.length > 0) {
        const maxId = Math.max(...notifications.map(n => n.id));
        localStorage.setItem('ztna_last_read_log_id', String(maxId));
      }
    } catch (_) {}
    setUnreadCount(0);
  };

  const closeToast = () => setToastAlert(null);

  return {
    notifications,
    unreadCount,
    toastAlert,
    closeToast,
    markAllRead
  };
}
