import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../api';
import { POSITIONS, POSITION_LIST, DEPARTMENTS, ROLES } from '../../constants/organization';

export function EditUserPopup() {
  const { id } = useParams();
  const [formData, setFormData] = useState({ email: '', name: '', department: '일반부서', position: '사원', role: 'USER', is_active: 1 });
  
  useEffect(() => {
    if (id) {
      api.get(`/admin/users`).then(res => {
        const user = res.data.find((u: any) => u.id === parseInt(id));
        if (user) setFormData({ email: user.email, name: user.name, department: user.department, position: user.position || '사원', role: user.role, is_active: user.is_active });
      }).catch(console.error);
    }
  }, [id]);

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.put(`/admin/users/${id}`, { ...formData, position_level: POSITIONS[formData.position] });
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
          <h3 className="font-bold text-ink" style={{ fontSize: '1.875rem' }}>임직원 정보 수정</h3>
        </div>
        <form onSubmit={handleEditUser} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label className="block font-bold text-ink" style={{ fontSize: '14px', marginBottom: '6px' }}>이메일</label>
            <input type="email" placeholder="이메일 주소" required value={formData.email} disabled readOnly className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:border-primary transition-all" style={{ padding: '14px', fontSize: '16px', boxSizing: 'border-box' }} />
          </div>
          <div>
            <label className="block font-bold text-ink" style={{ fontSize: '14px', marginBottom: '6px' }}>이름</label>
            <input type="text" placeholder="실명" required value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:border-primary transition-all" style={{ padding: '14px', fontSize: '16px', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: '20px' }}>
            <div>
              <label className="block font-bold text-ink" style={{ fontSize: '14px', marginBottom: '6px' }}>직급</label>
              <select value={formData.position} onChange={e => setFormData({ ...formData, position: e.target.value })} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:border-primary transition-all" style={{ padding: '14px', fontSize: '16px', boxSizing: 'border-box' }}>
                {POSITION_LIST.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-ink" style={{ fontSize: '14px', marginBottom: '6px' }}>부서</label>
              <select value={formData.department} onChange={e => setFormData({ ...formData, department: e.target.value })} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:border-primary transition-all" style={{ padding: '14px', fontSize: '16px', boxSizing: 'border-box' }}>
                {DEPARTMENTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block font-bold text-ink" style={{ fontSize: '14px', marginBottom: '6px' }}>계정 상태</label>
              <select value={formData.is_active} onChange={e => setFormData({ ...formData, is_active: parseInt(e.target.value) })} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:border-primary transition-all" style={{ padding: '14px', fontSize: '16px', boxSizing: 'border-box' }}>
                <option value={1}>정상 (Active)</option>
                <option value={0}>정지됨 (Suspended)</option>
              </select>
            </div>
            <div>
              <label className="block font-bold text-ink" style={{ fontSize: '14px', marginBottom: '6px' }}>권한 (Role)</label>
              <select value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value })} className="w-full bg-canvas-soft border border-hairline rounded-md text-ink outline-none focus:border-primary transition-all" style={{ padding: '14px', fontSize: '16px', boxSizing: 'border-box' }}>
                {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div className="flex justify-end border-t border-hairline" style={{ paddingTop: '24px', marginTop: '8px', gap: '16px' }}>
            <button type="button" onClick={() => window.close()} className="text-body font-bold hover:text-ink" style={{ padding: '14px 24px', fontSize: '16px' }}>취소</button>
            <button type="submit" className="bg-primary hover:bg-primary-active text-card rounded-md font-bold transition-all" style={{ padding: '14px 32px', fontSize: '16px' }}>수정 완료</button>
          </div>
        </form>
      </div>
    </div>
  );
}
