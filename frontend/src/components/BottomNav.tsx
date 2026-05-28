import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  BarChart2,
  Calendar,
  CheckCircle,
  FileSpreadsheet,
  Home,
  Menu,
  PlusCircle,
  Search,
  Settings,
  Users,
  X,
} from './Icons';
import './BottomNav.css';

interface BottomNavProps {
  onNovoCadastro?: () => void;
}

type NavItem =
  | { to: string; label: string; icon: typeof Home; action?: never }
  | { action: 'novoCadastro'; label: string; icon: typeof Home; to?: never };

const BottomNav = ({ onNovoCadastro }: BottomNavProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const location = useLocation();
  const isAlbergueArea = location.pathname.startsWith('/albergue') || location.pathname === '/dashboard';
  const isCrecheArea = location.pathname.startsWith('/creche');
  const navItems: NavItem[] = [
    { to: '/gestao', label: 'Gestao', icon: Home },
    { to: '/albergue', label: 'Albergue', icon: Users },
    { to: '/creche', label: 'E.E.I.', icon: CheckCircle },
  ];

  if (isCrecheArea) {
    navItems.push(
      { to: '/creche/criancas', label: 'Crianças', icon: Users },
      { to: '/creche/turmas', label: 'Turmas', icon: Calendar },
      { to: '/creche/professoras', label: 'Equipe', icon: Users },
      { to: '/creche/frequencia', label: 'Frequência', icon: CheckCircle },
      { to: '/creche/relatorios', label: 'Relatórios', icon: BarChart2 },
    );
  }

  if (isAlbergueArea && onNovoCadastro) {
    navItems.push({ action: 'novoCadastro', label: 'Novo', icon: PlusCircle });
  }

  if (isAlbergueArea) {
    navItems.push(
      { to: '/albergue/buscar', label: 'Buscar', icon: Search },
      { to: '/albergue/relatorios', label: 'Relatorios', icon: BarChart2 },
      { to: '/albergue/impacto-social', label: 'Impacto', icon: BarChart2 },
      { to: '/albergue/conferencia-rma', label: 'Afericao', icon: FileSpreadsheet },
      { to: '/albergue/admin', label: 'Admin', icon: Settings },
      { to: '/albergue/escala', label: 'Escala', icon: Calendar },
    );
  }

  // Encontrar item ativo
  const activeItem = navItems
    .filter((item): item is Extract<NavItem, { to: string }> => Boolean(item.to))
    .sort((a, b) => b.to.length - a.to.length)
    .find(item => location.pathname.startsWith(item.to));
  const ActiveIcon = activeItem?.icon || Menu;

  const handleMouseEnter = () => {
    if (!isPinned) setIsExpanded(true);
  };

  const handleMouseLeave = () => {
    if (!isPinned) setIsExpanded(false);
  };

  const togglePin = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPinned(!isPinned);
    setIsExpanded(!isPinned);
  };

  return (
    <nav 
      className={`floating-nav ${isExpanded ? 'expanded' : 'collapsed'} ${isPinned ? 'pinned' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label="Navegação principal"
    >
      {/* Botão de toggle/indicador quando fechado */}
      <div className="nav-toggle">
        <div className="toggle-icon">
          {isExpanded ? (
            <X size={20} onClick={() => { setIsExpanded(false); setIsPinned(false); }} />
          ) : (
            <ActiveIcon size={20} />
          )}
        </div>
        {!isExpanded && activeItem && (
          <span className="active-indicator">{activeItem.label}</span>
        )}
      </div>

      {/* Menu expandido */}
      <div className="nav-menu">
        <div className="nav-header">
          <span className="nav-title">Menu</span>
          <button 
            className={`pin-btn ${isPinned ? 'active' : ''}`} 
            onClick={togglePin}
            title={isPinned ? 'Desafixar menu' : 'Fixar menu'}
          >
            📌
          </button>
        </div>

        <ul className="nav-items">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = item.to && location.pathname.startsWith(item.to);
            
            return (
              <li key={item.to || item.action}>
                {item.to ? (
                  <NavLink
                    to={item.to}
                    className={`nav-item ${isActive ? 'active' : ''}`}
                    onClick={() => !isPinned && setIsExpanded(false)}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                    <span className="nav-label">{item.label}</span>
                    {isActive && <span className="active-dot" />}
                  </NavLink>
                ) : (
                  <button
                    className="nav-item"
                    onClick={() => {
                      onNovoCadastro?.();
                      if (!isPinned) setIsExpanded(false);
                    }}
                  >
                    <Icon size={20} strokeWidth={1.8} />
                    <span className="nav-label">{item.label}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default BottomNav;
