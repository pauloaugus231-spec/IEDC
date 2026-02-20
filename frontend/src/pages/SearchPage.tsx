import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHospedes, useTodasPessoas, checkoutPessoa } from '../api';
import CheckinModal from '../components/CheckinModal';
import { getNomePrincipal } from '../utils';
import FotoPreview from '../components/FotoPreview';

function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

const SearchPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [statusFilter, setStatusFilter] = useState<'todos' | 'hospedados' | 'pendentes'>('todos');
  const [visibleCount, setVisibleCount] = useState(20);

  const [reload, setReload] = useState(0);
  const { data: pessoasBusca, loading: loadingBusca, error } = useHospedes(debouncedSearch);
  const { data: todasPessoas, loading: loadingTodas } = useTodasPessoas(reload);
  
  const [pessoaParaCheckin, setPessoaParaCheckin] = useState<any | null>(null);
  const navigate = useNavigate();

  useEffect(() => { setVisibleCount(20); }, [debouncedSearch, statusFilter]);
  (window as any).reloadTodasPessoas = () => setReload(r => r + 1);

  const handleCheckinSuccess = () => { setPessoaParaCheckin(null); setReload(r => r + 1); };

  const handleCheckout = async (pessoa: any) => {
    if (window.confirm(`Check-out de ${getNomePrincipal(pessoa)}?`)) {
      try {
        await checkoutPessoa(pessoa.id);
        (window as any).showToast('Check-out realizado!', 'success');
        setReload(r => r + 1);
      } catch (err: any) { (window as any).showToast(err.message, 'error'); }
    }
  };

  const listaProcessada = useMemo(() => {
    const baseList = debouncedSearch ? pessoasBusca : todasPessoas;
    if (!baseList) return [];
    return baseList
      .filter((p: any) => {
        if (statusFilter === 'todos') return true;
        if (statusFilter === 'hospedados') return p.status_cadastro === 'ativa';
        if (statusFilter === 'pendentes') return p.status_cadastro === 'aprovado' || (p.status_cadastro === 'inativo' && p.liberacao_antecipada);
        return true;
      })
      .sort((a: any, b: any) => (getNomePrincipal(a) || '').toLowerCase().localeCompare((getNomePrincipal(b) || '').toLowerCase()));
  }, [debouncedSearch, pessoasBusca, todasPessoas, statusFilter]);

  const listaVisivel = listaProcessada.slice(0, visibleCount);
  const temMais = listaProcessada.length > visibleCount;
  const isLoading = loadingBusca || loadingTodas;

  return (
    // FIX 1: Altura travada na tela (100dvh) e sem rolagem no corpo principal
    <div style={{ display: 'flex', flexDirection: 'column', height: '100dvh', overflow: 'hidden', backgroundColor: '#F9FAFB' }}>
      
      {/* HEADER FIXO */}
      <div className="search-header" style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', backgroundColor: 'white', zIndex: 10, borderBottom: '1px solid #E5E7EB' }}>
        <div style={{ position: 'relative', width: '100%', display: 'flex', alignItems: 'center', backgroundColor: '#F3F4F6', borderRadius: '12px', padding: '0 12px' }}>
            <svg width="20" height="20" fill="#9CA3AF" viewBox="0 0 24 24"><path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
            <input
              type="text"
              placeholder="Buscar hóspede..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              style={{ border: 'none', background: 'transparent', padding: '12px', width: '100%', outline: 'none', fontSize: '16px', color: '#111' }}
            />
            {searchTerm && <button onClick={() => setSearchTerm('')} style={{ border: 'none', background: 'transparent', color: '#9CA3AF', cursor: 'pointer' }}>✕</button>}
        </div>

        <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '2px', scrollbarWidth: 'none' }}>
            <FilterChip label="Todos" active={statusFilter === 'todos'} onClick={() => setStatusFilter('todos')} count={debouncedSearch ? undefined : todasPessoas?.length} />
            <FilterChip label="Hospedados" active={statusFilter === 'hospedados'} onClick={() => setStatusFilter('hospedados')} />
            <FilterChip label="Pendentes" active={statusFilter === 'pendentes'} onClick={() => setStatusFilter('pendentes')} />
        </div>
      </div>

      {/* LISTA DE PESSOAS COM SCROLL INDEPENDENTE */}
      {/* FIX 2: flex: 1 ocupa o resto da tela e overflow-y: auto permite rolar só aqui dentro */}
      <div id="person-list" style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '12px 8px', paddingBottom: '120px' }}>
        
        {isLoading && listaVisivel.length === 0 && <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>{[1, 2, 3].map(i => <SkeletonCard key={i} />)}</div>}

        {error && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#DC2626', backgroundColor: '#FEF2F2', borderRadius: '12px', margin: '12px' }}>
             <div style={{ fontSize: '40px', marginBottom: '10px' }}>❌</div>
             <p><strong>Erro ao carregar:</strong></p>
             <p style={{ fontSize: '14px' }}>{error}</p>
          </div>
        )}

        {!isLoading && !error && listaVisivel.length === 0 && (
          <div style={{ textAlign: 'center', padding: '40px 20px', color: '#6B7280' }}>
             <div style={{ fontSize: '40px', marginBottom: '10px' }}>🔍</div>
             <p>Nenhum hóspede encontrado.</p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', width: '100%', maxWidth: '100%' }}>
            {listaVisivel.map((p: any) => (
            <div className="card person-card" key={p.id} style={{ display: 'flex', alignItems: 'center', padding: '10px 12px', backgroundColor: 'white', borderRadius: '12px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', border: '1px solid #E5E7EB', width: '100%', maxWidth: '100%', boxSizing: 'border-box', overflow: 'hidden' }}>
                <div onClick={() => navigate(`/pessoa/${p.id}`)} style={{ cursor: 'pointer', marginRight: '10px', flexShrink: 0 }}>
                    <FotoPreview fotoUrl={p.foto_url} size={44} altText={getNomePrincipal(p)} />
                </div>
                <div className="person-info" style={{ flex: 1, minWidth: 0 }}>
                    <div onClick={() => navigate(`/pessoa/${p.id}`)} style={{ cursor: 'pointer', fontWeight: '600', color: '#111827', fontSize: '15px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {p.lgbt && <span title="LGBT">🏳️‍🌈 </span>}
                        {getNomePrincipal(p)}
                    </div>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px', alignItems: 'center' }}>
                        <StatusBadge status={p.status_cadastro} />
                        {p.unidade && <span style={{ fontSize: '11px', color: '#6B7280' }}>• {p.unidade}</span>}
                    </div>
                </div>
                <div className="person-actions" style={{ marginLeft: '8px', flexShrink: 0 }}>
                    {(p.status_cadastro === 'aprovado' || (p.status_cadastro === 'inativo' && p.liberacao_antecipada)) && (
                        <button onClick={() => setPessoaParaCheckin(p)} style={{ backgroundColor: '#2563EB', color: 'white', border: 'none', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>Entrada</button>
                    )}
                    {p.status_cadastro === 'ativa' && (
                        <button onClick={() => handleCheckout(p)} style={{ backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA', padding: '8px 12px', borderRadius: '8px', fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap' }}>Saída</button>
                    )}
                </div>
            </div>
            ))}
        </div>

        {/* Botão Carregar Mais seguro */}
        {!isLoading && temMais && (
            <button onClick={() => setVisibleCount(c => c + 20)} style={{ width: '100%', padding: '12px', marginTop: '16px', backgroundColor: '#E5E7EB', border: 'none', borderRadius: '8px', color: '#374151', fontWeight: '600' }}>
                Carregar mais ({listaProcessada.length - visibleCount})
            </button>
        )}
      </div>

      {pessoaParaCheckin && <CheckinModal pessoa={pessoaParaCheckin} onClose={() => setPessoaParaCheckin(null)} onCheckinSuccess={handleCheckinSuccess} />}
    </div>
  );
};

const FilterChip = ({ label, active, onClick, count }: any) => (
    <button onClick={onClick} style={{ padding: '6px 14px', borderRadius: '20px', border: active ? '1px solid #2563EB' : '1px solid #E5E7EB', backgroundColor: active ? '#EFF6FF' : 'white', color: active ? '#2563EB' : '#6B7280', fontSize: '13px', fontWeight: '500', cursor: 'pointer', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '6px' }}>
        {label} {count !== undefined && <span style={{ backgroundColor: active ? '#DBEAFE' : '#F3F4F6', padding: '2px 6px', borderRadius: '10px', fontSize: '11px' }}>{count}</span>}
    </button>
);

const StatusBadge = ({ status }: { status: string }) => {
    const styles: Record<string, any> = {
        ativa: { bg: '#D1FAE5', color: '#065F46', text: 'Hospedado' },
        aprovado: { bg: '#FEF3C7', color: '#92400E', text: 'Aprovado' },
        inativo: { bg: '#F3F4F6', color: '#6B7280', text: 'Inativo' }
    };
    const s = styles[status] || styles.inativo;
    return <span style={{ backgroundColor: s.bg, color: s.color, padding: '2px 8px', borderRadius: '10px', fontSize: '10px', fontWeight: '600' }}>{s.text}</span>;
};

const SkeletonCard = () => (
    <div style={{ display: 'flex', alignItems: 'center', padding: '12px', backgroundColor: 'white', borderRadius: '12px', border: '1px solid #E5E7EB' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '50%', backgroundColor: '#E5E7EB', marginRight: '12px' }} />
        <div style={{ flex: 1 }}>
            <div style={{ width: '60%', height: '14px', backgroundColor: '#E5E7EB', borderRadius: '4px', marginBottom: '8px' }} />
            <div style={{ width: '30%', height: '10px', backgroundColor: '#E5E7EB', borderRadius: '4px' }} />
        </div>
    </div>
);

export default SearchPage;
