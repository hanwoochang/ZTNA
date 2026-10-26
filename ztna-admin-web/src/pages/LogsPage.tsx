import { useState, useEffect } from 'react';
import { ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react';
import api from '../api';

export function LogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 50;

  const fetchLogs = (p = page) =>
    api.get(`/admin/logs?page=${p}&limit=${LIMIT}`)
      .then(res => {
        setLogs(res.data.logs);
        setTotal(res.data.total);
        setTotalPages(res.data.totalPages);
      })
      .catch(console.error);

  useEffect(() => {
    fetchLogs(page);
    const interval = setInterval(() => {
      if (!document.hidden) fetchLogs(page);
    }, 15000); // 15초 주기 감사 로그 자동 갱신
    return () => clearInterval(interval);
  }, [page]);

  return (
    <div className="bg-card rounded-lg border border-hairline overflow-hidden">
      <div className="border-b border-hairline flex justify-between items-center bg-canvas-soft" style={{ padding: '16px 48px' }}>
        <h2 className="text-4xl font-bold text-ink">전체 접속 로그 감사 (Audit)</h2>
        <span className="text-muted text-xl font-bold">전체 {total.toLocaleString()}건 · 페이지 {page}/{totalPages}</span>
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
            {logs.map(log => {
              const isDanger = log.risk_score >= 70;
              const isWarning = log.risk_score >= 30 && log.risk_score < 70;
              const rowRiskClass = isDanger ? 'row-risk-danger' : isWarning ? 'row-risk-warning' : 'hover:bg-canvas';

              return (
                <tr
                  key={log.id}
                  className={`text-2xl transition-colors border-b last:border-0 ${rowRiskClass}`}
                  style={isDanger ? { backgroundColor: '#fee2e2' } : isWarning ? { backgroundColor: '#fef3c7' } : {}}
                >
                  <td className="pl-14 pr-8 text-body font-mono" style={{ paddingTop: '12px', paddingBottom: '12px', fontSize: '18px' }}>
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="px-8 font-semibold text-ink" style={{ paddingTop: '12px', paddingBottom: '12px' }}>
                    {log.email || '알 수 없음'}
                  </td>
                  <td className="px-8 text-body font-mono" style={{ paddingTop: '12px', paddingBottom: '12px', fontSize: '18px' }}>
                    {log.ip_address}
                  </td>
                  <td className="px-8" style={{ paddingTop: '12px', paddingBottom: '12px' }}>
                    <div className="flex flex-col gap-1 py-1">
                      <div className="flex items-center gap-2">
                        <ShieldAlert size={16} className={isDanger ? 'text-semantic-error' : isWarning ? 'text-primary' : 'text-semantic-success'} />
                        <span className={`font-bold ${isDanger ? 'text-semantic-error font-extrabold' : isWarning ? 'text-primary' : 'text-semantic-success'}`}>
                          {log.risk_score}점
                        </span>
                      </div>
                      <span className={`text-xl ${isDanger ? 'text-red-900 font-semibold' : isWarning ? 'text-amber-900' : 'text-body'}`}>
                        {log.reason || '정상 접속'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8" style={{ paddingTop: '12px', paddingBottom: '12px' }}>
                    <span className={`font-bold ${log.action_taken === 'DENY' ? 'text-semantic-error' : log.action_taken === 'STEP_UP' ? 'text-primary' : 'text-semantic-success'}`}>
                      {log.action_taken === 'DENY' ? '차단됨' : log.action_taken === 'STEP_UP' ? 'OTP 요구' : '허용됨'}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {logs.length === 0 && (
          <div className="py-20 text-center text-muted text-2xl font-bold">조회된 접속 로그가 없습니다.</div>
        )}
      </div>

      {/* 페이지 네비게이션 */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center border-t border-hairline py-6 bg-canvas-soft" style={{ gap: '48px' }}>
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-hairline bg-card text-ink font-bold text-xl hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <ChevronLeft size={22} /> 이전
          </button>
          <span className="text-ink font-bold text-2xl tracking-wider select-none">
            {page} / {totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg border border-hairline bg-card text-ink font-bold text-xl hover:bg-canvas disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            다음 <ChevronRight size={22} />
          </button>
        </div>
      )}
    </div>
  );
}
