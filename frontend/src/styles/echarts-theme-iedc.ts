/**
 * IEDC echarts theme tokens.
 *
 * Palette source: frontend/src/styles/design-system-core.css
 * Usage: import and apply colors/options to echarts series/components.
 */

// --- Primary palette ---
export const IEDC_BLUE_950 = '#06235c';
export const IEDC_BLUE_900 = '#073074';
export const IEDC_BLUE_800 = '#0041aa';
export const IEDC_BLUE_700 = '#0c56c8';
export const IEDC_BLUE_600 = '#256fd4';
export const IEDC_BLUE_400 = '#4A90C0';
export const IEDC_BLUE_100 = '#e8f1ff';
export const IEDC_BLUE_050 = '#f4f8ff';

export const IEDC_GREEN_700 = '#0f7a45';
export const IEDC_GREEN_100 = '#e8f7ee';

export const IEDC_AMBER_700 = '#8f5b10';
export const IEDC_AMBER_100 = '#fff4df';

export const IEDC_RED_700 = '#b42318';
export const IEDC_RED_100 = '#fee4e2';

export const IEDC_GOLD = '#8B6C3E';
export const IEDC_GOLD_LIGHT = '#f7b044';

// --- Semantic text/background ---
export const IEDC_TEXT = '#172033';
export const IEDC_MUTED = '#68778e';
export const IEDC_SUBTLE = '#8a97aa';
export const IEDC_SURFACE = '#ffffff';
export const IEDC_LINE = '#dfe7f2';
export const IEDC_LINE_SOFT = '#edf2f7';

// --- Chart color cycles ---
export const CHART_COLORS_PRIMARY = [
  IEDC_BLUE_800,   // #0041aa
  IEDC_BLUE_600,   // #256fd4
  IEDC_GOLD_LIGHT, // #f7b044
  IEDC_GREEN_700,  // #0f7a45
  IEDC_RED_700,    // #b42318
  IEDC_BLUE_400,   // #4A90C0
  IEDC_GOLD,       // #8B6C3E
  IEDC_BLUE_950,   // #06235c
];

export const CHART_COLORS_GENERO = ['#3B82F6', '#EC4899', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'];

export const CHART_COLORS_RACA: Record<string, string> = {
  Parda: '#F59E0B',
  Preta: '#1F2937',
  Branca: '#E5E7EB',
  Amarela: '#FCD34D',
  Indígena: '#10B981',
  'Não informado': '#9CA3AF',
};

export const CHART_COLORS_CRECHE_RACA: Record<string, string> = {
  Branca: '#d7dee8',
  Parda: '#c68145',
  Preta: '#1f2937',
  Negra: '#1f2937',
  Indígena: '#0f9d58',
  Amarela: '#f4c542',
  'Não informado': '#9ca3af',
};

// --- Shared tooltip style ---
export const TOOLTIP_STYLE = {
  backgroundColor: IEDC_TEXT,
  borderColor: 'rgba(255, 255, 255, 0.12)',
  borderRadius: 14,
  padding: 12,
  textStyle: {
    color: IEDC_SURFACE,
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: 12,
    fontWeight: 800,
  },
};

// --- Shared axis/grid defaults ---
export const AXIS_LABEL_STYLE = {
  color: IEDC_MUTED,
  fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
  fontSize: 11,
  fontWeight: 700 as const,
};

export const AXIS_LABEL_DARK = {
  ...AXIS_LABEL_STYLE,
  color: IEDC_TEXT,
  fontSize: 12,
  fontWeight: 800 as const,
};

export const GRID_LINE_STYLE = {
  color: 'rgba(104, 119, 142, 0.12)',
  type: 'solid' as const,
};

// --- Shared legend defaults ---
export const LEGEND_STYLE = {
  icon: 'circle',
  itemWidth: 8,
  itemHeight: 8,
  textStyle: {
    color: '#526174',
    fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
    fontSize: 12,
    fontWeight: 800 as const,
  },
};

// --- Nivo-equivalent theme for radar ---
export const NIVO_COMPAT = {
  lineColor: IEDC_BLUE_800,
  areaColor: 'rgba(0, 65, 170, 0.24)',
  dotColor: IEDC_GOLD_LIGHT,
  dotBorder: IEDC_SURFACE,
  gridColor: 'rgba(104, 119, 142, 0.12)',
  labelColor: '#526178',
};
