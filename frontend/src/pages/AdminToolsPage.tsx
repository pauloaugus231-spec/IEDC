import { useState, useEffect, useMemo, type ReactNode } from 'react';
import { apiFetch } from '../api';
import NovoPedidoModal, { type NovoPedidoForm, type PrioridadePedido } from '../components/NovoPedidoModal';

type StatusPedido = 'Pendente' | 'Em Andamento' | 'Concluído';
type PeriodoEscala = 7 | 30 | 90 | 180;

type PedidoOperacional = {
  id: string;
  titulo: string;
  descricao: string;
  prioridade: PrioridadePedido;
  solicitante: string;
  setor: string;
  status: StatusPedido;
  created_at?: string;
};

type PlantaoEscala = {
  data?: string;
  colaborador?: {
    nome?: string;
  };
  turno?: {
    nome?: string;
  };
};

type SetorTone = {
  label: string;
  bg: string;
  color: string;
  border: string;
};

const PEDIDOS_STORAGE_KEY = 'iedc-admin-pedidos';

const emptyPedidoForm: NovoPedidoForm = {
  titulo: '',
  descricao: '',
  prioridade: 'Normal',
  solicitante: '',
  setor: 'Manutenção',
};

const normalizeText = (value: unknown) =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const normalizeStatus = (status: unknown): StatusPedido => {
  const value = normalizeText(status);
  if (value.includes('andamento')) return 'Em Andamento';
  if (value.includes('concluido') || value.includes('aprovada') || value.includes('finalizado')) return 'Concluído';
  return 'Pendente';
};

const normalizePriority = (prioridade: unknown): PrioridadePedido =>
  normalizeText(prioridade).includes('urgente') ? 'Urgente' : 'Normal';

const normalizePedido = (item: unknown): PedidoOperacional | null => {
  if (!item || typeof item !== 'object') return null;
  const record = item as Record<string, unknown>;
  const titulo = String(record.titulo ?? '').trim();
  if (!titulo) return null;

  return {
    id: String(record.id ?? `local-${crypto.randomUUID()}`),
    titulo,
    descricao: String(record.descricao ?? record.justificativa ?? record.observacoes ?? ''),
    prioridade: normalizePriority(record.prioridade),
    solicitante: String(record.solicitante ?? record.solicitado_por ?? ''),
    setor: String(record.setor ?? record.tipo ?? 'Administrativo'),
    status: normalizeStatus(record.status),
    created_at: typeof record.created_at === 'string' ? record.created_at : undefined,
  };
};

const loadStoredRequests = (): PedidoOperacional[] | null => {
  try {
    const raw = window.localStorage.getItem(PEDIDOS_STORAGE_KEY);
    if (raw === null) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.map(normalizePedido).filter((request): request is PedidoOperacional => Boolean(request));
  } catch (error) {
    console.error('Erro ao carregar pedidos locais', error);
    return null;
  }
};

const persistRequests = (requests: PedidoOperacional[]) => {
  window.localStorage.setItem(PEDIDOS_STORAGE_KEY, JSON.stringify(requests));
};

const isPlantaoEscala = (item: unknown): item is PlantaoEscala =>
  Boolean(item) && typeof item === 'object';

