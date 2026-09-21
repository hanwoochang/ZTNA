const fs = require('fs');
const appPath = 'C:\\ZTNA\\ztna\\ztna-admin-web\\src\\App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

// 1. RECOVER USER'S DEVICE APPROVAL WORKFLOW
const oldDevicesPage = /function DevicesPage\(\) \{[\s\S]*?return \([\s\S]*?\}\);?\s*\}/;

const newDevicesPage = `function DevicesPage() {
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
}`;

content = content.replace(oldDevicesPage, newDevicesPage);

// 2. EXTRACT ADD USER POPUP (Standalone Window + Inline Styles)
const oldUsersPage = /function UsersPage\(\) \{[\s\S]*?return \([\s\S]*?\}\);?\s*\}/;

const newUsersPageAndPopup = `function AddUserPopup() {
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
}`;

content = content.replace(oldUsersPage, newUsersPageAndPopup);

// 3. ADD ROUTE
content = content.replace(
  '<Route path="/users" element={<DashboardLayout><UsersPage /></DashboardLayout>} />',
  '<Route path="/users" element={<DashboardLayout><UsersPage /></DashboardLayout>} />\n        <Route path="/users/add" element={<AddUserPopup />} />'
);

fs.writeFileSync(appPath, content, 'utf8');
console.log('App.tsx fully restored and refactored safely!');
