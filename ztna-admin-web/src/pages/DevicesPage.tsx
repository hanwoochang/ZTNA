import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ShieldAlert, Users, Server, Activity, LogOut, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import api from '../api';

export function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const fetchDevices = () => api.get('/admin/devices').then(res => setDevices(res.data)).catch(console.error);
  useEffect(() => { fetchDevices(); }, []);

  const handleApprove = async (id: number) => {
    try {
      await api.patch(`/admin/devices/${id}/approve`);
      fetchDevices();
    } catch (err: any) {
      alert(err.response?.data?.message || '승인 실패');
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm('이 기기를 차단하시겠습니까?\n접속 중인 세션도 즉시 끊기고, 재승인 전까지 로그인할 수 없습니다.')) return;
    try {
      await api.patch(`/admin/devices/${id}/revoke`);
      fetchDevices();
    } catch (err: any) {
      alert(err.response?.data?.message || '해제 실패');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('정말 이 기기를 영구적으로 삭제하시겠습니까?\n삭제 후 복구할 수 없습니다.')) return;
    try {
      await api.delete(`/admin/devices/${id}`);
      fetchDevices();
    } catch (err: any) {
      alert(err.response?.data?.message || '삭제 실패');
    }
  };

  const handleToggleType = async (id: number, currentType: string) => {
    const newType = currentType === 'BYOD' ? 'CORPORATE' : 'BYOD';
    if (!confirm(`기기 소유 형태를 [${newType}](으)로 변경하시겠습니까?`)) return;
    try {
      await api.patch(`/admin/devices/${id}/type`, { device_type: newType });
      fetchDevices();
    } catch (err: any) {
      alert(err.response?.data?.message || '변경 실패');
    }
  };

  const filtered = devices.filter(d =>
    d.device_identifier?.toLowerCase().includes(search.toLowerCase()) ||
    (d.name || d.email)?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-card rounded-lg border border-hairline overflow-hidden">
      <div className="border-b border-hairline flex justify-between items-center bg-canvas-soft" style={{ padding: '16px 48px' }}>
        <h2 className="text-2xl font-bold text-ink">단말기 자산 목록</h2>
        <div className="relative">
          <input type="text" placeholder="기기ID 또는 소유자 검색..." value={search} onChange={e => setSearch(e.target.value)}
            className="bg-canvas text-ink rounded-md w-80 outline-none border border-hairline focus:border-primary" style={{ padding: '10px 16px', paddingRight: '44px', fontSize: '15px' }} />
          <Search size={20} className="absolute text-muted" style={{ right: '16px', top: '50%', transform: 'translateY(-50%)' }} />
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-muted text-base uppercase font-bold border-b border-hairline">
              <th className="pl-10 pr-4 w-1/5" style={{ paddingTop: '8px', paddingBottom: '8px' }}>디바이스 ID</th>
              <th className="px-4 w-1/5" style={{ paddingTop: '8px', paddingBottom: '8px' }}>소유자</th>
              <th className="px-4 w-1/8" style={{ paddingTop: '8px', paddingBottom: '8px' }}>소유 형태</th>
              <th className="px-4 w-1/8" style={{ paddingTop: '8px', paddingBottom: '8px' }}>보안 상태</th>
              <th className="px-4 w-1/8" style={{ paddingTop: '8px', paddingBottom: '8px' }}>인가 여부</th>
              <th className="px-4 w-1/5" style={{ paddingTop: '8px', paddingBottom: '8px' }}>관리</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(d => (
              <tr key={d.id} className="text-base hover:bg-canvas transition-colors border-b border-hairline last:border-0">
                <td className="pl-10 pr-4 font-mono text-body text-sm" style={{ paddingTop: '10px', paddingBottom: '10px' }}>{d.device_identifier}</td>
                <td className="px-4 font-semibold text-ink" style={{ paddingTop: '10px', paddingBottom: '10px' }}>{d.name || d.email}</td>
                <td className="px-4" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                  <button 
                    onClick={() => d.email !== 'admin@company.com' && handleToggleType(d.id, d.device_type)}
                    className={`text-sm font-bold tracking-wide uppercase px-2 py-1 rounded transition-colors ${d.email === 'admin@company.com' ? 'cursor-default' : 'hover:bg-canvas-soft'}`} 
                    style={{ color: d.device_type === 'BYOD' ? '#f54e00' : '#10b981', border: `1px solid ${d.device_type === 'BYOD' ? '#f54e0030' : '#10b98130'}` }}
                  >
                    {d.device_type || '-'}
                  </button>
                </td>
                <td className="px-4" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${d.is_compliant ? 'bg-semantic-success' : 'bg-primary'}`}></div>
                    <span className="text-ink font-bold text-sm">{d.is_compliant ? 'Compliant' : '취약'}</span>
                  </div>
                </td>
                <td className="px-4" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                  {d.status === 'APPROVED' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-semantic-success/10 text-semantic-success">
                      ● 인가됨
                    </span>
                  ) : d.status === 'BLOCKED' ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-semantic-error/10 text-semantic-error">
                      ✕ 차단됨
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                      ◌ 승인 대기
                    </span>
                  )}
                </td>
                <td className="px-4" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                  <div className="flex items-center gap-2">
                    {d.status !== 'APPROVED' && (
                      <button onClick={() => handleApprove(d.id)}
                        className="px-3 py-1.5 bg-semantic-success text-white text-xs font-bold rounded-md hover:opacity-80 transition-all">
                        {d.status === 'BLOCKED' ? '재승인' : '승인'}
                      </button>
                    )}
                    {d.status !== 'BLOCKED' && (
                      <button onClick={() => handleRevoke(d.id)}
                        className="px-3 py-1.5 bg-semantic-error/10 text-semantic-error text-xs font-bold rounded-md hover:bg-semantic-error/20 transition-all border border-semantic-error/20">
                        차단
                      </button>
                    )}
                    <button onClick={() => handleDelete(d.id)}
                      className="px-3 py-1.5 bg-muted/10 text-muted text-xs font-bold rounded-md hover:bg-muted/20 hover:text-ink transition-all border border-hairline">
                      삭제
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-muted">검색 결과가 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