const AdminToolsPage = () => {
  // --- ESTADOS ---
  const [escala, setEscala] = useState<PlantaoEscala[]>([]);
  const [loadingEscala, setLoadingEscala] = useState(false);
  const [requests, setRequests] = useState<PedidoOperacional[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Filtro de período
  const [periodoSelecionado, setPeriodoSelecionado] = useState<PeriodoEscala>(7);
  
  // Estado do Formulário
  const [newRequest, setNewRequest] = useState<NovoPedidoForm>({ ...emptyPedidoForm });

  // --- CARREGAMENTO ---
  useEffect(() => {
    const loadData = async () => {
      setLoadingEscala(true);
      setLoadingRequests(true);
      try {
        const storedRequests = loadStoredRequests();
        const [escalaData, pedidosData] = await Promise.all([
          apiFetch('/api/plantoes'),
          storedRequests === null ? apiFetch('/api/pedidos') : Promise.resolve(null)
        ]);
        setEscala(Array.isArray(escalaData) ? escalaData.filter(isPlantaoEscala) : []);

        if (storedRequests !== null) {
          setRequests(storedRequests);
        } else {
          const normalizedRequests = Array.isArray(pedidosData)
            ? pedidosData.map(normalizePedido).filter((request): request is PedidoOperacional => Boolean(request))
            : [];
          setRequests(normalizedRequests);
        }
      } catch (error) { console.error(error); } 
      finally { setLoadingEscala(false); setLoadingRequests(false); }
    };
    loadData();
  }, []);

  // --- DADOS COMPUTADOS ---
  const escalaAgrupada = useMemo(() => {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const dataLimite = new Date(hoje);
    dataLimite.setDate(hoje.getDate() + periodoSelecionado);
    dataLimite.setHours(23, 59, 59, 999);

    const groups: Record<string, PlantaoEscala[]> = {};
    
    escala.forEach((item) => {
      if (!item.data) return;
      const dataString = item.data.split('T')[0];
      const [ano, mes, dia] = dataString.split('-').map(Number);
      const dataPlantao = new Date(ano, mes - 1, dia);

      if (dataPlantao >= hoje && dataPlantao <= dataLimite) {
        if (!groups[dataString]) groups[dataString] = [];
        groups[dataString].push(item);
      }
    });

    return Object.entries(groups).sort((a, b) => a[0].localeCompare(b[0]));
  }, [escala, periodoSelecionado]);

  const hojeISO = new Date().toISOString().split('T')[0];
  const urgentCount = requests.filter(r => r.prioridade === 'Urgente' && r.status !== 'Concluído').length;

  // --- AÇÕES ---
  const handleCreateRequest = () => {
    const titulo = newRequest.titulo.trim();
    if (!titulo) return;

    const created: PedidoOperacional = {
      id: `local-${crypto.randomUUID()}`,
      titulo,
      descricao: newRequest.descricao.trim(),
      prioridade: newRequest.prioridade,
      solicitante: newRequest.solicitante.trim(),
      setor: newRequest.setor,
      status: 'Pendente',
      created_at: new Date().toISOString(),
    };

    setRequests(prev => {
      const next = [created, ...prev];
      persistRequests(next);
      return next;
    });
    setShowModal(false);
    setNewRequest({ ...emptyPedidoForm });
  };

  const handleUpdateStatus = (id: string, newStatus: StatusPedido) => {
    setRequests(prev => {
      const next = prev.map(r => (r.id === id ? { ...r, status: newStatus } : r));
      persistRequests(next);
      return next;
    });
  };

  const handleDeleteRequest = (id: string) => {
    if(!confirm('Excluir este pedido?')) return;
    setRequests(prev => {
      const next = prev.filter(r => r.id !== id);
      persistRequests(next);
      return next;
    });
  };

  const getSetorTone = (setor: string): SetorTone => {
    const s = setor?.toLowerCase() || '';
    if (s.includes('manu')) return { label: 'Manutenção', bg: '#EFF6FF', color: '#1D4ED8', border: '#BFDBFE' };
    if (s.includes('hig')) return { label: 'Higiene', bg: '#F0FDFA', color: '#0F766E', border: '#99F6E4' };
    if (s.includes('limp')) return { label: 'Limpeza', bg: '#F8FAFC', color: '#475569', border: '#CBD5E1' };
    if (s.includes('alim')) return { label: 'Alimentação', bg: '#FFF7ED', color: '#C2410C', border: '#FED7AA' };
    if (s.includes('saú') || s.includes('sau')) return { label: 'Saúde', bg: '#F0FDF4', color: '#15803D', border: '#BBF7D0' };
    return { label: setor || 'Demanda', bg: '#F5F3FF', color: '#6D28D9', border: '#DDD6FE' };
  };

  return (
    // FIX 1: height: 100dvh e overflow: hidden no container pai para evitar scroll duplo
    <div style={{ backgroundColor: '#F3F4F6', height: '100dvh', width: '100%', display: 'flex', flexDirection: 'column', fontFamily: 'Inter, sans-serif', overflow: 'hidden' }}>
      
      {/* HEADER FIXO */}
      <header style={{ backgroundColor: 'white', borderBottom: '1px solid #E5E7EB', padding: '16px 24px', flexShrink: 0, zIndex: 10 }}>
        <div style={{ maxWidth: '100%', margin: '0 auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: 0 }}>Centro Operacional</h1>
            <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Gestão de demandas e equipe</p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
             <button onClick={() => setShowModal(true)} style={{ backgroundColor: '#2563EB', color: 'white', border: 'none', padding: '8px 16px', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)' }}>
              + Novo pedido
            </button>
            
            {urgentCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#FEF2F2', borderRadius: '12px', border: '1px solid #FECACA' }}>
                <span style={{ fontSize: '12px', fontWeight: '800', color: '#991B1B', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Urgentes</span>
                <span style={{ fontSize: '13px', fontWeight: '700', color: '#991B1B' }}>{urgentCount}</span>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* CONTEÚDO SCROLLÁVEL */}
      {/* FIX 2: O paddingBottom fica AQUI dentro, para o conteúdo rolar por trás do menu mas o final ficar visível */}
      <main style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: '24px', paddingBottom: '120px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
        
        {/* --- SEÇÃO 1: KANBAN --- */}
        {/* FIX 3: Ajuste de altura mínima para não estourar em telas pequenas */}
        <section style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1F2937', marginBottom: '16px' }}>Quadro de Pedidos</h2>

          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '10px', minHeight: '350px' }}>
            {loadingRequests ? (
              <div style={{ padding: '20px', width: '100%', backgroundColor: 'white', borderRadius: '12px', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                Carregando pedidos...
              </div>
            ) : (
              <>
                <KanbanColumn title="A Fazer" count={requests.filter(r => r.status === 'Pendente').length} color="#F59E0B" bgColor="#FFFBEB">
                  {requests.filter(r => r.status === 'Pendente').map(req => (
                    <RequestCard key={req.id} req={req} tone={getSetorTone(req.setor)}
                      onNext={() => handleUpdateStatus(req.id, 'Em Andamento')}
                      onDelete={() => handleDeleteRequest(req.id)}
                    />
                  ))}
                </KanbanColumn>

                <KanbanColumn title="Em Andamento" count={requests.filter(r => r.status === 'Em Andamento').length} color="#3B82F6" bgColor="#EFF6FF">
                  {requests.filter(r => r.status === 'Em Andamento').map(req => (
                    <RequestCard key={req.id} req={req} tone={getSetorTone(req.setor)}
                      onNext={() => handleUpdateStatus(req.id, 'Concluído')}
                      onPrev={() => handleUpdateStatus(req.id, 'Pendente')}
                    />
                  ))}
                </KanbanColumn>

                <KanbanColumn title="Concluído" count={requests.filter(r => r.status === 'Concluído').length} color="#10B981" bgColor="#ECFDF5">
                  {requests.filter(r => r.status === 'Concluído').map(req => (
                    <RequestCard key={req.id} req={req} tone={getSetorTone(req.setor)} isCompleted
                      onPrev={() => handleUpdateStatus(req.id, 'Em Andamento')}
                    />
                  ))}
                </KanbanColumn>
              </>
            )}
          </div>
        </section>

        {/* --- SEÇÃO 2: ESCALA --- */}
        <section style={{ display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#1F2937' }}>Escala</h2>
              <span style={{ fontSize: '13px', color: '#6B7280', paddingLeft: '12px', borderLeft: '1px solid #E5E7EB' }}>
                Próximos <strong>{periodoSelecionado} dias</strong>
              </span>
            </div>

            <div style={{ display: 'flex', backgroundColor: 'white', borderRadius: '8px', padding: '4px', border: '1px solid #E5E7EB', gap: '4px' }}>
              {[7, 30, 90, 180].map((dias) => (
                <button key={dias} onClick={() => setPeriodoSelecionado(dias as PeriodoEscala)}
                  style={{
                    border: 'none', backgroundColor: periodoSelecionado === dias ? '#EFF6FF' : 'transparent',
                    color: periodoSelecionado === dias ? '#2563EB' : '#6B7280', fontWeight: periodoSelecionado === dias ? '600' : '500',
                    padding: '4px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', transition: 'all 0.2s'
                  }}
                >
                  {dias === 7 ? '1 Sem' : dias === 30 ? '1 Mês' : dias === 90 ? '3 Meses' : '6 Meses'}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '16px', scrollBehavior: 'smooth' }}>
            {loadingEscala ? <div style={{color: '#9CA3AF', padding: '20px'}}>Carregando escala...</div> : escalaAgrupada.length === 0 ? (
              <div style={{ padding: '20px', width: '100%', backgroundColor: 'white', borderRadius: '12px', textAlign: 'center', color: '#6B7280', border: '1px dashed #E5E7EB' }}>
                Nenhuma escala encontrada.
              </div>
            ) : (
              escalaAgrupada.map(([data, plantoes]) => {
                const isToday = data === hojeISO;
                const [ano, mes, dia] = data.split('-').map(Number);
                const dateObj = new Date(ano, mes - 1, dia);

                return (
                  <div key={data} style={{ minWidth: '260px', backgroundColor: isToday ? '#EFF6FF' : 'white', borderRadius: '16px', padding: '16px', border: isToday ? '2px solid #BFDBFE' : '1px solid #E5E7EB' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '700', color: isToday ? '#1E40AF' : '#374151', marginBottom: '12px', display: 'flex', justifyContent: 'space-between' }}>
                      {dateObj.toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                      {isToday && <span style={{ fontSize: '10px', backgroundColor: '#3B82F6', color: 'white', padding: '2px 8px', borderRadius: '99px' }}>HOJE</span>}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {plantoes.map((p, idx) => (
                        <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '8px', borderRadius: '8px', backgroundColor: isToday ? 'white' : '#F9FAFB' }}>
                          <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: p.turno?.nome === 'Noite' ? '#4F46E5' : '#F59E0B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '12px' }}>{p.colaborador?.nome?.charAt(0) || '?'}</div>
                          <div>
                            <div style={{ fontSize: '13px', fontWeight: '600', color: '#1F2937' }}>{p.colaborador?.nome}</div>
                            <div style={{ fontSize: '11px', color: '#6B7280' }}>{p.turno?.nome}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>

      {/* --- MODAL --- */}
      {showModal && (
        <NovoPedidoModal
          form={newRequest}
          onChange={setNewRequest}
          onClose={() => setShowModal(false)}
          onSubmit={handleCreateRequest}
        />
      )}
    </div>
  );
};

// --- ESTILOS & COMPONENTES ---
type KanbanColumnProps = {
  title: string;
  count: number;
  color: string;
  bgColor: string;
  children: ReactNode;
};

type RequestCardProps = {
  req: PedidoOperacional;
  tone: SetorTone;
  onNext?: () => void;
  onPrev?: () => void;
  onDelete?: () => void;
  isCompleted?: boolean;
};

const KanbanColumn = ({ title, count, color, bgColor, children }: KanbanColumnProps) => (
  // FIX 4: Altura dinâmica para preencher o espaço sem forçar layout
  <div style={{ minWidth: '280px', maxWidth: '280px', backgroundColor: '#F9FAFB', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', border: '1px solid #E5E7EB', height: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: `2px solid ${color}` }}>
      <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#374151', textTransform: 'uppercase' }}>{title}</h3>
      <span style={{ backgroundColor: bgColor, color: color, padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{count}</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>{children}</div>
  </div>
);

const RequestCard = ({ req, tone, onNext, onPrev, onDelete, isCompleted }: RequestCardProps) => (
  <div style={{ backgroundColor: 'white', borderRadius: '14px', padding: '14px', boxShadow: '0 8px 22px rgba(15,23,42,0.06)', border: req.prioridade === 'Urgente' && !isCompleted ? '1px solid #FECACA' : '1px solid #E5E7EB', opacity: isCompleted ? 0.82 : 1 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '10px' }}>
      <span style={{ fontSize: '10px', fontWeight: '900', color: tone.color, backgroundColor: tone.bg, border: `1px solid ${tone.border}`, padding: '5px 8px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {tone.label}
      </span>
      {req.prioridade === 'Urgente' && !isCompleted && <span style={{ fontSize: '9px', fontWeight: '900', color: '#DC2626', backgroundColor: '#FEF2F2', padding: '4px 7px', borderRadius: '999px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Urgente</span>}
    </div>
    <h4 style={{ fontSize: '14px', lineHeight: '1.25', fontWeight: '800', color: '#111827', marginBottom: '6px' }}>{req.titulo}</h4>
    <p style={{ fontSize: '12px', lineHeight: '1.45', color: '#6B7280', marginBottom: '12px', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{req.descricao || 'Sem descrição'}</p>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F3F4F6', paddingTop: '8px' }}>
      <div style={{ fontSize: '10px', color: '#8A94A6', fontWeight: '700', maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{req.solicitante || req.setor}</div>
      <div style={{ display: 'flex', gap: '6px' }}>
        {onPrev && <button onClick={onPrev} title="Voltar" style={{ cursor: 'pointer', border: '1px solid #E5E7EB', background: '#FFFFFF', color: '#475569', borderRadius: '8px', fontSize: '11px', fontWeight: '800', padding: '5px 7px' }}>Voltar</button>}
        {onDelete && <button onClick={onDelete} title="Excluir" style={{ cursor: 'pointer', border: '1px solid #FECACA', background: '#FEF2F2', color: '#B91C1C', borderRadius: '8px', fontSize: '11px', fontWeight: '800', padding: '5px 7px' }}>Excluir</button>}
        {onNext && <button onClick={onNext} title="Avançar" style={{ cursor: 'pointer', border: '1px solid #BFDBFE', background: '#EFF6FF', color: '#1D4ED8', borderRadius: '8px', fontSize: '11px', fontWeight: '800', padding: '5px 7px' }}>Avançar</button>}
      </div>
    </div>
  </div>
);

export default AdminToolsPage;
