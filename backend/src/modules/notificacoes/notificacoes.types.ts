import { UsuarioRole } from '../../entities/usuario.entity';

export type NotificacaoNivel = 'critico' | 'atencao' | 'info' | 'sucesso';
export type NotificacaoTipo = 'tecnica' | 'executiva' | 'area' | 'financeira' | 'operacional' | 'recibo';
export type NotificacaoArea = 'suporte' | 'gestao' | 'albergue' | 'creche' | 'financeiro' | 'loja';

export interface NotificacaoItem {
  id: string;
  tipo: NotificacaoTipo;
  nivel: NotificacaoNivel;
  area: NotificacaoArea;
  title: string;
  description: string;
  actionLabel?: string;
  href?: string;
  createdAt: string;
}

export interface NotificacoesResponse {
  generatedAt: string;
  role: UsuarioRole | null;
  scopeLabel: string;
  unreadCount: number;
  receiptPolicy: {
    title: string;
    description: string;
  };
  items: NotificacaoItem[];
}
