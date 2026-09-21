import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Shield, ShieldAlert, Users, Server, Activity, LogOut, Bell, Settings, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';

// API 설정 (백엔드 정책 서버)
const api = axios.create({ baseURL: 'http://localhost:3000/api' });

// 토큰 설정 인터셉터
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('adminToken');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
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
      const res = await api.post('/login', { email, password, deviceId: 'admin-dashboard-browser' });
      if (res.data.token) {
        localStorage.setItem('adminToken', res.data.token);
        navigate('/dashboard');
      } else {
        setError('로그인 실패: 추가 인증이 필요하거나 권한이 없습니다.');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || '로그인 에러');
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-canvas font-sans">
      <div className="bg-card rounded-lg border border-hairline shadow-none" style={{ width: "600px", padding: "64px" }}>
        <div className="flex justify-center mb-10">
          <ShieldAlert size={80} className="text-primary" />
        </div>
        <h1 className="font-semibold text-center mb-5 text-ink tracking-tight" style={{ fontSize: "2.5rem" }}>Admin Login</h1>
        <p className="text-center text-body mb-10" style={{ fontSize: "1.25rem" }}>ZTNA v2.0 관제 센터에 로그인하세요.</p>
        
        {error && <div className="bg-[#fae9ed] text-semantic-error p-5 rounded-md text-base mb-8 text-center border border-semantic-error/20">{error}</div>}
        
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <input type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:bg-card focus:border-primary transition-all" style={{ boxSizing: 'border-box', height: '84px', width: '100%', padding: '0 24px', fontSize: '1.5rem', display: 'block' }} />
          </div>
          <div>
            <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:bg-card focus:border-primary transition-all" style={{ boxSizing: 'border-box', height: '84px', width: '100%', padding: '0 24px', fontSize: '1.5rem', display: 'block' }} />
          </div>
          <button type="submit" className="w-full bg-primary hover:bg-primary-active text-card rounded-md font-bold transition-all mt-6" style={{ boxSizing: 'border-box', height: '84px', width: '100%', padding: '0 24px', fontSize: '1.5rem', display: 'block' }}>
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}

