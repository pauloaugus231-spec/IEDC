import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link } from 'react-router-dom';
import {
  createCrecheProfessora,
  updateCrecheProfessora,
  updateCrecheTurmaProfessora,
  useCrecheProfessoras,
  useCrecheTurmas,
  type CrecheProfessora,
} from '../api';
import { MetricCard, MetricGrid, PageHeader } from '../components/DesignSystem';
import '../styles/institutional.css';

const funcoesEquipe = [
  'Regente',
  'Volante',
  'Técnica em desenvolvimento infantil',
  'Estagiária',
  'Temporária',
  'Substituta',
];

const emptyForm = {
  nome: '',
  telefone: '',
  email: '',
  funcao: 'Regente',
  status: 'ativa',
  observacoes: '',
};

const CrecheTeachersPage = () => {
  const [reload, setReload] = useState(0);
  const { data: professoras, loading: loadingProfessoras } = useCrecheProfessoras(reload);
  const { data: turmas, loading: loadingTurmas } = useCrecheTurmas(reload);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CrecheProfessora | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setAssignments(
      turmas.reduce<Record<string, string>>((acc, turma) => {
        acc[turma.id] = turma.professoraId || '';
        return acc;
      }, {}),
    );
  }, [turmas]);

  const metrics = useMemo(() => {
    const ativas = professoras.filter((professora) => professora.status === 'ativa').length;
    const regentes = professoras.filter((professora) => professora.funcao === 'Regente').length;
    const apoio = professoras.filter((professora) => professora.funcao !== 'Regente').length;
    const turmasSemResponsavel = turmas.filter((turma) => !turma.professoraId).length;

    return {
      total: professoras.length,
      ativas,
      regentes,
      apoio,
      turmasSemResponsavel,
    };
  }, [professoras, turmas]);

  const openNew = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setModalOpen(true);
  };

  const openEdit = (professora: CrecheProfessora) => {
    setEditing(professora);
    setForm({
      nome: professora.nome,
      telefone: professora.telefone || '',
      email: professora.email || '',
      funcao: professora.funcao || 'Regente',
      status: professora.status || 'ativa',
      observacoes: professora.observacoes || '',
    });
    setError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.nome.trim()) return;

    setSaving(true);
    setError(null);

    try {
      const payload = {
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim(),
        funcao: form.funcao,
        status: form.status,
        observacoes: form.observacoes.trim(),
      };

      if (editing) {
        await updateCrecheProfessora(editing.id, payload);
      } else {
        await createCrecheProfessora(payload);
      }

      setModalOpen(false);
      setEditing(null);
      setForm(emptyForm);
      setReload((value) => value + 1);
    } catch (err: any) {
      setError(err.message || 'Não foi possível salvar a profissional.');
    } finally {
      setSaving(false);
    }
  };

  const saveAssignment = async (turmaId: string) => {
    setSaving(true);
    setError(null);

    try {
      await updateCrecheTurmaProfessora(turmaId, assignments[turmaId] || null);
      setReload((value) => value + 1);
    } catch (err: any) {
      setError(err.message || 'Não foi possível atualizar o vínculo da turma.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-band creche-page">
      <PageHeader
        eyebrow="E.E.I. Casa do Pequenino"
        title="Equipe da Escola de Educação Infantil"
        description="Cadastre profissionais, defina função e direcione cada turma para sua responsável sem duplicar dados."
        actions={(
          <>
          <Link className="creche-head-link secondary" to="/creche/turmas">
            Turmas
          </Link>
          <Link className="creche-head-link secondary" to="/creche">
            Painel E.E.I.
          </Link>
          <button className="creche-head-link" onClick={openNew} type="button">
            Nova profissional
          </button>
          </>
        )}
      />

      <MetricGrid>
        <MetricCard label="Equipe cadastrada" value={metrics.total} detail={`${metrics.ativas} profissionais ativas`} />
        <MetricCard label="Regentes" value={metrics.regentes} detail="Responsáveis pedagógicas por turma" />
        <MetricCard label="Apoio" value={metrics.apoio} detail="Volantes, técnicas, estagiárias e substitutas" />
        <MetricCard label="Turmas sem vínculo" value={metrics.turmasSemResponsavel} detail="Revisar antes da apresentação" tone="warning" />
      </MetricGrid>

      {error && <p className="institutional-note">{error}</p>}

      <section className="creche-profile-grid">
        <article className="creche-panel wide">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Profissionais cadastradas</h2>
              <span>Cadastro único da equipe vinculável às turmas</span>
            </div>
          </div>

          <div className="report-table-wrap ds-table-shell">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Função</th>
                  <th>Turma vinculada</th>
                  <th>Contato</th>
                  <th>Status</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {professoras.map((professora) => (
                  <tr key={professora.id}>
                    <td>
                      <strong>{professora.nome}</strong>
                      {professora.observacoes ? <span>{professora.observacoes}</span> : null}
                    </td>
                    <td>{professora.funcao}</td>
                    <td>
                      {professora.turmas?.length
                        ? professora.turmas.map((turma) => turma.nome).join(', ')
                        : 'Sem turma'}
                    </td>
                    <td>{professora.telefone || professora.email || '-'}</td>
                    <td>{professora.status === 'ativa' ? 'Ativa' : 'Inativa'}</td>
                    <td>
                      <button className="table-action" onClick={() => openEdit(professora)} type="button">
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {loadingProfessoras && <p className="institutional-note">Carregando equipe da E.E.I...</p>}
        </article>

        <article className="creche-panel wide">
          <div className="creche-panel-head">
            <div>
              <h2 className="section-title">Vínculo por turma</h2>
              <span>Escolha a responsável principal de cada sala</span>
            </div>
          </div>

          <div className="teacher-assignment-list">
            {turmas.map((turma) => (
              <div className="teacher-assignment-row" key={turma.id}>
                <div>
                  <strong>{turma.nome}</strong>
                  <span>{turma.criancas}/{turma.capacidade} crianças · {turma.faixaEtaria}</span>
                </div>
                <select
                  value={assignments[turma.id] || ''}
                  onChange={(event) => setAssignments((current) => ({ ...current, [turma.id]: event.target.value }))}
                >
                  <option value="">Sem responsável</option>
                  {professoras
                    .filter((professora) => professora.status === 'ativa')
                    .map((professora) => (
                      <option key={professora.id} value={professora.id}>
                        {professora.nome} · {professora.funcao}
                      </option>
                    ))}
                </select>
                <button className="creche-head-link secondary" disabled={saving} onClick={() => saveAssignment(turma.id)} type="button">
                  Salvar
                </button>
              </div>
            ))}
          </div>

          {loadingTurmas && <p className="institutional-note">Carregando turmas da E.E.I...</p>}
        </article>
      </section>

      {modalOpen && (
        <div className="creche-modal-overlay" role="dialog" aria-modal="true">
          <form className="creche-modal-card compact" onSubmit={handleSubmit}>
            <div className="creche-modal-head">
              <div>
                <p className="institutional-eyebrow">Equipe da E.E.I.</p>
                <h2>{editing ? 'Editar profissional' : 'Nova profissional'}</h2>
                <span>Cadastro único para vínculo posterior com uma ou mais turmas.</span>
              </div>
              <button onClick={() => setModalOpen(false)} type="button">Fechar</button>
            </div>

            <div className="creche-form-grid">
              <label className="wide">
                <span>Nome completo</span>
                <input
                  required
                  value={form.nome}
                  onChange={(event) => setForm((current) => ({ ...current, nome: event.target.value }))}
                />
              </label>
              <label>
                <span>Função</span>
                <select value={form.funcao} onChange={(event) => setForm((current) => ({ ...current, funcao: event.target.value }))}>
                  {funcoesEquipe.map((funcao) => (
                    <option key={funcao}>{funcao}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>Status</span>
                <select value={form.status} onChange={(event) => setForm((current) => ({ ...current, status: event.target.value }))}>
                  <option value="ativa">Ativa</option>
                  <option value="inativa">Inativa</option>
                </select>
              </label>
              <label>
                <span>Telefone</span>
                <input value={form.telefone} onChange={(event) => setForm((current) => ({ ...current, telefone: event.target.value }))} />
              </label>
              <label>
                <span>E-mail</span>
                <input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} />
              </label>
              <label className="wide">
                <span>Observações</span>
                <textarea
                  rows={4}
                  value={form.observacoes}
                  onChange={(event) => setForm((current) => ({ ...current, observacoes: event.target.value }))}
                />
              </label>
            </div>

            {error && <p className="creche-form-error">{error}</p>}

            <div className="creche-modal-actions">
              <button className="creche-head-link secondary" onClick={() => setModalOpen(false)} type="button">
                Cancelar
              </button>
              <button className="creche-head-link" disabled={saving} type="submit">
                {saving ? 'Salvando...' : 'Salvar profissional'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
};

export default CrecheTeachersPage;
