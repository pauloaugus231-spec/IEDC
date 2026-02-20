import { useState, useEffect } from 'react';
import { apiFetch } from '../api';

// --- TIPOS DE DADOS ---
type Colaborador = {
  id: string;
  nome: string;
  cpf: string;
  telefone: string;
  funcao: string;
  unidade: 'Masculina' | 'Mista' | 'Geral'; 
  modelo_escala: '12x36' | 'Semanal'; 
  equipe_12x36?: 'A' | 'B'; 
  turno_12x36?: 'Dia (07-19)' | 'Noite (19-07)';
  dias_semanais?: number[]; 
  horario_semanal?: string; 
  revezamento_fds?: 'NaoTrabalha' | 'TodoSabado' | 'TodoDomingo' | 'Alternado_A' | 'Alternado_B';
  ativo: boolean;
};

type Plantao = {
  id: string;
  data: string; // YYYY-MM-DD
  resumo_turno: string; 
  colaborador_id: string | null;
  colaborador_nome?: string;
  unidade: string;
};

const ScaleManagerPage = () => {
  // --- ESTADOS ---
  const [colaboradores, setColaboradores] = useState<Colaborador[]>([]);
  const [plantoes, setPlantoes] = useState<Plantao[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Interface
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'colaboradores' | 'calendario'>('colaboradores');
  const [editingColaborador, setEditingColaborador] = useState<Colaborador | null>(null);

  // Filtros
  const [filtroUnidade, setFiltroUnidade] = useState<'Todas' | 'Masculina' | 'Mista' | 'Geral'>('Todas');
  
  // Inicializa com o mês atual (YYYY-MM)
  const [filtroMes, setFiltroMes] = useState(new Date().toISOString().slice(0, 7));

  // Formulário Inicial
  const initialForm: any = {
    nome: '', cpf: '', telefone: '', funcao: '', unidade: 'Masculina',
    modelo_escala: '12x36', equipe_12x36: 'A', turno_12x36: 'Dia (07-19)',
    dias_semanais: [1,2,3,4,5], horario_semanal: '08:00 - 17:00', revezamento_fds: 'NaoTrabalha',
    ativo: true
  };
  const [form, setForm] = useState(initialForm);

  // --- EFEITOS ---
  useEffect(() => { loadColaboradores(); }, []);
  useEffect(() => { if (activeTab === 'calendario') loadPlantoes(); }, [activeTab, filtroMes]);

  // --- API CALLS ---
  const loadColaboradores = async () => {
    try {
        const data = await apiFetch('/api/colaboradores');
        setColaboradores(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); }
  };

  const loadPlantoes = async () => {
    setLoading(true);
    try {
        const data = await apiFetch(`/api/plantoes?mes=${filtroMes}`);
        setPlantoes(Array.isArray(data) ? data : []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSave = async () => {
    try {
        const url = editingColaborador ? `/api/colaboradores/${editingColaborador.id}` : '/api/colaboradores';
        const method = editingColaborador ? 'PATCH' : 'POST';
        await apiFetch(url, { method, headers: {'Content-Type': 'application/json'}, body: JSON.stringify(form) });
        loadColaboradores(); setShowModal(false);
    } catch (e) { alert('Erro ao salvar dados.'); }
  };

  const handleGerarEscala = async () => {
    if(!confirm(`Deseja gerar a escala automática para ${formatarMesExtenso(filtroMes)}?`)) return;
    setLoading(true);
    try {
        await apiFetch('/api/gerar-escala-automatica', { 
            method: 'POST', 
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ mes_ano: filtroMes }) 
        });
        await loadPlantoes();
        alert('Escala gerada com sucesso!');
    } catch (e) { alert('Erro ao gerar escala.'); } finally { setLoading(false); }
  };

  const handleDelete = async (id: string) => { if(confirm('Excluir este colaborador?')) { await apiFetch(`/api/colaboradores/${id}`, {method:'DELETE'}); loadColaboradores(); }};

  const handleEdit = (col: Colaborador) => {
    setEditingColaborador(col);
    setForm({ ...col, dias_semanais: col.dias_semanais || [1,2,3,4,5] });
    setShowModal(true);
  };

  // --- HELPERS DE DATA ---
  const diasSemana = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  const toggleDia = (diaIndex: number) => {
    const atuais = form.dias_semanais || [];
    if (atuais.includes(diaIndex)) setForm({...form, dias_semanais: atuais.filter((d:number) => d !== diaIndex)});
    else setForm({...form, dias_semanais: [...atuais, diaIndex]});
  };

  // Nova função para mudar o mês (Anterior/Próximo)
  const mudarMes = (direcao: number) => {
    const [ano, mes] = filtroMes.split('-').map(Number);
    const novaData = new Date(ano, mes - 1 + direcao, 1);
    const novoAno = novaData.getFullYear();
    const novoMes = String(novaData.getMonth() + 1).padStart(2, '0');
    setFiltroMes(`${novoAno}-${novoMes}`);
  };

  // Formata "2025-12" para "DEZEMBRO 2025"
  const formatarMesExtenso = (isoMes: string) => {
    const [ano, mes] = isoMes.split('-');
    const date = new Date(Number(ano), Number(mes) - 1, 1);
    return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
  };

  return (
    <div style={{ backgroundColor: '#f3f4f6', minHeight: '100vh', padding: '24px', fontFamily: "'Segoe UI', sans-serif" }}>
      
      {/* CABEÇALHO E FILTROS DE UNIDADE */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
        <div>
            <h1 style={{ fontSize: '26px', fontWeight: 'bold', color: '#1f2937', margin: 0 }}>Gestão de Escala</h1>
            <p style={{ color: '#6b7280', margin: 0 }}>Albergue Dias da Cruz</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', backgroundColor: 'white', padding: '4px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
            {['Todas', 'Masculina', 'Mista', 'Geral'].map(u => (
                <button 
                    key={u} 
                    onClick={() => setFiltroUnidade(u as any)}
                    style={{ 
                        padding: '6px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', fontWeight: '600',
                        backgroundColor: filtroUnidade === u ? '#2563eb' : 'transparent',
                        color: filtroUnidade === u ? 'white' : '#4b5563',
                        transition: 'all 0.2s'
                    }}
                >
                    {u}
                </button>
            ))}
        </div>
      </div>

      {/* NAVEGAÇÃO DE ABAS */}
      <div style={{ display: 'flex', gap: '24px', marginBottom: '24px', borderBottom: '1px solid #e5e7eb' }}>
        <button onClick={() => setActiveTab('colaboradores')} style={{ padding: '12px 4px', borderBottom: activeTab === 'colaboradores' ? '2px solid #2563eb' : '2px solid transparent', color: activeTab === 'colaboradores' ? '#2563eb' : '#6b7280', fontWeight: '600', fontSize: '15px', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
             👥 Colaboradores
        </button>
        <button onClick={() => setActiveTab('calendario')} style={{ padding: '12px 4px', borderBottom: activeTab === 'calendario' ? '2px solid #2563eb' : '2px solid transparent', color: activeTab === 'calendario' ? '#2563eb' : '#6b7280', fontWeight: '600', fontSize: '15px', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
             📅 Calendário
        </button>
      </div>

      {/* --- ABA COLABORADORES --- */}
      {activeTab === 'colaboradores' && (
        <div style={cardStyle}>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
                <button onClick={() => { setEditingColaborador(null); setForm(initialForm); setShowModal(true); }} style={btnPrimary}>+ Novo Colaborador</button>
            </div>
            
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ textAlign: 'left', color: '#6b7280', fontSize: '12px', textTransform: 'uppercase', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '12px' }}>Nome / Função</th>
                        <th style={{ padding: '12px' }}>Unidade</th>
                        <th style={{ padding: '12px' }}>Configuração de Escala</th>
                        <th style={{ padding: '12px' }}>Ações</th>
                    </tr>
                </thead>
                <tbody>
                    {colaboradores.filter(c => filtroUnidade === 'Todas' || c.unidade === filtroUnidade || c.unidade === 'Geral').map(c => (
                        <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                            <td style={{ padding: '12px' }}>
                                <div style={{ fontWeight: '600', color: '#1f2937' }}>{c.nome}</div>
                                <div style={{ fontSize: '12px', color: '#6b7280' }}>{c.funcao}</div>
                            </td>
                            <td style={{ padding: '12px' }}>
                                <span style={{ 
                                    padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                                    backgroundColor: c.unidade === 'Masculina' ? '#dbeafe' : c.unidade === 'Mista' ? '#fce7f3' : '#f3f4f6',
                                    color: c.unidade === 'Masculina' ? '#1e40af' : c.unidade === 'Mista' ? '#9d174d' : '#374151'
                                }}>{c.unidade}</span>
                            </td>
                            <td style={{ padding: '12px', fontSize: '13px' }}>
                                {c.modelo_escala === '12x36' ? (
                                    <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
                                        <span style={{ fontWeight: 'bold', color: '#059669', backgroundColor:'#dcfce7', padding:'2px 6px', borderRadius:'4px', fontSize:'11px' }}>12x36</span>
                                        <span>Eq. {c.equipe_12x36} • {c.turno_12x36?.split(' ')[0]}</span>
                                    </div>
                                ) : (
                                    <div>
                                        <div style={{display:'flex', gap:'8px', alignItems:'center', marginBottom:'2px'}}>
                                            <span style={{ fontWeight: 'bold', color: '#d97706', backgroundColor:'#fef3c7', padding:'2px 6px', borderRadius:'4px', fontSize:'11px' }}>Semanal</span>
                                            <span>{c.horario_semanal}</span>
                                        </div>
                                        <div style={{ fontSize: '11px', color: '#666' }}>
                                            {c.revezamento_fds !== 'NaoTrabalha' ? `FDS: ${c.revezamento_fds}` : 'Sem FDS'}
                                        </div>
                                    </div>
                                )}
                            </td>
                            <td style={{ padding: '12px' }}>
                                <button onClick={() => handleEdit(c)} style={btnLink}>Editar</button>
                                <button onClick={() => handleDelete(c.id)} style={{...btnLink, color: '#ef4444'}}>Excluir</button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      )}

      {/* --- ABA CALENDÁRIO --- */}
      {activeTab === 'calendario' && (
        <div style={cardStyle}>
            
            {/* BARRA DE FERRAMENTAS DO CALENDÁRIO */}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '24px', alignItems: 'center' }}>
                
                {/* NAVEGAÇÃO DE MÊS COM SETAS (SOLICITADO) */}
                <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1f2937', borderRadius: '8px', padding: '4px', color:'white' }}>
                    <button onClick={() => mudarMes(-1)} style={{ ...btnNav, color: 'white' }}>◀</button>
                    <span style={{ padding: '0 20px', fontWeight: '600', minWidth: '140px', textAlign: 'center', fontSize: '14px' }}>
                        {formatarMesExtenso(filtroMes)}
                    </span>
                    <button onClick={() => mudarMes(1)} style={{ ...btnNav, color: 'white' }}>▶</button>
                </div>

                <div style={{display:'flex', gap:'16px', alignItems:'center'}}>
                    <div style={{fontSize:'13px', color:'#666'}}>
                        Visualizando: <b>{filtroUnidade}</b>
                    </div>
                    <button onClick={handleGerarEscala} style={{ ...btnPrimary, backgroundColor: '#10b981', display:'flex', alignItems:'center', gap:'6px' }}>
                        ⚡ Gerar Automático
                    </button>
                </div>
            </div>

            {loading ? <div style={{padding:'60px', textAlign:'center', color: '#6b7280'}}>Carregando escala...</div> : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', backgroundColor: '#e5e7eb', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden', gap: '1px' }}>
                    
                    {/* Cabeçalho dias da semana */}
                    {diasSemana.map(d => (
                        <div key={d} style={{ padding: '12px', textAlign: 'center', backgroundColor: 'white', fontSize: '12px', fontWeight: 'bold', color:'#374151', borderBottom:'1px solid #e5e7eb' }}>
                            {d}
                        </div>
                    ))}
                    
                    {(() => {
                        const year = parseInt(filtroMes.split('-')[0]);
                        const month = parseInt(filtroMes.split('-')[1]) - 1;
                        const daysInMonth = new Date(year, month + 1, 0).getDate();
                        const startDay = new Date(year, month, 1).getDay();
                        
                        const slots = [];
                        // Dias vazios antes do dia 1
                        for(let i=0; i<startDay; i++) slots.push(<div key={`e-${i}`} style={{ backgroundColor: '#f9fafb', minHeight: '120px' }} />);
                        
                        // Dias do mês
                        for(let d=1; d<=daysInMonth; d++) {
                            const dateStr = `${filtroMes}-${String(d).padStart(2, '0')}`;
                            
                            const plantoesDia = plantoes.filter(p => {
                                if (p.data !== dateStr) return false;
                                if (filtroUnidade === 'Todas') return true;
                                if (p.unidade === 'Geral') return true; 
                                return p.unidade === filtroUnidade;
                            });

                            slots.push(
                                <div key={d} style={{ backgroundColor: 'white', minHeight: '120px', padding: '8px', display:'flex', flexDirection:'column' }}>
                                    <div style={{ fontWeight: 'bold', marginBottom: '6px', fontSize: '14px', color: '#374151' }}>{d}</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex:1 }}>
                                        {plantoesDia.map(p => (
                                            <div key={p.id} style={{ 
                                                fontSize: '11px', padding: '3px 6px', borderRadius: '4px',
                                                backgroundColor: p.resumo_turno.toLowerCase().includes('noite') ? '#eef2ff' : '#fefce8',
                                                color: p.resumo_turno.toLowerCase().includes('noite') ? '#3730a3' : '#854d0e',
                                                border: `1px solid ${p.resumo_turno.toLowerCase().includes('noite') ? '#c7d2fe' : '#fef08a'}`,
                                                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                            }}>
                                                <span style={{fontWeight:'700', marginRight:'4px'}}>{p.unidade.substring(0,1)}:</span> 
                                                {p.colaborador_nome || 'Colaborador'}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        }
                        return slots;
                    })()}
                </div>
            )}
        </div>
      )}

      {/* --- SUPER MODAL DE CADASTRO --- */}
      {showModal && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 100 }}>
            <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '12px', width: '500px', maxWidth: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
                <h3 style={{ marginTop: 0, marginBottom: '20px', fontSize:'20px', color:'#111827' }}>{editingColaborador ? 'Editar' : 'Novo'} Colaborador</h3>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    
                    <input style={inputStyle} placeholder="Nome Completo" value={form.nome} onChange={e => setForm({...form, nome: e.target.value})} />
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <input style={inputStyle} placeholder="CPF" value={form.cpf} onChange={e => setForm({...form, cpf: e.target.value})} />
                        <input style={inputStyle} placeholder="Função" value={form.funcao} onChange={e => setForm({...form, funcao: e.target.value})} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <input style={inputStyle} placeholder="Telefone" value={form.telefone} onChange={e => setForm({...form, telefone: e.target.value})} />
                        
                        <div>
                            <select style={inputStyle} value={form.unidade} onChange={e => setForm({...form, unidade: e.target.value})}>
                                <option value="Masculina">Casa Masculina</option>
                                <option value="Mista">Casa Mista</option>
                                <option value="Geral">Geral / Portaria</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid #e5e7eb', margin: '4px 0' }} />
                    
                    <div style={{backgroundColor:'#f9fafb', padding:'16px', borderRadius:'8px', border:'1px solid #e5e7eb'}}>
                        <label style={{ fontSize: '13px', fontWeight: 'bold', color:'#374151', marginBottom:'8px', display:'block' }}>Modelo de Escala</label>
                        <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor:'pointer' }}>
                                <input type="radio" name="modelo" checked={form.modelo_escala === '12x36'} onChange={() => setForm({...form, modelo_escala: '12x36'})} />
                                Plantão 12x36
                            </label>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor:'pointer' }}>
                                <input type="radio" name="modelo" checked={form.modelo_escala === 'Semanal'} onChange={() => setForm({...form, modelo_escala: 'Semanal'})} />
                                Semanal / Volante
                            </label>
                        </div>

                        {/* OPÇÕES 12x36 */}
                        {form.modelo_escala === '12x36' && (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', animation:'fadeIn 0.2s' }}>
                                <div>
                                    <label style={labelSmall}>Equipe</label>
                                    <select style={inputStyle} value={form.equipe_12x36} onChange={e => setForm({...form, equipe_12x36: e.target.value})}>
                                        <option value="A">Equipe A</option>
                                        <option value="B">Equipe B</option>
                                    </select>
                                </div>
                                <div>
                                    <label style={labelSmall}>Turno</label>
                                    <select style={inputStyle} value={form.turno_12x36} onChange={e => setForm({...form, turno_12x36: e.target.value})}>
                                        <option value="Dia (07-19)">Dia (07-19)</option>
                                        <option value="Noite (19-07)">Noite (19-07)</option>
                                    </select>
                                </div>
                            </div>
                        )}

                        {/* OPÇÕES SEMANAL */}
                        {form.modelo_escala === 'Semanal' && (
                            <div style={{ animation:'fadeIn 0.2s' }}>
                                <label style={labelSmall}>Dias Fixos</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '12px' }}>
                                    {diasSemana.map((d, i) => i > 0 && i < 6 && ( 
                                        <label key={d} style={{ fontSize: '12px', display: 'flex', alignItems: 'center', gap: '4px', cursor:'pointer' }}>
                                            <input type="checkbox" checked={form.dias_semanais.includes(i)} onChange={() => toggleDia(i)} /> {d}
                                        </label>
                                    ))}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                    <div>
                                        <label style={labelSmall}>Horário</label>
                                        <input style={inputStyle} placeholder="08:00 - 17:00" value={form.horario_semanal} onChange={e => setForm({...form, horario_semanal: e.target.value})} />
                                    </div>
                                    <div>
                                        <label style={labelSmall}>Fim de Semana</label>
                                        <select style={inputStyle} value={form.revezamento_fds} onChange={e => setForm({...form, revezamento_fds: e.target.value})}>
                                            <option value="NaoTrabalha">Não trabalha</option>
                                            <option value="TodoSabado">Todo Sábado</option>
                                            <option value="TodoDomingo">Todo Domingo</option>
                                            <option value="Alternado_A">Sáb (Sem. Ímpar)</option>
                                            <option value="Alternado_B">Sáb (Sem. Par)</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div style={{ display: 'flex', gap: '10px', marginTop: '8px' }}>
                        <button onClick={handleSave} style={{ ...btnPrimary, flex: 1 }}>Salvar Cadastro</button>
                        <button onClick={() => setShowModal(false)} style={{ ...btnSecondary, flex: 1 }}>Cancelar</button>
                    </div>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};

// ESTILOS
const cardStyle = { backgroundColor: 'white', borderRadius: '12px', padding: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', border: '1px solid #e5e7eb', marginBottom: '24px' };
const inputStyle = { width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize:'14px', boxSizing: 'border-box' as const };
const labelSmall = { fontSize: '11px', fontWeight: 'bold', color: '#4b5563', marginBottom: '4px', display: 'block' };
const btnPrimary = { backgroundColor: '#2563eb', color: 'white', padding: '10px 16px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '14px' };
const btnSecondary = { backgroundColor: 'white', color: '#374151', padding: '10px 16px', borderRadius: '6px', border: '1px solid #d1d5db', cursor: 'pointer', fontWeight: '600', fontSize: '14px' };
const btnNav = { background: 'none', border: 'none', color: '#374151', cursor: 'pointer', fontSize: '16px', padding: '0 8px' };
const btnLink = { background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: '13px', fontWeight: '600', marginRight: '12px', padding: 0 };

export default ScaleManagerPage;
