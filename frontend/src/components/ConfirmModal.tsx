import React, { useEffect, useId, useRef } from 'react';
import './ConfirmModal.css';

interface Props {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

const ConfirmModal: React.FC<Props> = ({
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  danger = false,
  onConfirm,
  onCancel,
}) => {
  const titleId = useId();
  const confirmRef = useRef<HTMLButtonElement>(null);

  // Foco inicial no botão de confirmação
  useEffect(() => {
    confirmRef.current?.focus();
  }, []);

  // Fechar com Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onCancel]);

  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div
        className="confirm-container"
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={e => e.stopPropagation()}
      >
        <div className={`confirm-header ${danger ? 'danger' : ''}`}>
          <span className="confirm-eyebrow">
            {danger ? 'ATENÇÃO' : 'CONFIRMAÇÃO'}
          </span>
          <h3 id={titleId} className="confirm-title">{title}</h3>
        </div>

        <div className="confirm-body">
          <p className="confirm-message">{message}</p>
        </div>

        <div className="confirm-actions">
          <button className="confirm-btn-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            className={`confirm-btn-ok ${danger ? 'danger' : ''}`}
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
