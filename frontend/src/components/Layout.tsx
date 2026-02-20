import type { ReactNode } from 'react';
import { useCallback, useState, useRef } from 'react';
import BottomNav from './BottomNav';
import CadastroPessoaModal from './CadastroPessoaModal';
import Toast from './Toast';
import type { ToastType } from './Toast';
import '../styles/theme.css';

interface LayoutProps {
  children: ReactNode;
}

export const ToastContext = (window as any).ToastContext || null;

const Layout = ({ children }: LayoutProps) => {
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: ToastType }>({ message: '', type: 'success' });
  const [showToast, setShowToast] = useState(false);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Modal cadastro pessoa
  const [openCadastro, setOpenCadastro] = useState(false);

  // Função global para exibir toast
  const showToastMsg = useCallback((message: string, type: ToastType = 'success', duration = 3500) => {
    setToast({ message, type });
    setShowToast(true);
    if (toastTimeout.current) clearTimeout(toastTimeout.current);
    toastTimeout.current = setTimeout(() => setShowToast(false), duration);
  }, []);

  // Disponibiliza função global (window) para debug/facilidade
  (window as any).showToast = showToastMsg;

  // Autenticação removida

  return (
    <div className="app-container" style={{ margin: 0, padding: 0 }}>
      <header
        className="app-header"
        style={{
          position: 'relative',
          left: 0,
          top: 0,
          width: '100vw',
          minWidth: '100vw',
          maxWidth: '100vw',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.8rem 2rem',
          borderBottom: '1px solid #e5e7eb',
          background: '#fff',
          minHeight: 80,
          boxSizing: 'border-box',
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
        }}
      >
        <img
          src="/nome.png"
          alt="Albergue Dias da Cruz"
          style={{ height: 54, maxWidth: 340, objectFit: 'contain', display: 'block', background: '#fff', borderRadius: 8, padding: 2 }}
        />
        <img
          src="/icone.png"
          alt="Ícone da instituição"
          style={{ height: 90, marginLeft: 32, display: 'block', background: '#fff', borderRadius: 16, padding: 4 }}
        />
      </header>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#fff', // alterado para branco puro
          borderRadius: 16,
          padding: '24px 0px 20px',
          marginBottom: 32,
          boxShadow: '0px 2px 8px rgba(0,0,0,0.067)',
          minHeight: 100,
          minWidth: 200
        }}
      >
        {children}
      </div>
      <Toast message={toast.message} type={toast.type} show={showToast} onClose={() => setShowToast(false)} />
      <CadastroPessoaModal
        open={openCadastro}
        onClose={() => setOpenCadastro(false)}
        onSuccess={() => {
          window.showToast('Pessoa cadastrada com sucesso!', 'success');
          if (window.reloadTodasPessoas) window.reloadTodasPessoas();
        }}
      />
      <BottomNav onNovoCadastro={() => setOpenCadastro(true)} />
    </div>
  );
};

export default Layout;
