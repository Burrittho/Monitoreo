/**
 * Sistema de tema unificado para el dashboard de monitoreo
 * Diseño minimalista, profesional y responsivo
 */

// Paleta de colores principal
export const colors = {
  // Colores primarios - azul/gris profesional
  primary: {
    50: '#f8fafc',   // Backgrounds muy claros
    100: '#f1f5f9',  // Backgrounds claros
    200: '#e2e8f0',  // Borders, dividers
    300: '#cbd5e1',  // Borders activos, placeholders
    400: '#94a3b8',  // Text secondary
    500: '#64748b',  // Text primary
    600: '#475569',  // Headings
    700: '#334155',  // Headings importantes
    800: '#1e293b',  // Dark backgrounds
    900: '#0f172a',  // Darkest backgrounds
  },
  
  // Estados del sistema
  status: {
    success: {
      light: '#dcfce7',    // bg-green-100
      DEFAULT: '#16a34a',  // text-green-600
      dark: '#15803d',     // text-green-700
    },
    warning: {
      light: '#fef3c7',    // bg-yellow-100
      DEFAULT: '#d97706',  // text-yellow-600
      dark: '#b45309',     // text-yellow-700
    },
    error: {
      light: '#fee2e2',    // bg-red-100
      DEFAULT: '#dc2626',  // text-red-600
      dark: '#b91c1c',     // text-red-700
    },
    info: {
      light: '#dbeafe',    // bg-blue-100
      DEFAULT: '#2563eb',  // text-blue-600
      dark: '#1d4ed8',     // text-blue-700
    },
    neutral: {
      light: '#f3f4f6',    // bg-gray-100
      DEFAULT: '#6b7280',  // text-gray-500
      dark: '#4b5563',     // text-gray-600
    }
  },

  // Gradientes para elementos destacados
  gradients: {
    primary: 'from-slate-600 to-slate-700',
    success: 'from-green-600 to-emerald-600',
    warning: 'from-yellow-500 to-orange-500',
    error: 'from-red-600 to-rose-600',
    info: 'from-blue-600 to-indigo-600',
  }
};

// Tipografía
export const typography = {
  // Font families
  fontFamily: {
    sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
    mono: ['JetBrains Mono', 'Monaco', 'Consolas', 'monospace'],
  },
  
  // Font sizes (mobile-first approach)
  fontSize: {
    xs: ['0.75rem', { lineHeight: '1rem' }],      // 12px
    sm: ['0.875rem', { lineHeight: '1.25rem' }],  // 14px
    base: ['1rem', { lineHeight: '1.5rem' }],     // 16px
    lg: ['1.125rem', { lineHeight: '1.75rem' }],  // 18px
    xl: ['1.25rem', { lineHeight: '1.75rem' }],   // 20px
    '2xl': ['1.5rem', { lineHeight: '2rem' }],    // 24px
    '3xl': ['1.875rem', { lineHeight: '2.25rem' }], // 30px
  },
  
  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  }
};

// Espaciado y layout
export const spacing = {
  // Espaciado común
  xs: '0.25rem',   // 4px
  sm: '0.5rem',    // 8px
  md: '1rem',      // 16px
  lg: '1.5rem',    // 24px
  xl: '2rem',      // 32px
  '2xl': '3rem',   // 48px
  
  // Container máximo
  maxWidth: {
    container: '1400px',
  },
  
  // Responsive breakpoints
  screens: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  }
};

// Sombras y efectos
export const effects = {
  // Sombras sutiles
  boxShadow: {
    sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
    DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
    lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  },
  
  // Border radius
  borderRadius: {
    sm: '0.25rem',   // 4px
    DEFAULT: '0.5rem', // 8px
    md: '0.75rem',   // 12px
    lg: '1rem',      // 16px
    xl: '1.5rem',    // 24px
  },
  
  // Transiciones
  transition: {
    fast: '150ms ease-in-out',
    DEFAULT: '200ms ease-in-out',
    slow: '300ms ease-in-out',
  }
};

// Componentes base reutilizables
export const components = {
  // Card base
  card: `
    bg-white dark:bg-slate-800 
    border border-slate-200 dark:border-slate-700 
    rounded-lg shadow-sm 
    transition-all duration-200 
    hover:shadow-md
  `,
  
  // Panel con gradiente
  gradientPanel: `
    bg-gradient-to-br from-slate-50 to-slate-100 
    dark:from-slate-800 dark:to-slate-900 
    border border-slate-200 dark:border-slate-700 
    rounded-lg
  `,
  
  // Button primary
  buttonPrimary: `
    inline-flex items-center justify-center 
    px-4 py-2 text-sm font-medium 
    text-white bg-gradient-to-r from-slate-600 to-slate-700 
    border border-transparent rounded-md 
    hover:from-slate-700 hover:to-slate-800 
    focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 
    disabled:opacity-50 disabled:cursor-not-allowed 
    transition-all duration-200
  `,
  
  // Button secondary
  buttonSecondary: `
    inline-flex items-center justify-center 
    px-4 py-2 text-sm font-medium 
    text-slate-700 dark:text-slate-300 
    bg-white dark:bg-slate-800 
    border border-slate-300 dark:border-slate-600 
    rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 
    focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2 
    transition-all duration-200
  `,
  
  // Input base
  input: `
    block w-full px-3 py-2 
    text-slate-900 dark:text-slate-100 
    bg-white dark:bg-slate-800 
    border border-slate-300 dark:border-slate-600 
    rounded-md placeholder-slate-400 
    focus:outline-none focus:ring-2 focus:ring-slate-500 focus:border-slate-500 
    disabled:opacity-50 disabled:cursor-not-allowed 
    transition-colors duration-200
  `,
  
  // Badge base
  badge: `
    inline-flex items-center 
    px-2.5 py-0.5 
    text-xs font-medium 
    rounded-full 
    transition-colors duration-200
  `,
};

