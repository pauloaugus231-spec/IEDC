import type { ReactNode } from 'react';
import { useCallback, useState, useRef } from 'react';
import { Link, NavLink } from 'react-router-dom';
import CadastroPessoaModal from './CadastroPessoaModal';
import Toast from './Toast';
import type { ToastType } from './Toast';
import { useAuth, type DemoUser, type UserRole } from '../context/AuthContext';
import '../styles/theme.css';
import '../styles/institutional.css';

interface LayoutProps {
  children: ReactNode;
}

export const ToastContext = (window as any).ToastContext || null;

type SidebarLinkItem = {
  type?: 'link';
  label: string;
  to: string;
  roles: UserRole[];
  end?: boolean;
};

type SidebarActionItem = {
  type: 'action';
  action: 'novoCadastro';
  label: string;
  roles: UserRole[];
};

type SidebarGroupItem = {
  type: 'group';
  label: string;
  to: string;
  roles: UserRole[];
  children: Array<SidebarLinkItem | SidebarActionItem>;
};

type SidebarItem = SidebarLinkItem | SidebarActionItem | SidebarGroupItem;

const sidebarSections: { title: string; items: SidebarItem[] }[] = [
  {
    title: 'Institucional',
    items: [
      {
        label: 'Visão institucional',
        to: '/gestao',
        roles: ['gestora', 'equipe_tecnica'],
        end: true,
      },
      {
        label: 'Usuários e suporte',
        to: '/suporte/usuarios',
        roles: ['suporte'],
        end: true,
      },
      {
        type: 'group',
        label: 'Albergue',
        to: '/albergue',
        roles: ['gestora', 'coordenador_albergue', 'equipe_tecnica', 'educador_albergue'],
        children: [
          {
            type: 'action',
            action: 'novoCadastro',
            label: 'Novo cadastro',
            roles: ['gestora', 'coordenador_albergue', 'equipe_tecnica', 'educador_albergue'],
          },
          {
            label: 'Buscar pessoas',
            to: '/albergue/buscar',
            roles: ['gestora', 'coordenador_albergue', 'equipe_tecnica', 'educador_albergue'],
          },
          {
            label: 'Relatórios',
            to: '/albergue/relatorios',
            roles: ['gestora', 'coordenador_albergue', 'equipe_tecnica'],
          },
          {
            label: 'Impacto social',
            to: '/albergue/impacto-social',
            roles: ['gestora', 'coordenador_albergue', 'equipe_tecnica', 'educador_albergue'],
          },
          {
            label: 'Aferição',
            to: '/albergue/conferencia-rma',
            roles: ['gestora', 'coordenador_albergue', 'equipe_tecnica'],
          },
          {
            label: 'Escala',
            to: '/albergue/escala',
            roles: ['gestora', 'coordenador_albergue', 'equipe_tecnica'],
          },
          {
            label: 'Admin',
            to: '/albergue/admin',
            roles: ['gestora'],
          },
        ],
      },
      {
        type: 'group',
        label: 'E.E.I.',
        to: '/creche',
        roles: ['gestora', 'coordenador_creche', 'equipe_tecnica', 'educador_creche'],
        children: [
          {
            label: 'Crianças',
            to: '/creche/criancas',
            roles: ['gestora', 'coordenador_creche', 'equipe_tecnica', 'educador_creche'],
          },
          {
            label: 'Turmas',
            to: '/creche/turmas',
            roles: ['gestora', 'coordenador_creche', 'equipe_tecnica', 'educador_creche'],
          },
          {
            label: 'Equipe',
            to: '/creche/professoras',
            roles: ['gestora', 'coordenador_creche', 'equipe_tecnica'],
          },
          {
            label: 'Frequência',
            to: '/creche/frequencia',
            roles: ['gestora', 'coordenador_creche', 'equipe_tecnica', 'educador_creche'],
          },
          {
            label: 'Relatórios',
            to: '/creche/relatorios',
            roles: ['gestora', 'coordenador_creche', 'equipe_tecnica'],
          },
        ],
      },
      {
        type: 'group',
        label: 'Lojas',
        to: '/lojas/secretaria',
        roles: ['gestora', 'equipe_tecnica', 'financeiro'],
        children: [
          {
            label: 'Visão financeira',
            to: '/lojas/secretaria',
            roles: ['gestora', 'equipe_tecnica', 'financeiro'],
            end: true,
          },
          {
            label: 'Fila de pagamento',
            to: '/lojas/secretaria/fila',
            roles: ['equipe_tecnica', 'financeiro'],
          },
          {
            label: 'Histórico de pagamento',
            to: '/lojas/secretaria/historico',
            roles: ['equipe_tecnica', 'financeiro'],
          },
        ],
      },
      {
        type: 'group',
        label: 'Minha loja',
        to: '/lojas/bazar',
        roles: ['loja_bazar'],
        children: [
          {
            label: 'Produtos da loja',
            to: '/lojas/bazar/produtos',
            roles: ['loja_bazar'],
          },
          {
            label: 'Histórico da loja',
            to: '/lojas/bazar/historico',
            roles: ['loja_bazar'],
          },
        ],
      },
      {
        type: 'group',
        label: 'Minha loja',
        to: '/lojas/brecho',
        roles: ['loja_brecho'],
        children: [
          {
            label: 'Produtos da loja',
            to: '/lojas/brecho/produtos',
            roles: ['loja_brecho'],
          },
          {
            label: 'Histórico da loja',
            to: '/lojas/brecho/historico',
            roles: ['loja_brecho'],
          },
        ],
      },
      {
        type: 'group',
        label: 'Minha loja',
        to: '/lojas/feirao',
        roles: ['loja_feirao'],
        children: [
          {
            label: 'Produtos da loja',
            to: '/lojas/feirao/produtos',
            roles: ['loja_feirao'],
          },
          {
            label: 'Histórico da loja',
            to: '/lojas/feirao/historico',
            roles: ['loja_feirao'],
          },
        ],
      },
    ],
  },
];

