import React, { useCallback, useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import {
  clearTriagemCensoStorage,
  getTriagemCensoStorageState,
  type PresenceFloaterMode,
} from "../utils";

interface PresenceFloaterProps {
  pendentesCount: number;
  totalCount?: number;
  censoData?: {
    total: number;
    porQuarto: Record<string, number>;
    idosos: number;
    ausentes: number;
    data: string;
    pendentesNoEncerramento?: number;
  } | null;
  isTriagemEncerrada?: boolean;
  onCensoExpired?: () => void;
}

const PresenceFloater: React.FC<PresenceFloaterProps> = ({ 
  pendentesCount, 
  totalCount = 0,
  censoData, 
  isTriagemEncerrada = false,
  onCensoExpired,
}) => {
  const navigate = useNavigate();
  const [showTooltip, setShowTooltip] = useState(false);
  const [showCensoModal, setShowCensoModal] = useState(false);
  const [floaterMode, setFloaterMode] = useState<PresenceFloaterMode>('presenca');
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  // Responsivo
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const syncFloaterMode = useCallback(() => {
    const storageState = getTriagemCensoStorageState();

    if (storageState.shouldClear) {
      clearTriagemCensoStorage();
      setShowCensoModal(false);
      setShowTooltip(false);
      setFloaterMode('presenca');
      onCensoExpired?.();
      return;
    }

    const nextMode = isTriagemEncerrada && censoData && storageState.mode === 'censo'
      ? 'censo'
      : 'presenca';

    setFloaterMode(nextMode);
    if (nextMode === 'presenca') {
      setShowCensoModal(false);
      setShowTooltip(false);
    }
  }, [censoData, isTriagemEncerrada, onCensoExpired]);

  // Verifica pelo relógio se o censo ainda pertence ao plantão atual.
  useEffect(() => {
    syncFloaterMode();
    const interval = setInterval(syncFloaterMode, 30000);
    return () => clearInterval(interval);
  }, [syncFloaterMode]);

  const handleClick = () => {
    if (isCensoMode) {
      setShowCensoModal(true);
      return;
    }
    navigate('/presencas');
  };

  const isCensoMode = floaterMode === 'censo';
  const progressPercent = totalCount > 0 ? Math.round(((totalCount - pendentesCount) / totalCount) * 100) : 0;

  return (
    <>
      <div style={{ position: "relative" }}>
        <AnimatePresence>
          <motion.button
            key="floater"
            initial={{ y: 60, opacity: 0, scale: 0.9 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 60, opacity: 0, scale: 0.9 }}
            whileHover={isCensoMode ? { scale: 1.02 } : { scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleClick}
            onMouseEnter={() => !isMobile && isCensoMode && setShowTooltip(true)}
            onMouseLeave={() => setShowTooltip(false)}
            
            style={{
              position: "fixed",
              bottom: isMobile ? "24px" : "100px",
              right: isMobile ? "50%" : "24px",
              transform: isMobile ? "translateX(50%)" : "none",
              display: "flex",
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              padding: isMobile ? "8px 14px" : "10px 20px 10px 12px",
              borderRadius: "9999px",
              gap: "12px",
              minWidth: isMobile ? "auto" : "220px",
              maxWidth: "300px",
              color: "#1e293b",
              boxShadow: "0 10px 40px -10px rgba(0,0,0,0.25)",
              cursor: "pointer",
              zIndex: 100,
              backdropFilter: "blur(12px)",
              backgroundColor: "rgba(255,255,255,0.95)",
              border: "1px solid rgba(255,255,255,0.8)",
            }}
          >
            {/* Ícone Circular com mini progresso */}
            <div 
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "42px",
                height: "42px",
                borderRadius: "50%",
                backgroundColor: isCensoMode ? "#e0f2fe" : (pendentesCount > 0 ? "#ffedd5" : "#dcfce7"),
                color: isCensoMode ? "#0369a1" : (pendentesCount > 0 ? "#ea580c" : "#16a34a"),
                flexShrink: 0
              }}
            >
              {/* Anel de progresso (apenas quando não é censo) */}
              {!isCensoMode && totalCount > 0 && (
                <svg 
                  style={{ position: "absolute", top: -2, left: -2, transform: "rotate(-90deg)" }} 
                  width="46" height="46"
                >
                  <circle
                    cx="23" cy="23" r="20"
                    fill="none"
                    stroke="#E5E7EB"
                    strokeWidth="3"
                  />
                  <circle
                    cx="23" cy="23" r="20"
                    fill="none"
                    stroke={pendentesCount === 0 ? "#10B981" : "#F59E0B"}
                    strokeWidth="3"
                    strokeDasharray={`${2 * Math.PI * 20}`}
                    strokeDashoffset={`${2 * Math.PI * 20 * (1 - progressPercent / 100)}`}
                    strokeLinecap="round"
                  />
                </svg>
              )}
              
              {isCensoMode ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              ) : pendentesCount > 0 ? (
                <span style={{ fontSize: "16px", fontWeight: "bold" }}>{pendentesCount}</span>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>

            {/* Texto */}
            {!isMobile && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", flex: 1 }}>
                <span style={{ fontSize: "10px", textTransform: "uppercase", fontWeight: "bold", color: "#94a3b8", lineHeight: "1.2" }}>
                  {isCensoMode ? "Censo Noturno" : "Presença"}
                </span>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#334155", lineHeight: "1.3" }}>
                  {isCensoMode 
                    ? `${censoData?.total ?? 0} pessoas` 
                    : (pendentesCount > 0 ? `${pendentesCount} pendentes` : "Tudo pronto ✓")
                  }
                </span>
              </div>
            )}

            {/* Seta */}
            {!isMobile && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            )}

          </motion.button>
        </AnimatePresence>

        {/* Tooltip desktop */}
        <AnimatePresence>
          {showTooltip && isCensoMode && censoData && !isMobile && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              style={{
                position: "fixed",
                bottom: "160px",
                right: "24px",
                backgroundColor: "white",
                borderRadius: "12px",
                padding: "16px",
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.2)",
                border: "1px solid #e5e7eb",
                minWidth: "280px",
                zIndex: 101
              }}
            >
              <div style={{ textAlign: "center", marginBottom: "12px" }}>
                <div style={{ fontSize: "18px", marginBottom: "4px" }}>🌙</div>
                <h4 style={{ fontSize: "14px", fontWeight: "bold", color: "#1f2937", margin: 0 }}>
                  Censo Noturno - {censoData.data}
                </h4>
              </div>
              
              <div style={{ marginBottom: "12px" }}>
                <div style={{ fontSize: "16px", fontWeight: "600", marginBottom: "8px", textAlign: "center" }}>
                  Total: {censoData.total}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "8px" }}>
                  {Object.entries(censoData.porQuarto).map(([quarto, count]) => (
                    <div key={quarto} style={{ 
                      padding: "6px 8px", 
                      backgroundColor: "#f9fafb", 
                      borderRadius: "6px", 
                      textAlign: "center",
                      fontSize: "12px"
                    }}>
                      <div style={{ fontWeight: "600", color: "#6B7280" }}>{quarto}</div>
                      <div style={{ fontSize: "14px", fontWeight: "bold", color: "#1F2937" }}>{count}</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: "12px", color: "#6b7280", textAlign: "center" }}>
                  👴 Idosos: {censoData.idosos} • ❌ Ausentes: {censoData.ausentes}
                </div>
              </div>
              
              <div style={{ fontSize: "10px", color: "#9ca3af", textAlign: "center" }}>
                Clique para ver detalhes
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Modal Censo (mobile e desktop ao clicar) */}
      <AnimatePresence>
        {showCensoModal && isCensoMode && censoData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(15,23,42,0.6)",
              backdropFilter: "blur(4px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "16px",
              zIndex: 120,
            }}
            onClick={() => setShowCensoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              style={{
                backgroundColor: "white",
                borderRadius: "16px",
                padding: "24px",
                maxWidth: "420px",
                width: "100%",
                boxShadow: "0 20px 40px -10px rgba(0,0,0,0.3)",
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ textAlign: "center", marginBottom: "20px" }}>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>📊</div>
                <h3 style={{ fontSize: "20px", fontWeight: "bold", color: "#111827", margin: 0 }}>
                  Censo Noturno
                </h3>
                <p style={{ fontSize: "13px", color: "#6B7280", marginTop: "4px" }}>{censoData.data}</p>
              </div>
              
              <div style={{ marginBottom: "16px" }}>
                <div style={{ fontSize: "18px", fontWeight: "700", marginBottom: "12px", textAlign: "center" }}>
                  Total: {censoData.total} pessoas
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "12px" }}>
                  {Object.entries(censoData.porQuarto).map(([quarto, count]) => (
                    <div
                      key={quarto}
                      style={{ padding: "10px", backgroundColor: "#F9FAFB", borderRadius: "8px", textAlign: "center" }}
                    >
                      <div style={{ fontSize: "12px", fontWeight: "600", color: "#6B7280" }}>{quarto}</div>
                      <div style={{ fontSize: "18px", fontWeight: "bold", color: "#1F2937" }}>{count}</div>
                    </div>
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "center", gap: "16px", fontSize: "13px", color: "#6b7280" }}>
                  <span>👴 Idosos: <strong>{censoData.idosos}</strong></span>
                  <span>❌ Ausentes: <strong>{censoData.ausentes}</strong></span>
                </div>
                {typeof censoData.pendentesNoEncerramento === "number" && (
                  <div style={{ fontSize: "11px", color: "#9ca3af", marginTop: "8px", textAlign: "center" }}>
                    Pendentes no encerramento: {censoData.pendentesNoEncerramento}
                  </div>
                )}
              </div>

              <div style={{ 
                backgroundColor: "#ECFDF5", 
                borderRadius: "8px", 
                padding: "10px", 
                textAlign: "center",
                fontSize: "12px",
                color: "#047857",
                marginBottom: "16px"
              }}>
                ✅ Notificações enviadas para Telegram e Email
              </div>
              
              <button
                onClick={() => setShowCensoModal(false)}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor: "#2563EB",
                  color: "white",
                  fontWeight: "600",
                  cursor: "pointer",
                }}
              >
                Fechar
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default PresenceFloater;
