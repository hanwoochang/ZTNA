import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ShieldAlert, Users, Server, Activity, LogOut, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import api from '../api';

export function Overview() {
  const [stats, setStats] = useState({ totalUsers: 0, totalDevices: 0, deniedToday: 0 });
  const [logs, setLogs] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [topRisky, setTopRisky] = useState<any[]>([]);

  const fetchData = () => {
    api.get('/admin/stats').then(res => setStats(res.data)).catch(console.error);
    api.get('/admin/logs').then(res => setLogs(res.data)).catch(console.error);
    api.get('/admin/stats/trend').then(res => setTrend(res.data.map((d: any) => ({ ...d, avgRisk: Number(d.avgRisk) })))).catch(console.error);
    api.get('/admin/stats/top-risky').then(res => setTopRisky(res.data.map((d: any) => ({ ...d, totalRisk: Number(d.totalRisk) })))).catch(console.error);
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      {/* 통계 카드 */}
      <div className="bg-card border border-hairline rounded-md flex items-stretch shadow-sm">
        {[
          { label: '가입 임직원 수', value: stats.totalUsers, unit: '명', color: 'text-primary', icon: <Users size={28} className="text-primary" /> },
          { label: '등록된 단말기 수', value: stats.totalDevices, unit: '대', color: 'text-ink', icon: <Server size={28} className="text-ink" /> },
          { label: '금일 비정상 접근 차단', value: stats.deniedToday, unit: '건', color: 'text-semantic-error', icon: <ShieldAlert size={28} className="text-semantic-error" /> },
        ].map((s, i, arr) => (
          <div key={i} className={`flex-1 flex justify-between items-center ${i < arr.length - 1 ? 'border-r border-hairline' : ''}`} style={{ padding: '24px' }}>
            <div>
              <h3 className="text-body text-xl font-bold mb-4">{s.label}</h3>
              <p className={`text-6xl font-light ${s.color}`}>{s.value} <span className="text-xl font-medium text-muted">{s.unit}</span></p>
            </div>
            <div className="rounded-full border border-hairline flex items-center justify-center bg-canvas" style={{ width: '64px', height: '64px', flexShrink: 0 }}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* 차트 */}
      <div style={{ display: 'flex', gap: '24px' }}>
        <div className="bg-card border border-hairline rounded-md shadow-sm flex flex-col" style={{ flex: '6' }}>
          <div className="border-b border-hairline" style={{ padding: '20px 24px' }}>
            <h3 className="text-ink text-xl font-bold">시간대별 평균 위험도 트렌드 (최근 24시간)</h3>
          </div>
          <div className="flex-1 flex items-center justify-center" style={{ padding: '24px', height: '300px' }}>
            <LineChart width={700} height={260} data={trend} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e5e0" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#8f8e85', fontSize: 18 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8f8e85', fontSize: 18 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e6e5e0' }} labelStyle={{ fontWeight: 'bold', color: '#26251e' }} />
              <Line type="monotone" dataKey="avgRisk" stroke="#f54e00" strokeWidth={3} dot={{ r: 4, fill: '#f54e00', strokeWidth: 0 }} activeDot={{ r: 6 }} name="평균 위험도" />
            </LineChart>
          </div>
        </div>
        <div className="bg-card border border-hairline rounded-md shadow-sm flex flex-col" style={{ flex: '4' }}>
          <div className="border-b border-hairline" style={{ padding: '20px 24px' }}>
            <h3 className="text-ink text-xl font-bold">요주의 인물 TOP 5 (누적 위험도)</h3>
          </div>
          <div className="flex-1 flex items-center justify-center" style={{ padding: '24px', height: '300px' }}>
            <BarChart width={450} height={260} data={topRisky} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e6e5e0" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8f8e85', fontSize: 18 }} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#26251e', fontSize: 18, fontWeight: 'bold' }} width={80} />
              <Tooltip cursor={{ fill: '#f7f7f4' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e6e5e0' }} />
              <Bar dataKey="totalRisk" radius={[0, 4, 4, 0]} barSize={32} name="누적 위험도">
                {topRisky.map((_entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#d43000' : index === 1 ? '#f54e00' : '#ff7a33'} />
                ))}
              </Bar>
            </BarChart>
          </div>
        </div>
      </div>

      {/* 접속 로그 */}
      <div className="bg-card border border-hairline rounded-md shadow-sm flex flex-col">
        <div className="border-b border-hairline" style={{ padding: '20px 24px' }}>
          <h3 className="text-ink text-xl font-bold">최근 전사 접속 로그 (실시간)</h3>
        </div>
        <div className="flex-1" style={{ padding: '0 24px' }}>
          <div className="flex justify-between items-center text-xl text-muted font-bold border-b border-hairline py-4">
            <span className="w-1/5">사용자</span>
            <span className="w-1/5">IP 주소</span>
            <span className="w-2/5">위험도 및 사유</span>
            <span className="w-1/5 text-right">상태</span>
          </div>
          {logs.length > 0 ? logs.slice(0, 10).map((log, i) => (
            <div key={i} className="flex justify-between items-center text-xl py-4 border-b border-canvas-soft last:border-0">
              <span className="w-1/5 text-ink font-medium truncate pr-4">{log.email || '알 수 없음'}</span>
              <span className="w-1/5 text-body font-mono text-xl truncate pr-4">{log.ip_address}</span>
              <span className="w-2/5 flex items-center pr-4" style={{ gap: '8px' }}>
                <span className={`font-bold whitespace-nowrap ${log.risk_score >= 50 ? 'text-semantic-error' : log.risk_score >= 20 ? 'text-primary' : 'text-semantic-success'}`}>{log.risk_score}점</span>
                <span className="text-body text-xl truncate flex-1" title={log.reason}>{log.reason}</span>
              </span>
              <span className="w-1/5 text-right font-bold whitespace-nowrap">
                <span className={log.action_taken === 'DENY' ? 'text-semantic-error' : log.action_taken === 'STEP_UP' ? 'text-primary' : 'text-semantic-success'}>
                  {log.action_taken === 'DENY' ? '차단됨' : log.action_taken === 'STEP_UP' ? 'OTP 요구' : '허용됨'}
                </span>
              </span>
            </div>
          )) : (
            <div className="py-10 text-center text-muted">최근 접속 로그가 없습니다.</div>
          )}
        </div>
      </div>
    </div>
  );
}



