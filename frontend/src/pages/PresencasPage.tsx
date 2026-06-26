import React, { useEffect, useState, useMemo, type CSSProperties } from "react";
import { apiFetch } from "../api";
import { MetricCard, MetricGrid, ModalFrame, PageHeader } from "../components/DesignSystem";
import {
  clearTriagemCensoStorage,
  getOperationalPlantaoKey,
  getOperationalPlantaoKeyFromValue,
  getTriagemCensoStorageState,
  getNomePrincipal,
} from "../utils";

type Quarto = "Masculino" | "Feminino" | "Idosos" | "LGBT+";

interface Acolhido {
  id: string;
  nome: string;
  quarto: Quarto;
  cama: string | number;
  presente: boolean;
  idoso?: boolean;
  lgbt?: boolean;
  data_entrada: string;
}

interface NotificationStatus {
  telegram: "pending" | "sending" | "success" | "error";
  email: "pending" | "sending" | "success" | "error";
  telegramError?: string;
  emailError?: string;
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
  const [showReportModal, setShowReportModal] = useState<boolean>(false);
  const [reportData, setReportData] = useState<any>(null);
  const [triagemEncerrada, setTriagemEncerrada] = useState<boolean>(false);
  const [notifStatus, setNotifStatus] = useState<NotificationStatus>({
    telegram: "pending",
    email: "pending"
  });

  const fetchTriagemStatus = async (plantaoAtual = getOperationalPlantaoKey()) => {
    try {
      const status = await apiFetch<TriagemStatusResponse>(`/api/triagem/status?data_ref=${plantaoAtual}`);
      if (status.encerrada) {
        setTriagemEncerrada(true);
        localStorage.setItem('triagemEncerrada', 'true');
        localStorage.setItem('lastTriagemDate', status.data_ref);
        localStorage.setItem('lastTriagemClosedAt', status.fechamento?.fechada_em || new Date().toISOString());
        if (!localStorage.getItem('censoData') && status.fechamento) {
          localStorage.setItem('censoData', JSON.stringify({
            total: status.fechamento.total_presentes,
            porQuarto: status.fechamento.por_quarto,
            ausentes: status.fechamento.total_ausentes,
            data: new Date(`${status.data_ref}T12:00:00`).toLocaleDateString('pt-BR'),
          }));
        }
      } else {
        setTriagemEncerrada(false);
      }
    } catch (error) {
      console.error('Erro ao consultar status da triagem:', error);
    }
  };

  // Verificar se triagem já foi encerrada hoje E monitorar mudança de dia
  useEffect(() => {
    const checkTriagemStatus = () => {
      const plantaoAtual = getOperationalPlantaoKey();
      const storageState = getTriagemCensoStorageState();

      // Se existe um plantão anterior, resetar apenas depois das 07h.
      if (storageState.shouldClear) {
        console.log(`Novo ciclo operacional detectado (${storageState.storedPlantaoKey} -> ${plantaoAtual}) - resetando censo`);
        clearTriagemCensoStorage();
        setTriagemEncerrada(false);
        fetchAcolhidos();
      }
      // Se o plantão é o atual E triagem foi encerrada, manter bloqueado.
      else if (storageState.mode === 'censo') {
        setTriagemEncerrada(true);
      }
      // Caso contrário (primeira vez ou data foi resetada), desbloquear
      else {
        setTriagemEncerrada(false);
      }

      fetchTriagemStatus(plantaoAtual);
    };

    // Verificar imediatamente ao montar
    checkTriagemStatus();
    
    // Carregar dados sempre na inicialização
    fetchAcolhidos();

    // Verificar a cada 60 segundos se mudou o dia
    const interval = setInterval(checkTriagemStatus, 60000); // 1 minuto

    return () => clearInterval(interval);
  }, []);

