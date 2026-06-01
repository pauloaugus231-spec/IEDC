import type { SVGProps } from 'react';

type IconProps = SVGProps<SVGSVGElement> & {
  size?: number;
  color?: string;
};

// Icones SVG inline para evitar problemas de imports ESM
export const Home = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    <polyline points="9 22 9 12 15 12 15 22" />
  </svg>
);

export const Search = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.35-4.35" />
  </svg>
);

export const PlusCircle = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="16" />
    <line x1="8" y1="12" x2="16" y2="12" />
  </svg>
);

export const BarChart2 = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <line x1="18" y1="20" x2="18" y2="10" />
    <line x1="12" y1="20" x2="12" y2="4" />
    <line x1="6" y1="20" x2="6" y2="14" />
  </svg>
);

export const Settings = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 1v6m0 6v6m-6-6H0m6 0h6m6 0h6" />
  </svg>
);

export const Calendar = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
    <line x1="16" y1="2" x2="16" y2="6" />
    <line x1="8" y1="2" x2="8" y2="6" />
    <line x1="3" y1="10" x2="21" y2="10" />
  </svg>
);

export const Menu = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export const X = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

export const Pin = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M12 17v5" />
    <path d="M5 17h14" />
    <path d="M9 3h6l1 7 3 4H5l3-4 1-7z" />
  </svg>
);

export const Upload = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="17 8 12 3 7 8" />
    <line x1="12" y1="3" x2="12" y2="15" />
  </svg>
);

export const FileSpreadsheet = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="8" y1="13" x2="16" y2="13" />
    <line x1="8" y1="17" x2="16" y2="17" />
    <line x1="10" y1="9" x2="10" y2="21" />
  </svg>
);

export const CheckCircle = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const XCircle = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <line x1="15" y1="9" x2="9" y2="15" />
    <line x1="9" y1="9" x2="15" y2="15" />
  </svg>
);

export const Download = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <polyline points="7 10 12 15 17 10" />
    <line x1="12" y1="15" x2="12" y2="3" />
  </svg>
);

export const RefreshCw = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="23 4 23 10 17 10" />
    <polyline points="1 20 1 14 7 14" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export const UserPlus = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <line x1="20" y1="8" x2="20" y2="14" />
    <line x1="23" y1="11" x2="17" y2="11" />
  </svg>
);

export const PlayCircle = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polygon points="10 8 16 12 10 16 10 8" />
  </svg>
);

export const StopCircle = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <rect x="9" y="9" width="6" height="6" />
  </svg>
);

export const FileDown = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <polyline points="9 15 12 18 15 15" />
  </svg>
);

export const Users = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const Clock = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <circle cx="12" cy="12" r="10" />
    <polyline points="12 6 12 12 16 14" />
  </svg>
);

export const Play = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3" />
  </svg>
);

export const Check = ({ size = 24, color = 'currentColor', ...props }: IconProps) => (
  <svg {...props} width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);
