import React, { useEffect, useId, useRef, useState } from 'react';
import { getPessoasByCasa, apiFetch } from '../api';
import { getNomePrincipal } from '../utils';
import { CASA_OPTIONS, getCasaLabel } from '../utils/casaUtils';
import ConfirmModal from './ConfirmModal';
import './TrocaModal.css';

interface PessoaInfo {
  id: string;
  nome: string;
  nome_social?: string | null;
  estadia_id: string;
  cama_numero: number | string;
  casa: string;
}

interface CamaDestino {
  id: string;
  numero: number;
  posicao: string;
  estadia?: {
    pessoa: {
      nome: string;
      nome_social?: string | null;
    };
  };
}

interface ConfirmTrocaPayload {
  camaDestinoId: string;
  camaNumero: number;
  ocupanteNome: string;
}

interface Props {
  pessoa: PessoaInfo;
  onClose: () => void;
  onSuccess: () => void;
}

const TrocaModal: React.FC<Props> = ({ pessoa, onClose, onSuccess }) => {
  const titleId = useId();
  const firstFocusRef = useRef<HTMLSelectElement>(null);

  const [casaDestino, setCasaDestino] = useState('');
  const [camas, setCamas] = useState<CamaDestino[]>([]);
  const [loadingCamas, setLoadingCamas] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmTroca, setConfirmTroca] = useState<ConfirmTrocaPayload | null>(null);

  const nomePessoa = getNomePrincipal(pessoa);
  const casaAtualLabel = getCasaLabel(pessoa.casa);

  // Foco inicial no select de quarto destino
  useEffect(() => {
    firstFocusRef.current?.focus();
  }, []);

  // Fechar com Escape (só quando ConfirmModal interno não está aberto)
  useEffect(() => {
    if (confirmTroca) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose, confirmTroca]);

  const handleSelectCasa = async (casa: string) => {
    setCasaDestino(casa);
    setCamas([]);
    setError(null);
    if (!casa) return;

    setLoadingCamas(true);
    try {
      const data = await getPessoasByCasa(casa) as CamaDestino[];
      setCamas(data.sort((a, b) => a.numero - b.numero));
    } catch (e) {
      setError('Erro ao carregar camas. Tente novamente.');
    } finally {
      setLoadingCamas(false);
    }
  };

  const executarTroca = async (camaDestinoId: string, _camaNumero: number, _camaOcupada: boolean) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await apiFetch('/api/estadias/trocar-cama', {
        method: 'POST',
        body: JSON.stringify({
          estadia_origem_id: pessoa.estadia_id,
          cama_destino_id: camaDestinoId,
        }),
      });
      onSuccess();
    } catch (e: any) {
      setError(e?.message || 'Erro ao realizar troca. Tente novamente.');
      setIsSubmitting(false);
    }
  };

  const handleTrocarCama = (cd: CamaDestino) => {
    const ocupada = !!cd.estadia;
    if (ocupada) {
      const nomeOcupante = getNomePrincipal(cd.estadia!.pessoa);
      setConfirmTroca({ camaDestinoId: cd.id, camaNumero: cd.numero, ocupanteNome: nomeOcupante });
    } else {
      executarTroca(cd.id, cd.numero, false);
    }
  };

  const camasLivres = camas.filter(c => !c.estadia);
  const camasOcupadas = camas.filter(c => !!c.estadia);

  return (
    <>
      <div className="troca-overlay" onClick={onClose}>
        <div
          className="troca-container"
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          onClick={e => e.stopPropagation()}
        >

          {/* Header */}
          <div className="troca-header">
            <div>
              <span className="troca-eyebrow">TROCAR DE CAMA</span>
              <h3 id={titleId} className="troca-title">{nomePessoa}</h3>
              <p className="troca-subtitle">
                Cama {pessoa.cama_numero} · {casaAtualLabel}
              </p>
            </div>
            <button className="troca-close" onClick={onClose} aria-label="Fechar">×</button>
          </div>

          {/* Body */}
          <div className="troca-body">
            <label className="troca-label">Quarto destino</label>
            <select
              ref={firstFocusRef}
              className="troca-select"
              value={casaDestino}
              onChange={e => handleSelectCasa(e.target.value)}
              disabled={isSubmitting}
            >
              <option value="">Selecione o quarto...</option>
              {CASA_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>

            {error && <p className="troca-error">{error}</p>}

            {casaDestino && (
              <div className="troca-camas">
                {loadingCamas ? (
                  <div className="troca-loading">Carregando camas...</div>
                ) : camas.length === 0 ? (
                  <div className="troca-empty">Nenhuma cama encontrada neste quarto.</div>
                ) : (
                  <>
                    {camasLivres.length > 0 && (
                      <div className="troca-section">
                        <div className="troca-section-label">Camas livres</div>
                        {camasLivres.map(cd => (
                          <button
                            key={cd.id}
                            className="troca-cama-btn livre"
                            onClick={() => handleTrocarCama(cd)}
                            disabled={isSubmitting}
                          >
                            <span className="troca-cama-num">Cama {cd.numero}</span>
                            <span className="troca-cama-pos">{cd.posicao}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {camasOcupadas.length > 0 && (
                      <div className="troca-section">
                        <div className="troca-section-label mutua">Troca mútua (ocupadas)</div>
                        {camasOcupadas.map(cd => {
                          const nomeOcupante = getNomePrincipal(cd.estadia!.pessoa);
                          return (
                            <button
                              key={cd.id}
                              className="troca-cama-btn ocupada"
                              onClick={() => handleTrocarCama(cd)}
                              disabled={isSubmitting}
                              title={`Trocar com ${nomeOcupante}`}
                            >
                              <span className="troca-cama-num">Cama {cd.numero}</span>
                              <span className="troca-cama-ocupante">{nomeOcupante}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="troca-footer">
            <button className="troca-btn-cancel" onClick={onClose} disabled={isSubmitting}>
              Cancelar
            </button>
          </div>

        </div>
      </div>

      {confirmTroca && (
        <ConfirmModal
          title="Troca mútua"
          message={`A cama ${confirmTroca.camaNumero} está ocupada por ${confirmTroca.ocupanteNome}.\n\nDeseja realizar a troca mútua?\n• ${nomePessoa} irá para a cama ${confirmTroca.camaNumero}\n• ${confirmTroca.ocupanteNome} virá para a cama ${pessoa.cama_numero}`}
          confirmLabel="Confirmar troca"
          cancelLabel="Cancelar"
          onConfirm={() => {
            const { camaDestinoId, camaNumero } = confirmTroca;
            setConfirmTroca(null);
            executarTroca(camaDestinoId, camaNumero, true);
          }}
          onCancel={() => setConfirmTroca(null)}
        />
      )}
    </>
  );
};

export default TrocaModal;
