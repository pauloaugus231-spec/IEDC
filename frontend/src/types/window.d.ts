// Declaração global para o método showToast
export {};
declare global {
  interface Window {
    showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
    reloadTodasPessoas?: () => void;
  }
}
