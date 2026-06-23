// src/utils.ts
export interface PessoaNomePrincipal {
  nome?: string | null;
  nome_social?: string | null;
}

export const getNomePrincipal = (pessoa?: PessoaNomePrincipal | null) => {
  if (!pessoa) return 'Pessoa não encontrada';
  return pessoa.nome_social?.trim() || pessoa.nome?.trim() || 'Nome não disponível';
};

export const PLANTAO_RESET_HOUR = 7;
export type PresenceFloaterMode = 'presenca' | 'censo';

const padDatePart = (value: number) => String(value).padStart(2, '0');

export const getLocalDateKey = (date = new Date()) => {
  return [
    date.getFullYear(),
    padDatePart(date.getMonth() + 1),
    padDatePart(date.getDate()),
  ].join('-');
};

export const getOperationalPlantaoKey = (date = new Date()) => {
  const operationalDate = new Date(date);
  if (operationalDate.getHours() < PLANTAO_RESET_HOUR) {
    operationalDate.setDate(operationalDate.getDate() - 1);
  }
  return getLocalDateKey(operationalDate);
};

export const getOperationalPlantaoKeyFromValue = (value?: string | Date | null) => {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return getOperationalPlantaoKey(date);
};

export const isCurrentOperationalPlantao = (storedPlantaoKey: string | null) => {
  return storedPlantaoKey === getOperationalPlantaoKey();
};

export const clearTriagemCensoStorage = () => {
  localStorage.removeItem('triagemEncerrada');
  localStorage.removeItem('censoData');
  localStorage.removeItem('lastTriagemDate');
  localStorage.removeItem('lastTriagemClosedAt');
};

export const getTriagemCensoStorageState = (date = new Date()) => {
  const isTriagemEncerrada = localStorage.getItem('triagemEncerrada') === 'true';
  const censoData = localStorage.getItem('censoData');
  const storedPlantaoKey = localStorage.getItem('lastTriagemDate');
  const closedAt = localStorage.getItem('lastTriagemClosedAt');
  const currentPlantaoKey = getOperationalPlantaoKey(date);
  const localDateKey = getLocalDateKey(date);
  const isBeforeResetHour = date.getHours() < PLANTAO_RESET_HOUR;

  const isLegacySameNightCenso = !closedAt && isBeforeResetHour && storedPlantaoKey === localDateKey;
  const isLegacyExpiredDayCenso = !closedAt && !isBeforeResetHour && storedPlantaoKey === localDateKey;
  const isCurrentPlantaoCenso = (storedPlantaoKey === currentPlantaoKey && !isLegacyExpiredDayCenso)
    || isLegacySameNightCenso;
  const isActive = isTriagemEncerrada && Boolean(censoData) && isCurrentPlantaoCenso;
  const shouldClear = isTriagemEncerrada && !isActive;

  return {
    mode: (isActive ? 'censo' : 'presenca') as PresenceFloaterMode,
    shouldClear,
    censoData,
    storedPlantaoKey,
    currentPlantaoKey,
  };
};
