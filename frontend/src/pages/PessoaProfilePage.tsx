import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { apiFetch, createOcorrencia, getEstadiasByPessoaId, getOcorrenciasByPessoaId, getPessoaById, updatePessoa } from '../api';
import CheckinModal from '../components/CheckinModal';
import EditarPessoaModal from '../components/EditarPessoaModal';
import FotoPreview from '../components/FotoPreview';
import { getNomePrincipal } from '../utils';
import './PessoaProfilePage.css';

interface Pessoa {
  id: string;
  nome: string;
  nome_social?: string;
  cpf?: string;
  rg?: string;
  nis?: string;
  foto_url?: string;
  status_cadastro: string;
  tipo_vaga?: string;
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
  cama?: { numero: string | number; casa: string };
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

type ActiveTab = 'geral' | 'ocorrencias' | 'historico';

const CASA_LABELS: Record<string, string> = {
  MASCULINA: 'Quarto Masculino',
  MISTA_MULHERES: 'Quarto Feminino',
  IDOSOS: 'Quarto de Idosos',
  LGBT: 'Quarto LGBT+',
  masculina: 'Quarto Masculino',
  feminina: 'Quarto Feminino',
  idoso: 'Quarto de Idosos',
  lgbt: 'Quarto LGBT+',
};

const motivoSaidaLabels: Record<string, string> = {
  voluntario: 'Saída voluntária',
  automatico: 'Prazo expirado',
  abandono: 'Abandono da vaga',
  transferencia: 'Transferência',
  encaminhamento: 'Encaminhamento',
  descumprimento: 'Descumprimento de regras',
  outro: 'Outro',
};

function formatDate(value?: string | null) {
  if (!value) return '-';
  const datePart = String(value).split('T')[0];
  const [year, month, day] = datePart.split('-');
  if (year && month && day) return `${day}/${month}/${year}`;
  return new Date(value).toLocaleDateString('pt-BR');
}

function formatDateTime(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getCasaLabel(value?: string | null) {
  if (!value) return '-';
  return CASA_LABELS[value] || value;
}

function normalizeStatus(status?: string) {
  return (status || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function getTipoVagaLabel(value?: string) {
  if (!value) return 'Não definido';
  return CASA_LABELS[value] || value;
}

function getAge(dataNascimento?: string) {
  if (!dataNascimento) return null;
  const nascimento = new Date(dataNascimento);
  const hoje = new Date();
  let anos = hoje.getFullYear() - nascimento.getFullYear();
  const mes = hoje.getMonth() - nascimento.getMonth();
  if (mes < 0 || (mes === 0 && hoje.getDate() < nascimento.getDate())) anos--;
  return anos;
}

const PessoaProfilePage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [pessoa, setPessoa] = useState<Pessoa | null>(null);
  const [estadias, setEstadias] = useState<Estadia[]>([]);
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [bloqueios, setBloqueios] = useState<Bloqueio[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<ActiveTab>('geral');
  const [showEditar, setShowEditar] = useState(false);
  const [showCheckin, setShowCheckin] = useState(false);
  const [showOcorrenciaModal, setShowOcorrenciaModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchData = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const [pessoaData, estadiasData, ocorrenciasData, bloqueiosData] = await Promise.all([
        getPessoaById(id),
        getEstadiasByPessoaId(id),
        getOcorrenciasByPessoaId(id),
        apiFetch(`/api/bloqueios/pessoa/${id}`).catch(() => []),
      ]);
      setPessoa(pessoaData as Pessoa);
      setEstadias(estadiasData as Estadia[]);
      setOcorrencias(ocorrenciasData as Ocorrencia[]);
      setBloqueios(bloqueiosData as Bloqueio[]);
    } catch (error) {
      console.error(error);
      showToast('Erro ao carregar perfil.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const estadiaAtiva = useMemo(
    () => estadias.find((estadia) => estadia.status?.toLowerCase() === 'ativa'),
    [estadias],
  );

  const ultimaEstadiaFinalizada = useMemo(
    () => estadias.find((estadia) => Boolean(estadia.data_checkout)),
    [estadias],
  );

  const bloqueioAtivo = useMemo(() => {
    const hoje = new Date();
    return bloqueios.find((bloqueio) => {
      if (!bloqueio.ativo) return false;
      const inicio = new Date(bloqueio.data_inicio);
      if (hoje < inicio) return false;
      if (!bloqueio.data_fim) return true;
      const fim = new Date(bloqueio.data_fim);
      fim.setHours(23, 59, 59, 999);
      return hoje <= fim;
    });
  }, [bloqueios]);

  const retornoRegra = useMemo(() => {
    if (!ultimaEstadiaFinalizada?.data_checkout || pessoa?.liberacao_antecipada || estadiaAtiva) return null;

    const checkout = new Date(ultimaEstadiaFinalizada.data_checkout);
    const hoje = new Date();
    const diffDays = Math.ceil((hoje.getTime() - checkout.getTime()) / 86400000);
    const diasRestantes = Math.max(0, 15 - diffDays);
    const dataLiberada = new Date(checkout);
    dataLiberada.setDate(checkout.getDate() + 15);

    return {
      diasRestantes,
      dataLiberada,
      checkout,
    };
  }, [estadiaAtiva, pessoa?.liberacao_antecipada, ultimaEstadiaFinalizada]);

  const diasEstadia = useMemo(() => {
    if (!estadiaAtiva?.data_checkin) return null;
    const entrada = new Date(estadiaAtiva.data_checkin);
    return Math.max(1, Math.ceil((new Date().getTime() - entrada.getTime()) / 86400000));
  }, [estadiaAtiva]);

  const diasRestantesInfo = useMemo(() => {
    if (!estadiaAtiva?.data_limite) return null;
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    const dataLimite = new Date(estadiaAtiva.data_limite);
    const dias = Math.ceil((dataLimite.getTime() - hoje.getTime()) / 86400000);
    const status = dias <= 3 ? 'critico' : dias <= 7 ? 'atencao' : 'normal';
    return { dias, status, data: formatDate(estadiaAtiva.data_limite) };
  }, [estadiaAtiva]);

  const idade = useMemo(() => getAge(pessoa?.data_nascimento), [pessoa?.data_nascimento]);

  const camposAfericao = useMemo(() => {
    if (!pessoa) return [];
    return [
      { label: 'Nome', value: pessoa.nome },
      { label: 'CPF', value: pessoa.cpf },
      { label: 'Nascimento', value: pessoa.data_nascimento },
      { label: 'NIS', value: pessoa.nis },
      { label: 'Data de ingresso', value: estadiaAtiva?.data_checkin || ultimaEstadiaFinalizada?.data_checkin },
    ];
  }, [estadiaAtiva?.data_checkin, pessoa, ultimaEstadiaFinalizada?.data_checkin]);

  const pendenciasAfericao = camposAfericao.filter((campo) => !campo.value).map((campo) => campo.label);

  const podeIniciarEstadia = Boolean(
    pessoa
    && !estadiaAtiva
    && !bloqueioAtivo
    && (
      pessoa.status_cadastro === 'aprovado'
      || pessoa.liberacao_antecipada
      || (retornoRegra && retornoRegra.diasRestantes === 0)
      || estadias.length === 0
    ),
  );

  const statusOperacional = useMemo(() => {
    if (bloqueioAtivo) return { label: 'Bloqueado', tone: 'danger' };
    if (estadiaAtiva) return { label: 'Hospedado', tone: 'success' };
    if (podeIniciarEstadia) return { label: 'Apto para entrada', tone: 'primary' };
    if (retornoRegra && retornoRegra.diasRestantes > 0) return { label: 'Aguardando retorno', tone: 'warning' };
    if (pessoa?.liberacao_antecipada) return { label: 'Liberado', tone: 'primary' };
    return { label: pessoa?.status_cadastro || 'Sem status', tone: 'neutral' };
  }, [bloqueioAtivo, estadiaAtiva, pessoa?.liberacao_antecipada, pessoa?.status_cadastro, podeIniciarEstadia, retornoRegra]);

  const handleLiberarAntecipada = async () => {
    const funcionario = window.prompt('Nome de quem está autorizando a liberação:');
    if (!funcionario) return;
    if (!window.confirm('Confirmar liberação antecipada para nova entrada?')) return;

    try {
      await apiFetch(`/api/pessoas/${id}/liberar-antecipadamente`, {
        method: 'POST',
        body: JSON.stringify({ funcionario }),
      });
      showToast('Pessoa liberada para nova entrada.');
      fetchData();
    } catch {
      showToast('Erro ao registrar liberação.', 'error');
    }
  };

  const handleCheckout = async () => {
    if (!pessoa) return;
    if (!window.confirm(`Registrar saída de ${getNomePrincipal(pessoa)}?`)) return;

    try {
      await apiFetch('/api/estadias/checkout', {
        method: 'POST',
        body: JSON.stringify({
          pessoa_id: pessoa.id,
          observacoes_checkout: 'Saída registrada pelo perfil da pessoa.',
        }),
      });
      showToast('Saída registrada.');
      fetchData();
    } catch (error: any) {
      showToast(error?.message || 'Erro ao registrar saída.', 'error');
    }
  };

  const handleToggleLGBT = async () => {
    if (!pessoa) return;
    try {
      const lgbt = !pessoa.lgbt;
      await apiFetch(`/api/pessoas/${pessoa.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ lgbt }),
      });
      setPessoa({ ...pessoa, lgbt });
      showToast(lgbt ? 'Identificação LGBT+ adicionada.' : 'Identificação LGBT+ removida.');
    } catch {
      showToast('Erro ao atualizar identificação.', 'error');
    }
  };

  const handleCreateOcorrencia = async (data: any) => {
    try {
      await createOcorrencia({ pessoa_id: id!, ...data });
      setShowOcorrenciaModal(false);
      showToast('Ocorrência registrada.');
      fetchData();
    } catch {
      showToast('Erro ao criar ocorrência.', 'error');
    }
  };

  const handleDeleteOcorrencia = async (ocorrenciaId: string) => {
    if (!window.confirm('Excluir esta ocorrência?')) return;
    try {
      await apiFetch(`/api/ocorrencias/${ocorrenciaId}`, { method: 'DELETE' });
      setOcorrencias((current) => current.filter((ocorrencia) => ocorrencia.id !== ocorrenciaId));
      showToast('Ocorrência excluída.');
    } catch {
      showToast('Erro ao excluir ocorrência.', 'error');
    }
  };

  const handleSavePessoa = async (data: any) => {
    if (!pessoa) return;
    try {
      await updatePessoa(pessoa.id, data);
      setShowEditar(false);
      showToast('Dados atualizados.');
      fetchData();
    } catch {
      showToast('Erro ao salvar dados.', 'error');
    }
  };

  if (loading) {
    return (
      <main className="profile-page page-band">
        <section className="profile-loading-state">
          <span />
          <strong>Carregando perfil</strong>
          <p>Buscando cadastro, estadias e ocorrências.</p>
        </section>
      </main>
    );
  }

  if (!pessoa) {
    return (
      <main className="profile-page page-band">
        <section className="profile-empty-state">
          <h1>Pessoa não encontrada</h1>
          <p>O cadastro solicitado não está disponível.</p>
          <button className="profile-button secondary" onClick={() => navigate(-1)} type="button">
            Voltar
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="profile-page page-band">
      {toast && (
        <div className={`profile-toast ${toast.type}`}>
          {toast.message}
        </div>
      )}

      <section className="profile-hero">
        <div className="profile-hero-left">
          <button className="profile-back-button" onClick={() => navigate(-1)} type="button">
            Voltar
          </button>

          <div className="profile-photo-wrap">
            <FotoPreview fotoUrl={pessoa.foto_url} size={104} altText={getNomePrincipal(pessoa)} />
          </div>

          <div className="profile-heading">
            <span className={`profile-status-pill ${statusOperacional.tone}`}>{statusOperacional.label}</span>
            <h1>{getNomePrincipal(pessoa)}</h1>
            {pessoa.nome_social && <p>Nome civil: {pessoa.nome}</p>}
            <div className="profile-quick-tags">
              {idade !== null && <span>{idade} anos</span>}
              <span>{pessoa.cpf || 'CPF não informado'}</span>
              <span>NIS: {pessoa.nis || 'não informado'}</span>
              {pessoa.lgbt && <span>LGBT+</span>}
            </div>
          </div>
        </div>

        <div className="profile-hero-actions">
          <button className="profile-button secondary" onClick={() => setShowEditar(true)} type="button">
            Editar cadastro
          </button>
          {podeIniciarEstadia && (
            <button className="profile-button primary" onClick={() => setShowCheckin(true)} type="button">
              Iniciar estadia
            </button>
          )}
        </div>
      </section>

      <section className={`stay-command-card ${statusOperacional.tone}`}>
        <div className="stay-command-header">
          <div>
            <span className="institutional-eyebrow">Albergue Noturno</span>
            <h2>Situação da estadia</h2>
          </div>
          <strong>{statusOperacional.label}</strong>
        </div>

        {estadiaAtiva && (
          <div className="stay-active-grid">
            <Metric label="Cama" value={estadiaAtiva.cama ? `${estadiaAtiva.cama.numero}` : '-'} detail={getCasaLabel(estadiaAtiva.cama?.casa)} />
            <Metric label="Entrada" value={formatDate(estadiaAtiva.data_checkin)} detail={formatDateTime(estadiaAtiva.data_checkin)} />
            <Metric label="Dias de estadia" value={diasEstadia ? String(diasEstadia) : '-'} detail="desde o check-in" />
            <Metric
              label="Saída prevista"
              value={diasRestantesInfo ? `${diasRestantesInfo.dias} dias` : '-'}
              detail={diasRestantesInfo ? `até ${diasRestantesInfo.data}` : 'sem data limite'}
              tone={diasRestantesInfo?.status}
            />
          </div>
        )}

        {!estadiaAtiva && bloqueioAtivo && (
          <div className="stay-message-grid">
            <div>
              <h3>Entrada bloqueada neste momento</h3>
              <p>{bloqueioAtivo.motivo}</p>
              <small>
                {bloqueioAtivo.data_fim
                  ? `Liberação prevista em ${formatDate(bloqueioAtivo.data_fim)}`
                  : 'Bloqueio sem data final definida'}
              </small>
            </div>
            <button className="profile-button warning" onClick={handleLiberarAntecipada} type="button">
              Liberar bloqueio
            </button>
          </div>
        )}

        {!estadiaAtiva && !bloqueioAtivo && podeIniciarEstadia && (
          <div className="stay-message-grid">
            <div>
              <h3>Pessoa apta para entrada hoje</h3>
              <p>O operador pode iniciar a estadia selecionando uma cama disponível.</p>
              <small>Quarto sugerido: {getTipoVagaLabel(pessoa.tipo_vaga)}</small>
            </div>
            <button className="profile-button primary large" onClick={() => setShowCheckin(true)} type="button">
              Iniciar estadia
            </button>
          </div>
        )}

        {!estadiaAtiva && !bloqueioAtivo && !podeIniciarEstadia && (
          <div className="stay-message-grid">
            <div>
              <h3>Entrada não disponível automaticamente</h3>
              {retornoRegra && retornoRegra.diasRestantes > 0 ? (
                <p>
                  Regra de retorno em andamento. Faltam {retornoRegra.diasRestantes} dias para nova entrada automática.
                </p>
              ) : (
                <p>Use liberação apenas quando houver autorização operacional.</p>
              )}
              {retornoRegra && <small>Retorno automático a partir de {formatDate(retornoRegra.dataLiberada.toISOString())}</small>}
            </div>
            <button className="profile-button warning" onClick={handleLiberarAntecipada} type="button">
              Liberar entrada
            </button>
          </div>
        )}

        {estadiaAtiva && (
          <div className="stay-actions-row">
            <button className="profile-button secondary" onClick={() => setActiveTab('historico')} type="button">
              Ver histórico
            </button>
            <button className="profile-button danger" onClick={handleCheckout} type="button">
              Registrar saída
            </button>
          </div>
        )}
      </section>

      <section className="profile-kpis">
        <Metric label="Estadias registradas" value={String(estadias.length)} detail="histórico da pessoa" />
        <Metric label="Ocorrências" value={String(ocorrencias.length)} detail={ocorrencias.length ? 'há registros no perfil' : 'sem ocorrências'} />
        <Metric label="Pendências de aferição" value={String(pendenciasAfericao.length)} detail={pendenciasAfericao.length ? pendenciasAfericao.join(', ') : 'campos essenciais completos'} />
      </section>

      <nav className="profile-tabs" aria-label="Seções do perfil">
        <button className={activeTab === 'geral' ? 'active' : ''} onClick={() => setActiveTab('geral')} type="button">
          Visão geral
        </button>
        <button className={activeTab === 'ocorrencias' ? 'active' : ''} onClick={() => setActiveTab('ocorrencias')} type="button">
          Ocorrências
          {ocorrencias.length > 0 && <span>{ocorrencias.length}</span>}
        </button>
        <button className={activeTab === 'historico' ? 'active' : ''} onClick={() => setActiveTab('historico')} type="button">
          Histórico
        </button>
      </nav>

      {activeTab === 'geral' && (
        <section className="profile-info-grid">
          <article className="profile-card afericao-card">
            <div className="profile-card-header">
              <h3>Dados para aferição</h3>
              <span className={pendenciasAfericao.length ? 'chip-warning' : 'chip-success'}>
                {pendenciasAfericao.length ? `${pendenciasAfericao.length} pendências` : 'Completo'}
              </span>
            </div>
            <div className="field-list">
              {camposAfericao.map((campo) => (
                <FieldRow
                  key={campo.label}
                  label={campo.label}
                  value={campo.label.includes('Data') || campo.label === 'Nascimento' ? formatDate(campo.value) : campo.value || '-'}
                  missing={!campo.value}
                />
              ))}
            </div>
          </article>

          <article className="profile-card">
            <div className="profile-card-header">
              <h3>Saúde e cuidados</h3>
            </div>
            <CareRow label="Alergias" value={pessoa.alergias || 'Nenhuma registrada'} tone={pessoa.alergias ? 'warning' : undefined} />
            <CareRow label="Condições crônicas" value={pessoa.condicoes_cronicas || 'Nenhuma registrada'} />
            <CareRow label="Medicamentos contínuos" value={pessoa.medicamentos_uso_continuo || 'Nenhum registrado'} tone={pessoa.medicamentos_uso_continuo ? 'info' : undefined} />
          </article>

          <article className="profile-card">
            <div className="profile-card-header">
              <h3>Família e contatos</h3>
            </div>
            <FieldRow label="Telefone" value={pessoa.telefone || '-'} />
            <FieldRow label="Mãe" value={pessoa.nome_mae || '-'} />
            <FieldRow label="Pai" value={pessoa.nome_pai || '-'} />
            <FieldRow label="Contato de emergência" value={pessoa.contato_emergencia || '-'} />
            <FieldRow label="Telefone de emergência" value={pessoa.telefone_emergencia || '-'} />
          </article>

          <article className="profile-card">
            <div className="profile-card-header">
              <h3>Endereço e origem</h3>
            </div>
            <FieldRow label="Endereço" value={pessoa.endereco || '-'} />
            <FieldRow label="Cidade" value={pessoa.cidade ? `${pessoa.cidade}/${pessoa.uf || ''}` : '-'} />
            <FieldRow label="CEP" value={pessoa.cep || '-'} />
            <FieldRow label="Naturalidade" value={pessoa.naturalidade || '-'} />
          </article>

          <article className="profile-card">
            <div className="profile-card-header">
              <h3>Identidade e vaga</h3>
            </div>
            <FieldRow label="Sexo" value={pessoa.sexo || '-'} />
            <FieldRow label="Gênero" value={pessoa.genero || '-'} />
            <FieldRow label="Cor/raça" value={pessoa.cor || '-'} />
            <FieldRow label="Tipo de vaga" value={getTipoVagaLabel(pessoa.tipo_vaga)} />
            <label className="profile-switch">
              <input checked={Boolean(pessoa.lgbt)} onChange={handleToggleLGBT} type="checkbox" />
              <span>Identificação LGBT+</span>
            </label>
          </article>

          <article className="profile-card">
            <div className="profile-card-header">
              <h3>Observações</h3>
            </div>
            <p className="profile-notes">{pessoa.observacoes || 'Nenhuma observação registrada.'}</p>
          </article>
        </section>
      )}

      {activeTab === 'ocorrencias' && (
        <section className="profile-card profile-section-card">
          <div className="profile-card-header">
            <div>
              <h3>Ocorrências</h3>
              <p>Registros operacionais vinculados à pessoa.</p>
            </div>
            <button className="profile-button primary" onClick={() => setShowOcorrenciaModal(true)} type="button">
              Nova ocorrência
            </button>
          </div>

          {ocorrencias.length === 0 ? (
            <div className="profile-empty-state compact">
              <strong>Nenhuma ocorrência registrada</strong>
              <p>O histórico operacional está limpo.</p>
            </div>
          ) : (
            <div className="occurrence-list">
              {ocorrencias.map((ocorrencia) => (
                <article className={`occurrence-item severity-${ocorrencia.severidade}`} key={ocorrencia.id}>
                  <div>
                    <span>{formatDate(ocorrencia.data_ocorrencia)}</span>
                    <strong>{ocorrencia.titulo || ocorrencia.tipo}</strong>
                    <p>{ocorrencia.descricao}</p>
                    <small>
                      {ocorrencia.tipo} · Severidade {ocorrencia.severidade}
                      {ocorrencia.criado_por ? ` · Por ${ocorrencia.criado_por}` : ''}
                    </small>
                  </div>
                  <button className="profile-delete-button" onClick={() => handleDeleteOcorrencia(ocorrencia.id)} type="button">
                    Excluir
                  </button>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {activeTab === 'historico' && (
        <section className="history-grid">
          <article className="profile-card profile-section-card">
            <div className="profile-card-header">
              <div>
                <h3>Histórico de estadias</h3>
                <p>Entradas, saídas, camas e observações de permanência.</p>
              </div>
            </div>

            {estadias.length === 0 ? (
              <div className="profile-empty-state compact">
                <strong>Nenhuma estadia registrada</strong>
                <p>A pessoa ainda não possui permanência no albergue.</p>
              </div>
            ) : (
              <div className="stay-history-list">
                {estadias.map((estadia) => (
                  <article className={`stay-history-card status-${normalizeStatus(estadia.status)}`} key={estadia.id}>
                    <div className="stay-history-top">
                      <strong>{estadia.status || 'Sem status'}</strong>
                      <span>{estadia.cama ? `Cama ${estadia.cama.numero} · ${getCasaLabel(estadia.cama.casa)}` : 'Sem cama vinculada'}</span>
                    </div>
                    <div className="stay-history-metrics">
                      <FieldRow label="Entrada" value={formatDateTime(estadia.data_checkin)} />
                      <FieldRow label="Saída" value={estadia.data_checkout ? formatDateTime(estadia.data_checkout) : 'Em permanência'} />
                      <FieldRow label="Limite" value={formatDate(estadia.data_limite)} />
                      {estadia.motivo_saida && <FieldRow label="Motivo" value={motivoSaidaLabels[estadia.motivo_saida] || estadia.motivo_saida} />}
                    </div>
                    {(estadia.observacoes_checkin || estadia.observacoes_checkout || estadia.motivo_prorrogacao) && (
                      <div className="stay-history-notes">
                        {estadia.observacoes_checkin && <p><strong>Entrada:</strong> {estadia.observacoes_checkin}</p>}
                        {estadia.observacoes_checkout && <p><strong>Saída:</strong> {estadia.observacoes_checkout}</p>}
                        {estadia.motivo_prorrogacao && <p><strong>Prorrogação:</strong> {estadia.motivo_prorrogacao}</p>}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
          </article>

          {bloqueios.length > 0 && (
            <article className="profile-card profile-section-card">
              <div className="profile-card-header">
                <div>
                  <h3>Histórico de bloqueios</h3>
                  <p>Restrições, liberações e registros administrativos.</p>
                </div>
              </div>
              <div className="block-history-list">
                {bloqueios.map((bloqueio) => (
                  <article className={`block-history-card ${bloqueio.ativo ? 'ativo' : 'encerrado'}`} key={bloqueio.id}>
                    <div>
                      <strong>{bloqueio.tipo}</strong>
                      <span>{bloqueio.ativo ? 'Ativo' : bloqueio.liberacao_antecipada ? 'Liberado antecipadamente' : 'Encerrado'}</span>
                    </div>
                    <p>{bloqueio.motivo}</p>
                    <small>
                      Início: {formatDate(bloqueio.data_inicio)}
                      {bloqueio.data_fim ? ` · Fim: ${formatDate(bloqueio.data_fim)}` : ''}
                      {bloqueio.criado_por ? ` · Criado por ${bloqueio.criado_por}` : ''}
                    </small>
                  </article>
                ))}
              </div>
            </article>
          )}
        </section>
      )}

      {showEditar && (
        <EditarPessoaModal
          onClose={() => setShowEditar(false)}
          onSave={handleSavePessoa}
          pessoa={pessoa}
        />
      )}

      {showCheckin && (
        <CheckinModal
          onCheckinSuccess={() => {
            setShowCheckin(false);
            showToast('Estadia iniciada.');
            fetchData();
          }}
          onClose={() => setShowCheckin(false)}
          pessoa={pessoa}
        />
      )}

      {showOcorrenciaModal && (
        <div className="profile-modal-overlay" onClick={() => setShowOcorrenciaModal(false)}>
          <div className="profile-modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="profile-modal-header">
              <div>
                <span>Registro operacional</span>
                <h3>Nova ocorrência</h3>
              </div>
              <button className="profile-close-button" onClick={() => setShowOcorrenciaModal(false)} type="button">
                ×
              </button>
            </div>
            <form
              className="profile-modal-form"
              onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                const formData = new FormData(event.currentTarget);
                handleCreateOcorrencia(Object.fromEntries(formData));
              }}
            >
              <label>
                Tipo
                <select name="tipo" required>
                  <option value="">Selecione...</option>
                  <option value="Comportamental">Comportamental</option>
                  <option value="Médica">Médica</option>
                  <option value="Administrativa">Administrativa</option>
                  <option value="Conflito">Conflito</option>
                  <option value="Evasão">Evasão</option>
                  <option value="Outro">Outro</option>
                </select>
              </label>
              <label>
                Título
                <input name="titulo" placeholder="Resumo breve" />
              </label>
              <label>
                Severidade
                <select name="severidade" required>
                  <option value="baixa">Baixa</option>
                  <option value="media">Média</option>
                  <option value="alta">Alta</option>
                </select>
              </label>
              <label>
                Descrição
                <textarea name="descricao" placeholder="Descreva a ocorrência..." required rows={4} />
              </label>
              <label>
                Registrado por
                <input name="criado_por" placeholder="Nome do responsável pelo registro" />
              </label>
              <div className="profile-modal-actions">
                <button className="profile-button secondary" onClick={() => setShowOcorrenciaModal(false)} type="button">
                  Cancelar
                </button>
                <button className="profile-button primary" type="submit">
                  Salvar ocorrência
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
};

const Metric = ({ label, value, detail, tone }: { label: string; value: string; detail?: string; tone?: string }) => (
  <article className={`profile-metric ${tone || ''}`}>
    <span>{label}</span>
    <strong>{value}</strong>
    {detail && <small>{detail}</small>}
  </article>
);

const FieldRow = ({ label, value, missing }: { label: string; value?: string | null; missing?: boolean }) => (
  <div className={`field-row ${missing ? 'missing' : ''}`}>
    <span>{label}</span>
    <strong>{value || '-'}</strong>
  </div>
);

const CareRow = ({ label, value, tone }: { label: string; value: string; tone?: 'warning' | 'info' }) => (
  <div className={`care-row ${tone || ''}`}>
    <span>{label}</span>
    <p>{value}</p>
  </div>
);

export default PessoaProfilePage;
