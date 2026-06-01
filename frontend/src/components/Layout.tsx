import type { ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import CadastroPessoaModal from './CadastroPessoaModal';
import Toast from './Toast';
import type { ToastType } from './Toast';
import { useNotificacoes, type NotificacaoNivel } from '../api';
import { useAuth, type DemoUser, type UserRole } from '../context/AuthContext';
import '../styles/theme.css';
import '../styles/institutional.css';
import '../styles/design-system.css';

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
        type: 'group',
        label: 'Visão institucional',
        to: '/gestao',
        roles: ['gestora', 'equipe_tecnica'],
        children: [
          {
            label: 'Painel institucional',
            to: '/gestao',
            roles: ['gestora', 'equipe_tecnica'],
            end: true,
          },
          {
            label: 'Qualidade de dados',
            to: '/gestao/qualidade-dados',
            roles: ['gestora', 'equipe_tecnica'],
          },
        ],
      },
      {
        type: 'group',
        label: 'Suporte',
        to: '/suporte/usuarios',
        roles: ['suporte'],
        children: [
          {
            label: 'Usuários',
            to: '/suporte/usuarios',
            roles: ['suporte'],
            end: true,
          },
          {
            label: 'Auditoria',
            to: '/suporte/auditoria',
            roles: ['suporte'],
          },
          {
            label: 'Saúde do sistema',
            to: '/suporte/saude',
            roles: ['suporte'],
          },
        ],
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
            label: 'Qualidade de dados',
            to: '/albergue/qualidade-dados',
            roles: ['gestora', 'coordenador_albergue', 'equipe_tecnica', 'educador_albergue'],
          },
          {
            label: 'Impacto social',
            to: '/albergue/impacto-social',
            roles: ['gestora', 'coordenador_albergue', 'equipe_tecnica', 'educador_albergue'],
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
            label: 'Qualidade de dados',
            to: '/creche/qualidade-dados',
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
        label: 'Financeiro',
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
          {
            label: 'Relatório financeiro',
            to: '/lojas/secretaria/relatorio-executivo',
            roles: ['gestora', 'financeiro'],
          },
          {
            label: 'Qualidade de dados',
            to: '/lojas/secretaria/qualidade-dados',
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
        ],
      },
    ],
  },
];

function canUseItem(user: DemoUser | null, item: SidebarItem) {
  return Boolean(user && item.roles.includes(user.role));
}

function notificationNivelLabel(nivel: NotificacaoNivel) {
  const labels: Record<NotificacaoNivel, string> = {
    critico: 'Crítico',
    atencao: 'Atenção',
    info: 'Informativo',
    sucesso: 'Resolvido',
  };

  return labels[nivel];
}

