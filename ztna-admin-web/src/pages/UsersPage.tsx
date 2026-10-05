import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ShieldAlert, Users, Server, Activity, LogOut, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import api from '../api';

export function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);

  const fetchUsers = () => api.get('/admin/users').then(res => setUsers(res.data)).catch(console.error);
  useEffect(() => { 
    fetchUsers(); 
    const handleMessage = (e: MessageEvent) => {
      if (e.data === 'RELOAD_USERS') fetchUsers();
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  return (
    <div className="bg-card rounded-lg border border-hairline overflow-hidden">
      <div className="border-b border-hairline flex justify-between items-center bg-canvas-soft" style={{ padding: '16px 48px' }}>
        <h2 className="text-3xl font-bold text-ink">전사 임직원 목록</h2>
        <button onClick={() => window.open('/users/add', 'AddUser', 'width=650,height=800,left=200,top=100')} className="bg-primary hover:bg-primary-active text-card rounded-md font-bold transition-all" style={{ padding: '10px 24px', fontSize: '15px' }}>
          + 임직원 추가
        </button>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-muted text-xl uppercase font-bold border-b border-hairline">
              <th className="pl-14 pr-8 w-1/4" style={{ paddingTop: '8px', paddingBottom: '8px' }}>이름</th>
              <th className="px-8 w-1/4" style={{ paddingTop: '8px', paddingBottom: '8px' }}>이메일</th>
              <th className="px-8 w-1/6" style={{ paddingTop: '8px', paddingBottom: '8px' }}>권한</th>
              <th className="px-8 w-1/6" style={{ paddingTop: '8px', paddingBottom: '8px' }}>부서</th>
              <th className="px-8 w-1/4" style={{ paddingTop: '8px', paddingBottom: '8px' }}>상태 및 현재 위험도</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="text-xl hover:bg-canvas transition-colors border-b border-hairline last:border-0">
                <td className="pl-14 pr-8 font-semibold text-ink" style={{ paddingTop: '8px', paddingBottom: '8px' }}>{u.name || 'Unknown'}</td>
                <td className="px-8 text-body" style={{ paddingTop: '8px', paddingBottom: '8px' }}>{u.email}</td>
                <td className="px-8" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                  <span className="text-xl font-bold tracking-wide uppercase" style={{ color: u.role === 'ADMIN' ? '#f54e00' : '#26251e' }}>{u.role}</span>
                </td>
                <td className="px-8 text-body font-medium" style={{ paddingTop: '8px', paddingBottom: '8px' }}>{u.department}</td>
                <td className="px-8" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                  <div className="flex flex-col gap-1 py-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2.5 h-2.5 rounded-full ${u.is_active ? 'bg-semantic-success' : 'bg-semantic-error'}`}></div>
                      <span className="text-ink font-bold text-xl">{u.is_active ? '정상(Active)' : '정지됨'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={14} className={u.current_risk >= 50 ? 'text-semantic-error' : u.current_risk > 0 ? 'text-primary' : 'text-semantic-success'} />
                      <span className={`text-xl font-bold ${u.current_risk >= 50 ? 'text-semantic-error' : u.current_risk > 0 ? 'text-primary' : 'text-semantic-success'}`}>
                        현재 {u.current_risk}점
                      </span>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