function canUseItem(user: DemoUser | null, item: SidebarItem) {
  return Boolean(user && item.roles.includes(user.role));
}

const Layout = ({ children }: LayoutProps) => {
  const { currentUser, logout } = useAuth();
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

  const canOpenCadastro = Boolean(
    currentUser && ['gestora', 'coordenador_albergue', 'equipe_tecnica', 'educador_albergue'].includes(currentUser.role),
  );

  return (
    <div className="institutional-shell">
      <header className="institutional-header">
        <Link className="institutional-brand" to={currentUser?.homePath ?? '/gestao'}>
          <img
            className="institutional-navbar-logo"
            src="/iedc/logo.webp"
            alt="Instituto Espírita Dias da Cruz"
          />
        </Link>

        <div className="institutional-session">
          <div className="session-user">
            <strong>Olá, {currentUser?.displayName ?? 'equipe'}</strong>
            <span>{currentUser?.roleLabel ?? 'Usuário'}</span>
          </div>
          <Link className="account-link" to="/minha-conta">
            Minha conta
          </Link>
          <button className="logout-button" onClick={logout} type="button">
            Sair
          </button>
        </div>
      </header>

      <div className="institutional-body">
        <aside className="executive-sidebar" aria-label="Navegação principal">
          <div className="executive-sidebar-head">
            <div className="executive-sidebar-title">
              <strong>{currentUser?.serviceLabel ?? 'Gestão integrada'}</strong>
              <span>Sistema local de gestão social</span>
            </div>
          </div>

          {sidebarSections.map((section) => {
            const availableItems = section.items.filter((item) => canUseItem(currentUser, item));

            if (!availableItems.length) {
              return null;
            }

            return (
              <nav className="executive-nav-section" key={section.title}>
                <p>{section.title}</p>
                {availableItems.map((item) => {
                  if (item.type === 'group') {
                    const groupItems = item.children.filter((child) => canUseItem(currentUser, child));

                    return (
                      <div className="executive-nav-group" key={item.label}>
                        <NavLink
                          className={({ isActive }) => `executive-nav-item executive-nav-parent ${isActive ? 'active' : ''}`}
                          to={item.to}
                        >
                          <span>
                            {item.label}
                          </span>
                          <em>&gt;</em>
                        </NavLink>

                        {groupItems.length ? (
                          <div className="executive-nav-submenu" role="menu" aria-label={`${item.label}: atalhos`}>
                            {groupItems.map((child) => {
                              if (child.type === 'action') {
                                return (
                                  <button
                                    className="executive-nav-subitem"
                                    key={child.label}
                                    onClick={() => {
                                      if (child.action === 'novoCadastro') {
                                        setOpenCadastro(true);
                                      }
                                    }}
                                    role="menuitem"
                                    type="button"
                                  >
                                    <span>{child.label}</span>
                                    <em>+</em>
                                  </button>
                                );
                              }

                              return (
                                <NavLink
                                  className={({ isActive }) => `executive-nav-subitem ${isActive ? 'active' : ''}`}
                                  end={child.end}
                                  key={child.label}
                                  role="menuitem"
                                  to={child.to}
                                >
                                  <span>{child.label}</span>
                                  <em>&gt;</em>
                                </NavLink>
                              );
                            })}
                          </div>
                        ) : null}
                      </div>
                    );
                  }

                  if (item.type === 'action') {
                    return (
                      <button
                        className="executive-nav-item"
                        key={item.label}
                        onClick={() => {
                          if (item.action === 'novoCadastro') {
                            setOpenCadastro(true);
                          }
                        }}
                        type="button"
                      >
                        <span>
                          {item.label}
                        </span>
                        <em>+</em>
                      </button>
                    );
                  }

                  return (
                    <NavLink
                      className={({ isActive }) => `executive-nav-item ${isActive ? 'active' : ''}`}
                      end={item.end}
                      key={item.label}
                      to={item.to}
                    >
                      <span>
                        {item.label}
                      </span>
                      <em>&gt;</em>
                    </NavLink>
                  );
                })}
              </nav>
            );
          })}

          <div className="executive-founder-box">
            <strong>Construção conjunta</strong>
            <p>
              Navegação local por perfil, preservando a separação entre Gestão,
              Albergue e E.E.I. Casa do Pequenino.
            </p>
          </div>
        </aside>

        <div className="institutional-main">
          {children}
        </div>
      </div>
      <Toast message={toast.message} type={toast.type} show={showToast} onClose={() => setShowToast(false)} />
      {canOpenCadastro ? (
        <CadastroPessoaModal
          open={openCadastro}
          onClose={() => setOpenCadastro(false)}
          onSuccess={() => {
            window.showToast('Pessoa cadastrada com sucesso!', 'success');
            if (window.reloadTodasPessoas) window.reloadTodasPessoas();
          }}
        />
      ) : null}
    </div>
  );
};

export default Layout;
