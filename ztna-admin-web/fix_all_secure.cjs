const fs = require('fs');

const appPath = 'C:\\ZTNA\\ztna\\ztna-admin-web\\src\\App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

// 1. Add imports
content = content.replace(
  "import { Shield, ShieldAlert, Users, Server, Activity, LogOut, Bell, Settings, Search } from 'lucide-react';",
  "import { Shield, ShieldAlert, Users, Server, Activity, LogOut, Bell, Settings, Search } from 'lucide-react';\nimport { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';"
);

// 2. Box Sizing
content = content.replace(
  '<form onSubmit={handleLogin}>',
  '<form onSubmit={handleLogin} style={{ boxSizing: \'border-box\' }}>'
);
content = content.replace(
  'type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)}',
  'type="email" placeholder="Email Address" value={email} onChange={e => setEmail(e.target.value)} style={{ boxSizing: \'border-box\' }}'
);
content = content.replace(
  'type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)}',
  'type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} style={{ boxSizing: \'border-box\' }}'
);

// 3. Icon Sizing
content = content.replace(/className="w-14 h-14 rounded-full border border-hairline flex items-center justify-center bg-canvas"/g, 'className="rounded-full border border-hairline flex items-center justify-center bg-canvas" style={{ width: \'64px\', height: \'64px\', flexShrink: 0 }}');

// 4. Role & Device Colors
content = content.replace(
  'className={`px-4 py-2 rounded-sm text-base font-bold tracking-wide uppercase ${u.role === \'ADMIN\' ? \'bg-primary text-card\' : \'bg-canvas-soft border border-hairline text-ink\'}`}',
  'className="text-base font-bold tracking-wide uppercase" style={{ color: u.role === \'ADMIN\' ? \'#f54e00\' : \'#26251e\' }}'
);
content = content.replace(
  'className={`px-4 py-2 rounded-sm text-base font-bold tracking-wide uppercase ${d.device_type === \'CORPORATE\' ? \'bg-canvas-soft border border-hairline text-ink\' : \'bg-[#fff0e5] text-primary\'}`}',
  'className="text-base font-bold tracking-wide uppercase" style={{ color: d.device_type === \'BYOD\' ? \'#f54e00\' : \'#26251e\' }}'
);

// 5. Header Padding
content = content.replace(
  'className="pl-14 pr-10 py-10 border-b border-hairline flex justify-between items-center bg-canvas-soft"',
  'className="border-b border-hairline flex justify-between items-center bg-canvas-soft" style={{ padding: \'32px 48px\' }}'
);
content = content.replace(
  'className="pl-14 pr-10 py-10 border-b border-hairline flex justify-between items-center bg-canvas-soft"',
  'className="border-b border-hairline flex justify-between items-center bg-canvas-soft" style={{ padding: \'32px 48px\' }}'
);

// 6. Table Shrinking
content = content.replace(/py-8/g, 'py-4');
content = content.replace(/py-6/g, 'py-4');
content = content.replace(/<h3 className="text-ink text-2xl font-bold tracking-tight">전사 임직원 목록<\/h3>/g, '<h2 className="text-2xl font-bold text-ink">전사 임직원 목록</h2>');
content = content.replace(/<h3 className="text-ink text-2xl font-bold tracking-tight">단말기 자산 목록<\/h3>/g, '<h2 className="text-2xl font-bold text-ink">단말기 자산 목록</h2>');

// 7. Re-add Charts (Middle Section) without ResponsiveContainer to avoid bugs
const overviewRegex = /function Overview\(\) \{[\s\S]*?return \([\s\S]*?\{\/\* BOTTOM SECTION \*\/\}/;
const newOverview = `function Overview() {
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
                  <Cell key={\`cell-\${index}\`} fill={index === 0 ? '#d43000' : index === 1 ? '#f54e00' : '#ff7a33'} />
                ))}
              </Bar>
            </BarChart>
          </div>
        </div>
      </div>

      {/* BOTTOM SECTION */}`;

content = content.replace(overviewRegex, newOverview);

fs.writeFileSync(appPath, content, 'utf8');
console.log('App.tsx successfully reconstructed securely with fixed sizes and UTF8!');
