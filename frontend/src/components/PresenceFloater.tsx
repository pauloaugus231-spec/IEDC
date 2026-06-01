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
      <div className="presence-floater-root">
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
            className={`presence-floater-button ${isCensoMode ? 'censo' : pendentesCount > 0 ? 'pending' : 'ready'}`}
            aria-label={isCensoMode ? 'Abrir censo noturno' : 'Abrir controle de presença'}
          >
            <div className="presence-floater-icon">
              {!isCensoMode && totalCount > 0 && (
                <svg className="presence-progress-ring" width="46" height="46" aria-hidden="true">
                  <circle cx="23" cy="23" r="20" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                  <circle
                    cx="23"
                    cy="23"
                    r="20"
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
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                  <line x1="16" y1="2" x2="16" y2="6"></line>
                  <line x1="8" y1="2" x2="8" y2="6"></line>
                  <line x1="3" y1="10" x2="21" y2="10"></line>
                </svg>
              ) : pendentesCount > 0 ? (
                <span className="presence-floater-count">{pendentesCount}</span>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              )}
            </div>

            {!isMobile && (
              <div className="presence-floater-copy">
                <span>{isCensoMode ? "Censo noturno" : "Presença"}</span>
                <strong>
                  {isCensoMode 
                    ? `${censoData?.total ?? 0} pessoas` 
                    : (pendentesCount > 0 ? `${pendentesCount} pendentes` : "Tudo pronto")
                  }
                </strong>
              </div>
            )}

            {!isMobile && (
              <svg className="presence-floater-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"></polyline>
              </svg>
            )}
          </motion.button>
        </AnimatePresence>

        <AnimatePresence>
          {showTooltip && isCensoMode && censoData && !isMobile && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.9 }}
              className="presence-tooltip"
            >
              <div className="presence-tooltip-head">
                <span>Censo noturno</span>
                <h4>{censoData.data}</h4>
              </div>
              
              <div className="presence-tooltip-body">
                <strong>Total: {censoData.total}</strong>
                <div className="presence-count-grid">
                  {Object.entries(censoData.porQuarto).map(([quarto, count]) => (
                    <div key={quarto}>
                      <span>{quarto}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
                <div className="presence-summary-line">
                  Idosos: {censoData.idosos} • Ausentes: {censoData.ausentes}
                </div>
              </div>
              
              <div className="presence-tooltip-footer">
                Clique para ver detalhes
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showCensoModal && isCensoMode && censoData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="presence-modal-backdrop"
            onClick={() => setShowCensoModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="presence-modal"
              onClick={e => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-labelledby="presence-modal-title"
            >
              <div className="presence-modal-head">
                <span>Plantão encerrado</span>
                <h3 id="presence-modal-title">Censo noturno</h3>
                <p>{censoData.data}</p>
              </div>
              
              <div className="presence-modal-body">
                <strong>Total: {censoData.total} pessoas</strong>
                <div className="presence-count-grid">
                  {Object.entries(censoData.porQuarto).map(([quarto, count]) => (
                    <div key={quarto}>
                      <span>{quarto}</span>
                      <strong>{count}</strong>
                    </div>
                  ))}
                </div>
                <div className="presence-summary-line">
                  <span>Idosos: <strong>{censoData.idosos}</strong></span>
                  <span>Ausentes: <strong>{censoData.ausentes}</strong></span>
                </div>
                {typeof censoData.pendentesNoEncerramento === "number" && (
                  <div className="presence-muted-note">
                    Pendentes no encerramento: {censoData.pendentesNoEncerramento}
                  </div>
                )}
              </div>

              <div className="presence-success-note">
                Notificações registradas para Telegram e Email.
              </div>
              
              <button
                onClick={() => setShowCensoModal(false)}
                className="ds-button presence-modal-close"
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
