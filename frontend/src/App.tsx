// APP COMPLETO RESTAURADO - ConferenciaRMAPage estava vazia!
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import PessoaProfilePage from './pages/PessoaProfilePage';
import './styles/theme.css';
import DashboardPage from './pages/DashboardPage';
import SearchPage from './pages/SearchPage';
import AdminToolsPage from './pages/AdminToolsPage';
import ScaleManagerPage from './pages/ScaleManagerPage';
import PresencasPage from './pages/PresencasPage';
import ConferenciaRMAPage from './pages/ConferenciaRMAPage';
import ReportsPage from './pages/ReportsPage';
import Layout from './components/Layout';

function NotFound() {
  return (
    <div style={{ textAlign: 'center', marginTop: 64 }}>
      <h1>Página não encontrada</h1>
      <p>Verifique o endereço ou volte para o <a href="/dashboard">Dashboard</a>.</p>
    </div>
  );
}

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/buscar" element={<SearchPage />} />
          <Route path="/relatorios" element={<ReportsPage />} />
          <Route path="/admin" element={<AdminToolsPage />} />
          <Route path="/escala" element={<ScaleManagerPage />} />
          <Route path="/presencas" element={<PresencasPage />} />
          <Route path="/pessoa/:id" element={<PessoaProfilePage />} />
          <Route path="/conferencia-rma" element={<ConferenciaRMAPage />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;
