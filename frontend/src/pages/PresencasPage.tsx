import React, { useEffect, useState, useMemo } from "react";
import { apiFetch } from "../api";
import {
  clearTriagemCensoStorage,
  getOperationalPlantaoKey,
  getOperationalPlantaoKeyFromValue,
  getTriagemCensoStorageState,
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

const QUARTOS: Quarto[] = ["Masculino", "Feminino", "Idosos", "LGBT+"];

// Estilos Melhorados
const styles = {
  container: { backgroundColor: "#F9FAFB", minHeight: "100vh", fontFamily: "Inter, sans-serif", paddingBottom: "100px" },
  header: { backgroundColor: "white", borderBottom: "1px solid #E5E7EB", position: "sticky" as "sticky", top: 0, zIndex: 30 },
  headerContent: { maxWidth: "1280px", margin: "0 auto", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap" as "wrap", gap: "16px" },
  title: { fontSize: "24px", fontWeight: "700", color: "#111827", margin: 0 },
  subtitle: { fontSize: "14px", color: "#6B7280", marginTop: "4px" },
  cardGroup: { display: "flex", gap: "10px", flexWrap: "wrap" as "wrap" },
  miniCard: { backgroundColor: "white", border: "1px solid #F3F4F6", borderRadius: "12px", padding: "10px 16px", minWidth: "90px", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" },
  miniLabel: { fontSize: "10px", textTransform: "uppercase" as "uppercase", fontWeight: "600", color: "#9CA3AF", marginBottom: "2px", letterSpacing: "0.5px" },
  miniValue: { fontSize: "22px", fontWeight: "700", color: "#1F2937", lineHeight: 1 },
  
  // Barra de progresso
  progressContainer: { maxWidth: "1280px", margin: "0 auto", padding: "0 24px" },
  progressBar: { height: "6px", backgroundColor: "#E5E7EB", borderRadius: "3px", overflow: "hidden", marginBottom: "4px" },
  progressFill: { height: "100%", backgroundColor: "#10B981", transition: "width 0.5s ease-out", borderRadius: "3px" },
  progressText: { fontSize: "11px", color: "#6B7280", textAlign: "right" as "right" },
  
  filterBar: { backgroundColor: "rgba(255,255,255,0.9)", backdropFilter: "blur(8px)", borderBottom: "1px solid #E5E7EB", padding: "12px 0" },
  filterContent: { maxWidth: "1280px", margin: "0 auto", padding: "0 24px", display: "flex", gap: "10px", overflowX: "auto" as "auto", alignItems: "center" },
  
  input: { padding: "8px 12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "14px", minWidth: "180px", color: "#1F2937", backgroundColor: "white" },
  select: { padding: "8px 32px 8px 12px", borderRadius: "8px", border: "1px solid #D1D5DB", fontSize: "14px", backgroundColor: "white", color: "#1F2937", cursor: "pointer", minWidth: "160px" },
  
  // Botão de filtro toggle
  filterToggle: { padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: "500", cursor: "pointer", transition: "all 0.2s", display: "flex", alignItems: "center", gap: "6px" },
  filterToggleActive: { backgroundColor: "#FEF3C7", color: "#B45309", border: "1px solid #FCD34D" },
  filterToggleInactive: { backgroundColor: "white", color: "#6B7280", border: "1px solid #D1D5DB" },
  
  btnDanger: { backgroundColor: "white", color: "#E11D48", border: "1px solid #FECDD3", borderRadius: "8px", padding: "8px 14px", fontWeight: "600", fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", marginLeft: "auto", transition: "all 0.2s" },
  
  main: { maxWidth: "1280px", margin: "0 auto", padding: "24px" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: "20px" },
  
  roomCard: { backgroundColor: "white", borderRadius: "16px", border: "1px solid #E5E7EB", overflow: "hidden", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)" },
  roomHeader: { backgroundColor: "#F9FAFB", padding: "14px 18px", borderBottom: "1px solid #E5E7EB", display: "flex", justifyContent: "space-between", alignItems: "center" },
  roomTitle: { fontSize: "15px", fontWeight: "600", color: "#1F2937", display: "flex", alignItems: "center", gap: "8px" },
  roomBadge: { fontSize: "11px", backgroundColor: "#E5E7EB", color: "#6B7280", padding: "2px 8px", borderRadius: "10px", marginLeft: "6px" },
  btnSmall: { fontSize: "11px", fontWeight: "500", color: "#2563EB", backgroundColor: "#EFF6FF", border: "none", padding: "6px 12px", borderRadius: "99px", cursor: "pointer", transition: "all 0.2s" },
  
  row: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 18px", borderBottom: "1px solid #F3F4F6", transition: "all 0.2s", cursor: "pointer" },
  rowPendente: { backgroundColor: "#FFFBEB" },
  avatar: { width: "38px", height: "38px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: "bold", marginRight: "12px", transition: "all 0.3s" },
  
  checkbox: { width: "24px", height: "24px", borderRadius: "6px", border: "2px solid", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s", cursor: "pointer" },
  checkboxChecked: { backgroundColor: "#10B981", borderColor: "#10B981", color: "white" },
  checkboxUnchecked: { backgroundColor: "white", borderColor: "#D1D5DB", color: "transparent" },

  footer: { position: "fixed" as "fixed", bottom: 0, left: 0, right: 0, backgroundColor: "rgba(15, 23, 42, 0.95)", backdropFilter: "blur(8px)", color: "white", padding: "12px 24px", zIndex: 40, borderTop: "1px solid #1E293B" },
  footerContent: { maxWidth: "1280px", margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" as "wrap", gap: "8px" },

  modalOverlay: { position: "fixed" as "fixed", inset: 0, backgroundColor: "rgba(15, 23, 42, 0.6)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50, padding: "16px" },
  modalCard: { backgroundColor: "white", borderRadius: "16px", padding: "24px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 25px -5px rgba(0,0,0,0.1)", maxHeight: "90vh", overflowY: "auto" as "auto" },
  
  // Status de notificação
  notifStatus: { display: "flex", alignItems: "center", gap: "8px", padding: "8px 12px", borderRadius: "8px", fontSize: "13px", marginBottom: "8px" },
  notifPending: { backgroundColor: "#F3F4F6", color: "#6B7280" },
  notifSending: { backgroundColor: "#DBEAFE", color: "#1D4ED8" },
  notifSuccess: { backgroundColor: "#D1FAE5", color: "#047857" },
  notifError: { backgroundColor: "#FEE2E2", color: "#DC2626" },
  
  // Triagem encerrada
  triagemBanner: { backgroundColor: "#FEF3C7", borderBottom: "1px solid #FCD34D", padding: "10px 24px", textAlign: "center" as "center" },
  triagemText: { fontSize: "13px", color: "#92400E", fontWeight: "500" }
};

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
          nome: pessoa.nome,
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
          body: JSON.stringify({ ausentes: ausentesIds }),
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

    // Salvar estado da triagem encerrada no localStorage
    localStorage.setItem('triagemEncerrada', 'true');
    localStorage.setItem('lastTriagemDate', plantaoAtual);
    localStorage.setItem('lastTriagemClosedAt', new Date().toISOString());
    localStorage.setItem('censoData', JSON.stringify(censoPayload));
  };

  // Helper para renderizar status de notificação
  const renderNotifIcon = (status: "pending" | "sending" | "success" | "error") => {
    switch (status) {
      case "pending": return "⏳";
      case "sending": return "🔄";
      case "success": return "✅";
      case "error": return "❌";
    }
  };

  const progressPercent = totalAtivos > 0 ? Math.round((totalPresentes / totalAtivos) * 100) : 0;
  const isSending = notifStatus.telegram === "sending" || notifStatus.email === "sending";

  return (
    <div style={styles.container}>
      {/* Banner de triagem encerrada */}
      {triagemEncerrada && (
        <div style={styles.triagemBanner}>
          <span style={styles.triagemText}>
            🔒 Triagem encerrada. As alterações estão bloqueadas até amanhã.
          </span>
        </div>
      )}

      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>Presença</h1>
            <p style={styles.subtitle}>
              Controle noturno • {new Date().toLocaleDateString("pt-BR", { day: 'numeric', month: 'long' })}
            </p>
          </div>
          <div style={styles.cardGroup}>
            <div style={styles.miniCard}>
              <div style={styles.miniLabel}>Total</div>
              <div style={styles.miniValue}>{totalAtivos}</div>
            </div>
            <div style={{...styles.miniCard, backgroundColor: "#ECFDF5", border: "1px solid #D1FAE5"}}>
              <div style={{...styles.miniLabel, color: "#059669"}}>Presentes</div>
              <div style={{...styles.miniValue, color: "#047857"}}>{totalPresentes}</div>
            </div>
            <div style={{...styles.miniCard, backgroundColor: "#FFFBEB", border: "1px solid #FCD34D"}}>
              <div style={{...styles.miniLabel, color: "#D97706"}}>Pendentes</div>
              <div style={{...styles.miniValue, color: "#B45309"}}>{totalPendentes}</div>
            </div>
          </div>
        </div>

        {/* Barra de progresso */}
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            <div style={{...styles.progressFill, width: `${progressPercent}%`}} />
          </div>
          <div style={styles.progressText}>{progressPercent}% concluído</div>
        </div>

        <div style={styles.filterBar}>
          <div style={styles.filterContent}>
            <select style={styles.select} value={filterRoom} onChange={(e) => setFilterRoom(e.target.value)}>
              <option value="">Todos os Quartos</option>
              {QUARTOS.map((q) => (<option key={q} value={q}>{q}</option>))}
            </select>
            <input 
              style={styles.input} 
              type="text" 
              placeholder="Buscar por nome ou nº cama..." 
              value={searchTerm} 
              onChange={(e) => setSearchTerm(e.target.value)} 
            />
            {/* Filtro de pendentes */}
            <button 
              onClick={() => setShowOnlyPendentes(!showOnlyPendentes)}
              style={{
                ...styles.filterToggle,
                ...(showOnlyPendentes ? styles.filterToggleActive : styles.filterToggleInactive)
              }}
            >
              ⏱️ {showOnlyPendentes ? "Só pendentes" : "Todos"}
            </button>
            <button 
              style={{...styles.btnDanger, opacity: triagemEncerrada ? 0.5 : 1}} 
              onClick={() => !triagemEncerrada && setShowConfirmModal(true)} 
              disabled={isClosing || triagemEncerrada}
            >
              ⚠️ Encerrar Triagem
            </button>
          </div>
        </div>
      </header>

      <main style={styles.main}>
        {isLoading ? (
          <div style={{textAlign: "center", color: "#6B7280", marginTop: "40px"}}>
            <div style={{fontSize: "32px", marginBottom: "12px"}}>⏳</div>
            Carregando...
          </div>
        ) : filteredAcolhidos.length === 0 ? (
          <div style={{textAlign: "center", padding: "60px", backgroundColor: "white", borderRadius: "16px", border: "2px dashed #E5E7EB"}}>
            <div style={{fontSize: "40px", marginBottom: "16px"}}>📭</div>
            <h3 style={{fontSize: "18px", fontWeight: "600", color: "#374151"}}>Nenhum registro encontrado</h3>
            <p style={{fontSize: "14px", color: "#6B7280", marginTop: "8px"}}>
              {showOnlyPendentes ? "Todos estão presentes! 🎉" : "Verifique o nome ou o número da cama."}
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {QUARTOS.map((room) => {
              const residents = groupedByRoom[room];
              if (residents.length === 0) return null;
              const presentesQuarto = residents.filter(r => r.presente).length;
              const allPresent = presentesQuarto === residents.length;
              
              return (
                <div key={room} style={styles.roomCard}>
                  <div style={styles.roomHeader}>
                    <div style={styles.roomTitle}>
                      {room === "Masculino" ? "🚹" : room === "Feminino" ? "🚺" : room === "Idosos" ? "👴" : "🏳️‍🌈"} 
                      {room}
                      <span style={styles.roomBadge}>{presentesQuarto}/{residents.length}</span>
                    </div>
                    <button 
                      style={{...styles.btnSmall, opacity: (allPresent || triagemEncerrada) ? 0.5 : 1}} 
                      onClick={() => !triagemEncerrada && handleMarkAll(room)}
                      disabled={allPresent || triagemEncerrada}
                    >
                      {allPresent ? "✓ Todos presentes" : "Confirmar Todos"}
                    </button>
                  </div>
                  <div>
                    {residents.map((a) => {
                      const plantaoAtual = getOperationalPlantaoKey();
                      const isNovato = a.data_entrada === plantaoAtual;
                      
                      return (
                      <div 
                        key={a.id} 
                        style={{
                          ...styles.row, 
                          ...(a.presente ? {} : styles.rowPendente),
                          opacity: triagemEncerrada ? 0.7 : 1,
                          cursor: triagemEncerrada ? "not-allowed" : (isNovato ? "default" : "pointer"),
                          backgroundColor: isNovato ? "#F0FDF4" : undefined, // Fundo verde claro para novatos
                        }}
                        onClick={() => !triagemEncerrada && !isNovato && handleTogglePresenca(a.id)}
                        title={isNovato ? "Novato - Check-in realizado hoje" : undefined}
                      >
                        <div style={{display: "flex", alignItems: "center"}}>
                          <div style={{
                            ...styles.avatar, 
                            backgroundColor: a.presente ? "#10B981" : "#F3F4F6", 
                            color: a.presente ? "white" : "#6B7280"
                          }}>
                            {a.cama}
                          </div>
                          <div>
                            <div style={{fontWeight: "600", color: "#111827", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px"}}>
                              {a.nome}
                              {isNovato && (
                                <span style={{
                                  backgroundColor: "#10B981",
                                  color: "white",
                                  padding: "2px 6px",
                                  borderRadius: "4px",
                                  fontSize: "9px",
                                  fontWeight: "bold",
                                  textTransform: "uppercase",
                                  letterSpacing: "0.5px"
                                }}>
                                  NOVO
                                </span>
                              )}
                            </div>
                            <div style={{fontSize: "11px", color: "#6B7280", marginTop: "2px", display: "flex", gap: "4px"}}>
                              {a.idoso && <span style={{backgroundColor: "#FEF3C7", color: "#B45309", padding: "1px 6px", borderRadius: "4px"}}>60+</span>}
                              {a.lgbt && <span style={{backgroundColor: "#F3E8FF", color: "#7C3AED", padding: "1px 6px", borderRadius: "4px"}}>LGBT+</span>}
                            </div>
                          </div>
                        </div>
                        
                        {/* Checkbox estilo moderno */}
                        <div 
                          style={{
                            ...styles.checkbox,
                            ...(a.presente ? styles.checkboxChecked : styles.checkboxUnchecked),
                            ...(isNovato ? { opacity: 0.7 } : {})
                          }}
                        >
                          {a.presente && <span style={{fontWeight: "bold", fontSize: "14px"}}>✓</span>}
                        </div>
                      </div>
                    );})}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <div style={styles.footer}>
        <div style={styles.footerContent}>
          <div style={{display: "flex", gap: "20px", fontSize: "13px"}}>
            <span>✅ <strong style={{color: "#34D399"}}>{totalPresentes}</strong> presentes</span>
            <span>⏳ <strong style={{color: "#FBBF24"}}>{totalPendentes}</strong> pendentes</span>
          </div>
          <div style={{fontSize: "11px", color: "#94A3B8"}}>
            {triagemEncerrada ? "🔒 Encerrado" : `Atualizado às ${lastUpdate}`}
          </div>
        </div>
      </div>

      {/* Modal de confirmação */}
      {showConfirmModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalCard}>
            <div style={{textAlign: "center", marginBottom: "20px"}}>
              <div style={{fontSize: "40px", marginBottom: "16px"}}>⚠️</div>
              <h3 style={{fontSize: "20px", fontWeight: "bold", color: "#1F2937"}}>Encerrar Triagem?</h3>
              <p style={{fontSize: "14px", color: "#6B7280", marginTop: "8px"}}>
                {totalPendentes === 0 
                  ? "Todos estão presentes! Ninguém será marcado como ausente."
                  : `Os ${totalPendentes} pendentes (veteranos) serão registrados como abandono.`
                }
              </p>
            </div>
            
            {/* Preview do censo */}
            <div style={{backgroundColor: "#F9FAFB", borderRadius: "8px", padding: "12px", marginBottom: "16px"}}>
              <div style={{fontSize: "12px", fontWeight: "600", color: "#6B7280", marginBottom: "8px"}}>📊 Preview do Censo</div>
              <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", fontSize: "13px"}}>
                <div>🚹 Masculino: <strong>{groupedByRoom["Masculino"].filter(a => a.presente).length}</strong></div>
                <div>🚺 Feminino: <strong>{groupedByRoom["Feminino"].filter(a => a.presente).length}</strong></div>
                <div>👴 Idosos: <strong>{groupedByRoom["Idosos"].filter(a => a.presente).length}</strong></div>
                <div>🏳️‍🌈 LGBT+: <strong>{groupedByRoom["LGBT+"].filter(a => a.presente).length}</strong></div>
              </div>
              <div style={{marginTop: "8px", fontSize: "14px", fontWeight: "600"}}>
                Total: {totalPresentes} pessoas
              </div>
            </div>

            <div style={{fontSize: "12px", color: "#6B7280", marginBottom: "16px", textAlign: "center"}}>
              📱 Telegram e 📧 Email serão enviados automaticamente
            </div>

            <div style={{display: "flex", gap: "12px"}}>
              <button 
                onClick={() => setShowConfirmModal(false)}
                style={{flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid #D1D5DB", backgroundColor: "white", cursor: "pointer", fontWeight: "600", color: "#374151"}}
              >Cancelar</button>
              <button 
                onClick={handleConfirmEncerrar}
                disabled={isClosing}
                style={{flex: 1, padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#E11D48", cursor: isClosing ? "wait" : "pointer", fontWeight: "600", color: "white", opacity: isClosing ? 0.7 : 1}}
              >{isClosing ? "Processando..." : "Confirmar"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Censo/Report */}
      {showReportModal && reportData && (
        <div style={styles.modalOverlay}>
          <div style={{...styles.modalCard, maxWidth: '480px'}}>
            <div style={{textAlign: "center", marginBottom: "20px"}}>
              <div style={{fontSize: "40px", marginBottom: "12px"}}>📊</div>
              <h3 style={{fontSize: "20px", fontWeight: "bold", color: "#1F2937"}}>Censo da Noite</h3>
              <p style={{fontSize: "13px", color: "#6B7280"}}>{reportData.data}</p>
            </div>
            
            <div style={{marginBottom: "20px"}}>
              <div style={{fontSize: "18px", fontWeight: "700", marginBottom: "12px", textAlign: "center"}}>
                Total: {reportData.total} pessoas
              </div>
              <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "16px"}}>
                {Object.entries(reportData.porQuarto).map(([quarto, count]) => (
                  <div key={quarto} style={{padding: "10px", backgroundColor: "#F9FAFB", borderRadius: "8px", textAlign: "center"}}>
                    <div style={{fontSize: "13px", fontWeight: "600", color: "#6B7280"}}>{quarto}</div>
                    <div style={{fontSize: "20px", fontWeight: "bold", color: "#1F2937"}}>{count as number}</div>
                  </div>
                ))}
              </div>
              <div style={{display: "flex", justifyContent: "center", gap: "16px", fontSize: "13px", color: "#6B7280"}}>
                <span>👴 Idosos: <strong>{reportData.idosos}</strong></span>
                <span>❌ Ausentes: <strong>{reportData.ausentes}</strong></span>
              </div>
            </div>

            {/* Status das notificações */}
            <div style={{marginBottom: "16px"}}>
              <div style={{fontSize: "12px", fontWeight: "600", color: "#6B7280", marginBottom: "8px"}}>Status das Notificações</div>
              <div style={{
                ...styles.notifStatus,
                ...(notifStatus.telegram === "success" ? styles.notifSuccess : 
                    notifStatus.telegram === "error" ? styles.notifError : 
                    notifStatus.telegram === "sending" ? styles.notifSending : styles.notifPending)
              }}>
                {renderNotifIcon(notifStatus.telegram)} Telegram: {
                  notifStatus.telegram === "success" ? "Enviado" :
                  notifStatus.telegram === "error" ? "Erro" :
                  notifStatus.telegram === "sending" ? "Enviando..." : "Aguardando"
                }
              </div>
              <div style={{
                ...styles.notifStatus,
                ...(notifStatus.email === "success" ? styles.notifSuccess : 
                    notifStatus.email === "error" ? styles.notifError : 
                    notifStatus.email === "sending" ? styles.notifSending : styles.notifPending)
              }}>
                {renderNotifIcon(notifStatus.email)} Email: {
                  notifStatus.email === "success" ? "Enviado" :
                  notifStatus.email === "error" ? "Erro" :
                  notifStatus.email === "sending" ? "Enviando..." : "Aguardando"
                }
              </div>
            </div>

            <button 
              onClick={() => window.location.reload()}
              style={{width: "100%", padding: "12px", borderRadius: "8px", border: "none", backgroundColor: "#2563EB", cursor: isSending ? "wait" : "pointer", fontWeight: "600", color: "white", opacity: isSending ? 0.7 : 1}}
              disabled={isSending}
            >{isSending ? "Aguarde..." : "Concluir"}</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PresencasPage;
