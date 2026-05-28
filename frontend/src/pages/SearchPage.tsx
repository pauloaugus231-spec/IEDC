import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { checkoutPessoa, useHospedes, useTodasPessoas } from '../api';
import CadastroPessoaModal from '../components/CadastroPessoaModal';
import CheckinModal from '../components/CheckinModal';
import FotoPreview from '../components/FotoPreview';
import { getNomePrincipal } from '../utils';
import '../styles/institutional.css';

type StatusFilter = 'todos' | 'hospedados' | 'aprovados' | 'liberados' | 'inativos';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);

  return debouncedValue;
}

function maskCpf(cpf?: string | null) {
  if (!cpf) return 'CPF não informado';
  const digits = cpf.replace(/\D/g, '');
  if (digits.length < 5) return cpf;
  return `${digits.slice(0, 3)}.***.***-${digits.slice(-2)}`;
}

function formatDate(value?: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleDateString('pt-BR');
}

function getCasaLabel(value?: string | null) {
  const labels: Record<string, string> = {
    MASCULINA: 'Masculina',
    MISTA_MULHERES: 'Feminina',
    IDOSOS: 'Idosos',
    LGBT: 'LGBT+',
  };

  return value ? labels[value] || value : null;
}

function getActiveStay(pessoa: any) {
  return Array.isArray(pessoa.estadias) ? pessoa.estadias[0] : null;
}

function getPersonStatus(pessoa: any) {
  if (pessoa.status_cadastro === 'ativa') return 'Hospedado';
  if (pessoa.liberacao_antecipada) return 'Liberado';
  if (pessoa.status_cadastro === 'aprovado') return 'Aprovado';
  return 'Inativo';
}

