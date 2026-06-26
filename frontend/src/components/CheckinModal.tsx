import React, { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../api';
import { getNomePrincipal } from '../utils';
import './CheckinModal.css';

type Casa = 'MASCULINA' | 'MISTA_MULHERES' | 'IDOSOS' | 'LGBT';
type StatusCama = 'DISPONIVEL' | 'OCUPADA' | 'BLOQUEADA';

interface Cama {
  id: string;
  numero: number;
  casa: Casa;
  posicao: 'SUPERIOR' | 'INFERIOR';
  status: StatusCama;
}

interface Pessoa {
  id: string;
  nome: string;
  nome_social?: string | null;
  tipo_vaga?: string | null;
  sexo?: string | null;
  genero?: string | null;
  lgbt?: boolean;
}

interface CheckinModalProps {
  pessoa: Pessoa;
  onClose: () => void;
  onCheckinSuccess: (estadia: unknown) => void;
}

const NOME_CASAS: Record<Casa, string> = {
  MASCULINA: 'Quarto Masculino',
  MISTA_MULHERES: 'Quarto Feminino',
  IDOSOS: 'Quarto de Idosos',
  LGBT: 'Quarto LGBT+',
};

function getRecommendedCasa(pessoa: Pessoa): Casa {
  const tipo = pessoa.tipo_vaga?.toLowerCase();
  const genero = `${pessoa.genero || ''} ${pessoa.sexo || ''}`.toLowerCase();

  if (tipo === 'lgbt' || pessoa.lgbt) return 'LGBT';
  if (tipo === 'idoso') return 'IDOSOS';
  if (tipo === 'feminina' || genero.includes('femin')) return 'MISTA_MULHERES';
  return 'MASCULINA';
}

function getPositionLabel(posicao: Cama['posicao']) {
  return posicao === 'SUPERIOR' ? 'Superior' : 'Inferior';
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : '';
}

const BunkBedIcon = ({ posicao, status }: { posicao: Cama['posicao']; status: StatusCama }) => {
  const isOccupied = status !== 'DISPONIVEL';
  const color = status === 'BLOQUEADA' ? '#c92a2a' : (isOccupied ? '#94a3b8' : 'currentColor');

  return (
    <svg aria-hidden="true" className="bed-icon" fill="none" viewBox="0 0 24 24">
      <path d="M2 10H22" stroke={color} strokeLinecap="round" strokeWidth="2" />
      <path d="M2 4V20" stroke={color} strokeLinecap="round" strokeWidth="2" />
      <path d="M22 4V20" stroke={color} strokeLinecap="round" strokeWidth="2" />
      <rect
        fill={posicao === 'SUPERIOR' ? color : 'transparent'}
        height="4"
        opacity={posicao === 'INFERIOR' ? 0.3 : 1}
        rx="1"
        stroke={color}
        strokeWidth="1.5"
        width="16"
        x="4"
        y="5"
      />
      <rect
        fill={posicao === 'INFERIOR' ? color : 'transparent'}
        height="4"
        opacity={posicao === 'SUPERIOR' ? 0.3 : 1}
        rx="1"
        stroke={color}
        strokeWidth="1.5"
        width="16"
        x="4"
        y="14"
      />
    </svg>
  );
};

const CheckinModal: React.FC<CheckinModalProps> = ({ pessoa, onClose, onCheckinSuccess }) => {
  const [camas, setCamas] = useState<Cama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCamaId, setSelectedCamaId] = useState<string | null>(null);
  const [selectedCasa, setSelectedCasa] = useState<Casa>(() => getRecommendedCasa(pessoa));
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tipoEstadia, setTipoEstadia] = useState<'completa' | 'pernoite'>('completa');

  const recommendedCasa = useMemo(() => getRecommendedCasa(pessoa), [pessoa]);

  useEffect(() => {
    async function fetchCamas() {
      try {
        setLoading(true);
        const camasData = await apiFetch<Cama[]>('/api/camas');
        setCamas(camasData);
      } catch (err: unknown) {
        setError(`Falha ao carregar camas. ${getErrorMessage(err)}`.trim());
      } finally {
        setLoading(false);
      }
    }
    fetchCamas();
  }, []);

  const camasPorCasa = useMemo(() => {
    const grouped = camas.reduce((acc, cama) => {
      if (!acc[cama.casa]) acc[cama.casa] = [];
      acc[cama.casa].push(cama);
      return acc;
    }, {} as Record<Casa, Cama[]>);

    (Object.keys(grouped) as Casa[]).forEach((casa) => {
      grouped[casa].sort((a, b) => a.numero - b.numero);
    });

    return grouped;
  }, [camas]);

  const casasResumo = useMemo(() => (
    (Object.keys(NOME_CASAS) as Casa[]).map((casa) => {
      const lista = camasPorCasa[casa] || [];
      const livres = lista.filter((cama) => cama.status === 'DISPONIVEL').length;
      return { casa, total: lista.length, livres };
    })
  ), [camasPorCasa]);

  useEffect(() => {
    if (!camas.length) return;
    const recomendada = casasResumo.find((item) => item.casa === recommendedCasa && item.livres > 0);
    const primeiraComVaga = casasResumo.find((item) => item.livres > 0);
    setSelectedCasa((current) => {
      const atualTemVaga = casasResumo.find((item) => item.casa === current && item.livres > 0);
      return atualTemVaga ? current : recomendada?.casa || primeiraComVaga?.casa || recommendedCasa;
    });
  }, [camas.length, casasResumo, recommendedCasa]);

  useEffect(() => {
    setSelectedCamaId(null);
  }, [selectedCasa, showUnavailable]);

  const camasDaCasa = camasPorCasa[selectedCasa] || [];
  const camasVisiveis = showUnavailable
    ? camasDaCasa
    : camasDaCasa.filter((cama) => cama.status === 'DISPONIVEL');
  const selectedCama = camas.find((cama) => cama.id === selectedCamaId);
  const selectedCasaResumo = casasResumo.find((item) => item.casa === selectedCasa);

  const handleCheckin = async () => {
    if (!selectedCamaId) return;

    setIsSubmitting(true);
    try {
      const novaEstadia = await apiFetch('/api/estadias/checkin', {
        method: 'POST',
        body: JSON.stringify({
          pessoa_id: pessoa.id,
          cama_id: selectedCamaId,
          tipo_estadia: tipoEstadia,
        }),
      });
      onCheckinSuccess(novaEstadia);
    } catch (err: unknown) {
      setError(`Erro ao realizar check-in: ${getErrorMessage(err) || 'tente novamente.'}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="checkin-modal-overlay">
      <div className="checkin-modal-container">
        <header className="checkin-header">
          <div>
            <span>Entrada no albergue</span>
            <h2>Iniciar estadia</h2>
            <p>
              Pessoa atendida: <strong>{getNomePrincipal(pessoa)}</strong>
            </p>
          </div>
          <button aria-label="Fechar" className="checkin-close-button" onClick={onClose} type="button">
            ×
          </button>
        </header>

        <section className="checkin-body">
          <aside className="checkin-summary">
            <div className="checkin-summary-card">
              <span>Quarto sugerido</span>
              <strong>{NOME_CASAS[recommendedCasa]}</strong>
              <small>Baseado no cadastro da pessoa.</small>
            </div>

            <div className="checkin-summary-card">
              <span>Quarto selecionado</span>
              <strong>{NOME_CASAS[selectedCasa]}</strong>
              <small>
                {selectedCasaResumo?.livres ?? 0} vagas livres de {selectedCasaResumo?.total ?? 0}
              </small>
            </div>

            <div className="checkin-tipo-select">
              <span>Tipo de estadia</span>
              <div className="checkin-tipo-options">
                <button
                  className={`checkin-tipo-btn${tipoEstadia === 'completa' ? ' active' : ''}`}
                  onClick={() => setTipoEstadia('completa')}
                  type="button"
                >
                  <strong>Completa</strong>
                  <small>Até 30 noites</small>
                </button>
                <button
                  className={`checkin-tipo-btn${tipoEstadia === 'pernoite' ? ' active' : ''}`}
                  onClick={() => setTipoEstadia('pernoite')}
                  type="button"
                >
                  <strong>Pernoite</strong>
                  <small>1 noite apenas</small>
                </button>
              </div>
              {tipoEstadia === 'pernoite' && (
                <p className="checkin-tipo-hint">A cama será liberada automaticamente ao final da noite.</p>
              )}
            </div>

            <div className={`checkin-selection ${selectedCama ? 'active' : ''}`}>
              <span>Cama escolhida</span>
              {selectedCama ? (
                <>
                  <strong>Cama {selectedCama.numero}</strong>
                  <small>{getPositionLabel(selectedCama.posicao)} · {NOME_CASAS[selectedCama.casa]}</small>
                </>
              ) : (
                <>
                  <strong>Aguardando seleção</strong>
                  <small>Escolha uma cama disponível para confirmar.</small>
                </>
              )}
            </div>
          </aside>

          <div className="checkin-workspace">
            <div className="checkin-room-tabs" aria-label="Quartos">
              {casasResumo.map(({ casa, livres, total }) => (
                <button
                  className={selectedCasa === casa ? 'active' : ''}
                  key={casa}
                  onClick={() => setSelectedCasa(casa)}
                  type="button"
                >
                  <strong>{NOME_CASAS[casa]}</strong>
                  <span>{livres} livres de {total}</span>
                  {casa === recommendedCasa && <em>Sugerido</em>}
                </button>
              ))}
            </div>

            <div className="checkin-toolbar">
              <div>
                <h3>{NOME_CASAS[selectedCasa]}</h3>
                <p>
                  {showUnavailable
                    ? 'Mostrando todas as camas do quarto.'
                    : 'Mostrando somente camas disponíveis.'}
                </p>
              </div>
              <label className="checkin-toggle">
                <input
                  checked={showUnavailable}
                  onChange={(event) => setShowUnavailable(event.target.checked)}
                  type="checkbox"
                />
                <span>Ver ocupadas e bloqueadas</span>
              </label>
            </div>

            {loading && (
              <div className="checkin-loading">
                <span />
                <strong>Carregando mapa de camas</strong>
              </div>
            )}

            {error && <div className="checkin-error">{error}</div>}

            {!loading && !error && camasVisiveis.length === 0 && (
              <div className="checkin-empty">
                <strong>Nenhuma cama disponível neste filtro</strong>
                <p>Troque de quarto ou habilite a visualização de camas ocupadas e bloqueadas.</p>
              </div>
            )}

            {!loading && !error && camasVisiveis.length > 0 && (
              <div className="checkin-beds-grid">
                {camasVisiveis.map((cama) => {
                  const isSelectable = cama.status === 'DISPONIVEL';
                  const isSelected = selectedCamaId === cama.id;

                  return (
                    <button
                      className={`checkin-bed-card status-${cama.status.toLowerCase()} ${isSelected ? 'selected' : ''}`}
                      disabled={!isSelectable}
                      key={cama.id}
                      onClick={() => isSelectable && setSelectedCamaId(cama.id)}
                      type="button"
                    >
                      <BunkBedIcon posicao={cama.posicao} status={cama.status} />
                      <strong>{cama.numero}</strong>
                      <span>{getPositionLabel(cama.posicao)}</span>
                      <em>
                        {cama.status === 'DISPONIVEL' ? 'Disponível' : cama.status === 'OCUPADA' ? 'Ocupada' : 'Bloqueada'}
                      </em>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </section>

        <footer className="checkin-footer">
          <button className="checkin-secondary-button" disabled={isSubmitting} onClick={onClose} type="button">
            Cancelar
          </button>
          <button
            className="checkin-primary-button"
            disabled={!selectedCamaId || isSubmitting}
            onClick={handleCheckin}
            type="button"
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar entrada'}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default CheckinModal;
