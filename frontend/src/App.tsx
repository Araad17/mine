import { Navigate, Route, Routes } from 'react-router-dom';
import type { ReactElement } from 'react';
import { useAuth } from './auth';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import Shipments from './pages/Shipments';
import ShipmentForm from './pages/ShipmentForm';
import ShipmentView from './pages/ShipmentView';
import Receivers from './pages/Receivers';
import StatementPage from './pages/StatementPage';
import Admins from './pages/Admins';
import PdfPreview from './pages/PdfPreview';

function Protected({ children, superOnly }: { children: ReactElement; superOnly?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-8 text-center">در حال بارگذاری…</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (superOnly && user.role !== 'super_admin') return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<Protected><Layout /></Protected>}>
        <Route index element={<Dashboard />} />
        <Route path="shipments" element={<Shipments />} />
        <Route path="shipments/new" element={<ShipmentForm />} />
        <Route path="shipments/:id" element={<ShipmentView />} />
        <Route path="shipments/:id/edit" element={<ShipmentForm />} />
        <Route path="receivers" element={<Receivers />} />
        <Route path="statement" element={<StatementPage />} />
        <Route path="pdf/:kind/:id" element={<PdfPreview />} />
        <Route path="admins" element={<Protected superOnly><Admins /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
