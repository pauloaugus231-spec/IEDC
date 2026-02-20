import React, { useEffect, useState } from 'react';
import { apiFetch } from '../api';
import './CheckinModal.css';
import { getNomePrincipal } from '../utils';

// --- Tipos ---
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
}

interface CheckinModalProps {
  pessoa: Pessoa;
  onClose: () => void;
  onCheckinSuccess: (estadia: any) => void;
}

const NOME_CASAS: Record<Casa, string> = {
  MASCULINA: 'Quarto Masculino',
  MISTA_MULHERES: 'Quarto Feminino',
  IDOSOS: 'Quarto de Idosos',
  LGBT: 'Quarto LGBT+',
};

// --- Componente Auxiliar: Ícone SVG de Beliche ---
const BunkBedIcon = ({ posicao, status }: { posicao: 'SUPERIOR' | 'INFERIOR'; status: StatusCama }) => {
  const isOccupied = status !== 'DISPONIVEL';
  const color = status === 'BLOQUEADA' ? '#ef4444' : (isOccupied ? '#94a3b8' : 'currentColor');
  
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="bed-icon">
      <path d="M2 10H22" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M2 4V20" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      <path d="M22 4V20" stroke={color} strokeWidth="2" strokeLinecap="round"/>
      {/* Cama Superior */}
      <rect x="4" y="5" width="16" height="4" rx="1" 
        fill={posicao === 'SUPERIOR' ? color : 'transparent'} 
        stroke={color} strokeWidth="1.5" 
        opacity={posicao === 'INFERIOR' ? 0.3 : 1}
      />
      {/* Cama Inferior */}
      <rect x="4" y="14" width="16" height="4" rx="1" 
        fill={posicao === 'INFERIOR' ? color : 'transparent'} 
        stroke={color} strokeWidth="1.5"
        opacity={posicao === 'SUPERIOR' ? 0.3 : 1}
      />
    </svg>
  );
};

// --- Componente Principal ---
const CheckinModal: React.FC<CheckinModalProps> = ({ pessoa, onClose, onCheckinSuccess }) => {
  const [camas, setCamas] = useState<Cama[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCamaId, setSelectedCamaId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    async function fetchCamas() {
      try {
        setLoading(true);
        const camasData = await apiFetch<Cama[]>('/api/camas');
        setCamas(camasData);
      } catch (err: any) {
        setError('Falha ao carregar camas. ' + err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchCamas();
  }, []);

  const handleCheckin = async () => {
    if (!selectedCamaId) return;
    
    setIsSubmitting(true);
    try {
      const novaEstadia = await apiFetch(`/api/estadias/checkin`, {
        method: 'POST',
        body: JSON.stringify({
          pessoa_id: pessoa.id,
          cama_id: selectedCamaId,
        }),
      });
      // Pode adicionar um toast/notificação aqui se quiser
      onCheckinSuccess(novaEstadia);
    } catch (err: any) {
      alert('Erro ao realizar check-in: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Agrupar camas por casa
  const camasPorCasa = camas.reduce((acc, cama) => {
    if (!acc[cama.casa]) acc[cama.casa] = [];
    acc[cama.casa].push(cama);
    return acc;
  }, {} as Record<Casa, Cama[]>);

  // Ordenar camas numericamente dentro de cada grupo
  Object.keys(camasPorCasa).forEach(key => {
    camasPorCasa[key as Casa].sort((a, b) => a.numero - b.numero);
  });

  return (
    <div className="modal-overlay">
      <div className="modal-container">
        {/* HEADER */}
        <div className="modal-header">
          <div>
            <h2>Check-in</h2>
            <span style={{ fontSize: '0.9rem', color: '#64748b' }}>
              Acolhido: <strong style={{color: '#1e293b'}}>{getNomePrincipal(pessoa)}</strong>
            </span>
          </div>
          <button onClick={onClose} className="close-button" aria-label="Fechar">&times;</button>
        </div>

        {/* CONTENT */}
        <div className="modal-content">
          {/* LEGENDA */}
          <div style={{ display: 'flex', gap: '20px', marginBottom: '24px', fontSize: '0.85rem', color: '#475569', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{width: 16, height: 16, borderRadius: 4, border: '1px solid #cbd5e1', background: 'white'}}></div> 
              Disponível
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{width: 16, height: 16, borderRadius: 4, background: '#eff6ff', border: '1px solid #2563eb'}}></div> 
              Selecionada
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{width: 16, height: 16, borderRadius: 4, background: '#f1f5f9'}}></div> 
              Ocupada
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{width: 16, height: 16, borderRadius: 4, background: '#fee2e2'}}></div> 
              Bloqueada
            </div>
          </div>

          {loading && (
            <div style={{textAlign: 'center', padding: '60px', color: '#64748b'}}>
              Carregando mapa de camas...
            </div>
          )}
          
          {error && <div className="error-message">{error}</div>}
          
          {!loading && !error && (
            <div className="casas-container">
              {Object.entries(camasPorCasa).map(([casa, camasDaCasa]) => {
                const vagasDisponiveis = camasDaCasa.filter(c => c.status === 'DISPONIVEL').length;
                
                return (
                  <div key={casa} className="casa-section">
                    <h3>
                      {NOME_CASAS[casa as Casa]} 
                      <span style={{fontSize: '0.75rem', fontWeight: '600', color: vagasDisponiveis > 0 ? '#10b981' : '#94a3b8', background: vagasDisponiveis > 0 ? '#d1fae5' : '#f1f5f9', padding: '4px 8px', borderRadius: '20px', textTransform: 'none'}}>
                        {vagasDisponiveis} vagas livres
                      </span>
                    </h3>
                    <div className="camas-grid">
                      {camasDaCasa.map(cama => {
                        const isSelectable = cama.status === 'DISPONIVEL';
                        const isSelected = selectedCamaId === cama.id;
                        
                        return (
                          <div
                            key={cama.id}
                            className={`cama-item status-${cama.status.toLowerCase()} ${isSelected ? 'selected' : ''}`}
                            onClick={() => isSelectable && setSelectedCamaId(cama.id)}
                            role={isSelectable ? "button" : "presentation"}
                            tabIndex={isSelectable ? 0 : -1}
                            onKeyDown={(e) => {
                              if (isSelectable && (e.key === 'Enter' || e.key === ' ')) {
                                setSelectedCamaId(cama.id);
                              }
                            }}
                          >
                            <BunkBedIcon posicao={cama.posicao} status={cama.status} />
                            <div className="cama-info">
                              <div className="cama-numero">{cama.numero}</div>
                              <div className="cama-posicao-label">{cama.posicao === 'SUPERIOR' ? 'Cima' : 'Baixo'}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="modal-footer">
          <button onClick={onClose} disabled={isSubmitting}>Cancelar</button>
          <button
            onClick={handleCheckin}
            disabled={!selectedCamaId || isSubmitting}
            className="confirm-button"
          >
            {isSubmitting ? 'Confirmando...' : 'Confirmar Check-in'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CheckinModal;
