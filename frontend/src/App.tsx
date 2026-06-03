import { lazy, Suspense, type ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import './styles/theme.css';
import Layout from './components/Layout';
import LoginPage from './components/LoginPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import type { DemoUser } from './context/AuthContext';

const PessoaProfilePage = lazy(() => import('./pages/PessoaProfilePage'));
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const SearchPage = lazy(() => import('./pages/SearchPage'));
const PresencasPage = lazy(() => import('./pages/PresencasPage'));
const ConferenciaRMAPage = lazy(() => import('./pages/ConferenciaRMAPage'));
const ReportsPage = lazy(() => import('./pages/ReportsPage'));
const ImpactoSocialAlberguePage = lazy(() => import('./pages/ImpactoSocialAlberguePage'));
const InstitutionalDashboardPage = lazy(() => import('./pages/InstitutionalDashboardPage'));
const CrecheDashboardPage = lazy(() => import('./pages/CrecheDashboardPage'));
const CrecheReportsPage = lazy(() => import('./pages/CrecheReportsPage'));
const CrecheChildrenPage = lazy(() => import('./pages/CrecheChildrenPage'));
const CrecheChildProfilePage = lazy(() => import('./pages/CrecheChildProfilePage'));
const CrecheFrequencyPage = lazy(() => import('./pages/CrecheFrequencyPage'));
const CrecheClassPage = lazy(() => import('./pages/CrecheClassPage'));
const CrecheTeachersPage = lazy(() => import('./pages/CrecheTeachersPage'));
const LojasSecretariaPage = lazy(() => import('./pages/LojasSecretariaPage'));
const LojasStorePage = lazy(() => import('./pages/LojasStorePage'));
const FinancialReportPage = lazy(() => import('./pages/FinancialReportPage'));
const CaixaFinanceiroPage = lazy(() => import('./pages/CaixaFinanceiroPage'));
const SupportUsersPage = lazy(() => import('./pages/SupportUsersPage'));
const SupportAuditPage = lazy(() => import('./pages/SupportAuditPage'));
const SupportSystemHealthPage = lazy(() => import('./pages/SupportSystemHealthPage'));
const MyAccountPage = lazy(() => import('./pages/MyAccountPage'));
const DataQualityPage = lazy(() => import('./pages/DataQualityPage'));

function NotFound() {
  return (
    <div style={{ textAlign: 'center', marginTop: 64 }}>
      <h1>Página não encontrada</h1>
      <p>Verifique o endereço ou volte para o <a href="/gestao">Dashboard</a>.</p>
    </div>
  );
}

function RouteFallback() {
  return (
    <div className="route-loading" role="status">
      Carregando módulo...
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

  return (
    <Layout>
      <Suspense fallback={<RouteFallback />}>{children}</Suspense>
    </Layout>
  );
}

function canAccessPath(user: DemoUser, pathname: string) {
  if (pathname === '/minha-conta') {
    return true;
  }

  if (pathname.startsWith('/suporte')) {
    return user.role === 'suporte';
  }

  if (pathname.includes('/auditoria')) {
    return false;
  }

  if (pathname === '/albergue/relatorios') {
    return user.role === 'gestora' || user.role === 'equipe_tecnica' || user.role === 'coordenador_albergue';
  }

  if (pathname === '/creche/relatorios') {
    return user.role === 'gestora' || user.role === 'equipe_tecnica' || user.role === 'coordenador_creche';
  }

  if (pathname === '/lojas/secretaria/relatorio-executivo') {
    return user.role === 'gestora' || user.role === 'financeiro';
  }

  if (pathname === '/lojas/secretaria/caixa') {
    return user.role === 'financeiro';
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
    return pathname === '/lojas/bazar' || pathname === '/lojas/bazar/produtos';
  }

  if (user.role === 'loja_brecho') {
    return pathname === '/lojas/brecho' || pathname === '/lojas/brecho/produtos';
  }

  if (user.role === 'loja_feirao') {
    return pathname === '/lojas/feirao' || pathname === '/lojas/feirao/produtos';
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
        path="/suporte/auditoria"
        element={(
          <ProtectedLayout>
            <SupportAuditPage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/suporte/saude"
        element={(
          <ProtectedLayout>
            <SupportSystemHealthPage />
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
        path="/lojas/secretaria/caixa"
        element={(
          <ProtectedLayout>
            <CaixaFinanceiroPage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/lojas/secretaria/relatorio-executivo"
        element={(
          <ProtectedLayout>
            <FinancialReportPage />
          </ProtectedLayout>
        )}
      />
      <Route
        path="/lojas/secretaria/qualidade-dados"
        element={(
          <ProtectedLayout>
            <DataQualityPage area="financeiro" />
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
        path="/gestao/qualidade-dados"
        element={(
          <ProtectedLayout>
            <DataQualityPage />
          </ProtectedLayout>
        )}
      />
      <Route path="/gestao/relatorios" element={<Navigate replace to="/gestao" />} />
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
      <Route path="/creche/relatorio-executivo" element={<Navigate replace to="/creche/relatorios" />} />
      <Route
        path="/creche/qualidade-dados"
        element={(
          <ProtectedLayout>
            <DataQualityPage area="creche" />
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
      <Route path="/albergue/relatorio-executivo" element={<Navigate replace to="/albergue/relatorios" />} />
      <Route
        path="/albergue/qualidade-dados"
        element={(
          <ProtectedLayout>
            <DataQualityPage area="albergue" />
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
      <Route path="/albergue/admin" element={<Navigate replace to="/albergue" />} />
      <Route path="/admin" element={<Navigate replace to="/albergue" />} />
      <Route path="/albergue/escala" element={<Navigate replace to="/albergue" />} />
      <Route path="/escala" element={<Navigate replace to="/albergue" />} />
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
