import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  getCrecheFrequenciaTurma,
  saveCrecheFrequenciaTurma,
  useCrecheTurmas,
  type CrecheFrequenciaTurma,
} from '../api';
import { MetricCard, MetricGrid, PageHeader } from '../components/DesignSystem';
import '../styles/institutional.css';

const today = new Date().toISOString().slice(0, 10);

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function showOperationalReceipt(message: string, type: 'success' | 'info' = 'success') {
  window.showToast?.(message, type);
}

const CrecheFrequencyPage = () => {
  const [searchParams] = useSearchParams();
  const { data: turmas, loading: loadingTurmas } = useCrecheTurmas();
  const [turmaId, setTurmaId] = useState(searchParams.get('turmaId') || '');
  const [data, setData] = useState(today);
  const [frequencia, setFrequencia] = useState<CrecheFrequenciaTurma | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMessage, setSavedMessage] = useState('');

  useEffect(() => {
    if (!turmaId && turmas[0]?.id) {
      setTurmaId(turmas[0].id);
    }
  }, [turmaId, turmas]);

  useEffect(() => {
    if (!turmaId || !data) return;

    setLoading(true);
    setError(null);
    getCrecheFrequenciaTurma(turmaId, data)
      .then(setFrequencia)
      .catch((err) => setError(err.message || 'Não foi possível carregar a frequência.'))
      .finally(() => setLoading(false));
  }, [turmaId, data]);

  const resumo = useMemo(() => {
    const registros = frequencia?.registros ?? [];
    const presentes = registros.filter((item) => item.presente).length;
    const faltas = registros.length - presentes;
    const percentual = registros.length ? Math.round((presentes / registros.length) * 100) : 0;
    return { total: registros.length, presentes, faltas, percentual };
  }, [frequencia]);

  const updateRegistro = (criancaId: string, patch: { presente?: boolean; justificativa?: string }) => {
    setFrequencia((current) => {
      if (!current) return current;
      return {
        ...current,
        registros: current.registros.map((registro) => (
          registro.criancaId === criancaId
            ? { ...registro, ...patch }
            : registro
        )),
      };
    });
  };

  const markAll = (presente: boolean) => {
    setFrequencia((current) => {
      if (!current) return current;
      return {
        ...current,
        registros: current.registros.map((registro) => ({
          ...registro,
          presente,
          justificativa: presente ? '' : registro.justificativa,
        })),
      };
    });
  };

  const save = async () => {
    if (!frequencia || !turmaId) return;

    setSaving(true);
    setSavedMessage('');
    setError(null);
    try {
      const saved = await saveCrecheFrequenciaTurma({
        turmaId,
        data,
        registradoPor: 'Coordenação da E.E.I.',
        registros: frequencia.registros.map((registro) => ({
          criancaId: registro.criancaId,
          presente: registro.presente,
          justificativa: registro.justificativa,
        })),
      });
      setFrequencia(saved);
      setSavedMessage('Frequência salva para a turma.');
      showOperationalReceipt('Frequência salva para a turma.');
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Não foi possível salvar a frequência.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-band creche-page">
      <PageHeader
        eyebrow="E.E.I. Casa do Pequenino"
        title="Frequência por turma"
        description="Registro diário simples para alimentar o painel da E.E.I., sinais de evasão e relatórios mensais."
        actions={(
          <>
          <Link className="creche-head-link secondary" to="/creche">
            Painel da E.E.I.
          </Link>
          <button className="creche-head-link" disabled={saving || !frequencia} onClick={save} type="button">
            {saving ? 'Salvando...' : 'Salvar frequência'}
          </button>
          </>
        )}
      />

      <MetricGrid>
        <MetricCard label="Crianças na turma" value={resumo.total} detail={frequencia?.turma.nome || 'Selecione uma turma'} />
        <MetricCard label="Presentes" value={resumo.presentes} detail={`${resumo.percentual}% de presença`} tone="success" />
        <MetricCard label="Faltas" value={resumo.faltas} detail="Geram alerta de acompanhamento" tone="warning" />
        <MetricCard label="Data" value={`${data.slice(8, 10)}/${data.slice(5, 7)}`} detail="Registro operacional" />
      </MetricGrid>

      <section className="creche-panel creche-frequency-panel">
        <div className="creche-list-toolbar">
          <label>
            <span>Turma</span>
            <select disabled={loadingTurmas} onChange={(event) => setTurmaId(event.target.value)} value={turmaId}>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Data</span>
            <input type="date" value={data} onChange={(event) => setData(event.target.value)} />
          </label>
          <div className="creche-frequency-actions">
            <button className="creche-head-link secondary" onClick={() => markAll(true)} type="button">
              Marcar todas presentes
            </button>
            <button className="creche-head-link secondary" onClick={() => markAll(false)} type="button">
              Marcar todas faltas
            </button>
          </div>
        </div>

        <div className="creche-presence-list">
          {frequencia?.registros.map((registro) => (
            <article className="creche-presence-row" key={registro.criancaId}>
              <div>
                <Link to={`/creche/criancas/${registro.codigo}`}>
                  <strong>{registro.nome}</strong>
                </Link>
                <span>{registro.codigo} · NIS {registro.nis || 'pendente'}</span>
              </div>
              <div className="creche-presence-toggle">
                <button
                  className={registro.presente ? 'active' : ''}
                  onClick={() => updateRegistro(registro.criancaId, { presente: true, justificativa: '' })}
                  type="button"
                >
                  Presente
                </button>
                <button
                  className={!registro.presente ? 'active absent' : ''}
                  onClick={() => updateRegistro(registro.criancaId, { presente: false })}
                  type="button"
                >
                  Falta
                </button>
              </div>
              <label>
                <span>Justificativa</span>
                <input
                  disabled={registro.presente}
                  onChange={(event) => updateRegistro(registro.criancaId, { justificativa: event.target.value })}
                  placeholder={registro.presente ? 'Presença confirmada' : 'Motivo da falta'}
                  value={registro.justificativa ?? ''}
                />
              </label>
            </article>
          ))}
        </div>

        {loading && <p className="institutional-note">Carregando frequência da turma...</p>}
        {error && <p className="institutional-note">{error}</p>}
        {savedMessage && <p className="institutional-note success">{savedMessage}</p>}
        {!loading && frequencia && !frequencia.registros.length && (
          <p className="institutional-note">Nenhuma criança ativa nesta turma.</p>
        )}
      </section>
    </main>
  );
};

export default CrecheFrequencyPage;
