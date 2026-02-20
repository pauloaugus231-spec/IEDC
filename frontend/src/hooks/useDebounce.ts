import { useEffect, useState } from 'react';

/**
 * Hook para debounce de valores
 * Previne múltiplas chamadas de API durante digitação
 * 
 * @param value - Valor a ser debounced
 * @param delay - Delay em milissegundos (padrão: 500ms)
 * @returns Valor debounced
 * 
 * @example
 * const [search, setSearch] = useState('');
 * const debouncedSearch = useDebounce(search, 500);
 * 
 * useEffect(() => {
 *   // Esta busca só acontece 500ms após parar de digitar
 *   fetchPessoas(debouncedSearch);
 * }, [debouncedSearch]);
 */
export function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Criar timer que atualiza o valor após o delay
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Limpar timer se o valor mudar antes do delay
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook para throttle de funções
 * Limita a frequência de execução de uma função
 * 
 * @param callback - Função a ser throttled
 * @param delay - Delay em milissegundos (padrão: 500ms)
 * @returns Função throttled
 * 
 * @example
 * const handleScroll = useThrottle(() => {
 *   console.log('Scroll event');
 * }, 100);
 */
export function useThrottle<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 500,
): T {
  const [lastRan, setLastRan] = useState<number>(Date.now());

  return ((...args: Parameters<T>) => {
    const now = Date.now();
    
    if (now - lastRan >= delay) {
      callback(...args);
      setLastRan(now);
    }
  }) as T;
}
