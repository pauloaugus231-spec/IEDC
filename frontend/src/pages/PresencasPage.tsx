import React, { useEffect, useState, useMemo, useCallback, useRef, type CSSProperties } from "react";
import { apiFetch } from "../api";
import { MetricCard, MetricGrid, ModalFrame, PageHeader } from "../components/DesignSystem";
import {
  clearTriagemCensoStorage,
  getOperationalPlantaoKey,
  getOperationalPlantaoKeyFromValue,
  getTriagemCensoStorageState,
  getNomePrincipal,
} from "../utils";
import CheckoutModal from "../components/CheckoutModal";
import CheckinModal from "../components/CheckinModal";
import CadastroPessoaModal from "../components/CadastroPessoaModal";
import TrocaModal from "../components/TrocaModal";
import { QUARTO_PARA_CASA, type QuartoLabel } from "../utils/casaUtils";

type Quarto = QuartoLabel;

interface Acolhido {
  id: string;           // pessoa_id
  nome: string;
  nome_social?: string | null;
  quarto: Quarto;
  cama: string | number;
  casa: string;         // chave backend
  estadia_id: string;
  presente: boolean;
  idoso?: boolean;
  lgbt?: boolean;
  data_entrada: string;
}

interface AcolhidoParaModal {
  id: string;
  nome: string;
  nome_social?: string | null;
  estadia_id: string;
  cama_numero: number | string;
  casa: string;
  data_checkin?: string;
}

interface TriagemStatusResponse {
  data_ref: string;
  encerrada: boolean;
  fechamento?: {
    total_presentes: number;
    total_ausentes: number;
    por_quarto: Record<string, number>;
    fechada_em: string;
  } | null;
}

const QUARTOS: Quarto[] = ["Masculino", "Feminino", "Idosos", "LGBT+"];

function showOperationalReceipt(message: string, type: "success" | "info" = "success") {
  window.showToast?.(message, type);
}

