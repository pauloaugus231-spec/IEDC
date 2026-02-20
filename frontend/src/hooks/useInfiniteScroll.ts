import { useState, useEffect, useCallback, useRef } from 'react';

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

interface UseInfiniteScrollOptions<T> {
  fetchFn: (page: number, limit: number) => Promise<PaginatedResult<T>>;
  limit?: number;
  enabled?: boolean;
}

interface UseInfiniteScrollReturn<T> {
  data: T[];
  loading: boolean;
  error: Error | null;
  hasMore: boolean;
  total: number;
  loadMore: () => void;
  reset: () => void;
  refresh: () => void;
}

/**
 * Hook para implementar infinite scroll com paginação
 * 
 * Carrega dados automaticamente conforme o usuário scrola
 * Otimizado para grandes volumes de dados (13k+ registros)
 * 
 * @example
 * const { data, loading, hasMore, loadMore } = useInfiniteScroll({
 *   fetchFn: async (page, limit) => {
 *     const response = await fetch(`/api/pessoas?page=${page}&limit=${limit}`);
 *     return response.json();
 *   },
 *   limit: 20,
 * });
 */
export function useInfiniteScroll<T>({
  fetchFn,
  limit = 20,
  enabled = true,
}: UseInfiniteScrollOptions<T>): UseInfiniteScrollReturn<T> {
  const [data, setData] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const [total, setTotal] = useState(0);
  
  // Prevenir múltiplas chamadas simultâneas
  const loadingRef = useRef(false);

  const loadMore = useCallback(async () => {
    if (!enabled || loadingRef.current || !hasMore) return;

    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      const result = await fetchFn(page, limit);
      
      setData(prev => [...prev, ...result.data]);
      setTotal(result.total);
      setHasMore(result.hasNextPage);
      setPage(prev => prev + 1);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Erro ao carregar dados'));
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, [page, hasMore, enabled, fetchFn, limit]);

  const reset = useCallback(() => {
    setData([]);
    setPage(1);
    setHasMore(true);
    setTotal(0);
    setError(null);
    loadingRef.current = false;
  }, []);

  const refresh = useCallback(() => {
    reset();
    // Após reset, carrega primeira página
    setTimeout(() => {
      loadMore();
    }, 0);
  }, [reset, loadMore]);

  // Carregar primeira página automaticamente
  useEffect(() => {
    if (enabled && data.length === 0 && !loadingRef.current) {
      loadMore();
    }
  }, [enabled]); // Intencionalmente não inclui loadMore

  return {
    data,
    loading,
    error,
    hasMore,
    total,
    loadMore,
    reset,
    refresh,
  };
}

/**
 * Hook para detectar quando usuário chegou ao fim da página
 * Útil para carregar mais dados automaticamente
 * 
 * @example
 * const loadMore = () => { ... };
 * useScrollToBottom(loadMore, hasMore);
 */
export function useScrollToBottom(
  callback: () => void,
  enabled: boolean = true,
  threshold: number = 100, // pixels do fim da página
) {
  useEffect(() => {
    if (!enabled) return;

    const handleScroll = () => {
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;

      // Verificar se está próximo do fim
      if (scrollTop + clientHeight >= scrollHeight - threshold) {
        callback();
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [callback, enabled, threshold]);
}