// Clases utilitarias específicas del dominio
export const utilities = {
  // Estados de conectividad
  connectivity: {
    online: 'text-green-600 bg-green-100',
    offline: 'text-red-600 bg-red-100',
    warning: 'text-yellow-600 bg-yellow-100',
    unknown: 'text-gray-600 bg-gray-100',
  },
  
  // Prioridades
  priority: {
    low: 'text-blue-600 bg-blue-100',
    medium: 'text-yellow-600 bg-yellow-100', 
    high: 'text-orange-600 bg-orange-100',
    critical: 'text-red-600 bg-red-100 font-semibold',
  },
  
  // Estados de reportes
  reportStatus: {
    open: 'text-red-600 bg-red-100',
    closed: 'text-green-600 bg-green-100',
    concluded: 'text-blue-600 bg-blue-100',
  }
};

// Sistema de botones profesionales
export const buttons = {
  // Primary - Estilo principal profesional
  primary: `
    inline-flex items-center justify-center
    px-4 py-2 text-sm font-medium
    text-white bg-slate-900
    border border-transparent rounded-lg
    hover:bg-slate-800 focus:outline-none
    focus:ring-2 focus:ring-slate-500 focus:ring-offset-2
    transition-all duration-200
    shadow-sm hover:shadow-md
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  
  // Secondary - Estilo secundario con borde
  secondary: `
    inline-flex items-center justify-center
    px-4 py-2 text-sm font-medium
    text-slate-700 bg-white
    border border-slate-300 rounded-lg
    hover:bg-slate-50 hover:border-slate-400
    focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700
  `,
  
  // Success - Verde profesional
  success: `
    inline-flex items-center justify-center
    px-4 py-2 text-sm font-medium
    text-white bg-green-600
    border border-transparent rounded-lg
    hover:bg-green-700 focus:outline-none
    focus:ring-2 focus:ring-green-500 focus:ring-offset-2
    transition-all duration-200
    shadow-sm hover:shadow-md
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  
  // Danger - Rojo profesional
  danger: `
    inline-flex items-center justify-center
    px-4 py-2 text-sm font-medium
    text-white bg-red-600
    border border-transparent rounded-lg
    hover:bg-red-700 focus:outline-none
    focus:ring-2 focus:ring-red-500 focus:ring-offset-2
    transition-all duration-200
    shadow-sm hover:shadow-md
    disabled:opacity-50 disabled:cursor-not-allowed
  `,
  
  // Ghost - Minimalista
  ghost: `
    inline-flex items-center justify-center
    px-4 py-2 text-sm font-medium
    text-slate-600 bg-transparent
    border border-transparent rounded-lg
    hover:bg-slate-100 hover:text-slate-900
    focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100
  `,
  
  // Icon - Solo iconos
  icon: `
    inline-flex items-center justify-center
    w-8 h-8 text-slate-600 bg-transparent
    border border-transparent rounded-lg
    hover:bg-slate-100 hover:text-slate-900
    focus:outline-none focus:ring-2 focus:ring-slate-500 focus:ring-offset-2
    transition-all duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
    dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100
  `
};

// Sistema de iconos profesionales
export const icons = {
  // Tamaños base
  base: 'w-4 h-4',
  sm: 'w-3 h-3', 
  lg: 'w-5 h-5',
  xl: 'w-6 h-6',
  
  // Colores semánticos
  neutral: 'text-slate-500 dark:text-slate-400',
  success: 'text-green-600 dark:text-green-400',
  warning: 'text-amber-600 dark:text-amber-400',
  danger: 'text-red-600 dark:text-red-400',
  info: 'text-blue-600 dark:text-blue-400',
  
  // Estados específicos
  status: {
    online: 'text-green-500',
    offline: 'text-red-500',
    warning: 'text-amber-500',
    unknown: 'text-slate-400'
  },
  
  // Combinaciones comunes
  button: 'w-4 h-4 mr-2', // Para iconos en botones
  action: 'w-4 h-4 cursor-pointer hover:scale-110 transition-transform', // Para acciones
  indicator: 'w-2 h-2 rounded-full' // Para indicadores de estado
};

// Configuración para optimización de ancho de banda
export const performance = {
  // Lazy loading
  lazyLoading: true,
  
  // Debounce para filtros
  debounceMs: 300,
  
  // Paginación por defecto
  defaultPageSize: 10,
  pageSizeOptions: [5, 10, 25, 50],
  
  // Refresh intervals
  refreshIntervals: {
    realTime: 5000,   // 5 segundos para datos críticos
    normal: 30000,    // 30 segundos para datos normales
    slow: 300000,     // 5 minutos para datos históricos
  },
  
  // Compresión de imágenes
  imageOptimization: {
    maxWidth: 1920,
    quality: 85,
    format: 'webp',
  }
};
