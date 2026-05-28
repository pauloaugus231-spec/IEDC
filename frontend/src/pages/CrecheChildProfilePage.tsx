import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  createCrecheAcompanhamento,
  getCrecheCrianca,
  updateCrecheCriancaTurma,
  useCrecheTurmas,
  type CrecheCriancaDetalhe,
} from '../api';
import '../styles/institutional.css';

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

const CrecheChildProfilePage = () => {
  const { id } = useParams();
  const [profile, setProfile] = useState<CrecheCriancaDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [descricao, setDescricao] = useState('');
  const [tipo, setTipo] = useState('Busca ativa');
  const [status, setStatus] = useState('Aberto');
  const [saving, setSaving] = useState(false);
  const [savingTurma, setSavingTurma] = useState(false);
  const [selectedTurmaId, setSelectedTurmaId] = useState('');
  const { data: turmas } = useCrecheTurmas();

  const loadProfile = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getCrecheCrianca(id);
      setProfile(data);
      setSelectedTurmaId(data.crianca.turmaId);
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar o cadastro.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, [id]);

  const primaryResponsible = profile?.responsaveis.find((item) => item.responsavelPrincipal)
    ?? profile?.responsaveis[0];

  const requiredIssues = useMemo(() => {
    if (!profile) return [];
    const issues = [];
    if (!profile.crianca.cpf) issues.push('CPF');
    if (!profile.crianca.nis) issues.push('NIS');
    if (!primaryResponsible) issues.push('responsável');
    if (primaryResponsible && !primaryResponsible.telefone) issues.push('telefone');
    return issues;
  }, [primaryResponsible, profile]);

  const handleAcompanhamento = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!id || !descricao.trim()) return;

    setSaving(true);
    try {
      await createCrecheAcompanhamento(id, {
        tipo,
        status,
        descricao,
        responsavel: 'Coordenação da E.E.I.',
      });
      setDescricao('');
      setTipo('Busca ativa');
      setStatus('Aberto');
      setModalOpen(false);
      await loadProfile();
    } finally {
      setSaving(false);
    }
  };

  const handleTrocarTurma = async () => {
    if (!id || !selectedTurmaId || selectedTurmaId === profile?.crianca.turmaId) return;
    setSavingTurma(true);
    try {
      const updated = await updateCrecheCriancaTurma(id, selectedTurmaId);
      setProfile(updated);
      setSelectedTurmaId(updated.crianca.turmaId);
    } finally {
      setSavingTurma(false);
    }
  };

  if (loading && !profile) {
    return (
      <main className="page-band creche-page">
        <p className="institutional-note">Carregando cadastro da criança...</p>
      </main>
    );
  }

  if (error || !profile) {
    return (
      <main className="page-band creche-page">
        <p className="institutional-note">{error || 'Cadastro não encontrado.'}</p>
        <Link className="creche-head-link secondary" to="/creche/criancas">
          Voltar para crianças
        </Link>
      </main>
    );
  }

  const { crianca, resumoFrequencia } = profile;

  return (
    <main className="page-band creche-page">
      <section className="creche-profile-hero">
        <div>
          <p className="institutional-eyebrow">Cadastro da E.E.I.</p>
          <h1>{crianca.nome}</h1>
          <p>
            {crianca.turma} · {crianca.id} · ingresso em {formatDate(crianca.dataIngresso)}
          </p>
          <div className="creche-profile-tags">
            <span>{crianca.status}</span>
            <span>{crianca.sexo}</span>
            <span>{crianca.racaCor}</span>
            {requiredIssues.length ? <em>Revisar: {requiredIssues.join(', ')}</em> : <strong>Cadastro completo</strong>}
          </div>
        </div>
        <div className="creche-head-actions">
          <Link className="creche-head-link secondary" to="/creche/criancas">
            Voltar
          </Link>
          <Link className="creche-head-link secondary" to={`/creche/frequencia?turmaId=${crianca.turmaId}`}>
            Frequência da turma
          </Link>
          <Link className="creche-head-link secondary" to={`/creche/turmas/${crianca.turmaId}`}>
            Abrir turma
          </Link>
          <button className="creche-head-link" onClick={() => setModalOpen(true)} type="button">
            Registrar acompanhamento
          </button>
        </div>
      </section>

      <section className="metrics-grid creche-metrics-grid">
        <article className="metric-card creche-metric-card">
          <span>Frequência 90 dias</span>
          <strong>{resumoFrequencia?.percentual ?? 0}%</strong>
          <small>{resumoFrequencia?.diasRegistrados ?? 0} dias registrados</small>
        </article>
        <article className="metric-card creche-metric-card warning">
          <span>Faltas</span>
          <strong>{resumoFrequencia?.faltas ?? 0}</strong>
          <small>Ausências no período observado</small>
        </article>
        <article className="metric-card creche-metric-card">
          <span>Responsáveis</span>
          <strong>{profile.responsaveis.length}</strong>
          <small>{primaryResponsible?.nome || 'Sem responsável principal'}</small>
        </article>
        <article className="metric-card creche-metric-card">
          <span>Acompanhamentos</span>
          <strong>{profile.acompanhamentos.length}</strong>
          <small>Registros técnicos no cadastro</small>
        </article>
      </section>

      <section className="creche-profile-grid">
        <article className="creche-panel">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Dados para aferição</h2>
              <span>Campos usados em conferência e prestação de contas</span>
            </div>
          </div>
          <dl className="creche-definition-grid">
            <div><dt>Nome</dt><dd>{crianca.nome}</dd></div>
            <div><dt>CPF</dt><dd>{crianca.cpf || 'Pendente'}</dd></div>
            <div><dt>NIS</dt><dd>{crianca.nis || 'Pendente'}</dd></div>
            <div><dt>Nascimento</dt><dd>{formatDate(crianca.dataNascimento)}</dd></div>
            <div><dt>Ingresso</dt><dd>{formatDate(crianca.dataIngresso)}</dd></div>
            <div><dt>Turma</dt><dd>{crianca.turma}</dd></div>
            <div><dt>Endereço</dt><dd>{crianca.endereco}</dd></div>
            <div><dt>Bairro</dt><dd>{crianca.bairro || '-'}</dd></div>
          </dl>
          <div className="creche-inline-editor" style={{ marginTop: 16 }}>
            <label>
              <span>Editar turma</span>
              <select value={selectedTurmaId} onChange={(event) => setSelectedTurmaId(event.target.value)}>
                {turmas.map((turma) => (
                  <option key={turma.id} value={turma.id}>
                    {turma.nome}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="creche-head-link"
              disabled={savingTurma || !selectedTurmaId || selectedTurmaId === crianca.turmaId}
              onClick={handleTrocarTurma}
              type="button"
            >
              {savingTurma ? 'Salvando...' : 'Salvar turma'}
            </button>
          </div>
        </article>

        <article className="creche-panel">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Responsáveis</h2>
              <span>Contato familiar e retirada</span>
            </div>
          </div>
          <div className="creche-contact-list">
            {profile.responsaveis.map((responsavel) => (
              <div key={responsavel.id || responsavel.nome}>
                <strong>{responsavel.nome}</strong>
                <span>{responsavel.parentesco} · {responsavel.telefone}</span>
                <small>
                  {responsavel.autorizadoRetirada ? 'Autorizado para retirada' : 'Não autorizado para retirada'}
                  {responsavel.responsavelPrincipal ? ' · principal' : ''}
                </small>
              </div>
            ))}
          </div>
        </article>

        <article className="creche-panel">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Saúde e observações</h2>
              <span>Informações relevantes para a operação</span>
            </div>
          </div>
          <dl className="creche-definition-grid single">
            <div><dt>Alergias</dt><dd>{crianca.alergias || 'Não informado'}</dd></div>
            <div><dt>Condições de saúde</dt><dd>{crianca.condicoesSaude || 'Não informado'}</dd></div>
            <div><dt>Medicamentos</dt><dd>{crianca.medicamentos || 'Não informado'}</dd></div>
            <div><dt>Observações</dt><dd>{crianca.observacoes || 'Sem observações'}</dd></div>
          </dl>
        </article>

        <article className="creche-panel">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Frequência recente</h2>
              <span>Últimos registros lançados</span>
            </div>
          </div>
          <div className="creche-frequency-list">
            {profile.frequenciasRecentes.slice(0, 10).map((frequencia) => (
              <div key={frequencia.id}>
                <strong>{formatDate(frequencia.data)}</strong>
                <span className={frequencia.presente ? 'present' : 'absent'}>
                  {frequencia.presente ? 'Presente' : 'Falta'}
                </span>
                <small>{frequencia.justificativa || frequencia.registradoPor}</small>
              </div>
            ))}
            {!profile.frequenciasRecentes.length && (
              <p className="institutional-note">Sem frequência registrada para esta criança.</p>
            )}
          </div>
        </article>

        <article className="creche-panel wide">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Acompanhamentos</h2>
              <span>Registro técnico de busca ativa, contato e evolução</span>
            </div>
          </div>
          <div className="creche-follow-list">
            {profile.acompanhamentos.map((item) => (
              <div key={item.id}>
                <strong>{item.tipo}</strong>
                <span>{item.descricao}</span>
                <small>{formatDate(item.data)} · {item.status} · {item.responsavel}</small>
              </div>
            ))}
            {!profile.acompanhamentos.length && (
              <p className="institutional-note">Nenhum acompanhamento registrado ainda.</p>
            )}
          </div>
        </article>
      </section>

      {modalOpen && (
        <div className="creche-modal-overlay" role="dialog" aria-modal="true">
          <form className="creche-modal-card compact" onSubmit={handleAcompanhamento}>
            <div className="creche-modal-head">
              <div>
                <p className="institutional-eyebrow">Acompanhamento</p>
                <h2>Registrar ação técnica</h2>
                <span>Use para busca ativa, contato com família e evolução de evasão.</span>
              </div>
              <button onClick={() => setModalOpen(false)} type="button">Fechar</button>
            </div>
            <div className="creche-form-grid">
              <label>
                <span>Tipo</span>
                <select value={tipo} onChange={(event) => setTipo(event.target.value)}>
                  <option>Busca ativa</option>
                  <option>Contato com responsável</option>
                  <option>Orientação técnica</option>
                  <option>Reunião familiar</option>
                  <option>Encaminhamento</option>
                </select>
              </label>
              <label>
                <span>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  <option>Aberto</option>
                  <option>Em acompanhamento</option>
                  <option>Resolvido</option>
                </select>
              </label>
              <label className="wide">
                <span>Descrição</span>
                <textarea
                  required
                  rows={5}
                  value={descricao}
                  onChange={(event) => setDescricao(event.target.value)}
                />
              </label>
            </div>
            <div className="creche-modal-actions">
              <button className="creche-head-link secondary" onClick={() => setModalOpen(false)} type="button">
                Cancelar
              </button>
              <button className="creche-head-link" disabled={saving} type="submit">
                {saving ? 'Salvando...' : 'Salvar acompanhamento'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
};

export default CrecheChildProfilePage;