const PresencasPage: React.FC = () => {
  const [acolhidos, setAcolhidos] = useState<Acolhido[]>([]);
  const [filterRoom, setFilterRoom] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [showOnlyPendentes, setShowOnlyPendentes] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [lastUpdate, setLastUpdate] = useState<string>("--:--");
  const [triagemEncerrada, setTriagemEncerrada] = useState<boolean>(false);


  // Iniciar / Encerrar
  const [triagemAberta, setTriagemAberta] = useState<boolean>(false);
  const [isOpening, setIsOpening] = useState<boolean>(false);

  // Nova entrada (busca de pessoa existente)
  const [searchNova, setSearchNova] = useState<string>('');
  const [searchNovaResults, setSearchNovaResults] = useState<any[] | null>(null);
  const [searchingNova, setSearchingNova] = useState<boolean>(false);
  const [pessoaParaCheckin, setPessoaParaCheckin] = useState<any | null>(null);
  const [openNovoCadastro, setOpenNovoCadastro] = useState<boolean>(false);
  const searchNovaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchTriagemStatus = async (plantaoAtual = getOperationalPlantaoKey()) => {
    try {
      const status = await apiFetch<TriagemStatusResponse & { aberta?: boolean }>(`/api/triagem/status?data_ref=${plantaoAtual}`);
      setTriagemAberta(Boolean(status.aberta));
      if (status.encerrada) {
        setTriagemEncerrada(true);
        setTriagemAberta(false);
      } else {
        setTriagemEncerrada(false);
      }
    } catch (error) {
      console.error('Erro ao consultar status da triagem:', error);
    }
  };

  // Estados para Trocar e Checkout na linha de presença
  const [trocaAtivo, setTrocaAtivo] = useState<AcolhidoParaModal | null>(null);
  const [checkoutAtivo, setCheckoutAtivo] = useState<AcolhidoParaModal | null>(null);

  // Verificar se triagem já foi encerrada hoje E monitorar mudança de dia
  useEffect(() => {
    const checkTriagemStatus = () => {
      const plantaoAtual = getOperationalPlantaoKey();
      const storageState = getTriagemCensoStorageState();

      if (storageState.shouldClear) {
        clearTriagemCensoStorage();
        setTriagemEncerrada(false);
        setTriagemAberta(false);
        fetchAcolhidos();
      }

      fetchTriagemStatus(plantaoAtual);
    };

    checkTriagemStatus();
    fetchAcolhidos();

    const interval = setInterval(checkTriagemStatus, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchAcolhidos = async () => {
    setIsLoading(true);
    try {
      const pessoas: any[] = await apiFetch("/api/pessoas/ativos");
      
      const acolhidosData: Acolhido[] = pessoas.map((pessoa: any) => {
        const estadiaAtiva = pessoa.estadias?.find((e: any) => e.status === 'ativa');
        const cama = estadiaAtiva?.cama;
        
        let quarto: Quarto = "Masculino";
        if (cama?.casa === "MISTA_MULHERES") quarto = "Feminino";
        else if (cama?.casa === "IDOSOS") quarto = "Idosos";
        else if (cama?.casa === "LGBT") quarto = "LGBT+";
        
        const dataCheckin = getOperationalPlantaoKeyFromValue(estadiaAtiva?.data_checkin);
        const plantaoAtual = getOperationalPlantaoKey();
        const isNovato = dataCheckin === plantaoAtual;
        const presenteValue = isNovato ? true : (pessoa.presente || false);
        
        return {
          id: pessoa.id,
          nome: getNomePrincipal(pessoa),
          nome_social: pessoa.nome_social ?? null,
          quarto,
          cama: cama?.numero || 0,
          casa: cama?.casa || QUARTO_PARA_CASA[quarto],
          estadia_id: estadiaAtiva?.id || '',
          presente: presenteValue,
          idoso: pessoa.idade >= 60,
          lgbt: pessoa.lgbt,
          data_entrada: dataCheckin,
        };
      });
      
      setAcolhidos(acolhidosData);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) { console.error(e); } 
    finally { setIsLoading(false); }
  };

  const filteredAcolhidos = useMemo(() => {
    let data = acolhidos;

    if (filterRoom) {
      data = data.filter((a) => a.quarto === filterRoom);
    }

    if (showOnlyPendentes) {
      data = data.filter((a) => !a.presente);
    }

    if (searchTerm) {
      let term = searchTerm.toLowerCase().trim();
      if (term.startsWith("cama")) {
        term = term.replace(/^cama\s*/, "");
      }
      data = data.filter((a) => {
        const nomeMatch = a.nome.toLowerCase().includes(term);
        const camaMatch = String(a.cama).toLowerCase().includes(term);
        return nomeMatch || camaMatch;
      });
    }

    data = [...data].sort((a, b) => {
      if (a.presente === b.presente) return 0;
      return a.presente ? 1 : -1;
    });

    return data;
  }, [acolhidos, filterRoom, searchTerm, showOnlyPendentes]);

  const groupedByRoom = useMemo(() => {
    const groups: Record<Quarto, Acolhido[]> = { Masculino: [], Feminino: [], Idosos: [], "LGBT+": [] };
    filteredAcolhidos.forEach((a) => { if (groups[a.quarto]) groups[a.quarto].push(a); });
    return groups;
  }, [filteredAcolhidos]);

  const totalAtivos = acolhidos.length;
  const totalPresentes = acolhidos.filter((a) => a.presente).length;
  const totalPendentes = totalAtivos - totalPresentes;

  const handleTogglePresenca = async (id: string) => {
    const idx = acolhidos.findIndex((a) => a.id === id);
    if (idx === -1) return;
    const atual = acolhidos[idx];
    setAcolhidos((prev) => prev.map((a) => a.id === id ? { ...a, presente: !a.presente } : a));
    try {
      await apiFetch(`/api/pessoas/${id}/presenca`, {
        method: "PATCH",
        body: JSON.stringify({ presente: !atual.presente }),
        headers: { "Content-Type": "application/json" },
      });
      setLastUpdate(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      showOperationalReceipt(!atual.presente ? "Presença confirmada." : "Presença retirada.", !atual.presente ? "success" : "info");
    } catch (e) { 
      setAcolhidos((prev) => prev.map((a) => a.id === id ? { ...a, presente: atual.presente } : a));
    }
  };

  const handleMarkAll = async (room: Quarto) => {
    const toMark = acolhidos.filter((a) => a.quarto === room && !a.presente);
    setAcolhidos((prev) => prev.map((a) => a.quarto === room ? { ...a, presente: true } : a));
    try {
      await Promise.all(toMark.map((a) => apiFetch(`/api/pessoas/${a.id}/presenca`, {
        method: "PATCH", body: JSON.stringify({ presente: true }), headers: { "Content-Type": "application/json" }
      })));
      setLastUpdate(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
      if (toMark.length > 0) {
        showOperationalReceipt(`${toMark.length} presença(s) confirmada(s) no quarto ${room}.`);
      }
    } catch (e) {}
  };

  const handleConfirmEncerrar = async () => {
    setIsClosing(true);
    
    const plantaoAtual = getOperationalPlantaoKey();
    
    const ausentesIds = acolhidos
      .filter(a => !a.presente && a.data_entrada && a.data_entrada < plantaoAtual)
      .map(a => a.id);
    
    if (ausentesIds.length > 0) {
      try {
        await apiFetch('/api/triagem/encerrar', {
          method: 'POST',
          body: JSON.stringify({ ausentes: ausentesIds, data_ref: plantaoAtual }),
          headers: { 'Content-Type': 'application/json' },
        });
      } catch (e) {
        console.error('Erro ao registrar abandonos:', e);
      }
    }
    
    const ocupacaoFinal = acolhidos.filter(a => a.presente || a.data_entrada === plantaoAtual);
    const total = ocupacaoFinal.length;
    const porQuarto = QUARTOS.reduce((acc, q) => {
      acc[q] = ocupacaoFinal.filter(a => a.quarto === q).length;
      return acc;
    }, {} as Record<Quarto, number>);
    const idosos = ocupacaoFinal.filter(a => a.idoso).length;
    const ausentes = ausentesIds.length;
    
    const censoPayload = {
      total,
      porQuarto,
      idosos,
      ausentes,
      data: new Date().toLocaleDateString('pt-BR'),
      pendentesNoEncerramento: totalPendentes
    };
    
    setShowConfirmModal(false);

    // Enviar notificação (fire-and-forget)
    apiFetch('/api/triagem/notificar-encerramento', {
      method: 'POST',
      body: JSON.stringify({
        total,
        masc: porQuarto['Masculino'],
        fem: porQuarto['Feminino'],
        idosos,
        ausentes,
        lgbt: porQuarto['LGBT+'] || 0,
        data: censoPayload.data,
      }),
      headers: { 'Content-Type': 'application/json' },
    }).catch(e => console.error('Erro ao notificar encerramento:', e));

    setIsClosing(false);
    setTriagemEncerrada(true);
    setTriagemAberta(false);
    await fetchTriagemStatus(plantaoAtual);

    localStorage.setItem('triagemEncerrada', 'true');
    localStorage.setItem('lastTriagemDate', plantaoAtual);
    localStorage.setItem('lastTriagemClosedAt', new Date().toISOString());
    showOperationalReceipt('Triagem encerrada. Relatório enviado para a coordenação.');
  };


  // Iniciar triagem
  const handleIniciarTriagem = async () => {
    setIsOpening(true);
    try {
      await apiFetch('/api/triagem/iniciar', {
        method: 'POST',
        body: JSON.stringify({}),
        headers: { 'Content-Type': 'application/json' },
      });
      setTriagemAberta(true);
      setTriagemEncerrada(false);
      await fetchAcolhidos();
      showOperationalReceipt('Triagem iniciada! Coordenação notificada.');
    } catch (e) {
      console.error('Erro ao iniciar triagem:', e);
      showOperationalReceipt('Erro ao iniciar triagem.', 'info');
    } finally {
      setIsOpening(false);
    }
  };

  // Busca de nova entrada (debounced)
  const handleSearchNova = useCallback((q: string) => {
    setSearchNova(q);
    if (searchNovaTimer.current) clearTimeout(searchNovaTimer.current);
    if (!q.trim()) { setSearchNovaResults(null); return; }
    setSearchingNova(true);
    searchNovaTimer.current = setTimeout(async () => {
      try {
        const results = await apiFetch<any[]>(`/api/pessoas/search?q=${encodeURIComponent(q.trim())}`);
        setSearchNovaResults(Array.isArray(results) ? results.slice(0, 6) : []);
      } catch { setSearchNovaResults([]); }
      finally { setSearchingNova(false); }
    }, 380);
  }, []);

  const progressPercent = totalAtivos > 0 ? Math.round((totalPresentes / totalAtivos) * 100) : 0;
  const progressStyle = { "--presence-progress": `${progressPercent}%` } as CSSProperties;

  return (
    <main className="page-band presence-page">
      {triagemEncerrada && (
        <div className="presence-alert">
          Triagem encerrada. As alterações estão bloqueadas até amanhã.
        </div>
      )}

      <PageHeader
        eyebrow="Albergue Noturno"
        title="Presença"
        description={`Controle noturno do plantão de ${new Date().toLocaleDateString("pt-BR", { day: 'numeric', month: 'long' })}.`}
        actions={<div className="ds-context-badge">Atualizado às {lastUpdate}</div>}
      />

      <MetricGrid className="presence-metrics">
        <MetricCard label="Total" value={totalAtivos} detail="Pessoas ativas no plantão" />
        <MetricCard label="Presentes" value={totalPresentes} detail="Presença confirmada" tone="success" />
        <MetricCard label="Pendentes" value={totalPendentes} detail="Requer conferência" tone={totalPendentes > 0 ? "warning" : "success"} />
      </MetricGrid>

      <div className="presence-progress-block" style={progressStyle}>
        <div className="presence-progress-track">
          <div className="presence-progress-fill" />
        </div>
        <div className="presence-progress-text">{progressPercent}% concluído</div>
      </div>

      <section className="presence-filterbar" aria-label="Filtros de presença">
        <select value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}>
          <option value="">Todos os quartos</option>
          {QUARTOS.map((q) => (<option key={q} value={q}>{q}</option>))}
        </select>
        <input
          type="text"
          placeholder="Buscar por nome ou número da cama"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button
          onClick={() => setShowOnlyPendentes(!showOnlyPendentes)}
          className={`ds-button ${showOnlyPendentes ? "active" : "secondary"}`}
        >
          {showOnlyPendentes ? "Mostrar pendentes" : "Mostrar todos"}
        </button>
        {!triagemAberta && !triagemEncerrada && (
          <button
            className="ds-button primary presence-open-button"
            onClick={handleIniciarTriagem}
            disabled={isOpening}
          >
            {isOpening ? 'Iniciando...' : '▶ Iniciar triagem'}
          </button>
        )}
        {triagemAberta && !triagemEncerrada && (
          <button
            className="ds-button danger presence-close-button"
            onClick={() => setShowConfirmModal(true)}
            disabled={isClosing}
          >
            {isClosing ? 'Processando...' : 'Encerrar triagem'}
          </button>
        )}
      </section>

      {/* Nova entrada — busca de pessoa existente */}
      {triagemAberta && !triagemEncerrada && (
        <section className="presence-nova-entrada" aria-label="Nova entrada">
          <div className="presence-nova-entrada-search">
            <input
              type="text"
              placeholder="Buscar por nome ou CPF para nova entrada..."
              value={searchNova}
              onChange={e => handleSearchNova(e.target.value)}
            />
            {searchingNova && <span className="presence-nova-searching">Buscando...</span>}
          </div>
          {searchNovaResults !== null && (
            <div className="presence-nova-results">
              {searchNovaResults.length === 0 ? (
                <div className="presence-nova-empty">
                  <span>Nenhum cadastro encontrado para "{searchNova}".</span>
                  <button
                    className="ds-button secondary"
                    onClick={() => { setSearchNovaResults(null); setSearchNova(''); setOpenNovoCadastro(true); }}
                  >
                    + Criar novo cadastro
                  </button>
                </div>
              ) : (
                searchNovaResults.map((p: any) => {
                  const temEstadiaAtiva = p.estadias?.some((e: any) => e.status === 'ativa');
                  const nome = p.nome_social?.trim() || p.nome || '—';
                  return (
                    <button
                      key={p.id}
                      className={`presence-nova-result-item ${temEstadiaAtiva ? 'already-in' : ''}`}
                      disabled={temEstadiaAtiva}
                      onClick={() => {
                        if (!temEstadiaAtiva) {
                          setPessoaParaCheckin(p);
                          setSearchNovaResults(null);
                          setSearchNova('');
                        }
                      }}
                    >
                      <span className="presence-nova-nome">{nome}</span>
                      {temEstadiaAtiva
                        ? <span className="presence-nova-badge already">Já hospedado</span>
                        : <span className="presence-nova-badge action">Iniciar estadia →</span>
                      }
                    </button>
                  );
                })
              )}
            </div>
          )}
        </section>
      )}

      {!triagemAberta && !triagemEncerrada && (
        <div className="presence-waiting-start">
          <p>Inicie a triagem para começar a registrar presenças e entradas.</p>
        </div>
      )}

      <section className="presence-main">
        {isLoading ? (
          <div className="presence-empty-state">
            Carregando...
          </div>
        ) : filteredAcolhidos.length === 0 ? (
          <div className="presence-empty-state">
            <h3>Nenhum registro encontrado</h3>
            <p>
              {showOnlyPendentes ? "Todos estão presentes." : "Verifique o nome ou o número da cama."}
            </p>
          </div>
        ) : (
          <div className="presence-grid">
            {QUARTOS.map((room) => {
              const residents = groupedByRoom[room];
              if (residents.length === 0) return null;
              const presentesQuarto = residents.filter(r => r.presente).length;
              const allPresent = presentesQuarto === residents.length;
              const roomMark = room === "Masculino" ? "M" : room === "Feminino" ? "F" : room === "Idosos" ? "60+" : "LGBT";
              
              return (
                <article key={room} className="presence-room-card">
                  <div className="presence-room-head">
                    <div className="presence-room-title">
                      <span className="presence-room-mark">{roomMark}</span>
                      {room}
                      <span className="presence-room-count">{presentesQuarto}/{residents.length}</span>
                    </div>
                    <button
                      className="presence-mark-all"
                      onClick={() => !triagemEncerrada && handleMarkAll(room)}
                      disabled={allPresent || triagemEncerrada}
                    >
                      {allPresent ? "Todos presentes" : "Confirmar todos"}
                    </button>
                  </div>
                  <div>
                    {residents.map((a) => {
                      const plantaoAtual = getOperationalPlantaoKey();
                      const isNovato = a.data_entrada === plantaoAtual;
                      const temEstadia = !!a.estadia_id;
                      
                      return (
                        <div
                          key={a.id}
                          className={`presence-resident-row ${a.presente ? "present" : "pending"} ${isNovato ? "new" : ""} ${triagemEncerrada ? "locked" : ""}`}
                          onClick={() => !triagemEncerrada && !isNovato && handleTogglePresenca(a.id)}
                          title={isNovato ? "Novato - Check-in realizado hoje" : undefined}
                        >
                          <div className="presence-resident-main">
                            <div className="presence-bed-avatar">
                              {a.cama}
                            </div>
                            <div>
                              <div className="presence-resident-name">
                                {a.nome}
                                {isNovato && (
                                  <span className="presence-tag new">
                                    NOVO
                                  </span>
                                )}
                              </div>
                              <div className="presence-tag-row">
                                {a.idoso && <span className="presence-tag age">60+</span>}
                                {a.lgbt && <span className="presence-tag identity">LGBT+</span>}
                              </div>
                            </div>
                          </div>

                          {/* Botões de ação — só aparecem se não encerrado e tem estadia */}
                          {!triagemEncerrada && temEstadia && (
                            <div className="presence-row-actions" onClick={e => e.stopPropagation()}>
                              <button
                                className="presence-action-btn trocar"
                                title="Trocar de cama"
                                onClick={() => setTrocaAtivo({
                                  id: a.id,
                                  nome: a.nome,
                                  nome_social: a.nome_social,
                                  estadia_id: a.estadia_id,
                                  cama_numero: a.cama,
                                  casa: a.casa,
                                })}
                              >
                                Trocar
                              </button>
                              <button
                                className="presence-action-btn checkout"
                                title="Registrar saída"
                                onClick={() => setCheckoutAtivo({
                                  id: a.id,
                                  nome: a.nome,
                                  nome_social: a.nome_social,
                                  estadia_id: a.estadia_id,
                                  cama_numero: a.cama,
                                  casa: a.casa,
                                  data_checkin: a.data_entrada,
                                })}
                              >
                                Checkout
                              </button>
                            </div>
                          )}
                          
                          <div className="presence-check">
                            {a.presente && <span>✓</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <div className="presence-footer">
        <div className="presence-footer-content">
          <div>
            <span><strong>{totalPresentes}</strong> presentes</span>
            <span><strong>{totalPendentes}</strong> pendentes</span>
          </div>
          <div>
            {triagemEncerrada ? "Encerrado" : triagemAberta ? `Atualizado às ${lastUpdate}` : "Aguardando início"}
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="ds-modal-backdrop support-modal-backdrop presence-modal-backdrop">
          <ModalFrame
            title="Encerrar triagem?"
            subtitle="Após confirmar, ausentes veteranos serão registrados como abandono e a coordenação será notificada."
            className="presence-modal"
          >
            <div className="presence-modal-copy">
              <p>
                {totalPendentes === 0 
                  ? "Todos estão presentes! Ninguém será marcado como ausente."
                  : `Os ${totalPendentes} pendentes (veteranos) serão registrados como abandono.`
                }
              </p>
            </div>
            
            <div className="presence-census-preview">
              <h4>Prévia do censo</h4>
              <div>
                <span>Masculino: <strong>{groupedByRoom["Masculino"].filter(a => a.presente).length}</strong></span>
                <span>Feminino: <strong>{groupedByRoom["Feminino"].filter(a => a.presente).length}</strong></span>
                <span>Idosos: <strong>{groupedByRoom["Idosos"].filter(a => a.presente).length}</strong></span>
                <span>LGBT+: <strong>{groupedByRoom["LGBT+"].filter(a => a.presente).length}</strong></span>
              </div>
              <strong>Total: {totalPresentes} pessoas</strong>
            </div>

            <div className="presence-muted-note">
              Telegram e Email serão enviados automaticamente.
            </div>

            <div className="presence-modal-actions">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="ds-button secondary"
              >Cancelar</button>
              <button
                onClick={handleConfirmEncerrar}
                disabled={isClosing}
                className="ds-button danger"
              >{isClosing ? "Processando..." : "Confirmar"}</button>
            </div>
          </ModalFrame>
        </div>
      )}


      {/* TrocaModal — aberto via botão Trocar na linha */}
      {trocaAtivo && (
        <TrocaModal
          pessoa={trocaAtivo}
          onClose={() => setTrocaAtivo(null)}
          onSuccess={() => {
            setTrocaAtivo(null);
            fetchAcolhidos();
            showOperationalReceipt('Cama alterada com sucesso.');
          }}
        />
      )}

      {/* CheckoutModal — aberto via botão Checkout na linha */}
      {checkoutAtivo && (
        <CheckoutModal
          pessoa={{
            id: checkoutAtivo.id,
            nome: checkoutAtivo.nome,
            nome_social: checkoutAtivo.nome_social,
          }}
          estadia={{
            data_checkin: checkoutAtivo.data_checkin,
            cama: { numero: Number(checkoutAtivo.cama_numero), casa: checkoutAtivo.casa },
          }}
          onClose={() => setCheckoutAtivo(null)}
          onSuccess={() => {
            setCheckoutAtivo(null);
            fetchAcolhidos();
            showOperationalReceipt('Saída registrada com sucesso.');
          }}
        />
      )}

      {/* CheckinModal — aberto pela busca de nova entrada */}
      {pessoaParaCheckin && (
        <CheckinModal
          pessoa={pessoaParaCheckin}
          onClose={() => setPessoaParaCheckin(null)}
          onCheckinSuccess={() => {
            setPessoaParaCheckin(null);
            fetchAcolhidos();
            showOperationalReceipt('Check-in realizado com sucesso.');
          }}
        />
      )}

      {/* CadastroPessoaModal — criação rápida quando pessoa não encontrada */}
      {openNovoCadastro && (
        <CadastroPessoaModal
          open={openNovoCadastro}
          onClose={() => setOpenNovoCadastro(false)}
          onSuccess={(pessoaSalva: any) => {
            setOpenNovoCadastro(false);
            setPessoaParaCheckin(pessoaSalva);
            fetchAcolhidos();
          }}
        />
      )}
    </main>
  );
};

export default PresencasPage;
