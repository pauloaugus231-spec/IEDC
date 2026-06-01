import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  getCrecheTurmaDetalhe,
  updateCrecheCriancaTurma,
  updateCrecheTurmaProfessora,
  useCrecheCriancas,
  useCrecheProfessoras,
  useCrecheTurmas,
  type CrecheTurmaDetalhe,
} from '../api';
import { MetricCard, MetricGrid, PageHeader } from '../components/DesignSystem';
import '../styles/institutional.css';

const CrecheClassPage = () => {
  const { id } = useParams();
  const { data: turmas, loading: loadingTurmas } = useCrecheTurmas();
  const { data: criancasTodas } = useCrecheCriancas({ status: 'ativa' });
  const { data: professoras } = useCrecheProfessoras();
  const [detail, setDetail] = useState<CrecheTurmaDetalhe | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfessora, setSelectedProfessora] = useState('');
  const [selectedCrianca, setSelectedCrianca] = useState('');
  const [saving, setSaving] = useState(false);

  const loadDetail = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);

    try {
      const data = await getCrecheTurmaDetalhe(id);
      setDetail(data);
      setSelectedProfessora(data.turma.professoraId || '');
    } catch (err: any) {
      setError(err.message || 'Não foi possível carregar a turma.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetail();
  }, [id]);

  const criancasDisponiveis = useMemo(
    () => criancasTodas.filter((crianca) => crianca.turmaId !== id),
    [criancasTodas, id],
  );

  const ocupacao = detail
    ? Math.round((detail.turma.criancas / Math.max(detail.turma.capacidade, 1)) * 100)
    : 0;

  const handleChangeProfessora = async () => {
    if (!id) return;
    setSaving(true);
    try {
      const updated = await updateCrecheTurmaProfessora(id, selectedProfessora || null);
      setDetail(updated);
    } finally {
      setSaving(false);
    }
  };

  const handleVincularCrianca = async () => {
    if (!id || !selectedCrianca) return;
    setSaving(true);
    try {
      await updateCrecheCriancaTurma(selectedCrianca, id);
      setSelectedCrianca('');
      await loadDetail();
    } finally {
      setSaving(false);
    }
  };

  if (!id) {
    return (
      <main className="page-band creche-page">
        <PageHeader
          eyebrow="E.E.I. Casa do Pequenino"
          title="Turmas da Escola de Educação Infantil"
          description="Visualize cada turma, professora responsável, ocupação e acesso rápido às crianças vinculadas."
          actions={(
            <>
            <Link className="creche-head-link secondary" to="/creche">
              Painel E.E.I.
            </Link>
            <Link className="creche-head-link secondary" to="/creche/professoras">
              Equipe
            </Link>
            <Link className="creche-head-link" to="/creche/criancas">
              Crianças
            </Link>
            </>
          )}
        />

        <section className="creche-turmas-grid">
          {turmas.map((turma) => {
            const taxa = Math.round((turma.criancas / Math.max(turma.capacidade, 1)) * 100);
            return (
              <article className="creche-turma-card" key={turma.id}>
                <div className="creche-turma-top">
                  <div>
                    <h2>{turma.nome}</h2>
                    <span>{turma.faixaEtaria} · {turma.turno}</span>
                    <small>{turma.professora || 'Professora não vinculada'}</small>
                  </div>
                  <em>{turma.criancas}/{turma.capacidade}</em>
                </div>
                <progress className="creche-turma-track" value={Math.min(taxa, 100)} max={100} aria-label={`Ocupação da turma ${turma.nome}`} />
                <div className="creche-turma-actions">
                  <Link to={`/creche/turmas/${turma.id}`}>Abrir turma</Link>
                  <Link to={`/creche/frequencia?turmaId=${turma.id}`}>Frequência</Link>
                </div>
              </article>
            );
          })}
        </section>

        {loadingTurmas && <p className="institutional-note">Carregando turmas da E.E.I...</p>}
      </main>
    );
  }

  if (loading && !detail) {
    return (
      <main className="page-band creche-page">
        <p className="institutional-note">Carregando turma da E.E.I...</p>
      </main>
    );
  }

  if (error || !detail) {
    return (
      <main className="page-band creche-page">
        <p className="institutional-note">{error || 'Turma não encontrada.'}</p>
        <Link className="creche-head-link secondary" to="/creche/turmas">
          Voltar para turmas
        </Link>
      </main>
    );
  }

  return (
    <main className="page-band creche-page">
      <section className="creche-profile-hero">
        <div>
          <p className="institutional-eyebrow">Turma da E.E.I.</p>
          <h1>{detail.turma.nome}</h1>
          <p>
            {detail.turma.faixaEtaria} · {detail.turma.turno} · professora: {detail.turma.professora || 'não vinculada'}
          </p>
          <div className="creche-profile-tags">
            <span>{detail.turma.criancas} crianças</span>
            <span>{detail.turma.capacidade} vagas</span>
            <strong>{ocupacao}% de ocupação</strong>
          </div>
        </div>
        <div className="creche-head-actions">
          <Link className="creche-head-link secondary" to="/creche/turmas">
            Turmas
          </Link>
          <Link className="creche-head-link secondary" to="/creche/professoras">
            Equipe
          </Link>
          <Link className="creche-head-link secondary" to={`/creche/frequencia?turmaId=${detail.turma.id}`}>
            Frequência
          </Link>
          <Link className="creche-head-link" to={`/creche/criancas?turmaId=${detail.turma.id}`}>
            Crianças
          </Link>
        </div>
      </section>

      <MetricGrid>
        <MetricCard label="Crianças" value={detail.indicadores.totalCriancas} detail="Vinculadas à turma" />
        <MetricCard label="Frequência 30 dias" value={`${detail.indicadores.frequencia30Dias}%`} detail={`${detail.indicadores.diasRegistrados} registros`} />
        <MetricCard label="Pendências NIS" value={detail.indicadores.semNis} detail="Revisar para aferição" tone="warning" />
        <MetricCard label="Faltas" value={detail.indicadores.faltas} detail="Últimos 30 dias" />
      </MetricGrid>

      <section className="creche-profile-grid">
        <article className="creche-panel">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Professora responsável</h2>
              <span>Vínculo da profissional já cadastrada</span>
            </div>
          </div>

          <div className="creche-inline-editor">
            <label>
              <span>Professora</span>
              <select value={selectedProfessora} onChange={(event) => setSelectedProfessora(event.target.value)}>
                <option value="">Selecione</option>
                {professoras.map((professora) => (
                  <option key={professora.id} value={professora.id}>
                    {professora.nome} · {professora.funcao}
                  </option>
                ))}
              </select>
            </label>
            <button className="creche-head-link" disabled={saving} onClick={handleChangeProfessora} type="button">
              {saving ? 'Salvando...' : selectedProfessora ? 'Salvar vínculo' : 'Remover vínculo'}
            </button>
          </div>

          <p className="institutional-note">
            Novas profissionais devem ser cadastradas em Equipe da E.E.I.; aqui a turma apenas recebe o vínculo.
          </p>
          <Link className="creche-head-link secondary" to="/creche/professoras">
            Abrir cadastro da equipe
          </Link>
        </article>

        <article className="creche-panel">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Vincular criança à turma</h2>
              <span>Move a criança para {detail.turma.nome}</span>
            </div>
          </div>

          <div className="creche-inline-editor">
            <label>
              <span>Criança</span>
              <select value={selectedCrianca} onChange={(event) => setSelectedCrianca(event.target.value)}>
                <option value="">Selecione</option>
                {criancasDisponiveis.map((crianca) => (
                  <option key={crianca.id} value={crianca.id}>
                    {crianca.nome} · {crianca.turma}
                  </option>
                ))}
              </select>
            </label>
            <button className="creche-head-link" disabled={saving || !selectedCrianca} onClick={handleVincularCrianca} type="button">
              Vincular
            </button>
          </div>
        </article>

        <article className="creche-panel wide">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Crianças da turma</h2>
              <span>Lista operacional com responsáveis e pendências</span>
            </div>
          </div>

          <div className="report-table-wrap ds-table-shell">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Criança</th>
                  <th>Nascimento</th>
                  <th>NIS</th>
                  <th>Responsável</th>
                  <th>Contato</th>
                </tr>
              </thead>
              <tbody>
                {detail.criancas.map((crianca) => (
                  <tr key={crianca.id}>
                    <td>
                      <Link className="creche-table-link" to={`/creche/criancas/${crianca.id}`}>
                        <strong>{crianca.nome}</strong>
                        <span>{crianca.cpf || 'CPF pendente'}</span>
                      </Link>
                    </td>
                    <td>{new Date(`${crianca.dataNascimento}T12:00:00`).toLocaleDateString('pt-BR')}</td>
                    <td>{crianca.nis || 'Pendente'}</td>
                    <td>{crianca.responsavelPrincipal || 'Não informado'}</td>
                    <td>{crianca.telefone || 'sem telefone'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {!detail.criancas.length && (
            <p className="institutional-note">Nenhuma criança vinculada a esta turma.</p>
          )}
        </article>
      </section>
    </main>
  );
};

export default CrecheClassPage;
