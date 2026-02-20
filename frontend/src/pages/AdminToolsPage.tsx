import { useState, useEffect, useMemo } from 'react';
import { apiFetch } from '../api';

type StatusPedido = 'Pendente' | 'Em Andamento' | 'Concluído';
type Prioridade = 'Normal' | 'Urgente';
type PeriodoEscala = 7 | 30 | 90 | 180;

const AdminToolsPage = () => {
  // --- ESTADOS ---
  const [escala, setEscala] = useState<any[]>([]);
  const [loadingEscala, setLoadingEscala] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [_loadingRequests, setLoadingRequests] = useState(false);
  const [showModal, setShowModal] = useState(false);
  
  // Filtro de período
  const [periodoSelecionado, setPeriodoSelecionado] = useState<PeriodoEscala>(7);
  
  // Estado do Formulário
  const [newRequest, setNewRequest] = useState({
    titulo: '',
    descricao: '',
    prioridade: 'Normal' as Prioridade,
    solicitante: '',
    setor: 'Manutenção', 
  });

  // --- CARREGAMENTO ---
  useEffect(() => {
    const loadData = async () => {
      setLoadingEscala(true);
      setLoadingRequests(true);
      try {
        const [escalaData, pedidosData] = await Promise.all([
          apiFetch('/api/plantoes'),
          apiFetch('/api/pedidos')
        ]);
        setEscala(Array.isArray(escalaData) ? escalaData : []);
        setRequests(Array.isArray(pedidosData) ? pedidosData : []);
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

    const groups: Record<string, any[]> = {};
    
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
  
  const now = new Date();
  const hour = now.getHours();
  let turnoInfo = { nome: 'Noite', icone: '🌙' };
  if (hour >= 7 && hour < 13) turnoInfo = { nome: 'Manhã', icone: '☀️' };
  else if (hour >= 13 && hour < 19) turnoInfo = { nome: 'Tarde', icone: '🌤️' };

  // --- AÇÕES ---
  const handleCreateRequest = async () => {
    if (!newRequest.titulo) return;
    try {
      const payload = { ...newRequest, status: 'Pendente' };
      const created = await apiFetch('/api/pedidos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
      });
      setRequests(prev => [...prev, created]);
      setShowModal(false);
      setNewRequest({ titulo: '', descricao: '', prioridade: 'Normal', solicitante: '', setor: 'Manutenção' });
    } catch (error) { console.error(error); }
  };

  const handleUpdateStatus = async (id: string, newStatus: StatusPedido) => {
    setRequests(prev => prev.map(r => (r.id === id ? { ...r, status: newStatus } : r)));
    apiFetch(`/api/pedidos/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: newStatus }),
    }).catch(console.error);
  };

  const handleDeleteRequest = async (id: string) => {
    if(!confirm('Excluir este pedido?')) return;
    try {
      await apiFetch(`/api/pedidos/${id}`, { method: 'DELETE' });
      setRequests(prev => prev.filter(r => r.id !== id));
    } catch (error) { console.error(error); }
  };

  const getSetorIcon = (setor: string) => {
    const s = setor?.toLowerCase() || '';
    if (s.includes('alim')) return '🍔';
    if (s.includes('manu')) return '🔧';
    if (s.includes('limp')) return '🧹';
    if (s.includes('saú')) return '💊';
    return '📦';
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
              + Novo Pedido
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#EFF6FF', borderRadius: '12px', border: '1px solid #BFDBFE' }}>
              <span style={{ fontSize: '16px' }}>{turnoInfo.icone}</span>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#1E3A8A' }}>{turnoInfo.nome}</span>
            </div>
            
            {urgentCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 12px', backgroundColor: '#FEF2F2', borderRadius: '12px', border: '1px solid #FECACA' }}>
                <span style={{ fontSize: '16px' }}>🚨</span>
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
            <KanbanColumn title="A Fazer" count={requests.filter(r => r.status === 'Pendente').length} color="#F59E0B" bgColor="#FFFBEB">
              {requests.filter(r => r.status === 'Pendente').map(req => (
                <RequestCard key={req.id} req={req} icon={getSetorIcon(req.setor)}
                  onNext={() => handleUpdateStatus(req.id, 'Em Andamento')}
                  onDelete={() => handleDeleteRequest(req.id)}
                />
              ))}
            </KanbanColumn>

            <KanbanColumn title="Em Andamento" count={requests.filter(r => r.status === 'Em Andamento').length} color="#3B82F6" bgColor="#EFF6FF">
              {requests.filter(r => r.status === 'Em Andamento').map(req => (
                <RequestCard key={req.id} req={req} icon={getSetorIcon(req.setor)}
                  onNext={() => handleUpdateStatus(req.id, 'Concluído')}
                  onPrev={() => handleUpdateStatus(req.id, 'Pendente')}
                />
              ))}
            </KanbanColumn>

            <KanbanColumn title="Concluído" count={requests.filter(r => r.status === 'Concluído').length} color="#10B981" bgColor="#ECFDF5">
              {requests.filter(r => r.status === 'Concluído').map(req => (
                <RequestCard key={req.id} req={req} icon={getSetorIcon(req.setor)} isCompleted
                  onPrev={() => handleUpdateStatus(req.id, 'Em Andamento')}
                />
              ))}
            </KanbanColumn>
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
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ backgroundColor: 'white', borderRadius: '16px', padding: '24px', width: '90%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '20px', color: '#1F2937' }}>Novo Pedido</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <input type="text" value={newRequest.titulo} onChange={e => setNewRequest({...newRequest, titulo: e.target.value})} placeholder="O que precisa ser feito?" style={inputStyle} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <select value={newRequest.setor} onChange={e => setNewRequest({...newRequest, setor: e.target.value})} style={inputStyle}>
                  <option value="Manutenção">Manutenção</option>
                  <option value="Limpeza">Limpeza</option>
                  <option value="Alimentação">Alimentação</option>
                  <option value="Saúde">Saúde</option>
                </select>
                <select value={newRequest.prioridade} onChange={e => setNewRequest({...newRequest, prioridade: e.target.value as Prioridade})} style={inputStyle}>
                  <option value="Normal">Normal</option>
                  <option value="Urgente">🔥 Urgente</option>
                </select>
              </div>
              <textarea rows={3} value={newRequest.descricao} onChange={e => setNewRequest({...newRequest, descricao: e.target.value})} placeholder="Detalhes..." style={inputStyle} />
              <input type="text" value={newRequest.solicitante} onChange={e => setNewRequest({...newRequest, solicitante: e.target.value})} placeholder="Seu Nome" style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
              <button onClick={() => setShowModal(false)} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: '1px solid #D1D5DB', backgroundColor: 'white', cursor: 'pointer' }}>Cancelar</button>
              <button onClick={handleCreateRequest} style={{ flex: 1, padding: '12px', borderRadius: '8px', border: 'none', backgroundColor: '#2563EB', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Criar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// --- ESTILOS & COMPONENTES ---
const inputStyle = { width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid #D1D5DB', boxSizing: 'border-box' as const };

const KanbanColumn = ({ title, count, color, bgColor, children }: any) => (
  // FIX 4: Altura dinâmica para preencher o espaço sem forçar layout
  <div style={{ minWidth: '280px', maxWidth: '280px', backgroundColor: '#F9FAFB', borderRadius: '16px', padding: '16px', display: 'flex', flexDirection: 'column', border: '1px solid #E5E7EB', height: '100%' }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', paddingBottom: '8px', borderBottom: `2px solid ${color}` }}>
      <h3 style={{ fontSize: '13px', fontWeight: '800', color: '#374151', textTransform: 'uppercase' }}>{title}</h3>
      <span style={{ backgroundColor: bgColor, color: color, padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' }}>{count}</span>
    </div>
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', overflowY: 'auto', flex: 1 }}>{children}</div>
  </div>
);

const RequestCard = ({ req, icon, onNext, onPrev, onDelete, isCompleted }: any) => (
  <div style={{ backgroundColor: 'white', borderRadius: '12px', padding: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)', border: req.prioridade === 'Urgente' && !isCompleted ? '1px solid #FECACA' : '1px solid #E5E7EB', opacity: isCompleted ? 0.8 : 1 }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
      <span style={{ fontSize: '16px', backgroundColor: '#F3F4F6', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{icon}</span>
      {req.prioridade === 'Urgente' && !isCompleted && <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#DC2626', backgroundColor: '#FEF2F2', padding: '2px 6px', borderRadius: '4px' }}>URGENTE</span>}
    </div>
    <h4 style={{ fontSize: '13px', fontWeight: '600', color: '#111827', marginBottom: '4px' }}>{req.titulo}</h4>
    <p style={{ fontSize: '11px', color: '#6B7280', marginBottom: '10px', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{req.descricao || 'Sem descrição'}</p>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #F3F4F6', paddingTop: '8px' }}>
      <div style={{ fontSize: '10px', color: '#9CA3AF' }}>{req.solicitante || req.setor}</div>
      <div style={{ display: 'flex', gap: '8px' }}>
        {onPrev && <button onClick={onPrev} title="Voltar" style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: '14px' }}>⬅️</button>}
        {onDelete && <button onClick={onDelete} title="Excluir" style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: '14px', color: '#EF4444' }}>🗑️</button>}
        {onNext && <button onClick={onNext} title="Avançar" style={{ cursor: 'pointer', border: 'none', background: 'none', fontSize: '14px', color: '#3B82F6' }}>➡️</button>}
      </div>
    </div>
  </div>
);

export default AdminToolsPage;
