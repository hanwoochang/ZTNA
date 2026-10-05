import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, Activity, Users, Server, LogOut } from 'lucide-react';

const PAGE_TITLES: Record<string, string> = {
  '/dashboard': '대시보드',
  '/users': '임직원 통제',
  '/devices': '단말 자산',
};

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;
  const title = PAGE_TITLES[location.pathname] || '대시보드';

  return (
    <div className="bg-canvas font-sans" style={{ display: 'flex', height: '100vh', width: '100vw', padding: '32px', gap: '40px', boxSizing: 'border-box', overflow: 'hidden' }}>
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
        <header className="flex items-center shrink-0 pt-2" style={{ gap: '16px' }}>
          <h1 className="text-4xl font-bold text-ink tracking-tight">{title}</h1>
          <div className="h-5 w-px bg-muted/40"></div>
          <p className="text-body text-lg font-medium">네트워크 접근 통제 및 단말기 보안 현황을 간략히 확인할 수 있습니다.</p>
        </header>
        <div className="flex-1 overflow-y-auto bg-transparent pb-6 pr-4">
          {children}
        </div>
      </main>
    </div>
  );
}

