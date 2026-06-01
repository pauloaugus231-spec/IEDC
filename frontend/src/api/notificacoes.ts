import { useEffect, useState } from 'react';
import { apiFetch } from './http';

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
  role: string | null;
  scopeLabel: string;
  unreadCount: number;
  receiptPolicy: {
    title: string;
    description: string;
  };
  items: NotificacaoItem[];
}

export interface EncerrarNotificacaoResponse {
  ok: boolean;
  notificationId: string;
  message: string;
}

function countUnread(items: NotificacaoItem[]) {
  return items.filter((item) => item.nivel === 'critico' || item.nivel === 'atencao').length;
}

export function encerrarNotificacao(id: string) {
  return apiFetch<EncerrarNotificacaoResponse>(`/api/notificacoes/${encodeURIComponent(id)}/encerrar`, {
    method: 'POST',
  });
}

export function useNotificacoes(enabled = true, refreshMs = 60_000) {
  const [data, setData] = useState<NotificacoesResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await apiFetch<NotificacoesResponse>('/api/notificacoes');

        if (!cancelled) {
          setData(response);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Não foi possível carregar os avisos.');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    void load();

    const interval = refreshMs > 0 ? window.setInterval(() => void load(), refreshMs) : null;

    return () => {
      cancelled = true;
      if (interval) {
        window.clearInterval(interval);
      }
    };
  }, [enabled, refreshMs]);

  const dismissNotification = async (id: string) => {
    const previous = data;

    setData((current) => {
      if (!current) {
        return current;
      }

      const items = current.items.filter((item) => item.id !== id);
      return {
        ...current,
        unreadCount: countUnread(items),
        items,
      };
    });

    try {
      await encerrarNotificacao(id);
    } catch (err) {
      setData(previous);
      throw err;
    }
  };

  return { data, loading, error, dismissNotification };
}
