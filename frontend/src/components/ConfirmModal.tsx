import React from 'react';
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
  return (
    <div className="confirm-overlay" onClick={onCancel}>
      <div className="confirm-container" onClick={e => e.stopPropagation()}>
        <div className={`confirm-header ${danger ? 'danger' : ''}`}>
          <span className="confirm-eyebrow">
            {danger ? 'ATENÇÃO' : 'CONFIRMAÇÃO'}
          </span>
          <h3 className="confirm-title">{title}</h3>
        </div>

        <div className="confirm-body">
          <p className="confirm-message">{message}</p>
        </div>

        <div className="confirm-actions">
          <button className="confirm-btn-cancel" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button
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
