import type { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import PessoaProfilePage from './pages/PessoaProfilePage';
import './styles/theme.css';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import AdminToolsPage from './pages/AdminToolsPage';
import ScaleManagerPage from './pages/ScaleManagerPage';
import PresencasPage from './pages/PresencasPage';
import ConferenciaRMAPage from './pages/ConferenciaRMAPage';
import ReportsPage from './pages/ReportsPage';
import ImpactoSocialAlberguePage from './pages/ImpactoSocialAlberguePage';
import Layout from './components/Layout';
import LoginPage from './components/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import InstitutionalDashboardPage from './pages/InstitutionalDashboardPage';
import CrecheDashboardPage from './pages/CrecheDashboardPage';
import CrecheReportsPage from './pages/CrecheReportsPage';
import CrecheChildrenPage from './pages/CrecheChildrenPage';
import CrecheChildProfilePage from './pages/CrecheChildProfilePage';
import CrecheFrequencyPage from './pages/CrecheFrequencyPage';
import CrecheClassPage from './pages/CrecheClassPage';
import CrecheTeachersPage from './pages/CrecheTeachersPage';
import LojasSecretariaPage from './pages/LojasSecretariaPage';
import LojasStorePage from './pages/LojasStorePage';
import SupportUsersPage from './pages/SupportUsersPage';
import MyAccountPage from './pages/MyAccountPage';
import type { DemoUser } from './context/AuthContext';

function NotFound() {
  return (
    <div style={{ textAlign: 'center', marginTop: 64 }}>
      <h1>Página não encontrada</h1>
      <p>Verifique o endereço ou volte para o <a href="/gestao">Dashboard</a>.</p>
    </div>
  );
}

function ProtectedLayout({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();
  const location = useLocation();

  if (!currentUser) {
    return <Navigate replace state={{ from: location.pathname }} to="/login" />;
  }

  if (currentUser.mustChangePassword && location.pathname !== '/minha-conta') {
    return <Navigate replace to="/minha-conta?trocarSenha=1" />;
  }

  if (!canAccessPath(currentUser, location.pathname)) {
    return <Navigate replace to={currentUser.homePath} />;
  }

  return <Layout>{children}</Layout>;
}

function canAccessPath(user: DemoUser, pathname: string) {
  if (pathname === '/minha-conta') {
    return true;
  }

  if (pathname.startsWith('/suporte')) {
    return user.role === 'suporte';
  }

  if (user.role === 'suporte') {
    return false;
  }

  if (user.role === 'gestora') {
    if (pathname.startsWith('/lojas/') && pathname !== '/lojas/secretaria') {
      return false;
    }

    return true;
  }

  if (user.role === 'equipe_tecnica') {
    if (pathname.startsWith('/lojas/') && !pathname.startsWith('/lojas/secretaria')) {
      return false;
    }

    return true;
  }

  if (user.role === 'coordenador_albergue' || user.role === 'educador_albergue') {
    return pathname.startsWith('/albergue') || pathname === '/dashboard';
  }

  if (user.role === 'coordenador_creche' || user.role === 'educador_creche') {
    return pathname.startsWith('/creche');
  }

  if (user.role === 'financeiro') {
    return pathname === '/lojas/secretaria' || pathname.startsWith('/lojas/secretaria/');
  }

  if (user.role === 'loja_bazar') {
    return pathname === '/lojas/bazar' || pathname.startsWith('/lojas/bazar/');
  }

  if (user.role === 'loja_brecho') {
    return pathname === '/lojas/brecho' || pathname.startsWith('/lojas/brecho/');
  }

  if (user.role === 'loja_feirao') {
    return pathname === '/lojas/feirao' || pathname.startsWith('/lojas/feirao/');
  }

  return false;
}

function HomeRedirect() {
  const { currentUser } = useAuth();

  if (!currentUser) {
    return <Navigate replace to="/login" />;
  }

  if (currentUser.mustChangePassword) {
    return <Navigate replace to="/minha-conta?trocarSenha=1" />;
  }

  return <Navigate replace to={currentUser.homePath} />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/" element={<HomeRedirect />} />
      <Route
        path="/minha-conta"
        element={(
          <ProtectedLayout>
            <MyAccountPage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/suporte/usuarios"
        element={(
          <ProtectedLayout>
            <SupportUsersPage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/lojas"
        element={<HomeRedirect />}
      />
      <Route
        path="/lojas/secretaria"
        element={(
          <ProtectedLayout>
            <LojasSecretariaPage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/lojas/secretaria/fila"
        element={(
          <ProtectedLayout>
            <LojasSecretariaPage mode="fila" />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/lojas/secretaria/historico"
        element={(
          <ProtectedLayout>
            <LojasSecretariaPage mode="historico" />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/lojas/:lojaSlug"
        element={(
          <ProtectedLayout>
            <LojasStorePage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/lojas/:lojaSlug/produtos"
        element={(
          <ProtectedLayout>
            <LojasStorePage mode="produtos" />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/lojas/:lojaSlug/historico"
        element={(
          <ProtectedLayout>
            <LojasStorePage mode="historico" />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/gestao"
        element={(
          <ProtectedLayout>
            <InstitutionalDashboardPage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/creche"
        element={(
          <ProtectedLayout>
            <CrecheDashboardPage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/creche/relatorios"
        element={(
          <ProtectedLayout>
            <CrecheReportsPage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/creche/professoras"
        element={(
          <ProtectedLayout>
            <CrecheTeachersPage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/creche/turmas"
        element={(
          <ProtectedLayout>
            <CrecheClassPage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/creche/turmas/:id"
        element={(
          <ProtectedLayout>
            <CrecheClassPage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/creche/criancas"
        element={(
          <ProtectedLayout>
            <CrecheChildrenPage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/creche/criancas/:id"
        element={(
          <ProtectedLayout>
            <CrecheChildProfilePage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/creche/frequencia"
        element={(
          <ProtectedLayout>
            <CrecheFrequencyPage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/albergue"
        element={(
          <ProtectedLayout>
            <DashboardPage />
          </ProtectedLayout>
        )}
      />
      <Route path="/dashboard" element={<Navigate replace to="/albergue" />} />
      <Route
        path="/albergue/buscar"
        element={(
          <ProtectedLayout>
            <SearchPage />
          </ProtectedLayout>
        )}
      />
      <Route path="/buscar" element={<Navigate replace to="/albergue/buscar" />} />
      <Route
        path="/albergue/relatorios"
        element={(
          <ProtectedLayout>
            <ReportsPage />
          </ProtectedLayout>
        )}
      />
      <Route path="/relatorios" element={<Navigate replace to="/albergue/relatorios" />} />
      <Route
        path="/albergue/impacto-social"
        element={(
          <ProtectedLayout>
            <ImpactoSocialAlberguePage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/albergue/admin"
        element={(
          <ProtectedLayout>
            <AdminToolsPage />
          </ProtectedLayout>
        )}
      />
      <Route path="/admin" element={<Navigate replace to="/albergue/admin" />} />
      <Route
        path="/albergue/escala"
        element={(
          <ProtectedLayout>
            <ScaleManagerPage />
          </ProtectedLayout>
        )}
      />
      <Route path="/escala" element={<Navigate replace to="/albergue/escala" />} />
      <Route
        path="/albergue/presencas"
        element={(
          <ProtectedLayout>
            <PresencasPage />
          </ProtectedLayout>
        )}
      />
      <Route path="/presencas" element={<Navigate replace to="/albergue/presencas" />} />
      <Route
        path="/albergue/pessoa/:id"
        element={(
          <ProtectedLayout>
            <PessoaProfilePage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/pessoa/:id"
        element={(
          <ProtectedLayout>
            <PessoaProfilePage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/albergue/conferencia-rma"
        element={(
          <ProtectedLayout>
            <ConferenciaRMAPage />
          </ProtectedLayout>
        )}
      />
      <Route path="/conferencia-rma" element={<Navigate replace to="/albergue/conferencia-rma" />} />
      <Route
        path="*"
        element={(
          <ProtectedLayout>
            <NotFound />
          </ProtectedLayout>
        )}
      />
    </Routes>
  );
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  );
}

export default App;