const Layout = ({ children }: LayoutProps) => {
  const { currentUser, logout } = useAuth();
  const {
    data: notificacoes,
    loading: loadingNotificacoes,
    error: notificacoesError,
    dismissNotification,
  } = useNotificacoes(Boolean(currentUser));
  // Toast state
  const [toast, setToast] = useState<{ message: string; type: ToastType }>({ message: '', type: 'success' });
  const [showToast, setShowToast] = useState(false);
  const toastTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [dismissingNotificationId, setDismissingNotificationId] = useState<string | null>(null);

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
  const notificationItems = notificacoes?.items ?? [];
  const notificationCount = notificacoes?.unreadCount ?? 0;

  const handleDismissNotification = useCallback(async (id: string) => {
    setDismissingNotificationId(id);

    try {
      await dismissNotification(id);
      showToastMsg('Aviso encerrado para hoje.', 'success');
    } catch {
      showToastMsg('Não foi possível encerrar o aviso agora.', 'error');
    } finally {
      setDismissingNotificationId(null);
    }
  }, [dismissNotification, showToastMsg]);

  useEffect(() => {
    if (!notificationsOpen) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (notificationsRef.current?.contains(event.target as Node)) {
        return;
      }

      setNotificationsOpen(false);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setNotificationsOpen(false);
      }
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [notificationsOpen]);

  return (
    <div className="institutional-shell ds-app-shell">
      <header className="institutional-header ds-topbar">
        <Link className="institutional-brand" to={currentUser?.homePath ?? '/gestao'}>
          <img
            className="institutional-navbar-logo"
            src="/iedc/logo.webp"
            alt="Instituto Espírita Dias da Cruz"
          />
        </Link>

        <div className="institutional-session ds-session">
          <div className="institutional-notifications" ref={notificationsRef}>
            <button
              aria-expanded={notificationsOpen}
              aria-haspopup="dialog"
              className={`notification-trigger ${notificationsOpen ? 'active' : ''}`}
              onClick={() => setNotificationsOpen((open) => !open)}
              type="button"
            >
              <span className="notification-trigger-dot" aria-hidden="true" />
              <span>Avisos</span>
              {notificationCount > 0 ? (
                <strong aria-label={`${notificationCount} aviso(s) exigem atenção`}>{notificationCount}</strong>
              ) : null}
            </button>

            {notificationsOpen ? (
              <section className="notification-panel" role="dialog" aria-label="Avisos institucionais">
                <header className="notification-panel-head">
                  <div>
                    <strong>Avisos institucionais</strong>
                    <span>{notificacoes?.scopeLabel ?? 'Carregando escopo'}</span>
                  </div>
                  <button
                    aria-label="Fechar avisos"
                    className="notification-close"
                    onClick={() => setNotificationsOpen(false)}
                    type="button"
                  >
                    ×
                  </button>
                </header>

                {notificacoes?.receiptPolicy ? (
                  <div className="notification-policy">
                    <strong>{notificacoes.receiptPolicy.title}</strong>
                    <p>{notificacoes.receiptPolicy.description}</p>
                  </div>
                ) : null}

                <div className="notification-list">
                  {loadingNotificacoes ? (
                    <div className="notification-empty" role="status">Carregando avisos...</div>
                  ) : notificacoesError ? (
                    <div className="notification-empty warning">{notificacoesError}</div>
                  ) : notificationItems.length ? (
                    notificationItems.map((item) => (
                      <article className={`notification-item ${item.nivel}`} key={item.id}>
                        <div className="notification-item-top">
                          <span className={`notification-pill ${item.nivel}`}>{notificationNivelLabel(item.nivel)}</span>
                          <small>{item.area}</small>
                        </div>
                        <strong>{item.title}</strong>
                        <p>{item.description}</p>
                        <div className="notification-item-actions">
                          {item.href && item.actionLabel ? (
                            <Link className="notification-action" onClick={() => setNotificationsOpen(false)} to={item.href}>
                              {item.actionLabel}
                            </Link>
                          ) : null}
                          <button
                            className="notification-dismiss"
                            disabled={dismissingNotificationId === item.id}
                            onClick={() => void handleDismissNotification(item.id)}
                            type="button"
                          >
                            {dismissingNotificationId === item.id ? 'Encerrando...' : 'Encerrar'}
                          </button>
                        </div>
                      </article>
                    ))
                  ) : (
                    <div className="notification-empty">
                      <strong>Tudo em ordem</strong>
                      <span>Nenhuma pendência relevante para o seu perfil agora.</span>
                    </div>
                  )}
                </div>
              </section>
            ) : null}
          </div>
          <div className="session-user">
            <strong>Olá, {currentUser?.displayName ?? 'equipe'}</strong>
            <span>{currentUser?.roleLabel ?? 'Usuário'}</span>
          </div>
          <Link className="account-link ds-shell-link" to="/minha-conta">
            Minha conta
          </Link>
          <button className="logout-button ds-shell-link" onClick={logout} type="button">
            Sair
          </button>
        </div>
      </header>

      <div className="institutional-body ds-workspace-frame">
        <aside className="executive-sidebar ds-sidebar" aria-label="Navegação principal">
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
              <nav className="executive-nav-section ds-nav-section" key={section.title}>
                <p>{section.title}</p>
                {availableItems.map((item) => {
                  if (item.type === 'group') {
                    const groupItems = item.children.filter((child) => canUseItem(currentUser, child));

                    return (
                      <div className="executive-nav-group" key={item.label}>
                        <NavLink
                          className={({ isActive }) => `executive-nav-item executive-nav-parent ds-nav-item ${isActive ? 'active' : ''}`}
                          to={item.to}
                        >
                          <span>
                            {item.label}
                          </span>
                          <em>&gt;</em>
                        </NavLink>

                        {groupItems.length ? (
                          <div className="executive-nav-submenu ds-nav-submenu" role="menu" aria-label={`${item.label}: atalhos`}>
                            {groupItems.map((child) => {
                              if (child.type === 'action') {
                                return (
                                  <button
                                    className="executive-nav-subitem ds-nav-subitem"
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
                                  className={({ isActive }) => `executive-nav-subitem ds-nav-subitem ${isActive ? 'active' : ''}`}
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
                        className="executive-nav-item ds-nav-item"
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
                      className={({ isActive }) => `executive-nav-item ds-nav-item ${isActive ? 'active' : ''}`}
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

          <div className="executive-founder-box ds-governance-note">
            <strong>Construção conjunta</strong>
            <p>
              Navegação local por perfil, preservando a separação entre Gestão,
              Albergue e E.E.I. Casa do Pequenino.
            </p>
          </div>
        </aside>

        <div className="institutional-main ds-main-region">
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
