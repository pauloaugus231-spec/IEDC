import React, { useState, useEffect, useMemo, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { getPessoasByCasa, apiFetch } from '../api';
import { getNomePrincipal } from '../utils';
import './PessoaCasaModal.css';
import CheckoutModal from './CheckoutModal';

// Cache local simples
const camasCache: Record<string, { data: PessoaHospedada[], timestamp: number }> = {};
const CACHE_TTL = 30000; // 30 segundos

// Interfaces
interface PessoaCasaModalProps {
  isOpen: boolean;
  onClose: () => void;
  casa: string;
  casaLabel: string;
}

interface PessoaHospedada {
  id: string;
  numero: number;
  casa: string;
  posicao: string;
  status: string;
  estadia?: {
    id: string;
    data_checkin: string;
    data_limite: string;
    status: string;
    pessoa: {
      id: string;
      nome: string;
      nome_social?: string | null;
      cpf?: string;
      lgbt?: boolean;
      status_cadastro: string;
    };
  };
}

const PessoaCasaModal: React.FC<PessoaCasaModalProps> = ({ isOpen, onClose, casa, casaLabel }) => {
  // --- Estados ---
  const [camas, setCamas] = useState<PessoaHospedada[]>([]);
  const [loading, setLoading] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);
  const [filtro, setFiltro] = useState('');
  const [feedback, setFeedback] = useState<{ tipo: 'success' | 'error', msg: string } | null>(null);
  
  // Estados de Ação Inline
  const [acaoAtiva, setAcaoAtiva] = useState<{ id: string, tipo: 'PRORROGAR' | 'TROCA' } | null>(null);
  const [prorrogacaoDias, setProrrogacaoDias] = useState(7);
  const [prorrogacaoMotivo, setProrrogacaoMotivo] = useState('');
  
  // Estados de Troca
  const [casaDestinoSelect, setCasaDestinoSelect] = useState('');
  const [camasDestino, setCamasDestino] = useState<PessoaHospedada[]>([]);

  // Estado de visualização: 'cards' ou 'lista'
  const [viewMode, setViewMode] = useState<'cards' | 'lista'>('cards');
  const [checkoutPessoa, setCheckoutPessoa] = useState<{
    id: string; nome: string; nome_social?: string | null;
    data_checkin?: string; cama?: { numero: number; casa: string } | null;
  } | null>(null);

  const navigate = useNavigate();

  // --- Efeitos ---
  useEffect(() => {
    if (isOpen && casa) {
      fetchDados();
    }
    // Limpar estados ao abrir
    setAcaoAtiva(null);
    setFiltro('');
    setViewMode('cards');
    setInitialLoad(true);
  }, [isOpen, casa]);

  // Auto-hide feedback
  useEffect(() => {
    if (feedback) {
      const timer = setTimeout(() => setFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [feedback]);

  // --- Buscas OTIMIZADAS ---
  const fetchDados = useCallback(async (forceRefresh = false) => {
    // Verificar cache local primeiro
    const cached = camasCache[casa];
    const now = Date.now();
    
    if (!forceRefresh && cached && (now - cached.timestamp) < CACHE_TTL) {
      setCamas(cached.data);
      setInitialLoad(false);
      return;
    }

    // Só mostrar loading no primeiro carregamento
    if (initialLoad) setLoading(true);
    
    try {
      const data = await getPessoasByCasa(casa) as PessoaHospedada[];
      const sortedData = data.sort((a, b) => a.numero - b.numero);
      
      // Atualizar cache local
      camasCache[casa] = { data: sortedData, timestamp: now };
      
      setCamas(sortedData);
    } catch (err) {
      console.error(err);
      setFeedback({ tipo: 'error', msg: 'Erro ao carregar camas' });
    } finally {
      setLoading(false);
      setInitialLoad(false);
    }
  }, [casa, initialLoad]);

  // Refresh silencioso após ações
  const refreshSilencioso = useCallback(() => {
    delete camasCache[casa];
    fetchDados(true);
  }, [casa, fetchDados]);

  const fetchCamasDestino = async (casaDest: string) => {
    try {
      const data = await getPessoasByCasa(casaDest) as PessoaHospedada[];
      setCamasDestino(data.sort((a, b) => a.numero - b.numero));
    } catch (error) { 
      console.error(error); 
    }
  };

  // --- Lógica Visual ---
  const getProgressColor = (percent: number) => {
    if (percent > 100) return '#EF4444'; // Vermelho (Vencido)
    if (percent > 80) return '#F59E0B';  // Laranja (Quase)
    return '#10B981';                    // Verde (OK)
  };

  const calcularEstadiaInfo = (checkin: string, limite: string) => {
    if (!checkin || !limite) return { percent: 0, restantes: 0 };
    
    const start = new Date(checkin).getTime();
    const end = new Date(limite).getTime();
    const now = new Date().getTime();
    
    const total = end - start;
    const decorridos = now - start;
    const percent = Math.min(100, Math.max(0, (decorridos / total) * 100));
    const restantes = Math.ceil((end - now) / (1000 * 60 * 60 * 24));

    return { percent, restantes };
  };

  // --- Ações ---
  const handleProrrogarConfirm = async (estadiaId: string) => {
    if (prorrogacaoDias <= 0) return;
    try {
      await apiFetch(`/api/estadias/${estadiaId}/prorrogar`, {
        method: 'PATCH',
        body: JSON.stringify({ dias: prorrogacaoDias, motivo: prorrogacaoMotivo || 'Prorrogação solicitada' }),
      });
      setFeedback({ tipo: 'success', msg: `+${prorrogacaoDias} dias adicionados!` });
      setAcaoAtiva(null);
      setProrrogacaoMotivo('');
      refreshSilencioso();
    } catch (e) { 
      setFeedback({ tipo: 'error', msg: 'Erro ao prorrogar' }); 
    }
  };

  const handleTrocaConfirm = async (estadiaIdOrigem: string, camaDestinoId: string, camaNumero: number, camaOcupada?: boolean, ocupanteNome?: string) => {
    // Se cama ocupada, pedir confirmação
    if (camaOcupada) {
      const confirmou = window.confirm(
        `TROCA MÚTUA\n\nA cama ${camaNumero} está ocupada por ${ocupanteNome}.\n\nDeseja realizar a troca mútua entre os dois hóspedes?\n\n• O hóspede atual irá para a cama ${camaNumero}\n• ${ocupanteNome} virá para a cama atual`
      );
      if (!confirmou) return;
    }
    
    try {
      await apiFetch('/api/estadias/trocar-cama', {
        method: 'POST',
        body: JSON.stringify({ estadia_origem_id: estadiaIdOrigem, cama_destino_id: camaDestinoId }),
      });
      setFeedback({ tipo: 'success', msg: camaOcupada ? `Troca mútua realizada! Cama ${camaNumero}` : `Transferido para cama ${camaNumero}!` });
      setAcaoAtiva(null);
      setCasaDestinoSelect('');
      // Invalidar cache de ambas as casas
      delete camasCache[casa];
      if (casaDestinoSelect) delete camasCache[casaDestinoSelect];
      refreshSilencioso();
    } catch (e) { 
      setFeedback({ tipo: 'error', msg: 'Erro na troca' }); 
    }
  };

  const handleCheckout = (cama: PessoaHospedada) => {
    const p = cama.estadia?.pessoa;
    if (!p) return;
    setCheckoutPessoa({
      id: p.id, nome: p.nome, nome_social: p.nome_social,
      data_checkin: cama.estadia?.data_checkin,
      cama: { numero: cama.numero, casa: cama.casa },
    });
  };

  // Copiar CPF para clipboard
  const handleCopyCpf = (cpf: string) => {
    navigator.clipboard.writeText(cpf);
    setFeedback({ tipo: 'success', msg: 'CPF copiado!' });
  };

  // Copiar toda a lista para clipboard
  const handleCopyAll = () => {
    const listaTexto = pessoasOcupadas
      .map(p => `${p.nome}\t${p.cpf || 'Sem CPF'}`)
      .join('\n');
    navigator.clipboard.writeText(listaTexto);
    setFeedback({ tipo: 'success', msg: `${pessoasOcupadas.length} registros copiados!` });
  };

  // Filtro local
  const camasFiltradas = useMemo(() => {
    if (!filtro) return camas;
    const termo = filtro.toLowerCase();
    return camas.filter(c => {
      const pessoa = c.estadia?.pessoa;
      return (pessoa && (
        getNomePrincipal(pessoa).toLocaleLowerCase('pt-BR').includes(termo)
        || pessoa.nome.toLocaleLowerCase('pt-BR').includes(termo)
      )) || c.numero.toString().includes(termo);
    });
  }, [camas, filtro]);

  // Lista de pessoas ocupadas (para modo lista)
  const pessoasOcupadas = useMemo(() => {
    return camasFiltradas
      .filter(c => c.estadia?.pessoa)
      .map(c => ({
        id: c.estadia!.pessoa.id,
        nome: getNomePrincipal(c.estadia!.pessoa),
        cpf: c.estadia!.pessoa.cpf,
        cama: c.numero,
        lgbt: c.estadia!.pessoa.lgbt,
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome));
  }, [camasFiltradas]);

  // Estatísticas
  const stats = useMemo(() => {
    const ocupadas = camas.filter(c => c.estadia).length;
    const total = camas.length;
    const percentOcupacao = total > 0 ? Math.round((ocupadas / total) * 100) : 0;
    return { ocupadas, total, percentOcupacao };
  }, [camas]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content modal-wide" onClick={e => e.stopPropagation()}>
        
        {/* Feedback Toast */}
        {feedback && (
          <div className={`feedback-toast ${feedback.tipo}`}>
            <strong>{feedback.tipo === 'success' ? 'Sucesso' : 'Erro'}:</strong> {feedback.msg}
          </div>
        )}

        {/* Header Moderno */}
        <div className="modal-header-modern">
          <div className="header-left">
            <h2>{casaLabel}</h2>
            <div className="stats-pills">
              <span className="pill occupied">{stats.ocupadas} ocupadas</span>
              <span className="pill free">{stats.total - stats.ocupadas} livres</span>
              <span className="pill percent">{stats.percentOcupacao}%</span>
            </div>
          </div>
          
          <div className="header-right">
            {/* Toggle de Visualização */}
            <div className="view-toggle">
              <button 
                className={`toggle-btn ${viewMode === 'cards' ? 'active' : ''}`}
                onClick={() => setViewMode('cards')}
                title="Visualização em cards"
              >
                Cards
              </button>
              <button 
                className={`toggle-btn ${viewMode === 'lista' ? 'active' : ''}`}
                onClick={() => setViewMode('lista')}
                title="Lista para exportação"
              >
                Lista
              </button>
            </div>

            <div className="search-box">
              <input 
                type="text" 
                placeholder="Buscar nome ou cama..." 
                value={filtro}
                onChange={e => setFiltro(e.target.value)}
              />
              {filtro && (
                <button className="clear-search" onClick={() => setFiltro('')}>×</button>
              )}
            </div>
            <button className="close-btn" onClick={onClose} aria-label="Fechar">×</button>
          </div>
        </div>

        <div className="modal-body-scroll">
          {loading ? (
            /* SKELETON LOADING - mais rápido visualmente */
            <div className="beds-grid">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bed-card skeleton">
                  <div className="skeleton-header"></div>
                  <div className="skeleton-body"></div>
                  <div className="skeleton-footer"></div>
                </div>
              ))}
            </div>
          ) : viewMode === 'lista' ? (
            /* ========== MODO LISTA ========== */
            <div className="lista-export-container">
              <div className="lista-header">
                <div className="lista-info">
                  <span className="lista-count">{pessoasOcupadas.length} pessoas hospedadas</span>
                  <span className="lista-hint">Clique no CPF para copiar individualmente</span>
                </div>
                <button 
                  className="btn-copy-all" 
                  onClick={handleCopyAll}
                  disabled={pessoasOcupadas.length === 0}
                >
                  Copiar tudo
                </button>
              </div>

              {pessoasOcupadas.length === 0 ? (
                <div className="empty-state-modern">
                  <p>{filtro ? 'Nenhuma pessoa encontrada' : 'Nenhuma pessoa hospedada'}</p>
                </div>
              ) : (
                <table className="lista-table">
                  <thead>
                    <tr>
                      <th className="cama-col">Cama</th>
                      <th>Nome</th>
                      <th className="cpf-col">CPF</th>
                      <th className="action-col"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pessoasOcupadas.map((pessoa) => (
                      <tr key={pessoa.id}>
                        <td className="cama-cell">
                          <span className="cama-badge">{pessoa.cama}</span>
                        </td>
                        <td className="nome-cell">
                          {pessoa.lgbt && <span className="lgbt-badge-small">LGBT+</span>}
                          {pessoa.nome}
                        </td>
                        <td className="cpf-cell">
                          {pessoa.cpf ? (
                            <code className="cpf-code">{pessoa.cpf}</code>
                          ) : (
                            <span className="sem-cpf">Sem CPF</span>
                          )}
                        </td>
                        <td className="action-cell">
                          {pessoa.cpf && (
                            <button 
                              className="btn-copy-single"
                              onClick={() => handleCopyCpf(pessoa.cpf!)}
                              title="Copiar CPF"
                            >
                              Copiar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ) : camasFiltradas.length === 0 ? (
            <div className="empty-state-modern">
              <p>{filtro ? 'Nenhuma cama encontrada' : 'Nenhuma cama neste quarto'}</p>
            </div>
          ) : (
            <div className="beds-grid">
              {camasFiltradas.map((cama) => {
                const ocupada = !!cama.estadia;
                const info = ocupada ? calcularEstadiaInfo(cama.estadia!.data_checkin, cama.estadia!.data_limite) : null;
                const isEditing = acaoAtiva?.id === cama.id;
                const vencido = info && info.restantes <= 0;
                const progressStyle = info ? {
                  '--bed-progress-width': `${Math.min(info.percent, 100)}%`,
                  '--bed-progress-color': getProgressColor(info.percent),
                } as CSSProperties : undefined;

                return (
                  <div 
                    key={cama.id} 
                    className={`bed-card ${ocupada ? 'occupied' : 'free'} ${isEditing ? 'editing' : ''} ${vencido ? 'expired' : ''}`}
                  >
                    {/* Topo do Card */}
                    <div className="bed-header">
                      <span className="bed-number">Cama {cama.numero}</span>
                      <span className="bed-position">{cama.posicao}</span>
                    </div>

                    {/* Conteúdo */}
                    {!ocupada ? (
                      <div className="bed-free">
                        <span className="free-icon">✓</span>
                        <span>Disponível</span>
                      </div>
                    ) : (
                      <div className="bed-occupied">
                        <div 
                          className="occupant-info" 
                          onClick={() => {
                            const pessoaId = cama.estadia?.pessoa?.id;
                            if (pessoaId) {
                              onClose();
                              navigate(`/pessoa/${pessoaId}`);
                            }
                          }}
                          title="Clique para ver perfil"
                        >
                          <div className="occupant-name">
                            {cama.estadia?.pessoa?.lgbt && <span className="lgbt-badge">LGBT+</span>}
                            {getNomePrincipal(cama.estadia?.pessoa)}
                          </div>
                        </div>
                        
                        {/* Barra de Progresso */}
                        <div className="progress-wrapper">
                          <div className="progress-track">
                            <div 
                              className="progress-fill" 
                              style={progressStyle}
                            />
                          </div>
                          <span className={`days-badge ${vencido ? 'expired' : ''}`}>
                            {vencido ? 'Vencido' : `${info!.restantes}d`}
                          </span>
                        </div>

                        {/* Área de Ações */}
                        {isEditing ? (
                          <div className="inline-action-panel">
                            {acaoAtiva.tipo === 'PRORROGAR' ? (
                              <>
                                <div className="action-title">Prorrogar estadia</div>
                                <div className="days-stepper">
                                  <button onClick={() => setProrrogacaoDias(p => Math.max(1, p-1))}>−</button>
                                  <span>{prorrogacaoDias} dias</span>
                                  <button onClick={() => setProrrogacaoDias(p => p+1)}>+</button>
                                </div>
                                <input 
                                  className="reason-input"
                                  placeholder="Motivo (opcional)..."
                                  value={prorrogacaoMotivo}
                                  onChange={e => setProrrogacaoMotivo(e.target.value)}
                                />
                                <div className="action-buttons">
                                  <button className="btn-confirm" onClick={() => handleProrrogarConfirm(cama.estadia!.id)}>
                                    ✓ Confirmar
                                  </button>
                                  <button className="btn-cancel" onClick={() => setAcaoAtiva(null)}>
                                    Cancelar
                                  </button>
                                </div>
                              </>
                            ) : (
                              <>
                                <div className="action-title">Trocar de cama</div>
                                <select 
                                  value={casaDestinoSelect} 
                                  onChange={(e) => {
                                    setCasaDestinoSelect(e.target.value);
                                    if (e.target.value) fetchCamasDestino(e.target.value);
                                  }}
                                  className="select-destino"
                                >
                                  <option value="">Selecione o quarto...</option>
                                  <option value="MASCULINA">Quarto Masculino</option>
                                  <option value="MISTA_MULHERES">Quarto Feminino</option>
                                  <option value="IDOSOS">Quarto Idosos</option>
                                  <option value="LGBT">Quarto LGBT+</option>
                                </select>
                                
                                {casaDestinoSelect && (
                                  <div className="camas-destino-list">
                                    {camasDestino.length === 0 ? (
                                      <span className="no-beds">Nenhuma cama encontrada</span>
                                    ) : (
                                      <>
                                        {/* Camas Livres */}
                                        {camasDestino.filter(c => !c.estadia).length > 0 && (
                                          <>
                                            <div className="camas-section-label">Camas livres</div>
                                            {camasDestino.filter(c => !c.estadia).map(cd => (
                                              <button 
                                                key={cd.id} 
                                                className="cama-option cama-livre"
                                                onClick={() => handleTrocaConfirm(cama.estadia!.id, cd.id, cd.numero, false)}
                                              >
                                                Cama {cd.numero} <small>({cd.posicao})</small>
                                              </button>
                                            ))}
                                          </>
                                        )}
                                        
                                        {/* Camas Ocupadas */}
                                        {camasDestino.filter(c => c.estadia && c.id !== cama.id).length > 0 && (
                                          <>
                                            <div className="camas-section-label ocupadas">Troca mútua (ocupadas)</div>
                                            {camasDestino.filter(c => c.estadia && c.id !== cama.id).map(cd => {
                                              const nomeOcupante = getNomePrincipal(cd.estadia?.pessoa);
                                              return (
                                                <button 
                                                  key={cd.id} 
                                                  className="cama-option cama-ocupada"
                                                  onClick={() => handleTrocaConfirm(cama.estadia!.id, cd.id, cd.numero, true, nomeOcupante)}
                                                  title={`Trocar com ${nomeOcupante}`}
                                                >
                                                  <span>Cama {cd.numero} <small>({cd.posicao})</small></span>
                                                  <span className="ocupante-nome">{nomeOcupante}</span>
                                                </button>
                                              );
                                            })}
                                          </>
                                        )}
                                      </>
                                    )}
                                  </div>
                                )}
                                <button className="btn-cancel full" onClick={() => { setAcaoAtiva(null); setCasaDestinoSelect(''); }}>
                                  Cancelar
                                </button>
                              </>
                            )}
                          </div>
                        ) : (
                          <div className="card-actions">
                            <button 
                              className="action-btn extend" 
                              title="Prorrogar estadia"
                              aria-label="Prorrogar estadia"
                              onClick={() => {
                                setAcaoAtiva({ id: cama.id, tipo: 'PRORROGAR' });
                                setProrrogacaoDias(7);
                              }}
                            >
                              Prorrogar
                            </button>
                            <button 
                              className="action-btn swap" 
                              title="Trocar de cama"
                              aria-label="Trocar de cama"
                              onClick={() => {
                                setAcaoAtiva({ id: cama.id, tipo: 'TROCA' });
                                setCasaDestinoSelect('');
                                setCamasDestino([]);
                              }}
                            >
                              Trocar
                            </button>
                            <button 
                              className="action-btn checkout" 
                              title="Fazer checkout"
                              aria-label="Fazer checkout"
                              onClick={() => handleCheckout(cama)}
                            >
                              Checkout
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>

      {checkoutPessoa && (
        <CheckoutModal
          pessoa={checkoutPessoa}
          estadia={{ data_checkin: checkoutPessoa.data_checkin, cama: checkoutPessoa.cama }}
          onClose={() => setCheckoutPessoa(null)}
          onSuccess={() => {
            setCheckoutPessoa(null);
            setFeedback({ tipo: 'success', msg: 'Saída registrada!' });
            refreshSilencioso();
          }}
        />
      )}
  );
};

export default PessoaCasaModal;
