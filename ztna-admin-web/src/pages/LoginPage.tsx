import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Shield, ShieldAlert, Users, Server, Activity, LogOut, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';
import api from '../api';

export function LoginPage() {
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

