const fs = require('fs');
const appPath = 'C:\\ZTNA\\ztna\\ztna-admin-web\\src\\App.tsx';
let content = fs.readFileSync(appPath, 'utf8');

const oldPopupRegex = /function AddUserPopup\(\) \{[\s\S]*?return \([\s\S]*?\}\);?\s*\}/;

const newPopup = `function AddUserPopup() {
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
}`;

content = content.replace(oldPopupRegex, newPopup);
fs.writeFileSync(appPath, content, 'utf8');
console.log('Fixed AddUserPopup with inline styles!');
