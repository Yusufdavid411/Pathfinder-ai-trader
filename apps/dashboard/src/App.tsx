import { Navigate, Route, Routes } from 'react-router-dom';

import { AppProvider } from './contexts/AppContext';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/LoginPage';
import ReportsPage from './pages/ReportsPage';
import SettingsPage from './pages/SettingsPage';

export default function App() {
  return (
    <AppProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Routes>
    </AppProvider>
  );
}
