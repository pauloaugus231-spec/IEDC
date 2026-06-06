import { useEffect } from 'react';

export type ToastType = 'success' | 'error' | 'info';

interface ToastProps {
  message: string;
  type?: ToastType;
  show: boolean;
  onClose: () => void;
  duration?: number;
}

const icons = {
  success: (
    <svg className="toast-icon" width="18" height="18" viewBox="0 0 24 24">
      <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  error: (
    <svg className="toast-icon" width="18" height="18" viewBox="0 0 24 24">
      <path d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  info: (
    <svg className="toast-icon" width="18" height="18" viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" fill="none" />
      <path d="M12 16h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M12 8v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  ),
};

const Toast = ({ message, type = 'success', show, onClose, duration = 3500 }: ToastProps) => {
  useEffect(() => {
    if (show) {
      const timer = setTimeout(onClose, duration);
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  return (
    <div
      className={`toast${show ? ' show' : ''} ${type}`}
      role="alert"
      aria-live="assertive"
    >
      {icons[type]}
      <div className="toast-message">{message}</div>
    </div>
  );
};

export default Toast;
