import React, { useEffect, useState, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getPessoaById, getEstadiasByPessoaId, getOcorrenciasByPessoaId, createOcorrencia, updatePessoa, apiFetch } from '../api';
import EditarPessoaModal from '../components/EditarPessoaModal';
import FotoPreview from '../components/FotoPreview';
import CheckinModal from '../components/CheckinModal';
import { getNomePrincipal } from '../utils';
import './PessoaProfilePage.css';

// Tipos
interface Pessoa { 
  id: string; 
  nome: string; 
  nome_social?: string; 
  cpf?: string;
  rg?: string;
  foto_url?: string; 
  status_cadastro: string; 
  lgbt?: boolean; 
  data_nascimento?: string; 
  telefone?: string; 
  endereco?: string; 
  cidade?: string; 
  uf?: string; 
  cep?: string;
  naturalidade?: string;
  nome_mae?: string;
  nome_pai?: string;
  contato_emergencia?: string;
  telefone_emergencia?: string;
  alergias?: string; 
  condicoes_cronicas?: string; 
  medicamentos_uso_continuo?: string; 
  liberacao_antecipada?: boolean;
  observacoes?: string;
  genero?: string;
  sexo?: string;
  cor?: string;
  sexualidade?: string;
}

interface Estadia { 
  id: string; 
  data_checkin: string; 
  data_checkout?: string; 
  data_limite: string; 
  status: string;
  prorrogada?: boolean;
  dias_prorrogacao?: number;
  motivo_prorrogacao?: string;
  motivo_saida?: string;
  observacoes_checkin?: string;
  observacoes_checkout?: string;
  funcionario_checkin?: string;
  funcionario_checkout?: string;
  cama?: { numero: string; casa: string };
}

interface Ocorrencia { 
  id: string; 
  tipo: string; 
  titulo?: string; 
  descricao: string; 
  severidade: 'baixa' | 'media' | 'alta'; 
  data_ocorrencia: string;
  criado_por?: string;
}

interface Bloqueio {
  id: string;
  tipo: string;
  motivo: string;
  data_inicio: string;
  data_fim?: string;
  dias_bloqueio?: number;
  ativo: boolean;
  criado_por: string;
  observacoes?: string;
  liberacao_antecipada?: boolean;
  data_liberacao_antecipada?: string;
  motivo_liberacao_antecipada?: string;
  liberado_por?: string;
}

const PessoaProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  // Estados de Dados
  const [pessoa, setPessoa] = useState<Pessoa | null>(null);
  const [estadias, setEstadias] = useState<Estadia[]>([]);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [loading, setLoading] = useState(true);

  // Estados de Interface
  const [activeTab, setActiveTab] = useState<'geral' | 'ocorrencias' | 'historico'>('geral');
  const [showEditar, setShowEditar] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showOcorrenciaModal, setShowOcorrenciaModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  // Toast helper
  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // --- CARREGAMENTO DE DADOS ---
  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [p, e, o, b] = await Promise.all([
        getPessoaById(id),
        getEstadiasByPessoaId(id),
        getOcorrenciasByPessoaId(id),
        apiFetch(`/api/bloqueios/pessoa/${id}`).catch(() => [])
      ]);
      setPessoa(p as Pessoa);
      setEstadias(e as Estadia[]);
      setOcorrencias(o as Ocorrencia[]);
      setBloqueios(b as Bloqueio[]);
    } catch (err) { 
      console.error(err); 
      showToast("Erro ao carregar perfil", 'error');
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { fetchData(); }, [id]);

  // --- COMPUTED / HELPERS ---
  const estadiaAtiva = useMemo(() => estadias.find(e => e.status?.toUpperCase() === 'ATIVA'), [estadias]);
  
  // Bloqueio ativo
  const bloqueioAtivo = useMemo(() => {
    const hoje = new Date();
    return bloqueios.find(b => {
      if (!b.ativo) return false;
      const inicio = new Date(b.data_inicio);
      if (hoje < inicio) return false;
      if (b.data_fim) {
        const fim = new Date(b.data_fim);
        fim.setHours(23, 59, 59, 999);
        return hoje <= fim;
      }
      return true;
    });
  }, [bloqueios]);

  // Dias restantes do bloqueio
  const diasRestantesBloqueio = useMemo(() => {
    if (!bloqueioAtivo?.data_fim) return null;
    const hoje = new Date();
    const fim = new Date(bloqueioAtivo.data_fim);
    const diff = fim.getTime() - hoje.getTime();
    return Math.max(0, Math.ceil(diff / 86400000));
  }, [bloqueioAtivo]);
  
  const diasRestantesInfo = useMemo(() => {
    if (!estadiaAtiva?.data_limite) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataLimite = new Date(estadiaAtiva.data_limite);
    const diff = dataLimite.getTime() - hoje.getTime();
    const dias = Math.ceil(diff / (86400000));
    
    let color = '#10B981'; // Verde
    let status = 'normal';
    if (dias <= 3) { color = '#EF4444'; status = 'critico'; }
    else if (dias <= 7) { color = '#F59E0B'; status = 'atencao'; }
    
    return { dias, color, status, data: dataLimite.toLocaleDateString() };
  }, [estadiaAtiva]);

  // Calcular idade
  const idade = useMemo(() => {
    if (!pessoa?.data_nascimento) return null;
    const nascimento = new Date(pessoa.data_nascimento);
    const hoje = new Date();
    let anos = hoje.getFullYear() - nascimento.getFullYear();
    const m = hoje.getMonth() - nascimento.getMonth();
    if (m < 0 || (m === 0 && hoje.getDate() < nascimento.getDate())) anos--;
    return anos;
  }, [pessoa?.data_nascimento]);

  // --- AÇÕES ---
  const handleLiberarAntecipada = async () => {
    const funcionario = prompt("Seu nome (funcionário autorizador):");
    if (!funcionario) return;
    
    if (!window.confirm("Confirmar liberação antecipada para nova entrada? Isso também liberará qualquer bloqueio ativo.")) return;
    try {
      await apiFetch(`/api/pessoas/${id}/liberar-antecipadamente`, { 
        method: 'POST',
        body: JSON.stringify({ funcionario })
      });
      showToast("Pessoa liberada para nova entrada!");
      fetchData();
    } catch (e) { 
      showToast("Erro na liberação", 'error'); 
    }
  };

  const handleToggleLGBT = async () => {
    if (!pessoa) return;
    try {
      const novoValor = !pessoa.lgbt;
      await apiFetch(`/api/pessoas/${pessoa.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ lgbt: novoValor }),
      });
      setPessoa({ ...pessoa, lgbt: novoValor });
      showToast(novoValor ? "Identificação LGBT+ adicionada" : "Identificação LGBT+ removida");
    } catch (error) {
      showToast("Erro ao atualizar", 'error');
    }
  };

  const handleCreateOcorrencia = async (data: any) => {
    try {
      await createOcorrencia({ pessoa_id: id!, ...data });
      setShowOcorrenciaModal(false);
      showToast("Ocorrência registrada!");
      fetchData();
    } catch (e) { 
      showToast("Erro ao criar ocorrência", 'error'); 
    }
  };

  const handleDeleteOcorrencia = async (ocorrenciaId: string) => {
    if (!window.confirm("Excluir esta ocorrência?")) return;
    try {
      await apiFetch(`/api/ocorrencias/${ocorrenciaId}`, { method: 'DELETE' });
      setOcorrencias(prev => prev.filter(o => o.id !== ocorrenciaId));
      showToast("Ocorrência excluída");
    } catch (e) {
      showToast("Erro ao excluir", 'error');
    }
  };

  const handleSavePessoa = async (data: any) => {
    try {
      await updatePessoa(pessoa!.id, data);
      setShowEditar(false);
      showToast("Dados atualizados!");
      fetchData();
    } catch (e) {
      showToast("Erro ao salvar", 'error');
    }
  };

  // --- LOADING / ERROR STATES ---
  if (loading) {
    return (
      <div className="loading-screen">
        <div className="loading-spinner">⏳</div>
        <p>Carregando Prontuário...</p>
      </div>
    );
  }

  if (!pessoa) {
    return (
      <div className="error-screen">
        <h2>😕 Pessoa não encontrada</h2>
        <button onClick={() => navigate(-1)} className="btn-secondary">← Voltar</button>
      </div>
    );
  }

  return (
    <div className="profile-layout">
      
      {/* TOAST NOTIFICATION */}
      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.type === 'success' ? '✅' : '❌'} {toast.message}
        </div>
      )}

      {/* SIDEBAR ESQUERDA */}
      <aside className="profile-sidebar">
        {/* Botão Voltar */}
        <button className="btn-back" onClick={() => navigate(-1)}>
          ← Voltar
        </button>

        <div className="profile-photo-container">
          <FotoPreview fotoUrl={pessoa.foto_url} size={150} altText={getNomePrincipal(pessoa)} />
          <div className={`status-badge status-${pessoa.status_cadastro?.toLowerCase().replace(' ', '-')}`}>
            {pessoa.status_cadastro}
          </div>
        </div>

        <div className="profile-identity">
          <h1>
            {getNomePrincipal(pessoa)}
            {pessoa.lgbt && <span className="tag-lgbt" title="Pessoa LGBT+">🏳️‍🌈</span>}
          </h1>
          {pessoa.nome_social && (
            <p className="subtitle">Civil: {pessoa.nome}</p>
          )}
          {idade && <p className="age-info">{idade} anos</p>}
        </div>

        <div className="sidebar-info">
          <InfoRow icon="📅" label="Nascimento" value={pessoa.data_nascimento ? new Date(pessoa.data_nascimento).toLocaleDateString() : '-'} />
          <InfoRow icon="📱" label="Telefone" value={pessoa.telefone || '-'} />
          <InfoRow icon="📍" label="Cidade" value={pessoa.cidade ? `${pessoa.cidade}/${pessoa.uf || ''}` : '-'} />
          {pessoa.cpf && <InfoRow icon="🪪" label="CPF" value={pessoa.cpf} />}
        </div>

        {/* Toggle LGBT */}
        <div className="sidebar-toggle">
          <label className="toggle-label">
            <input
              type="checkbox"
              checked={pessoa.lgbt || false}
              onChange={handleToggleLGBT}
            />
            <span className="toggle-text">🏳️‍🌈 Identificação LGBT+</span>
          </label>
        </div>

        <div className="sidebar-actions">
          <button className="btn-primary full" onClick={() => setShowEditar(true)}>
            ✏️ Editar Dados
          </button>
          
          {/* Botão Check-in: aparece se não tem estadia ativa, já foi liberado e não tem bloqueio ativo */}
          {!estadiaAtiva && pessoa.liberacao_antecipada && !bloqueioAtivo && (
            <button className="btn-success full" onClick={() => setShowCheckin(true)}>
              🏨 Fazer Check-in
            </button>
          )}
          
          {/* Botão Liberar Entrada: aparece se tem bloqueio ativo OU se não tem estadia e não foi liberado */}
          {bloqueioAtivo && (
            <button className="btn-warning full" onClick={handleLiberarAntecipada}>
              🔓 Liberar Bloqueio Antecipado
            </button>
          )}
          
          {!estadiaAtiva && !pessoa.liberacao_antecipada && !bloqueioAtivo && (
            <button className="btn-warning full" onClick={handleLiberarAntecipada}>
              🔓 Liberar Entrada
            </button>
          )}
        </div>
      </aside>

      {/* ÁREA PRINCIPAL */}
      <main className="profile-main">
        
        {/* BANNER DE BLOQUEIO ATIVO */}
        {bloqueioAtivo && (
          <div className="block-banner">
            <div className="block-info">
              <span className="block-icon">🚫</span>
              <div className="block-details">
                <strong>Pessoa Bloqueada</strong>
                <span className="block-reason">{bloqueioAtivo.motivo}</span>
                <small>
                  Tipo: {bloqueioAtivo.tipo} • 
                  {bloqueioAtivo.data_fim 
                    ? ` Liberação em ${new Date(bloqueioAtivo.data_fim).toLocaleDateString()}`
                    : ' Bloqueio permanente'}
                </small>
              </div>
            </div>
            {diasRestantesBloqueio !== null && diasRestantesBloqueio > 0 && (
              <div className="block-countdown">
                <span className="days">{diasRestantesBloqueio}</span>
                <span className="label">dias restantes</span>
              </div>
            )}
          </div>
        )}

        {/* BANNER DE ESTADIA ATIVA */}
        {estadiaAtiva && diasRestantesInfo && (
          <div className={`active-stay-banner status-${diasRestantesInfo.status}`}>
            <div className="stay-info">
              <span className="stay-label">🏨 Estadia Ativa</span>
              <span className="stay-dates">
                Entrada: {new Date(estadiaAtiva.data_checkin).toLocaleDateString()}
                {estadiaAtiva.cama && ` • Cama ${estadiaAtiva.cama.numero} (${estadiaAtiva.cama.casa})`}
              </span>
              {estadiaAtiva.prorrogada && (
                <span className="stay-extended">⏰ Prorrogada (+{estadiaAtiva.dias_prorrogacao} dias)</span>
              )}
            </div>
            <div className="stay-countdown">
              <span className="days" style={{ color: diasRestantesInfo.color }}>
                {diasRestantesInfo.dias}
              </span>
              <span className="label">dias restantes</span>
              <small>até {diasRestantesInfo.data}</small>
            </div>
          </div>
        )}

        {/* NAVEGAÇÃO POR ABAS */}
        <div className="tabs-nav">
          <button 
            className={activeTab === 'geral' ? 'active' : ''} 
            onClick={() => setActiveTab('geral')}
          >
            📋 Visão Geral
          </button>
          <button 
            className={activeTab === 'ocorrencias' ? 'active' : ''} 
            onClick={() => setActiveTab('ocorrencias')}
          >
            ⚠️ Ocorrências 
            {ocorrencias.length > 0 && <span className="tab-badge">{ocorrencias.length}</span>}
          </button>
          <button 
            className={activeTab === 'historico' ? 'active' : ''} 
            onClick={() => setActiveTab('historico')}
          >
            📜 Histórico
          </button>
        </div>

        <div className="tab-content">
          
          {/* ABA GERAL */}
          {activeTab === 'geral' && (
            <div className="general-grid">
              
              {/* Card Saúde */}
              <div className="card health-card">
                <h3>🏥 Informações de Saúde</h3>
                <div className={`health-item ${pessoa.alergias ? 'warning' : ''}`}>
                  <label>⚠️ Alergias</label>
                  <p>{pessoa.alergias || 'Nenhuma registrada'}</p>
                </div>
                <div className="health-item">
                  <label>🩺 Condições Crônicas</label>
                  <p>{pessoa.condicoes_cronicas || 'Nenhuma registrada'}</p>
                </div>
                <div className={`health-item ${pessoa.medicamentos_uso_continuo ? 'info' : ''}`}>
                  <label>💊 Medicamentos Contínuos</label>
                  <p>{pessoa.medicamentos_uso_continuo || 'Nenhum'}</p>
                </div>
              </div>

              {/* Card Contatos */}
              <div className="card contact-card">
                <h3>👨‍👩‍👦 Família e Contatos</h3>
                <div className="contact-item">
                  <label>👩 Nome da Mãe</label>
                  <p>{pessoa.nome_mae || '-'}</p>
                </div>
                <div className="contact-item">
                  <label>👨 Nome do Pai</label>
                  <p>{pessoa.nome_pai || '-'}</p>
                </div>
                <div className="contact-item emergency">
                  <label>🚨 Contato de Emergência</label>
                  <p>{pessoa.contato_emergencia || '-'}</p>
                  {pessoa.telefone_emergencia && <small>📞 {pessoa.telefone_emergencia}</small>}
                </div>
              </div>

              {/* Card Endereço */}
              <div className="card address-card">
                <h3>📍 Endereço</h3>
                <p className="address-full">
                  {pessoa.endereco || 'Não informado'}
                  {pessoa.cidade && <><br />{pessoa.cidade} - {pessoa.uf}</>}
                  {pessoa.cep && <><br />CEP: {pessoa.cep}</>}
                </p>
                {pessoa.naturalidade && (
                  <p className="naturalidade">🌍 Natural de: {pessoa.naturalidade}</p>
                )}
              </div>

              {/* Card Observações */}
              {pessoa.observacoes && (
                <div className="card obs-card full-width">
                  <h3>📝 Observações</h3>
                  <p>{pessoa.observacoes}</p>
                </div>
              )}
            </div>
          )}

          {/* ABA OCORRÊNCIAS */}
          {activeTab === 'ocorrencias' && (
            <div className="ocorrencias-tab">
              <div className="action-bar">
                <button className="btn-primary" onClick={() => setShowOcorrenciaModal(true)}>
                  + Nova Ocorrência
                </button>
              </div>
              
              {ocorrencias.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">✅</span>
                  <p>Nenhuma ocorrência registrada</p>
                </div>
              ) : (
                <div className="timeline-list">
                  {ocorrencias.map(oc => (
                    <div key={oc.id} className={`timeline-item severity-${oc.severidade}`}>
                      <div className="timeline-marker" />
                      <div className="timeline-date">
                        {new Date(oc.data_ocorrencia).toLocaleDateString()}
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className={`badge badge-${oc.severidade}`}>
                            {oc.severidade === 'alta' ? '🔴' : oc.severidade === 'media' ? '🟡' : '🟢'} {oc.severidade}
                          </span>
                          <span className="tipo-tag">{oc.tipo}</span>
                        </div>
                        <h4>{oc.titulo || 'Sem título'}</h4>
                        <p>{oc.descricao}</p>
                        {oc.criado_por && <small className="author">Por: {oc.criado_por}</small>}
                        <button 
                          className="btn-delete-small"
                          onClick={() => handleDeleteOcorrencia(oc.id)}
                          title="Excluir"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ABA HISTÓRICO */}
          {activeTab === 'historico' && (
            <div className="historico-tab">
              {estadias.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📭</span>
                  <p>Nenhuma estadia registrada</p>
                </div>
              ) : (
                <div className="estadias-cards">
                  {estadias.map(est => {
                    const entrada = new Date(est.data_checkin);
                    const saida = est.data_checkout ? new Date(est.data_checkout) : null;
                    const dias = saida 
                      ? Math.ceil((saida.getTime() - entrada.getTime()) / 86400000)
                      : Math.ceil((new Date().getTime() - entrada.getTime()) / 86400000);
                    
                    // Mapear status para cores e labels
                    const statusConfig: Record<string, { color: string; label: string; icon: string }> = {
                      'ativa': { color: '#10B981', label: 'Ativa', icon: '🟢' },
                      'finalizada': { color: '#6B7280', label: 'Finalizada', icon: '✅' },
                      'cancelada': { color: '#EF4444', label: 'Cancelada', icon: '❌' },
                      'abandono': { color: '#F59E0B', label: 'Abandono', icon: '🚪' },
                      'checkout_automatico': { color: '#8B5CF6', label: 'Automático', icon: '⏰' },
                    };

                    const motivoSaidaLabels: Record<string, string> = {
                      'voluntario': '👋 Saída Voluntária',
                      'automatico': '⏰ Prazo Expirado',
                      'abandono': '🚪 Abandonou a Vaga',
                      'transferencia': '🔄 Transferência',
                      'encaminhamento': '📋 Encaminhamento',
                      'descumprimento': '⚠️ Descumpriu Regras',
                      'outro': '📝 Outro',
                    };

                    const config = statusConfig[est.status?.toLowerCase()] || statusConfig['finalizada'];
                    
                    return (
                      <div key={est.id} className="estadia-card">
                        <div className="estadia-header">
                          <div className="estadia-dates">
                            <span className="date-badge entrada">
                              📥 {entrada.toLocaleDateString()}
                            </span>
                            <span className="date-arrow">→</span>
                            <span className={`date-badge saida ${!saida ? 'presente' : ''}`}>
                              {saida ? `📤 ${saida.toLocaleDateString()}` : '🏠 Presente'}
                            </span>
                          </div>
                          <span 
                            className="status-pill-large"
                            style={{ backgroundColor: config.color }}
                          >
                            {config.icon} {config.label}
                          </span>
                        </div>

                        <div className="estadia-body">
                          <div className="estadia-stats">
                            <div className="stat">
                              <span className="stat-value">{dias}</span>
                              <span className="stat-label">dias</span>
                            </div>
                            {est.cama && (
                              <div className="stat">
                                <span className="stat-value">🛏️ {est.cama.numero}</span>
                                <span className="stat-label">{est.cama.casa}</span>
                              </div>
                            )}
                            {est.prorrogada && (
                              <div className="stat extended">
                                <span className="stat-value">+{est.dias_prorrogacao}</span>
                                <span className="stat-label">prorrogação</span>
                              </div>
                            )}
                          </div>

                          {/* Motivo de Saída */}
                          {est.motivo_saida && (
                            <div className="motivo-saida">
                              <strong>Motivo:</strong> {motivoSaidaLabels[est.motivo_saida] || est.motivo_saida}
                            </div>
                          )}

                          {/* Prorrogação */}
                          {est.prorrogada && est.motivo_prorrogacao && (
                            <div className="info-tag prorrogacao">
                              ⏰ Prorrogada: {est.motivo_prorrogacao}
                            </div>
                          )}

                          {/* Observações */}
                          {(est.observacoes_checkin || est.observacoes_checkout) && (
                            <div className="estadia-obs">
                              {est.observacoes_checkin && (
                                <p><strong>Entrada:</strong> {est.observacoes_checkin}</p>
                              )}
                              {est.observacoes_checkout && (
                                <p><strong>Saída:</strong> {est.observacoes_checkout}</p>
                              )}
                            </div>
                          )}

                          {/* Funcionários */}
                          <div className="estadia-footer">
                            {est.funcionario_checkin && (
                              <small>Check-in: {est.funcionario_checkin}</small>
                            )}
                            {est.funcionario_checkout && (
                              <small>Check-out: {est.funcionario_checkout}</small>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* SEÇÃO DE BLOQUEIOS */}
              {bloqueios.length > 0 && (
                <>
                  <h3 className="section-title">🚫 Histórico de Bloqueios</h3>
                  <div className="bloqueios-cards">
                    {bloqueios.map(bloq => {
                      const tipoBloqueioLabels: Record<string, { label: string; icon: string; color: string }> = {
                        'comportamento': { label: 'Comportamento', icon: '⚠️', color: '#EF4444' },
                        'descumprimento_regras': { label: 'Descumprimento', icon: '📋', color: '#F59E0B' },
                        'administrativo': { label: 'Administrativo', icon: '📝', color: '#6B7280' },
                        'abandono': { label: 'Abandono de Vaga', icon: '🚪', color: '#DC2626' },
                        'outros': { label: 'Outros', icon: '📌', color: '#8B5CF6' },
                      };

                      const tipoConfig = tipoBloqueioLabels[bloq.tipo] || tipoBloqueioLabels['outros'];
                      const inicio = new Date(bloq.data_inicio);
                      const fim = bloq.data_fim ? new Date(bloq.data_fim) : null;

                      return (
                        <div key={bloq.id} className={`bloqueio-card ${bloq.ativo ? 'ativo' : 'inativo'} ${bloq.liberacao_antecipada ? 'liberado' : ''}`}>
                          <div className="bloqueio-header">
                            <span className="bloqueio-tipo" style={{ backgroundColor: tipoConfig.color }}>
                              {tipoConfig.icon} {tipoConfig.label}
                            </span>
                            <span className={`bloqueio-status ${bloq.ativo ? 'ativo' : bloq.liberacao_antecipada ? 'liberado' : 'encerrado'}`}>
                              {bloq.ativo ? '🔴 Ativo' : bloq.liberacao_antecipada ? '🟢 Liberado' : '⚪ Encerrado'}
                            </span>
                          </div>
                          
                          <div className="bloqueio-body">
                            <p className="bloqueio-motivo">{bloq.motivo}</p>
                            
                            <div className="bloqueio-datas">
                              <span>📅 {inicio.toLocaleDateString()}</span>
                              {fim && <span>→ {fim.toLocaleDateString()}</span>}
                              {bloq.dias_bloqueio && <span className="dias-tag">{bloq.dias_bloqueio} dias</span>}
                            </div>

                            {/* Info de liberação antecipada */}
                            {bloq.liberacao_antecipada && (
                              <div className="liberacao-info">
                                <span className="liberacao-badge">✅ Liberação Antecipada</span>
                                {bloq.data_liberacao_antecipada && (
                                  <small>em {new Date(bloq.data_liberacao_antecipada).toLocaleDateString()}</small>
                                )}
                                {bloq.liberado_por && <small>por {bloq.liberado_por}</small>}
                                {bloq.motivo_liberacao_antecipada && (
                                  <p className="motivo-liberacao">"{bloq.motivo_liberacao_antecipada}"</p>
                                )}
                              </div>
                            )}

                            {bloq.observacoes && (
                              <p className="bloqueio-obs"><small>{bloq.observacoes}</small></p>
                            )}
                          </div>

                          <div className="bloqueio-footer">
                            <small>Criado por: {bloq.criado_por}</small>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </main>

      {/* MODAIS */}
      {showEditar && (
        <EditarPessoaModal 
          pessoa={pessoa} 
          onClose={() => setShowEditar(false)} 
          onSave={handleSavePessoa} 
        />
      )}
      
      {showCheckin && (
        <CheckinModal 
          pessoa={pessoa} 
          onClose={() => setShowCheckin(false)} 
          onCheckinSuccess={() => {
            setShowCheckin(false);
            showToast("Check-in realizado!");
            fetchData();
          }} 
        />
      )}

      {/* MODAL DE OCORRÊNCIA */}
      {showOcorrenciaModal && (
        <div className="modal-overlay" onClick={() => setShowOcorrenciaModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>⚠️ Nova Ocorrência</h3>
              <button className="close-btn" onClick={() => setShowOcorrenciaModal(false)}>×</button>
            </div>
            <form onSubmit={(e: React.FormEvent<HTMLFormElement>) => {
              e.preventDefault();
              const formData = new FormData(e.currentTarget);
              handleCreateOcorrencia(Object.fromEntries(formData));
            }}>
              <div className="form-group">
                <label>Tipo</label>
                <select name="tipo" className="input-block" required>
                  <option value="">Selecione...</option>
                  <option value="Comportamental">Comportamental</option>
                  <option value="Médica">Médica</option>
                  <option value="Administrativa">Administrativa</option>
                  <option value="Conflito">Conflito</option>
                  <option value="Evasão">Evasão</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>
              <div className="form-group">
                <label>Título</label>
                <input name="titulo" placeholder="Resumo breve" className="input-block" />
              </div>
              <div className="form-group">
                <label>Severidade</label>
                <select name="severidade" className="input-block" required>
                  <option value="baixa">🟢 Baixa</option>
                  <option value="media">🟡 Média</option>
                  <option value="alta">🔴 Alta</option>
                </select>
              </div>
              <div className="form-group">
                <label>Descrição</label>
                <textarea 
                  name="descricao" 
                  placeholder="Descreva a ocorrência em detalhes..." 
                  required 
                  className="input-block" 
                  rows={4} 
                />
              </div>
              <div className="form-group">
                <label>Registrado por</label>
                <input name="criado_por" placeholder="Seu nome" className="input-block" />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-secondary" onClick={() => setShowOcorrenciaModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn-primary">
                  Salvar Ocorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

// Componente Auxiliar
const InfoRow = ({ icon, label, value }: { icon?: string; label: string; value: string }) => (
  <div className="info-row">
    <span className="label">{icon} {label}</span>
    <span className="value">{value}</span>
  </div>
);

export default PessoaProfilePage;