function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  const isActive = (path: string) => location.pathname === path;

  return (
    <div className="bg-canvas font-sans" style={{ display: 'flex', height: '100vh', width: '100vw', padding: '32px', gap: '40px', boxSizing: 'border-box', overflow: 'hidden' }}>
      {/* Sidebar (Fixed Box) */}
      <aside className="bg-card rounded-xl border border-hairline flex flex-col text-ink shadow-sm z-10 shrink-0" style={{ width: '260px', height: '100%', overflow: 'hidden' }}>
        <div className="flex flex-col items-center pt-10 pb-8 border-b border-hairline shrink-0">
          <Shield size={40} className="text-primary mb-4" />
          <h2 className="font-semibold text-xl text-ink tracking-tight">ZTNA Admin</h2>
        </div>

        <nav className="flex-1 py-4 px-4 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={() => navigate('/dashboard')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/dashboard') ? 'bg-canvas text-ink border border-hairline font-bold shadow-sm' : 'text-body hover:bg-canvas-soft hover:text-ink border border-transparent font-semibold'}`}
          >
            <Activity size={20} /> <span className="text-base">대시보드</span>
          </button>
          
          <button 
            onClick={() => navigate('/users')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/users') ? 'bg-canvas text-ink border border-hairline font-bold shadow-sm' : 'text-body hover:bg-canvas-soft hover:text-ink border border-transparent font-semibold'}`}
          >
            <Users size={20} /> <span className="text-base flex-1 text-left">임직원 통제</span>
          </button>
          
          <button 
            onClick={() => navigate('/devices')} 
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${isActive('/devices') ? 'bg-canvas text-ink border border-hairline font-bold shadow-sm' : 'text-body hover:bg-canvas-soft hover:text-ink border border-transparent font-semibold'}`}
          >
            <Server size={20} /> <span className="text-base flex-1 text-left">단말 자산</span>
          </button>
        </nav>

        <div className="p-4 border-t border-hairline bg-canvas-soft shrink-0">
          <button onClick={() => { localStorage.removeItem('adminToken'); navigate('/login'); }} className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-card border border-hairline text-muted hover:text-semantic-error hover:border-semantic-error/30 rounded-lg transition-all font-semibold shadow-sm">
            <LogOut size={20} /> <span className="text-base">로그아웃</span>
          </button>
        </div>
      </aside>

      {/* Main Column */}
      <main className="flex-1 flex flex-col" style={{ gap: '24px', height: '100%', overflow: 'hidden' }}>
        {/* Top Header (Fixed) */}
        <header className="flex items-center shrink-0 pt-2" style={{ gap: '16px' }}>
          <h1 className="text-2xl font-bold text-ink tracking-tight">대시보드</h1>
          <div className="h-5 w-px bg-muted/40"></div>
          <p className="text-body text-sm font-medium">네트워크 접근 통제 및 단말기 보안 현황을 간략히 확인할 수 있습니다.</p>
        </header>

        {/* Content Body (Scrollable Area) */}
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
    api.get('/admin/stats/trend')
      .then(res => {
        const parsedData = res.data.map((d: any) => ({ ...d, avgRisk: Number(d.avgRisk) }));
        setTrend(parsedData);
      })
      .catch(console.error);
    api.get('/admin/stats/top-risky')
      .then(res => {
        const parsedData = res.data.map((d: any) => ({ ...d, totalRisk: Number(d.totalRisk) }));
        setTopRisky(parsedData);
      })
      .catch(console.error);
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
      
      {/* SUMMARY SECTION */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Single Row Container */}
        <div className="bg-card border border-hairline rounded-md flex items-stretch shadow-sm">
          
          {/* Stat 1: Total Users */}
          <div className="flex-1 border-r border-hairline flex justify-between items-center" style={{ padding: '24px' }}>
            <div>
              <h3 className="text-body text-sm font-bold mb-4">가입 임직원 수</h3>
              <p className="text-4xl font-light text-primary">
                {stats.totalUsers} <span className="text-base font-medium text-muted">명</span>
              </p>
            </div>
            <div className="rounded-full border border-hairline flex items-center justify-center bg-canvas" style={{ width: '64px', height: '64px', flexShrink: 0 }}>
              <Users size={28} className="text-primary" />
            </div>
          </div>

          {/* Stat 2: Total Devices */}
          <div className="flex-1 border-r border-hairline flex justify-between items-center" style={{ padding: '24px' }}>
            <div>
              <h3 className="text-body text-sm font-bold mb-4">등록된 단말기 수</h3>
              <p className="text-4xl font-light text-ink">
                {stats.totalDevices} <span className="text-base font-medium text-muted">대</span>
              </p>
            </div>
            <div className="rounded-full border border-hairline flex items-center justify-center bg-canvas" style={{ width: '64px', height: '64px', flexShrink: 0 }}>
              <Server size={28} className="text-ink" />
            </div>
          </div>

          {/* Stat 3: Denied Today */}
          <div className="flex-1 flex justify-between items-center" style={{ padding: '24px' }}>
            <div>
              <h3 className="text-body text-sm font-bold mb-4">금일 비정상 접근 차단</h3>
              <p className="text-4xl font-light text-semantic-error">
                {stats.deniedToday} <span className="text-base font-medium text-muted">건</span>
              </p>
            </div>
            <div className="rounded-full border border-hairline flex items-center justify-center bg-canvas" style={{ width: '64px', height: '64px', flexShrink: 0 }}>
              <ShieldAlert size={28} className="text-semantic-error" />
            </div>
          </div>

        </div>
      </div>

      {/* MIDDLE SECTION: CHARTS */}
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
              <Tooltip 
                contentStyle={{ borderRadius: '8px', border: '1px solid #e6e5e0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                labelStyle={{ fontWeight: 'bold', color: '#26251e', marginBottom: '4px' }}
              />
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
              <Tooltip 
                cursor={{ fill: '#f7f7f4' }}
                contentStyle={{ borderRadius: '8px', border: '1px solid #e6e5e0' }}
              />
              <Bar dataKey="totalRisk" fill="#f54e00" radius={[0, 4, 4, 0]} barSize={32} name="누적 위험도">
                {topRisky.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={index === 0 ? '#d43000' : index === 1 ? '#f54e00' : '#ff7a33'} />
                ))}
              </Bar>
            </BarChart>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION */}
      <div className="grid grid-cols-1" style={{ gap: '24px' }}>
        
        {/* Real Audit Logs Table Widget */}
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
                  <span className={`font-bold ${log.risk_score >= 50 ? 'text-semantic-error' : log.risk_score >= 20 ? 'text-primary' : 'text-semantic-success'}`}>{log.risk_score}점</span>
                  <span className="text-body text-sm truncate">{log.reason}</span>
                </span>
                <span className="w-1/4 text-right font-bold flex justify-end items-center" style={{ gap: '6px' }}>
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
    </div>
  );
}

function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ email: '', password: '', name: '', department: '일반부서', role: 'USER' });

  const fetchUsers = () => {
    api.get('/admin/users').then(res => setUsers(res.data)).catch(console.error);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/users', formData);
      setShowModal(false);
      setFormData({ email: '', password: '', name: '', department: '일반부서', role: 'USER' });
      fetchUsers();
    } catch (err: any) {
      alert(err.response?.data?.message || '생성 실패');
    }
  };

  return (
    <div className="bg-card rounded-lg border border-hairline overflow-hidden">
      <div className="border-b border-hairline flex justify-between items-center bg-canvas-soft" style={{ padding: '16px 48px' }}>
        <h2 className="text-2xl font-bold text-ink">전사 임직원 목록</h2>
        <button onClick={() => setShowModal(true)} className="bg-primary hover:bg-primary-active text-card rounded-md font-bold transition-all" style={{ padding: "10px 24px", fontSize: "15px" }}>
          + 임직원 추가
        </button>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-muted text-base uppercase font-bold border-b border-hairline">
              <th className="pl-14 pr-8  w-1/4" style={{ paddingTop: '8px', paddingBottom: '8px' }}>이름</th>
              <th className="px-8  w-1/4" style={{ paddingTop: '8px', paddingBottom: '8px' }}>이메일</th>
              <th className="px-8  w-1/6" style={{ paddingTop: '8px', paddingBottom: '8px' }}>권한 (Role)</th>
              <th className="px-8  w-1/6" style={{ paddingTop: '8px', paddingBottom: '8px' }}>부서</th>
              <th className="px-8  w-1/6" style={{ paddingTop: '8px', paddingBottom: '8px' }}>상태</th>
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} className="text-lg hover:bg-canvas transition-colors border-b border-hairline last:border-0">
                <td className="pl-14 pr-8  font-semibold text-ink" style={{ paddingTop: '8px', paddingBottom: '8px' }}>{u.name || 'Unknown'}</td>
                <td className="px-8  text-body" style={{ paddingTop: '8px', paddingBottom: '8px' }}>{u.email}</td>
                <td className="px-8 " style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                  <span className="text-base font-bold tracking-wide uppercase" style={{ color: u.role === 'ADMIN' ? '#f54e00' : '#26251e' }}>
                    {u.role}
                  </span>
                </td>
                <td className="px-8  text-body font-medium" style={{ paddingTop: '8px', paddingBottom: '8px' }}>{u.department}</td>
                <td className="px-8 " style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                  <div className="flex items-center gap-4">
                    <div className={`w-3.5 h-3.5 rounded-full ${u.is_active ? 'bg-semantic-success' : 'bg-semantic-error'}`}></div>
                    <span className="text-ink font-bold">{u.is_active ? '정상(Active)' : '정지됨'}</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-ink/40 flex items-center justify-center z-50">
          <div className="bg-card w-[600px] rounded-lg p-12 border border-hairline">
            <div className="flex justify-between items-center mb-10 border-b border-hairline pb-6">
              <h3 className="text-3xl font-bold text-ink">새 임직원 등록</h3>
              <button onClick={() => setShowModal(false)} className="text-muted hover:text-semantic-error font-bold text-2xl">✕</button>
            </div>
            <form onSubmit={handleAddUser} className="space-y-8">
              <div>
                <label className="block text-base font-bold text-body mb-3">이메일</label>
                <input type="email" placeholder="이메일 주소" required value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full p-5 bg-canvas-soft border border-hairline rounded-md text-lg text-ink outline-none focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-base font-bold text-body mb-3">임시 비밀번호</label>
                <input type="password" placeholder="임시 비밀번호" required value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-5 bg-canvas-soft border border-hairline rounded-md text-lg text-ink outline-none focus:border-primary transition-all" />
              </div>
              <div>
                <label className="block text-base font-bold text-body mb-3">이름</label>
                <input type="text" placeholder="실명" required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-5 bg-canvas-soft border border-hairline rounded-md text-lg text-ink outline-none focus:border-primary transition-all" />
              </div>
              
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <label className="block text-base font-bold text-body mb-3">부서</label>
                  <select value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} className="w-full p-5 bg-canvas-soft border border-hairline rounded-md text-lg text-ink outline-none focus:border-primary transition-all">
                    <option value="일반부서">일반부서</option>
                    <option value="재무팀">재무팀</option>
                    <option value="인사팀">인사팀</option>
                    <option value="보안팀">보안팀</option>
                  </select>
                </div>
                <div>
                  <label className="block text-base font-bold text-body mb-3">권한 (Role)</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} className="w-full p-5 bg-canvas-soft border border-hairline rounded-md text-lg text-ink outline-none focus:border-primary transition-all">
                    <option value="USER">일반 사용자</option>
                    <option value="FINANCE">재무 관리자</option>
                    <option value="ADMIN">시스템 관리자</option>
                  </select>
                </div>
              </div>

              <div className="pt-6 mt-6 flex justify-end gap-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-8 py-5 text-body font-bold hover:text-ink text-lg">취소</button>
                <button type="submit" className="bg-primary hover:bg-primary-active text-card px-10 py-5 rounded-md text-lg font-bold transition-all">
                  등록 완료
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function DevicesPage() {
  const [devices, setDevices] = useState<any[]>([]);

  useEffect(() => {
    api.get('/admin/devices').then(res => setDevices(res.data)).catch(console.error);
  }, []);

  return (
    <div className="bg-card rounded-lg border border-hairline overflow-hidden">
      <div className="border-b border-hairline flex justify-between items-center bg-canvas-soft" style={{ padding: '16px 48px' }}>
        <h2 className="text-2xl font-bold text-ink">단말기 자산 목록</h2>
        <div className="relative">
          <input type="text" placeholder="단말 검색..." className="bg-canvas text-ink rounded-md w-80 outline-none border border-hairline focus:border-primary" style={{ padding: "10px 16px", fontSize: "15px" }} />
          <Search size={20} className="absolute text-muted" style={{ right: "16px", top: "50%", transform: "translateY(-50%)" }} />
        </div>
      </div>

      <div className="overflow-x-auto p-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="text-muted text-base uppercase font-bold border-b border-hairline">
              <th className="pl-14 pr-8  w-1/4" style={{ paddingTop: '8px', paddingBottom: '8px' }}>디바이스 ID</th>
              <th className="px-8  w-1/4" style={{ paddingTop: '8px', paddingBottom: '8px' }}>소유자</th>
              <th className="px-8  w-1/6" style={{ paddingTop: '8px', paddingBottom: '8px' }}>소유 형태</th>
              <th className="px-8  w-1/6" style={{ paddingTop: '8px', paddingBottom: '8px' }}>보안 상태</th>
              <th className="px-8  w-1/6" style={{ paddingTop: '8px', paddingBottom: '8px' }}>인가 여부</th>
            </tr>
          </thead>
          <tbody>
            {devices.map(d => (
              <tr key={d.id} className="text-lg hover:bg-canvas transition-colors border-b border-hairline last:border-0">
                <td className="pl-14 pr-8  font-mono text-body" style={{ paddingTop: '8px', paddingBottom: '8px' }}>{d.device_identifier}</td>
                <td className="px-8  font-semibold text-ink" style={{ paddingTop: '8px', paddingBottom: '8px' }}>{d.name || d.email}</td>
                <td className="px-8 " style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                  <span className="text-base font-bold tracking-wide uppercase" style={{ color: d.device_type === 'BYOD' ? '#f54e00' : '#26251e' }}>
                    {d.device_type}
                  </span>
                </td>
                <td className="px-8 " style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                  <div className="flex items-center gap-4">
                    <div className={`w-3.5 h-3.5 rounded-full ${d.is_compliant ? 'bg-semantic-success' : 'bg-primary'}`}></div>
                    <span className="text-ink font-bold">{d.is_compliant ? '정상(Compliant)' : '취약함'}</span>
                  </div>
                </td>
                <td className="px-8 " style={{ paddingTop: '8px', paddingBottom: '8px' }}>
                  <div className="flex items-center gap-4">
                    <div className={`w-3.5 h-3.5 rounded-full ${d.is_trusted ? 'bg-semantic-success' : 'bg-muted'}`}></div>
                    <span className="text-ink font-bold">{d.is_trusted ? '인가됨(Trusted)' : '대기중'}</span>
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

// -- [App Router] --
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardLayout><Overview /></DashboardLayout>} />
        <Route path="/users" element={<DashboardLayout><UsersPage /></DashboardLayout>} />
        <Route path="/devices" element={<DashboardLayout><DevicesPage /></DashboardLayout>} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}