function canCheckin(pessoa: any) {
  return pessoa.status_cadastro === 'aprovado' || (pessoa.status_cadastro === 'inativo' && pessoa.liberacao_antecipada);
}

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [visibleCount, setVisibleCount] = useState(24);
  const [reload, setReload] = useState(0);
  const [pessoaParaCheckin, setPessoaParaCheckin] = useState<any | null>(null);
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const navigate = useNavigate();

  const { data: pessoasBusca, loading: loadingBusca, error } = useHospedes(debouncedSearch, reload);
  const { data: todasPessoas, loading: loadingTodas } = useTodasPessoas(reload);

  useEffect(() => {
    setVisibleCount(24);
  }, [debouncedSearch, statusFilter]);

  (window as any).reloadTodasPessoas = () => setReload((current) => current + 1);

  const stats = useMemo(() => {
    const total = todasPessoas?.length ?? 0;
    const hospedados = todasPessoas?.filter((p: any) => p.status_cadastro === 'ativa').length ?? 0;
    const aprovados = todasPessoas?.filter((p: any) => p.status_cadastro === 'aprovado').length ?? 0;
    const liberados = todasPessoas?.filter((p: any) => p.liberacao_antecipada).length ?? 0;

    return { total, hospedados, aprovados, liberados };
  }, [todasPessoas]);

  const handleCheckinSuccess = () => {
    setPessoaParaCheckin(null);
    setReload((current) => current + 1);
  };

  const handleCheckout = async (pessoa: any) => {
    if (!window.confirm(`Realizar saída de ${getNomePrincipal(pessoa)}?`)) return;

    try {
      await checkoutPessoa(pessoa.id);
      (window as any).showToast?.('Saída registrada com sucesso.', 'success');
      setReload((current) => current + 1);
    } catch (err: any) {
      (window as any).showToast?.(err.message, 'error');
    }
  };

  const listaProcessada = useMemo(() => {
    const baseList = debouncedSearch ? pessoasBusca : todasPessoas;
    if (!baseList) return [];

    return baseList
      .filter((p: any) => {
        if (statusFilter === 'todos') return true;
        if (statusFilter === 'hospedados') return p.status_cadastro === 'ativa';
        if (statusFilter === 'aprovados') return p.status_cadastro === 'aprovado';
        if (statusFilter === 'liberados') return p.liberacao_antecipada;
        if (statusFilter === 'inativos') return p.status_cadastro === 'inativo' && !p.liberacao_antecipada;
        return true;
      })
      .sort((a: any, b: any) => (
        (getNomePrincipal(a) || '').toLowerCase().localeCompare((getNomePrincipal(b) || '').toLowerCase())
      ));
  }, [debouncedSearch, pessoasBusca, todasPessoas, statusFilter]);

  const listaVisivel = listaProcessada.slice(0, visibleCount);
  const temMais = listaProcessada.length > visibleCount;
  const isLoading = loadingBusca || loadingTodas;

  return (
    <main className="page-band people-search-page">
      <section className="people-search-head">
        <div>
          <p className="institutional-eyebrow">Albergue Noturno</p>
          <h1>Buscar pessoas</h1>
          <p>Localize cadastros, veja status de estadia e execute entrada ou saída com clareza.</p>
        </div>
        <div className="people-search-actions">
          <button className="report-button secondary" onClick={() => setReload((current) => current + 1)} type="button">
            Atualizar
          </button>
          <button className="report-button" onClick={() => setCadastroOpen(true)} type="button">
            Novo cadastro
          </button>
        </div>
      </section>

      <section className="people-search-kpis">
        <article>
          <span>Total cadastrados</span>
          <strong>{stats.total}</strong>
          <small>Base ativa do albergue</small>
        </article>
        <article>
          <span>Hospedados agora</span>
          <strong>{stats.hospedados}</strong>
          <small>Com estadia ativa</small>
        </article>
        <article>
          <span>Aprovados</span>
          <strong>{stats.aprovados}</strong>
          <small>Disponíveis para entrada</small>
        </article>
        <article>
          <span>Liberados</span>
          <strong>{stats.liberados}</strong>
          <small>Com liberação antecipada</small>
        </article>
      </section>

      <section className="people-search-panel">
        <div className="people-search-box">
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="M21 21l-5.2-5.2m1.2-5.3a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
          <input
            autoComplete="off"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar por nome, nome social, CPF ou NIS"
            type="text"
            value={searchTerm}
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} type="button">
              Limpar
            </button>
          )}
        </div>

        <div className="people-filter-row" aria-label="Filtros de status">
          <FilterChip active={statusFilter === 'todos'} count={stats.total} label="Todos" onClick={() => setStatusFilter('todos')} />
          <FilterChip active={statusFilter === 'hospedados'} count={stats.hospedados} label="Hospedados" onClick={() => setStatusFilter('hospedados')} />
          <FilterChip active={statusFilter === 'aprovados'} count={stats.aprovados} label="Aprovados" onClick={() => setStatusFilter('aprovados')} />
          <FilterChip active={statusFilter === 'liberados'} count={stats.liberados} label="Liberados" onClick={() => setStatusFilter('liberados')} />
          <FilterChip active={statusFilter === 'inativos'} label="Inativos" onClick={() => setStatusFilter('inativos')} />
        </div>
      </section>

      <section className="people-results-head">
        <div>
          <h2>{debouncedSearch ? 'Resultado da busca' : 'Cadastros recentes'}</h2>
          <span>
            {isLoading ? 'Carregando registros...' : `${listaProcessada.length} registros encontrados`}
          </span>
        </div>
      </section>

      {isLoading && listaVisivel.length === 0 && (
        <div className="people-card-list">
          {[1, 2, 3, 4].map((item) => <SkeletonCard key={item} />)}
        </div>
      )}

      {error && (
        <section className="people-empty-state error">
          <strong>Não foi possível carregar a busca.</strong>
          <p>{error}</p>
        </section>
      )}

      {!isLoading && !error && listaVisivel.length === 0 && (
        <section className="people-empty-state">
          <strong>Nenhuma pessoa encontrada</strong>
          <p>Revise o termo pesquisado ou limpe os filtros ativos.</p>
          <button className="report-button secondary" onClick={() => { setSearchTerm(''); setStatusFilter('todos'); }} type="button">
            Limpar busca
          </button>
        </section>
      )}

      <section className="people-card-list">
        {listaVisivel.map((pessoa: any) => {
          const activeStay = getActiveStay(pessoa);
          const casa = getCasaLabel(activeStay?.cama?.casa);
          const dataEntrada = formatDate(activeStay?.data_checkin);

          return (
            <article className="people-card" key={pessoa.id}>
              <button className="people-photo-button" onClick={() => navigate(`/pessoa/${pessoa.id}`)} type="button">
                <FotoPreview fotoUrl={pessoa.foto_url} size={58} altText={getNomePrincipal(pessoa)} />
              </button>

              <div className="people-card-main">
                <div className="people-card-title">
                  <button onClick={() => navigate(`/pessoa/${pessoa.id}`)} type="button">
                    {getNomePrincipal(pessoa)}
                  </button>
                  <StatusBadge pessoa={pessoa} />
                </div>

                <div className="people-card-meta">
                  <span>{maskCpf(pessoa.cpf)}</span>
                  {pessoa.nome_social && <span>Nome social informado</span>}
                  {pessoa.lgbt && <span className="identity-badge">LGBT+</span>}
                </div>

                <div className="people-card-details">
                  {casa && <span>Casa: <strong>{casa}</strong></span>}
                  {activeStay?.cama?.numero && <span>Cama: <strong>{activeStay.cama.numero}</strong></span>}
                  {dataEntrada && <span>Entrada: <strong>{dataEntrada}</strong></span>}
                  {!activeStay && <span>Sem estadia ativa no momento</span>}
                </div>
              </div>

              <div className="people-card-actions">
                <button className="report-button secondary" onClick={() => navigate(`/pessoa/${pessoa.id}`)} type="button">
                  Abrir
                </button>
                {canCheckin(pessoa) && (
                  <button className="report-button" onClick={() => setPessoaParaCheckin(pessoa)} type="button">
                    Entrada
                  </button>
                )}
                {pessoa.status_cadastro === 'ativa' && (
                  <button className="people-danger-button" onClick={() => handleCheckout(pessoa)} type="button">
                    Saída
                  </button>
                )}
              </div>
            </article>
          );
        })}
      </section>

      {!isLoading && temMais && (
        <button className="people-load-more" onClick={() => setVisibleCount((count) => count + 24)} type="button">
          Carregar mais {listaProcessada.length - visibleCount} registros
        </button>
      )}

      {pessoaParaCheckin && (
        <CheckinModal
          onCheckinSuccess={handleCheckinSuccess}
          onClose={() => setPessoaParaCheckin(null)}
          pessoa={pessoaParaCheckin}
        />
      )}

      <CadastroPessoaModal
        onClose={() => setCadastroOpen(false)}
        onSuccess={() => {
          (window as any).showToast?.('Pessoa cadastrada com sucesso.', 'success');
          setReload((current) => current + 1);
        }}
        open={cadastroOpen}
      />
    </main>
  );
};

const FilterChip = ({ label, active, onClick, count }: any) => (
  <button className={`people-filter-chip ${active ? 'active' : ''}`} onClick={onClick} type="button">
    <span>{label}</span>
    {count !== undefined && <em>{count}</em>}
  </button>
);

const StatusBadge = ({ pessoa }: { pessoa: any }) => {
  const status = getPersonStatus(pessoa);
  const className = status.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  return <span className={`people-status-badge ${className}`}>{status}</span>;
};

const SkeletonCard = () => (
  <article className="people-card people-card-skeleton">
    <div />
    <section>
      <span />
      <span />
    </section>
  </article>
);

export default SearchPage;
