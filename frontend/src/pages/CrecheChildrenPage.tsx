import { useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  createCrecheCrianca,
  useCrecheCriancas,
  useCrecheTurmas,
  type CreateCrecheCriancaPayload,
} from '../api';
import '../styles/institutional.css';

const today = new Date().toISOString().slice(0, 10);

const emptyForm: CreateCrecheCriancaPayload = {
  nome: '',
  cpf: '',
  rg: '',
  nis: '',
  dataNascimento: '',
  dataIngresso: today,
  turmaId: '',
  status: 'ativa',
  sexo: 'menina',
  genero: '',
  racaCor: 'Não informado',
  naturalidade: 'Porto Alegre',
  endereco: '',
  bairro: '',
  cidade: 'Porto Alegre',
  uf: 'RS',
  cep: '',
  escolaOrigem: '',
  alergias: '',
  condicoesSaude: '',
  medicamentos: '',
  autorizacaoImagem: false,
  observacoes: '',
  responsaveis: [
    {
      nome: '',
      parentesco: 'Mãe',
      cpf: '',
      telefone: '',
      telefoneAlternativo: '',
      email: '',
      endereco: '',
      bairro: '',
      cidade: 'Porto Alegre',
      uf: 'RS',
      cep: '',
      trabalho: '',
      responsavelPrincipal: true,
      autorizadoRetirada: true,
      observacoes: '',
    },
  ],
};

function formatDate(value?: string) {
  if (!value) return '-';
  return new Date(`${value}T12:00:00`).toLocaleDateString('pt-BR');
}

function getMissingFields(item: { cpf?: string; nis?: string; responsaveis?: number }) {
  const missing = [];
  if (!item.cpf) missing.push('CPF');
  if (!item.nis) missing.push('NIS');
  if (!item.responsaveis) missing.push('responsável');
  return missing;
}

function isMenina(value?: string) {
  const normalized = (value || '').toLowerCase();
  return normalized.includes('fem') || normalized.includes('menina');
}

const CrecheChildrenPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [turmaId, setTurmaId] = useState(searchParams.get('turmaId') || '');
  const [status, setStatus] = useState('ativa');
  const [reload, setReload] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState<CreateCrecheCriancaPayload>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const { data: turmas } = useCrecheTurmas();
  const { data: criancas, loading, error } = useCrecheCriancas({ search, turmaId, status }, reload);

  const metrics = useMemo(() => {
    const pendencias = criancas.filter((item) => getMissingFields(item).length > 0).length;
    const comResponsavel = criancas.filter((item) => item.responsaveis > 0).length;

    return {
      total: criancas.length,
      pendencias,
      comResponsavel,
      meninas: criancas.filter((item) => isMenina(item.sexo)).length,
    };
  }, [criancas]);

  const updateForm = (field: keyof CreateCrecheCriancaPayload, value: any) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateResponsavel = (field: string, value: any) => {
    setForm((current) => ({
      ...current,
      responsaveis: [
        {
          ...current.responsaveis[0],
          [field]: value,
        },
      ],
    }));
  };

  const openModal = () => {
    setForm({
      ...emptyForm,
      turmaId: turmas[0]?.id ?? '',
      responsaveis: [{ ...emptyForm.responsaveis[0] }],
    });
    setFormError(null);
    setModalOpen(true);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);

    try {
      const saved = await createCrecheCrianca(form);
      setModalOpen(false);
      setReload((value) => value + 1);
      navigate(`/creche/criancas/${saved.crianca.id}`);
    } catch (err: any) {
      setFormError(err.message || 'Não foi possível cadastrar a criança.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="page-band creche-page">
      <section className="creche-dashboard-head">
        <div>
          <p className="institutional-eyebrow">E.E.I. Casa do Pequenino</p>
          <h1>Crianças e responsáveis</h1>
          <p>
            Consulta operacional da E.E.I. com dados de aferição, responsáveis,
            turma e pendências cadastrais.
          </p>
        </div>
        <div className="creche-head-actions">
          <Link className="creche-head-link secondary" to="/creche/turmas">
            Turmas
          </Link>
          <Link className="creche-head-link secondary" to="/creche/frequencia">
            Registrar frequência
          </Link>
          <button className="creche-head-link" onClick={openModal} type="button">
            Nova criança
          </button>
        </div>
      </section>

      <section className="metrics-grid creche-metrics-grid">
        <article className="metric-card creche-metric-card">
          <span>Total filtrado</span>
          <strong>{metrics.total}</strong>
          <small>Crianças na lista atual</small>
        </article>
        <article className="metric-card creche-metric-card">
          <span>Com responsável</span>
          <strong>{metrics.comResponsavel}</strong>
          <small>Base pronta para contato</small>
        </article>
        <article className="metric-card creche-metric-card warning">
          <span>Pendências</span>
          <strong>{metrics.pendencias}</strong>
          <small>CPF, NIS ou responsável</small>
        </article>
        <article className="metric-card creche-metric-card">
          <span>Meninas</span>
          <strong>{metrics.meninas}</strong>
          <small>Recorte rápido do cadastro</small>
        </article>
      </section>

      <section className="creche-panel creche-list-panel">
        <div className="creche-list-toolbar">
          <label>
            <span>Buscar</span>
            <input
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Nome, CPF, NIS ou código"
              value={search}
            />
          </label>

          <label>
            <span>Turma</span>
            <select onChange={(event) => setTurmaId(event.target.value)} value={turmaId}>
              <option value="">Todas</option>
              {turmas.map((turma) => (
                <option key={turma.id} value={turma.id}>
                  {turma.nome}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Status</span>
            <select onChange={(event) => setStatus(event.target.value)} value={status}>
              <option value="ativa">Ativas</option>
              <option value="inativa">Inativas</option>
              <option value="todos">Todos</option>
            </select>
          </label>
        </div>

        <div className="report-table-wrap">
          <table className="report-table">
            <thead>
              <tr>
                <th>Criança</th>
                <th>Turma</th>
                <th>Professora</th>
                <th>Nascimento</th>
                <th>NIS</th>
                <th>Responsável</th>
                <th>Pendências</th>
              </tr>
            </thead>
            <tbody>
              {criancas.map((item) => {
                const missing = getMissingFields(item);
                return (
                  <tr key={item.id}>
                    <td>
                      <Link className="creche-table-link" to={`/creche/criancas/${item.id}`}>
                        <strong>{item.nome}</strong>
                        <span>{item.cpf || 'CPF pendente'}</span>
                      </Link>
                    </td>
                    <td>
                      <Link className="creche-table-link" to={`/creche/turmas/${item.turmaId}`}>
                        <strong>{item.turma}</strong>
                        <span>abrir turma</span>
                      </Link>
                    </td>
                    <td>{item.professora || '-'}</td>
                    <td>{formatDate(item.dataNascimento)}</td>
                    <td>{item.nis || 'Pendente'}</td>
                    <td>
                      <strong>{item.responsavelPrincipal || 'Não informado'}</strong>
                      <span>{item.telefone || 'sem telefone'}</span>
                    </td>
                    <td>
                      {missing.length ? (
                        <em className="status-pill warning">{missing.join(', ')}</em>
                      ) : (
                        <em className="status-pill success">Completo</em>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {loading && <p className="institutional-note">Atualizando lista da E.E.I...</p>}
        {error && <p className="institutional-note">Não foi possível carregar as crianças.</p>}
        {!loading && !criancas.length && (
          <p className="institutional-note">Nenhuma criança encontrada com os filtros atuais.</p>
        )}
      </section>

      {modalOpen && (
        <div className="creche-modal-overlay" role="dialog" aria-modal="true">
          <form className="creche-modal-card" onSubmit={handleSubmit}>
            <div className="creche-modal-head">
              <div>
                <p className="institutional-eyebrow">Novo cadastro</p>
                <h2>Criança e responsável</h2>
                <span>Base mínima para aferição, frequência e contato familiar.</span>
              </div>
              <button onClick={() => setModalOpen(false)} type="button">Fechar</button>
            </div>

            <div className="creche-form-section">
              <h3>Dados da criança</h3>
              <div className="creche-form-grid">
                <label>
                  <span>Nome completo</span>
                  <input required value={form.nome} onChange={(event) => updateForm('nome', event.target.value)} />
                </label>
                <label>
                  <span>CPF</span>
                  <input required value={form.cpf} onChange={(event) => updateForm('cpf', event.target.value)} />
                </label>
                <label>
                  <span>NIS</span>
                  <input value={form.nis} onChange={(event) => updateForm('nis', event.target.value)} />
                </label>
                <label>
                  <span>Data de nascimento</span>
                  <input
                    required
                    type="date"
                    value={form.dataNascimento}
                    onChange={(event) => updateForm('dataNascimento', event.target.value)}
                  />
                </label>
                <label>
                  <span>Data de ingresso</span>
                  <input
                    required
                    type="date"
                    value={form.dataIngresso}
                    onChange={(event) => updateForm('dataIngresso', event.target.value)}
                  />
                </label>
                <label>
                  <span>Turma</span>
                  <select required value={form.turmaId} onChange={(event) => updateForm('turmaId', event.target.value)}>
                    <option value="">Selecione</option>
                    {turmas.map((turma) => (
                      <option key={turma.id} value={turma.id}>
                        {turma.nome}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  <span>Sexo</span>
                  <select value={form.sexo} onChange={(event) => updateForm('sexo', event.target.value)}>
                    <option value="menina">Menina</option>
                    <option value="menino">Menino</option>
                  </select>
                </label>
                <label>
                  <span>Raça/cor</span>
                  <select value={form.racaCor} onChange={(event) => updateForm('racaCor', event.target.value)}>
                    <option>Não informado</option>
                    <option>Branca</option>
                    <option>Preta</option>
                    <option>Parda</option>
                    <option>Indígena</option>
                    <option>Amarela</option>
                  </select>
                </label>
                <label className="wide">
                  <span>Endereço</span>
                  <input required value={form.endereco} onChange={(event) => updateForm('endereco', event.target.value)} />
                </label>
                <label>
                  <span>Bairro</span>
                  <input value={form.bairro} onChange={(event) => updateForm('bairro', event.target.value)} />
                </label>
                <label>
                  <span>CEP</span>
                  <input value={form.cep} onChange={(event) => updateForm('cep', event.target.value)} />
                </label>
              </div>
            </div>

            <div className="creche-form-section">
              <h3>Responsável principal</h3>
              <div className="creche-form-grid">
                <label>
                  <span>Nome</span>
                  <input
                    required
                    value={form.responsaveis[0].nome}
                    onChange={(event) => updateResponsavel('nome', event.target.value)}
                  />
                </label>
                <label>
                  <span>Parentesco</span>
                  <select
                    value={form.responsaveis[0].parentesco}
                    onChange={(event) => updateResponsavel('parentesco', event.target.value)}
                  >
                    <option>Mãe</option>
                    <option>Pai</option>
                    <option>Avó</option>
                    <option>Avô</option>
                    <option>Responsável legal</option>
                    <option>Outro</option>
                  </select>
                </label>
                <label>
                  <span>CPF do responsável</span>
                  <input
                    value={form.responsaveis[0].cpf}
                    onChange={(event) => updateResponsavel('cpf', event.target.value)}
                  />
                </label>
                <label>
                  <span>Telefone</span>
                  <input
                    required
                    value={form.responsaveis[0].telefone}
                    onChange={(event) => updateResponsavel('telefone', event.target.value)}
                  />
                </label>
                <label>
                  <span>Telefone alternativo</span>
                  <input
                    value={form.responsaveis[0].telefoneAlternativo ?? ''}
                    onChange={(event) => updateResponsavel('telefoneAlternativo', event.target.value)}
                  />
                </label>
                <label>
                  <span>E-mail</span>
                  <input
                    type="email"
                    value={form.responsaveis[0].email ?? ''}
                    onChange={(event) => updateResponsavel('email', event.target.value)}
                  />
                </label>
                <label className="wide">
                  <span>Observações de contato</span>
                  <textarea
                    rows={3}
                    value={form.responsaveis[0].observacoes ?? ''}
                    onChange={(event) => updateResponsavel('observacoes', event.target.value)}
                  />
                </label>
              </div>
            </div>

            <div className="creche-form-section">
              <h3>Saúde e observações</h3>
              <div className="creche-form-grid">
                <label>
                  <span>Alergias</span>
                  <input value={form.alergias} onChange={(event) => updateForm('alergias', event.target.value)} />
                </label>
                <label>
                  <span>Condições de saúde</span>
                  <input
                    value={form.condicoesSaude}
                    onChange={(event) => updateForm('condicoesSaude', event.target.value)}
                  />
                </label>
                <label className="wide">
                  <span>Observações</span>
                  <textarea
                    rows={3}
                    value={form.observacoes}
                    onChange={(event) => updateForm('observacoes', event.target.value)}
                  />
                </label>
              </div>
            </div>

            {formError && <p className="creche-form-error">{formError}</p>}

            <div className="creche-modal-actions">
              <button className="creche-head-link secondary" onClick={() => setModalOpen(false)} type="button">
                Cancelar
              </button>
              <button className="creche-head-link" disabled={saving} type="submit">
                {saving ? 'Salvando...' : 'Cadastrar criança'}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
};

export default CrecheChildrenPage;