  // Função CORRIGIDA aqui
  const fetchAcolhidos = async () => {
    setIsLoading(true);
    try {
      const pessoas: any[] = await apiFetch("/api/pessoas/ativos");
      
      // Transformar dados da API para o formato esperado
      const acolhidosData: Acolhido[] = pessoas.map((pessoa: any) => {
        const estadiaAtiva = pessoa.estadias?.find((e: any) => e.status === 'ativa');
        const cama = estadiaAtiva?.cama;
        
        // Mapear casa para quarto
        let quarto: Quarto = "Masculino";
        if (cama?.casa === "MISTA_MULHERES") quarto = "Feminino";
        else if (cama?.casa === "IDOSOS") quarto = "Idosos";
        else if (cama?.casa === "LGBT") quarto = "LGBT+";
        
        // Normalizar data de entrada para formato YYYY-MM-DD
        const dataCheckin = getOperationalPlantaoKeyFromValue(estadiaAtiva?.data_checkin);
        
        // Novatos do plantão atual já vêm com presença confirmada automaticamente.
        const plantaoAtual = getOperationalPlantaoKey();
        const isNovato = dataCheckin === plantaoAtual;
        const presenteValue = isNovato ? true : (pessoa.presente || false);
        
        return {
          id: pessoa.id,
          nome: getNomePrincipal(pessoa),
          quarto,
          cama: cama?.numero || 0,
          presente: presenteValue, // Novatos já vêm marcados
          idoso: pessoa.idade >= 60,
          lgbt: pessoa.lgbt,
          data_entrada: dataCheckin, // Usando data_checkin normalizada
        };
      });
      
      setAcolhidos(acolhidosData);
      setLastUpdate(new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) { console.error(e); } 
    finally { setIsLoading(false); }
  };

  // REMOVIDO: useEffect(() => { fetchAcolhidos(); }, []);
  // O fetchAcolhidos() agora é chamado apenas dentro do useEffect de verificação de triagem

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

    // Ordenar: pendentes primeiro
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
    
    // Passo 1: Filtrar ausentes (veteranos ausentes - entraram antes de hoje e não marcaram presença)
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
    
    // Passo 2: Calcular censo da noite
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
    
    setReportData(censoPayload);
    setShowConfirmModal(false);
    setShowReportModal(true);
    
    // Passo 3: Enviar notificações (Telegram + Email via endpoint único)
    setNotifStatus({ telegram: "sending", email: "sending" });
    
    try {
      const notifResponse: any = await apiFetch('/api/triagem/notificar-encerramento', {
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
      });
      
      // Se o backend retornar status individual, usar; senão, assumir sucesso
      if (notifResponse?.telegram !== undefined) {
        setNotifStatus({
          telegram: notifResponse.telegram ? "success" : "error",
          email: notifResponse.email ? "success" : "error",
          telegramError: notifResponse.telegramError,
          emailError: notifResponse.emailError
        });
      } else {
        setNotifStatus({ telegram: "success", email: "success" });
      }
    } catch (e: any) {
      console.error('Erro ao enviar notificações:', e);
      setNotifStatus({ 
        telegram: "error", 
        email: "error", 
        telegramError: e.message,
        emailError: e.message 
      });
    }
    
    // Passo 4: Resetar presença para o dia seguinte
    const presentes = acolhidos.filter(a => a.presente === true);
    if (presentes.length > 0) {
      try {
        await Promise.all(presentes.map(a => 
          apiFetch(`/api/pessoas/${a.id}/presenca`, {
            method: 'PATCH',
            body: JSON.stringify({ presente: false }),
            headers: { 'Content-Type': 'application/json' },
          })
        ));
      } catch (e) {
        console.error('Erro ao resetar presença:', e);
      }
    }
    
    setIsClosing(false);
    setTriagemEncerrada(true);
    await fetchTriagemStatus(plantaoAtual);

    // Salvar estado da triagem encerrada no localStorage
    localStorage.setItem('triagemEncerrada', 'true');
    localStorage.setItem('lastTriagemDate', plantaoAtual);
    localStorage.setItem('lastTriagemClosedAt', new Date().toISOString());
    localStorage.setItem('censoData', JSON.stringify(censoPayload));
    showOperationalReceipt('Censo encerrado e registrado.');
  };

  const renderNotifLabel = (status: "pending" | "sending" | "success" | "error") => {
    switch (status) {
      case "pending": return "Aguardando";
      case "sending": return "Enviando";
      case "success": return "Enviado";
      case "error": return "Erro";
    }
  };

  const progressPercent = totalAtivos > 0 ? Math.round((totalPresentes / totalAtivos) * 100) : 0;
  const isSending = notifStatus.telegram === "sending" || notifStatus.email === "sending";
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
        <button
          className="ds-button danger presence-close-button"
          onClick={() => !triagemEncerrada && setShowConfirmModal(true)}
          disabled={isClosing || triagemEncerrada}
        >
          Encerrar triagem
        </button>
      </section>

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
                        
                        <div className="presence-check">
                          {a.presente && <span>✓</span>}
                        </div>
                      </div>
                    );})}
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
            {triagemEncerrada ? "Encerrado" : `Atualizado às ${lastUpdate}`}
          </div>
        </div>
      </div>

      {showConfirmModal && (
        <div className="ds-modal-backdrop support-modal-backdrop presence-modal-backdrop">
          <ModalFrame
            title="Encerrar triagem?"
            subtitle="Após confirmar, pendências de veteranos serão registradas como abandono e o censo será gerado."
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

      {showReportModal && reportData && (
        <div className="ds-modal-backdrop support-modal-backdrop presence-modal-backdrop">
          <ModalFrame
            title="Censo da noite"
            subtitle={reportData.data}
            className="presence-modal wide"
          >
            <div className="presence-census-result">
              <strong>Total: {reportData.total} pessoas</strong>
              <div className="presence-census-grid">
                {Object.entries(reportData.porQuarto).map(([quarto, count]) => (
                  <div key={quarto}>
                    <span>{quarto}</span>
                    <strong>{count as number}</strong>
                  </div>
                ))}
              </div>
              <div className="presence-summary-line">
                <span>Idosos: <strong>{reportData.idosos}</strong></span>
                <span>Ausentes: <strong>{reportData.ausentes}</strong></span>
              </div>
            </div>

            <div className="presence-notification-box">
              <h4>Status das notificações</h4>
              <div className={`presence-notification-status ${notifStatus.telegram}`}>
                Telegram: {renderNotifLabel(notifStatus.telegram)}
              </div>
              <div className={`presence-notification-status ${notifStatus.email}`}>
                Email: {renderNotifLabel(notifStatus.email)}
              </div>
            </div>

            <button
              onClick={() => window.location.reload()}
              className="ds-button presence-modal-close"
              disabled={isSending}
            >{isSending ? "Aguarde..." : "Concluir"}</button>
          </ModalFrame>
        </div>
      )}
    </main>
  );
};

export default PresencasPage;
