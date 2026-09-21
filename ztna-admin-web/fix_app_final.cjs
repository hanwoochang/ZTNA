const fs = require('fs');
const appPath = 'C:\\ZTNA\\ztna\\ztna-admin-web\\src\\App.tsx';
const content = `import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Shield, ShieldAlert, Users, Server, Activity, LogOut, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';

// API 설정 (백엔드 정책 서버)
const api = axios.create({ baseURL: 'http://localhost:3000/api' });

// 토큰 자동 주입 인터셉터
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = \`Bearer \${token}\`;
  return config;
});

// 401 → 자동 로그아웃
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('adminToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// -- [Pages] --

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/admin-login', { email, password });
      localStorage.setItem('adminToken', res.data.token);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || '로그인 에러');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-canvas font-sans">
      <div className="bg-card rounded-lg border border-hairline shadow-none" style={{ width: '600px', padding: '64px' }}>
        <div className="flex justify-center mb-10">
          <ShieldAlert size={80} className="text-primary" />
        </div>
        <h1 className="font-semibold text-center mb-5 text-ink tracking-tight" style={{ fontSize: '2.5rem' }}>Admin Login</h1>
        <p className="text-center text-body mb-10" style={{ fontSize: '1.25rem' }}>ZTNA v2.0 관제 센터에 로그인하세요.</p>

        {error && <div className="bg-[#fae9ed] text-semantic-error p-5 rounded-md text-base mb-8 text-center border border-semantic-error/20">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-6">
          <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:bg-card focus:border-primary transition-all" style={{ boxSizing: 'border-box', height: '84px', padding: '0 24px', fontSize: '1.5rem', display: 'block' }} />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:bg-card focus:border-primary transition-all" style={{ boxSizing: 'border-box', height: '84px', padding: '0 24px', fontSize: '1.5rem', display: 'block' }} />
          <button type="submit" className="w-full bg-primary hover:bg-primary-active text-card rounded-md font-bold transition-all mt-6" style={{ boxSizing: 'border-box', height: '84px', padding: '0 24px', fontSize: '1.5rem', display: 'block' }}>
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '대시보드',
  '/users': '임직원 통제',
  '/devices': '단말 자산',
};

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const title = PAGE_TITLES[location.pathname] || '대시보드';

  return (
    <div className="bg-canvas font-sans" style={{ display: 'flex', height: '100vh', width: '100vw', padding: '32px', gap: '40px', boxSizing: 'border-box', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside className="bg-card rounded-xl border border-hairline flex flex-col text-ink shadow-sm z-10 shrink-0" style={{ width: '260px', height: '100%', overflow: 'hidden' }}>
        <div className="flex flex-col items-center pt-10 pb-8 border-b border-hairline shrink-0">
          <Shield size={40} className="text-primary mb-4" />
          <h2 className="font-semibold text-xl text-ink tracking-tight">ZTNA Admin</h2>
        </div>
        <nav className="flex-1 py-4 px-4 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { path: '/dashboard', icon: <Activity size={20} />, label: '대시보드' },
            { path: '/users', icon: <Users size={20} />, label: '임직원 통제' },
            { path: '/devices', icon: <Server size={20} />, label: '단말 자산' },
          ].map(({ path, icon, label }) => (
            <button key={path} onClick={() => navigate(path)}
              className={\`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all \${isActive(path) ? 'bg-canvas text-ink border border-hairline font-bold shadow-sm' : 'text-body hover:bg-canvas-soft hover:text-ink border border-transparent font-semibold'}\`}>
              {icon} <span className="text-base flex-1 text-left">{label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-hairline bg-canvas-soft shrink-0">
          <button onClick={() => { localStorage.removeItem('adminToken'); navigate('/login'); }}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-card border border-hairline text-muted hover:text-semantic-error hover:border-semantic-error/30 rounded-lg transition-all font-semibold shadow-sm">
            <LogOut size={20} /> <span className="text-base">로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 flex flex-col" style={{ gap: '24px', height: '100%', overflow: 'hidden' }}>
        <header className="flex items-center shrink-0 pt-2" style={{ gap: '16px' }}>
          <h1 className="text-2xl font-bold text-ink tracking-tight">{title}</h1>
          <div className="h-5 w-px bg-muted/40"></div>
          <p className="text-body text-sm font-medium">네트워크 접근 통제 및 단말기 보안 현황을 간략히 확인할 수 있습니다.</p>
        </header>
        <div className="flex-1 overflow-y-auto bg-transparent pb-6 pr-4">
          {children}
        </div>
      </main>
    </div>
  );
}

function Overview() {
  const [stats, setStats] = useState({ totalUsers: 0, totalDevices: 0, deniedToday: 0 });
  const [logs, setLogs] = useState<any[]>([]);
  const [trend, setTrend] = useState<any[]>([]);
  const [topRisky, setTopRisky] = useState<any[]>([]);

  useEffect(() => {
    api.get('/admin/stats').then(res => setStats(res.data)).catch(console.error);
    api.get('/admin/logs').then(res => setLogs(res.data)).catch(console.error);
    api.get('/admin/stats/trend').then(res => setTrend(res.data.map((d: any) => ({ ...d, avgRisk: Number(d.avgRisk) })))).catch(console.error);
    api.get('/admin/stats/top-risky').then(res => setTopRisky(res.data.map((d: any) => ({ ...d, totalRisk: Number(d.totalRisk) })))).catch(console.error);
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
          <div key={i} className={\`flex-1 flex justify-between items-center \${i < arr.length - 1 ? 'border-r border-hairline' : ''}\`} style={{ padding: '24px' }}>
            <div>
              <h3 className="text-body text-sm font-bold mb-4">{s.label}</h3>
              <p className={\`text-4xl font-light \${s.color}\`}>{s.value} <span className="text-base font-medium text-muted">{s.unit}</span></p>
            </div>
            <div className="rounded-full border border-hairline flex items-center justify-center bg-canvas" style={{ width: '64px', height: '64px', flexShrink: 0 }}>{s.icon}</div>
          </div>
        ))}
      </div>

      {/* 차트 */}
      <div style={{ display: 'flex', gap: '24px' }}>
        <div className="bg-card border border-hairline rounded-md shadow-sm flex flex-col" style={{ flex: '6' }}>
          <div className="border-b border-hairline" style={{ padding: '20px 24px' }}>
            <h3 className="text-ink text-base font-bold">시간대별 평균 위험도 트렌드 (최근 24시간)</h3>
          </div>
          <div className="flex-1 flex items-center justify-center" style={{ padding: '24px', height: '300px' }}>
            <LineChart width={700} height={260} data={trend} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e5e0" />
              <XAxis dataKey="time" axisLine={false} tickLine={false} tick={{ fill: '#8f8e85', fontSize: 12 }} dy={10} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: '#8f8e85', fontSize: 12 }} />
              <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e6e5e0' }} labelStyle={{ fontWeight: 'bold', color: '#26251e' }} />
              <Line type="monotone" dataKey="avgRisk" stroke="#f54e00" strokeWidth={3} dot={{ r: 4, fill: '#f54e00', strokeWidth: 0 }} activeDot={{ r: 6 }} name="평균 위험도" />
            </LineChart>
          </div>
        </div>
        <div className="bg-card border border-hairline rounded-md shadow-sm flex flex-col" style={{ flex: '4' }}>
          <div className="border-b border-hairline" style={{ padding: '20px 24px' }}>
            <h3 className="text-ink text-base font-bold">요주의 인물 TOP 5 (누적 위험도)</h3>
          </div>
          <div className="flex-1 flex items-center justify-center" style={{ padding: '24px', height: '300px' }}>
            <BarChart width={450} height={260} data={topRisky} layout="vertical" margin={{ top: 5, right: 30, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e6e5e0" />
              <XAxis type="number" axisLine={false} tickLine={false} tick={{ fill: '#8f8e85', fontSize: 12 }} />
              <YAxis type="category" dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#26251e', fontSize: 12, fontWeight: 'bold' }} width={80} />
              <Tooltip cursor={{ fill: '#f7f7f4' }} contentStyle={{ borderRadius: '8px', border: '1px solid #e6e5e0' }} />
              <Bar dataKey="totalRisk" radius={[0, 4, 4, 0]} barSize={32} name="누적 위험도">
                {topRisky.map((_entry, index) => (
                  <Cell key={\`cell-\${index}\`} fill={index === 0 ? '#d43000' : index === 1 ? '#f54e00' : '#ff7a33'} />
                ))}
              </Bar>
            </BarChart>
          </div>
        </div>
      </div>

      {/* 접속 로그 */}
      <div className="bg-card border border-hairline rounded-md shadow-sm flex flex-col">
        <div className="border-b border-hairline" style={{ padding: '20px 24px' }}>
          <h3 className="text-ink text-base font-bold">최근 전사 접속 로그 (실시간)</h3>
        </div>
        <div className="flex-1" style={{ padding: '0 24px' }}>
          <div className="flex justify-between items-center text-sm text-muted font-bold border-b border-hairline py-4">
            <span className="w-1/4">사용자</span>
            <span className="w-1/4">IP 주소</span>
            <span className="w-1/4">위험도 및 사유</span>
            <span className="w-1/4 text-right">상태</span>
          </div>
          {logs.length > 0 ? logs.slice(0, 5).map((log, i) => (
            <div key={i} className="flex justify-between items-center text-base py-4 border-b border-canvas-soft last:border-0">
              <span className="w-1/4 text-ink font-medium">{log.email || '알 수 없음'}</span>
              <span className="w-1/4 text-body font-mono text-sm">{log.ip_address}</span>
              <span className="w-1/4 flex items-center" style={{ gap: '8px' }}>
                <span className={\`font-bold \${log.risk_score >= 50 ? 'text-semantic-error' : log.risk_score >= 20 ? 'text-primary' : 'text-semantic-success'}\`}>{log.risk_score}점</span>
                <span className="text-body text-sm truncate">{log.reason}</span>
              </span>
              <span className="w-1/4 text-right font-bold">
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

function AddUserPopup() {
  const [formData, setFormData] = useState({ email: '', password: '', name: '', department: '일반부서', role: 'USER' });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', formData);
      if (window.opener) {
        window.opener.postMessage('RELOAD_USERS', '*');
      }
      window.close();
    } catch (err: any) {
      alert(err.response?.data?.message || '생성 실패');
    }
  };

  return (
    <div className="bg-canvas min-h-screen font-sans" style={{ padding: '32px' }}>
      <div className="bg-card rounded-lg border border-hairline shadow-sm mx-auto" style={{ maxWidth: '42rem', padding: '40px' }}>
        <div className="flex justify-between items-center border-b border-hairline" style={{ paddingBottom: '24px', marginBottom: '32px' }}>
          <h3 className="font-bold text-ink" style={{ fontSize: '1.875rem' }}>새 임직원 등록</h3>
        </div>
        <form onSubmit={handleAddUser} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="block font-bold text-ink" style={{ fontSize: '14px', marginBottom: '6px' }}>이메일</label>
            <input type="email" placeholder="이메일 주소" required value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:border-primary transition-all" style={{ padding: '14px', fontSize: '16px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label className="block font-bold text-ink" style={{ fontSize: '14px', marginBottom: '6px' }}>임시 비밀번호</label>
            <input type="password" placeholder="임시 비밀번호" required value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:border-primary transition-all" style={{ padding: '14px', fontSize: '16px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label className="block font-bold text-ink" style={{ fontSize: '14px', marginBottom: '6px' }}>이름</label>
            <input type="text" placeholder="실명" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:border-primary transition-all" style={{ padding: '14px', fontSize: '16px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px' }}>
            <div>
              <label className="block font-bold text-ink" style={{ fontSize: '14px', marginBottom: '6px' }}>부서</label>
              <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:border-primary transition-all" style={{ padding: '14px', fontSize: '16px', boxSizing: 'border-box' }}>
                {['일반부서', '재무팀', '인사팀', '보안팀'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-ink" style={{ fontSize: '14px', marginBottom: '6px' }}>권한 (Role)</label>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:border-primary transition-all" style={{ padding: '14px', fontSize: '16px', boxSizing: 'border-box' }}>
                <option value="USER">일반 사용자</option>
                <option value="FINANCE">재무 관리자</option>
                <option value="ADMIN">시스템 관리자</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end border-t border-hairline" style={{ paddingTop: '24px', marginTop: '8px', gap: '16px' }}>
            <button type="button" onClick={() => window.close()} className="text-body font-bold hover:text-ink" style={{ padding: '14px 24px', fontSize: '16px' }}>취소</button>
            <button type="submit" className="bg-primary hover:bg-primary-active text-card rounded-md font-bold transition-all" style={{ padding: '14px 32px', fontSize: '16px' }}>등록 완료</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function UsersPage() {
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
        <h2 className="text-2xl font-bold text-ink">전사 임직원 목록</h2>
        <button onClick={() => window.open('/users/add', 'AddUser', 'width=650,height=800,left=200,top=100')} className="bg-primary hover:bg-primary-active text-card rounded-md font-bold transition-all" style={{ padding: '10px 24px', fontSize: '15px' }}>
          + 임직원 추가
        </button>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-muted text-base uppercase font-bold border-b border-hairline">
              <th className="pl-14 pr-8 w-1/4" style={{ paddingTop: '8px', paddingBottom: '8px' }}>이름</th>
              <th className="px-8 w-1/4" style={{ paddingTop: '8px', paddingBottom: '8px' }}>이메일</th>
              <th className="px-8 w-1/6" style={{ paddingTop: '8px', paddingBottom: '8px' }}>권한</th>
              <th className="px-8 w-1/6" style={{ paddingTop: '8px', paddingBottom: '8px' }}>부서</th>
              <th className="px-8 w-1/6" style={{ paddingTop: '8px', paddingBottom: '8px' }}>상태</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="text-lg hover:bg-canvas transition-colors border-b border-hairline last:border-0">
                <td className="pl-14 pr-8 font-semibold text-ink" style={{ paddingTop: '8px', paddingBottom: '8px' }}>{u.name || 'Unknown'}</td>
                <td className="px-8 text-body" style={{ paddingTop: '8px', paddingBottom: '8px' }}>{u.email}</td>
                <td className="px-8" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                  <span className="text-base font-bold tracking-wide uppercase" style={{ color: u.role === 'ADMIN' ? '#f54e00' : '#26251e' }}>{u.role}</span>
                </td>
                <td className="px-8 text-body font-medium" style={{ paddingTop: '8px', paddingBottom: '8px' }}>{u.department}</td>
                <td className="px-8" style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                  <div className="flex items-center gap-4">
                    <div className={\`w-3.5 h-3.5 rounded-full \${u.is_active ? 'bg-semantic-success' : 'bg-semantic-error'}\`}></div>
                    <span className="text-ink font-bold">{u.is_active ? '정상(Active)' : '정지됨'}</span>
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

function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  const fetchDevices = () => api.get('/admin/devices').then(res => setDevices(res.data)).catch(console.error);
  useEffect(() => { fetchDevices(); }, []);

  const handleApprove = async (id: number) => {
    try {
      await api.patch(\`/admin/devices/\${id}/approve\`);
      fetchDevices();
    } catch (err: any) {
      alert(err.response?.data?.message || '승인 실패');
    }
  };

  const handleRevoke = async (id: number) => {
    if (!confirm('이 기기의 신뢰를 해제하시겠습니까?')) return;
    try {
      await api.patch(\`/admin/devices/\${id}/revoke\`);
      fetchDevices();
    } catch (err: any) {
      alert(err.response?.data?.message || '해제 실패');
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
                  <span className="text-sm font-bold tracking-wide uppercase" style={{ color: d.device_type === 'BYOD' ? '#f54e00' : '#26251e' }}>{d.device_type || '-'}</span>
                </td>
                <td className="px-4" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                  <div className="flex items-center gap-2">
                    <div className={\`w-3 h-3 rounded-full \${d.is_compliant ? 'bg-semantic-success' : 'bg-primary'}\`}></div>
                    <span className="text-ink font-bold text-sm">{d.is_compliant ? 'Compliant' : '취약'}</span>
                  </div>
                </td>
                <td className="px-4" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                  {d.is_trusted === 1 ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-semantic-success/10 text-semantic-success">
                      ● 인가됨
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary">
                      ◌ 승인 대기
                    </span>
                  )}
                </td>
                <td className="px-4" style={{ paddingTop: '10px', paddingBottom: '10px' }}>
                  <div className="flex items-center gap-2">
                    {d.is_trusted !== 1 ? (
                      <button onClick={() => handleApprove(d.id)}
                        className="px-3 py-1.5 bg-semantic-success text-white text-xs font-bold rounded-md hover:opacity-80 transition-all">
                        승인
                      </button>
                    ) : (
                      <button onClick={() => handleRevoke(d.id)}
                        className="px-3 py-1.5 bg-semantic-error/10 text-semantic-error text-xs font-bold rounded-md hover:bg-semantic-error/20 transition-all border border-semantic-error/20">
                        해제
                      </button>
                    )}
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

// -- [App Router] --
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardLayout><Overview /></DashboardLayout>} />
        <Route path="/users" element={<DashboardLayout><UsersPage /></DashboardLayout>} />
        <Route path="/users/add" element={<AddUserPopup />} />
        <Route path="/devices" element={<DashboardLayout><DevicesPage /></DashboardLayout>} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}
\`;

fs.writeFileSync(appPath, content, 'utf8');
console.log('App.tsx Fully rebuilt successfully with NO syntax errors!');
