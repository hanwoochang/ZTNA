import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import { Shield, ShieldAlert, Users, Server, Activity, LogOut, Search } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, BarChart, Bar, Cell } from 'recharts';

import { LoginPage } from './pages/LoginPage';
import { Overview } from './pages/Overview';
import { UsersPage } from './pages/UsersPage';
import { DevicesPage } from './pages/DevicesPage';
import { LogsPage } from './pages/LogsPage';
import { DashboardLayout } from './components/layout/DashboardLayout';
import { AddUserPopup } from './components/modals/AddUserPopup';

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
          <Route path="/logs" element={<DashboardLayout><LogsPage /></DashboardLayout>} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    </BrowserRouter>
  );
}
