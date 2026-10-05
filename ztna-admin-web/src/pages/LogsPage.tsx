import React, { useState, useEffect } from 'react';
import { ShieldAlert } from 'lucide-react';
import api from '../api';

export function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);

  const fetchLogs = () => api.get('/admin/logs').then(res => setLogs(res.data)).catch(console.error);
  
  useEffect(() => { 
    fetchLogs();
    const interval = setInterval(fetchLogs, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-card rounded-lg border border-hairline overflow-hidden">
      <div className="border-b border-hairline flex justify-between items-center bg-canvas-soft" style={{ padding: '16px 48px' }}>
        <h2 className="text-4xl font-bold text-ink">전체 접속 로그 감사 (Audit)</h2>
        <span className="text-muted text-xl font-bold">총 {logs.length}건 조회됨</span>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full text-left border-collapse">
          <thead style={{ position: 'sticky', top: 0, backgroundColor: '#ffffff', zIndex: 10 }}>
            <tr className="text-muted text-2xl uppercase font-bold border-b border-hairline">
              <th className="pl-14 pr-8" style={{ paddingTop: '16px', paddingBottom: '16px' }}>발생 일시</th>
              <th className="px-8" style={{ paddingTop: '16px', paddingBottom: '16px' }}>사용자</th>
              <th className="px-8" style={{ paddingTop: '16px', paddingBottom: '16px' }}>IP 주소</th>
              <th className="px-8" style={{ paddingTop: '16px', paddingBottom: '16px' }}>위험도 및 사유</th>
              <th className="px-8" style={{ paddingTop: '16px', paddingBottom: '16px' }}>처리 결과</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="text-2xl hover:bg-canvas transition-colors border-b border-hairline last:border-0">
                <td className="pl-14 pr-8 text-body font-mono" style={{ paddingTop: '12px', paddingBottom: '12px', fontSize: '18px' }}>
                  {new Date(log.created_at).toLocaleString()}
                </td>
                <td className="px-8 font-semibold text-ink" style={{ paddingTop: '12px', paddingBottom: '12px' }}>{log.email || '알 수 없음'}</td>
                <td className="px-8 text-body font-mono" style={{ paddingTop: '12px', paddingBottom: '12px', fontSize: '18px' }}>{log.ip_address}</td>
                <td className="px-8" style={{ paddingTop: '12px', paddingBottom: '12px' }}>
                  <div className="flex flex-col gap-1 py-1">
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={16} className={log.risk_score >= 50 ? 'text-semantic-error' : log.risk_score >= 20 ? 'text-primary' : 'text-semantic-success'} />
                      <span className={`font-bold ${log.risk_score >= 50 ? 'text-semantic-error' : log.risk_score >= 20 ? 'text-primary' : 'text-semantic-success'}`}>
                        {log.risk_score}점
                      </span>
                    </div>
                    <span className="text-body text-xl">{log.reason || '정상 접속'}</span>
                  </div>
                </td>
                <td className="px-8" style={{ paddingTop: '12px', paddingBottom: '12px' }}>
                  <span className={`font-bold ${log.action_taken === 'DENY' ? 'text-semantic-error' : log.action_taken === 'STEP_UP' ? 'text-primary' : 'text-semantic-success'}`}>
                    {log.action_taken === 'DENY' ? '차단됨' : log.action_taken === 'STEP_UP' ? 'OTP 요구' : '허용됨'}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="py-20 text-center text-muted text-2xl font-bold">조회된 접속 로그가 없습니다.</div>
        )}
      </div>
    </div>
  );
}
