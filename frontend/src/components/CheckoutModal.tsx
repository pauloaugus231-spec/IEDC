import React, { useState } from 'react';
import { apiFetch } from '../api';
import { getNomePrincipal } from '../utils';
import './CheckoutModal.css';

const CASA_LABELS: Record<string, string> = {
  MASCULINA: 'Quarto Masculino',
  MISTA_MULHERES: 'Quarto Feminino',
  IDOSOS: 'Quarto de Idosos',
  LGBT: 'Quarto LGBT+',
};

const MOTIVOS = [
  { value: 'voluntario',     label: 'Saída voluntária',           hint: 'A pessoa solicitou a saída.' },
  { value: 'transferencia',  label: 'Transferência',              hint: 'Transferida para outro abrigo ou serviço.' },
  { value: 'encaminhamento', label: 'Encaminhamento',             hint: 'Encaminhada para serviço especializado.' },
  { value: 'abandono',       label: 'Não retornou / abandono',    hint: 'A pessoa não retornou à vaga.' },
  { value: 'descumprimento', label: 'Descumprimento de regras',   hint: 'Violação das normas da casa.' },
  { value: 'outro',          label: 'Outro motivo',               hint: 'Registre nas observações abaixo.' },
];

interface Pessoa {
  id: string;
  nome: string;
  nome_social?: string | null;
}

interface EstadiaInfo {
  data_checkin?: string | null;
  cama?: { numero: number; casa: string } | null;
}

interface Props {
  pessoa: Pessoa;
  estadia?: EstadiaInfo | null;
  onClose: () => void;
  onSuccess: () => void;
}

function calcDias(dataCkheckin?: string | null): number | null {
  if (!dataCkheckin) return null;
  return Math.max(1, Math.ceil((Date.now() - new Date(dataCkheckin).getTime()) / 86_400_000));
}

function formatDateBR(iso?: string | null): string {
  if (!iso) return '-';
  const [y, m, d] = iso.split('T')[0].split('-');
  return `${d}/${m}/${y}`;
}

const CheckoutModal: React.FC<Props> = ({ pessoa, estadia, onClose, onSuccess }) => {
  const [motivo, setMotivo]         = useState('voluntario');
  const [observacoes, setObservacoes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError]           = useState<string | null>(null);

  const dias      = calcDias(estadia?.data_checkin);
  const motivoObj = MOTIVOS.find(m => m.value === motivo);
  const isAbandono = motivo === 'abandono';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiFetch('/api/estadias/checkout', {
        method: 'POST',
        body: JSON.stringify({
          pessoa_id: pessoa.id,
          motivo_saida: motivo,
          observacoes_checkout: observacoes.trim() || undefined,
        }),
      });
      onSuccess();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao registrar saída.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkout-overlay" onClick={onClose}>
      <div className="checkout-container" onClick={e => e.stopPropagation()}>

        <header className="checkout-header">
          <div>
            <span>Saída do albergue</span>
            <h2>Registrar saída</h2>
            <p>Pessoa atendida: <strong>{getNomePrincipal(pessoa)}</strong></p>
          </div>
          <button
            aria-label="Fechar"
            className="checkout-close-btn"
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </header>

        <div className="checkout-body">

          {/* Resumo da pessoa */}
          <div className="checkout-person-card">
            <div className="checkout-avatar" aria-hidden="true">
              {getNomePrincipal(pessoa).charAt(0).toUpperCase()}
            </div>
            <div className="checkout-person-info">
              <strong>{getNomePrincipal(pessoa)}</strong>
              {estadia?.cama ? (
                <span>
                  Cama {estadia.cama.numero} · {CASA_LABELS[estadia.cama.casa] ?? estadia.cama.casa}
                </span>
              ) : null}
              {dias !== null ? (
                <small>
                  {dias} noite{dias !== 1 ? 's' : ''} · Entrada em {formatDateBR(estadia?.data_checkin)}
                </small>
              ) : null}
            </div>
          </div>

          {/* Motivo */}
          <div className="checkout-field">
            <label htmlFor="co-motivo">Motivo da saída</label>
            <select
              id="co-motivo"
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
            >
              {MOTIVOS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            {motivoObj && <p className="checkout-field-hint">{motivoObj.hint}</p>}
          </div>

          {/* Aviso abandono */}
          {isAbandono && (
            <div className="checkout-abandono-notice" role="alert">
              <strong>Atenção — abandono de vaga</strong>
              <p>
                A cama será liberada imediatamente. A carência de 15 noites
                para reingresso continua aplicada normalmente.
              </p>
            </div>
          )}

          {/* Observações */}
          <div className="checkout-field">
            <label htmlFor="co-obs">
              Observações <span className="checkout-optional">Opcional</span>
            </label>
            <textarea
              id="co-obs"
              value={observacoes}
              onChange={e => setObservacoes(e.target.value)}
              placeholder="Informações relevantes sobre a saída, destino ou encaminhamento..."
              rows={3}
            />
          </div>

          {error && <div className="checkout-error" role="alert">{error}</div>}

        </div>

        <footer className="checkout-footer">
          <button
            className="checkout-btn-secondary"
            disabled={isSubmitting}
            onClick={onClose}
            type="button"
          >
            Cancelar
          </button>
          <button
            className={`checkout-btn-primary${isAbandono ? ' danger' : ''}`}
            disabled={isSubmitting}
            onClick={handleConfirm}
            type="button"
          >
            {isSubmitting
              ? 'Registrando...'
              : isAbandono
                ? 'Registrar abandono'
                : 'Confirmar saída'}
          </button>
        </footer>

      </div>
    </div>
  );
};

export default CheckoutModal;
