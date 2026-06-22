import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  checkoutPessoa,
  type PessoaApi,
  type PessoaEstadiaResumo,
  usePessoasPaginadas,
  useResumoPessoas,
} from '../api';
import CadastroPessoaModal from '../components/CadastroPessoaModal';
import CheckinModal from '../components/CheckinModal';
import { MetricCard, MetricGrid, PageHeader } from '../components/DesignSystem';
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

function getActiveStay(pessoa: PessoaApi): PessoaEstadiaResumo | null {
  return Array.isArray(pessoa.estadias) ? pessoa.estadias[0] : null;
}

function getPersonStatus(pessoa: PessoaApi) {
  if (pessoa.status_cadastro === 'ativa') return 'Hospedado';
  if (pessoa.liberacao_antecipada) return 'Liberado';
  if (pessoa.status_cadastro === 'aprovado') return 'Aprovado';
  return 'Inativo';
}

function canCheckin(pessoa: PessoaApi) {
  return pessoa.status_cadastro === 'aprovado' || (pessoa.status_cadastro === 'inativo' && pessoa.liberacao_antecipada);
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Erro inesperado.';
}

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 350);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [reload, setReload] = useState(0);
  const [pessoaParaCheckin, setPessoaParaCheckin] = useState<PessoaApi | null>(null);
  const [cadastroOpen, setCadastroOpen] = useState(false);
  const navigate = useNavigate();
  const statusQuery = statusFilter === 'hospedados'
    ? 'ativa'
    : statusFilter === 'aprovados'
      ? 'aprovado'
      : statusFilter === 'inativos'
        ? 'inativo'
        : undefined;
  const onlyLiberados = statusFilter === 'liberados';

  const {
    data: pessoas,
    total: totalPessoas,
    page,
    totalPages,
    hasNextPage,
    hasPreviousPage,
    loading,
    error,
    goToPage,
    nextPage,
    previousPage,
  } = usePessoasPaginadas({
    search: debouncedSearch,
    status: statusQuery,
    onlyLiberados,
    reload,
    limit: 24,
  });
  const { data: resumoPessoas } = useResumoPessoas(reload);

  window.reloadTodasPessoas = () => setReload((current) => current + 1);

  const stats = useMemo(() => {
    const total = resumoPessoas?.total ?? totalPessoas;
    const hospedados = resumoPessoas?.hospedados ?? 0;
    const aprovados = resumoPessoas?.aprovados ?? 0;
    const liberados = resumoPessoas?.liberados ?? 0;

    return { total, hospedados, aprovados, liberados };
  }, [resumoPessoas, totalPessoas]);

  const handleCheckinSuccess = () => {
    setPessoaParaCheckin(null);
    setReload((current) => current + 1);
  };

  const handleCheckout = async (pessoa: PessoaApi) => {
    if (!window.confirm(`Realizar saída de ${getNomePrincipal(pessoa)}?`)) return;

    try {
      await checkoutPessoa(pessoa.id);
      window.showToast?.('Saída registrada com sucesso.', 'success');
      setReload((current) => current + 1);
    } catch (err: unknown) {
      window.showToast?.(getErrorMessage(err), 'error');
    }
  };

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    goToPage(1);
  };

  const handleStatusChange = (nextStatus: StatusFilter) => {
    setStatusFilter(nextStatus);
    goToPage(1);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
    setStatusFilter('todos');
    goToPage(1);
  };

  const listaProcessada = pessoas;
  const isLoading = loading;
  const paginaAtual = totalPages > 0 ? page : 1;
  const totalPaginas = totalPages > 0 ? totalPages : 1;

  return (
    <main className="page-band people-search-page">
      <PageHeader
        className="people-search-head"
        eyebrow="Albergue Noturno"
        title="Buscar pessoas"
        description="Localize cadastros, veja status de estadia e execute entrada ou saída com clareza."
        actions={(
          <>
          <button className="report-button secondary" onClick={() => setReload((current) => current + 1)} type="button">
            Atualizar
          </button>
          <button className="report-button" onClick={() => setCadastroOpen(true)} type="button">
            Novo cadastro
          </button>
          </>
        )}
      />

      <MetricGrid className="people-search-kpis">
        <MetricCard label="Total cadastrados" value={stats.total} detail="Base ativa do albergue" />
        <MetricCard label="Hospedados agora" value={stats.hospedados} detail="Com estadia ativa" tone="success" />
        <MetricCard label="Aprovados" value={stats.aprovados} detail="Disponíveis para entrada" />
        <MetricCard label="Liberados" value={stats.liberados} detail="Com liberação antecipada" tone="warning" />
      </MetricGrid>

      <section className="people-search-panel">
        <div className="people-search-box">
          <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
            <path d="M21 21l-5.2-5.2m1.2-5.3a6.5 6.5 0 11-13 0 6.5 6.5 0 0113 0z" stroke="currentColor" strokeLinecap="round" strokeWidth="2" />
          </svg>
          <input
            autoComplete="off"
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder="Buscar por nome, nome social, CPF ou NIS"
            type="text"
            value={searchTerm}
          />
          {searchTerm && (
            <button onClick={handleClearSearch} type="button">
              Limpar
            </button>
          )}
        </div>

        <div className="people-filter-row" aria-label="Filtros de status">
          <FilterChip active={statusFilter === 'todos'} count={stats.total} label="Todos" onClick={() => handleStatusChange('todos')} />
          <FilterChip active={statusFilter === 'hospedados'} count={stats.hospedados} label="Hospedados" onClick={() => handleStatusChange('hospedados')} />
          <FilterChip active={statusFilter === 'aprovados'} count={stats.aprovados} label="Aprovados" onClick={() => handleStatusChange('aprovados')} />
          <FilterChip active={statusFilter === 'liberados'} count={stats.liberados} label="Liberados" onClick={() => handleStatusChange('liberados')} />
          <FilterChip active={statusFilter === 'inativos'} label="Inativos" onClick={() => handleStatusChange('inativos')} />
        </div>
      </section>

      <section className="people-results-head">
        <div>
          <h2>{debouncedSearch ? 'Resultado da busca' : 'Cadastros recentes'}</h2>
          <span>
            {isLoading && listaProcessada.length === 0 ? 'Carregando registros...' : `${totalPessoas} registros encontrados`}
          </span>
        </div>
      </section>

      {isLoading && listaProcessada.length === 0 && (
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

      {!isLoading && !error && listaProcessada.length === 0 && (
        <section className="people-empty-state">
          <strong>Nenhuma pessoa encontrada</strong>
          <p>Revise o termo pesquisado ou limpe os filtros ativos.</p>
          <button className="report-button secondary" onClick={handleClearSearch} type="button">
            Limpar busca
          </button>
        </section>
      )}

      <section className="people-card-list">
        {listaProcessada.map((pessoa) => {
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

      {!isLoading && totalPessoas > 0 && (
        <section className="people-pagination" aria-label="Paginação da lista de pessoas">
          <div className="people-pagination-info">
            <strong>Página {paginaAtual} de {totalPaginas}</strong>
            <span>{totalPessoas} registros encontrados</span>
          </div>
          <div className="people-pagination-actions">
            <button className="report-button secondary" onClick={previousPage} type="button" disabled={!hasPreviousPage}>
              Anterior
            </button>
            <button className="report-button" onClick={nextPage} type="button" disabled={!hasNextPage}>
              Próxima
            </button>
          </div>
        </section>
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
          window.showToast?.('Pessoa cadastrada com sucesso.', 'success');
          setReload((current) => current + 1);
        }}
        open={cadastroOpen}
      />
    </main>
  );
};

interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  count?: number;
}

const FilterChip = ({ label, active, onClick, count }: FilterChipProps) => (
  <button className={`people-filter-chip ${active ? 'active' : ''}`} onClick={onClick} type="button">
    <span>{label}</span>
    {count !== undefined && <em>{count}</em>}
  </button>
);

const StatusBadge = ({ pessoa }: { pessoa: PessoaApi }) => {
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
