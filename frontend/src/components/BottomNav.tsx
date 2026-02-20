import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Home, Search, PlusCircle, BarChart2, Settings, Calendar, Menu, X } from './Icons';
import './BottomNav.css';

const navItems = [
  { to: '/dashboard', label: 'Painel', icon: Home },
  { to: '/buscar', label: 'Buscar', icon: Search },
  { action: 'novoCadastro', label: 'Novo', icon: PlusCircle },
  { to: '/relatorios', label: 'Relatórios', icon: BarChart2 },
  { to: '/admin', label: 'Admin', icon: Settings },
  { to: '/escala', label: 'Escala', icon: Calendar },
];

interface BottomNavProps {
  onNovoCadastro?: () => void;
}

const BottomNav = ({ onNovoCadastro }: BottomNavProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const location = useLocation();

  // Encontrar item ativo
  const activeItem = navItems.find(item => item.to && location.pathname.startsWith(item.to));
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
