import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

export type ServiceScope =
  | 'gestao'
  | 'suporte'
  | 'albergue'
  | 'creche'
  | 'institucional'
  | 'comercial'
  | 'bazar'
  | 'brecho'
  | 'feirao';

export type UserRole =
  | 'gestora'
  | 'suporte'
  | 'coordenador_albergue'
  | 'coordenador_creche'
  | 'equipe_tecnica'
  | 'educador_albergue'
  | 'educador_creche'
  | 'comercial'
  | 'loja_bazar'
  | 'loja_brecho'
  | 'loja_feirao';

export interface DemoUser {
  id: string;
  uuid?: string;
  login: string;
  name: string;
  displayName: string;
  role: UserRole;
  roleLabel: string;
  service: ServiceScope;
  serviceLabel: string;
  homePath: string;
  mustChangePassword?: boolean;
}

interface AuthContextValue {
  currentUser: DemoUser | null;
  profiles: DemoUser[];
  login: (userLogin: string, password: string) => Promise<boolean>;
  logout: () => void;
  refreshCurrentUser: () => Promise<DemoUser | null>;
}

const USER_STORAGE_KEY = 'iedc_auth_user';
const TOKEN_STORAGE_KEY = 'iedc_auth_token';

const DEFAULT_PROFILES: DemoUser[] = [
  {
    id: 'claudia',
    login: 'claudia',
    name: 'Claudia',
    displayName: 'Claudia',
    role: 'gestora',
    roleLabel: 'Gestão',
    service: 'gestao',
    serviceLabel: 'Gestão institucional',
    homePath: '/gestao',
  },
  {
    id: 'suporte',
    login: 'suporte',
    name: 'Suporte',
    displayName: 'Suporte',
    role: 'suporte',
    roleLabel: 'Suporte',
    service: 'suporte',
    serviceLabel: 'Suporte institucional',
    homePath: '/suporte/usuarios',
  },
  {
    id: 'coord-albergue',
    login: 'coord-albergue',
    name: 'Coordenação Albergue',
    displayName: 'Coordenação do Albergue',
    role: 'coordenador_albergue',
    roleLabel: 'Coordenação',
    service: 'albergue',
    serviceLabel: 'Albergue Noturno',
    homePath: '/albergue',
  },
  {
    id: 'coord-creche',
    login: 'coord-creche',
    name: 'Coordenação E.E.I.',
    displayName: 'Coordenação da E.E.I.',
    role: 'coordenador_creche',
    roleLabel: 'Coordenação',
    service: 'creche',
    serviceLabel: 'E.E.I. Casa do Pequenino',
    homePath: '/escola',
  },
  {
    id: 'equipe-tecnica',
    login: 'equipe-tecnica',
    name: 'Equipe Técnica',
    displayName: 'Equipe Técnica',
    role: 'equipe_tecnica',
    roleLabel: 'Equipe técnica',
    service: 'institucional',
    serviceLabel: 'Atendimento institucional',
    homePath: '/gestao',
  },
  {
    id: 'educador-albergue',
    login: 'educador-albergue',
    name: 'Educador Albergue',
    displayName: 'Educador do Albergue',
    role: 'educador_albergue',
    roleLabel: 'Educador',
    service: 'albergue',
    serviceLabel: 'Albergue Noturno',
    homePath: '/albergue',
  },
  {
    id: 'educador-creche',
    login: 'educador-creche',
    name: 'Educador E.E.I.',
    displayName: 'Educador da E.E.I.',
    role: 'educador_creche',
    roleLabel: 'Educador',
    service: 'creche',
    serviceLabel: 'E.E.I. Casa do Pequenino',
    homePath: '/escola',
  },
  {
    id: 'comercial',
    login: 'comercial',
    name: 'Comercial',
    displayName: 'Comercial',
    role: 'comercial',
    roleLabel: 'Comercial',
    service: 'comercial',
    serviceLabel: 'Operacao comercial das lojas',
    homePath: '/lojas/secretaria',
  },
  {
    id: 'loja-bazar',
    login: 'loja-bazar',
    name: 'Bazar',
    displayName: 'Equipe do Bazar',
    role: 'loja_bazar',
    roleLabel: 'Loja',
    service: 'bazar',
    serviceLabel: 'Bazar',
    homePath: '/lojas/bazar',
  },
  {
    id: 'loja-brecho',
    login: 'loja-brecho',
    name: 'Brechó',
    displayName: 'Equipe do Brechó',
    role: 'loja_brecho',
    roleLabel: 'Loja',
    service: 'brecho',
    serviceLabel: 'Brechó',
    homePath: '/lojas/brecho',
  },
  {
    id: 'loja-feirao',
    login: 'loja-feirao',
    name: 'Feirão',
    displayName: 'Equipe do Feirão',
    role: 'loja_feirao',
    roleLabel: 'Loja',
    service: 'feirao',
    serviceLabel: 'Feirão',
    homePath: '/lojas/feirao',
  },
];

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<DemoUser | null>(() => {
    const stored = localStorage.getItem(USER_STORAGE_KEY);

    if (!stored) {
      return null;
    }

    try {
      return JSON.parse(stored) as DemoUser;
    } catch {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      return null;
    }
  });
  const [profiles, setProfiles] = useState<DemoUser[]>(DEFAULT_PROFILES);

  const persistUser = useCallback((user: DemoUser) => {
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    setCurrentUser(user);
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch('/api/auth/profiles')
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data: DemoUser[]) => {
        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setProfiles(data);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setProfiles(DEFAULT_PROFILES);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const refreshCurrentUser = useCallback(async () => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);

    if (!token) {
      return null;
    }

    const response = await fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401) {
      localStorage.removeItem(USER_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      setCurrentUser(null);
      return null;
    }

    if (!response.ok) {
      return null;
    }

    const user = await response.json() as DemoUser;
    persistUser(user);
    return user;
  }, [persistUser]);

  useEffect(() => {
    if (!currentUser) {
      return;
    }

    refreshCurrentUser().catch(() => undefined);
  }, [currentUser?.login, refreshCurrentUser]);

  const login = useCallback(async (userLogin: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ login: userLogin.trim().toLowerCase(), password }),
    });

    if (!response.ok) {
      return false;
    }

    const data = await response.json() as { accessToken: string; user: DemoUser };
    localStorage.setItem(TOKEN_STORAGE_KEY, data.accessToken);
    persistUser(data.user);
    return true;
  }, [persistUser]);

  const logout = useCallback(() => {
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setCurrentUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      login,
      logout,
      profiles,
      refreshCurrentUser,
    }),
    [currentUser, login, logout, profiles, refreshCurrentUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }

  return context;
}
