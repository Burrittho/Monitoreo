import React from 'react';

/**
 * Botón primario unificado
 */
export const Button = ({ 
  children, 
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  icon,
  iconPosition = 'left',
  className = '',
  ...props 
}) => {
  const baseClasses = `
    inline-flex items-center justify-center
    font-medium rounded-md transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-50 disabled:cursor-not-allowed
  `;

  const variants = {
    primary: `
      text-white bg-gradient-to-r from-slate-600 to-slate-700
      hover:from-slate-700 hover:to-slate-800
      focus:ring-slate-500
      shadow-sm hover:shadow-md
    `,
    secondary: `
      text-slate-700 dark:text-slate-300
      bg-white dark:bg-slate-800
      border border-slate-300 dark:border-slate-600
      hover:bg-slate-50 dark:hover:bg-slate-700
      focus:ring-slate-500
    `,
    success: `
      text-white bg-gradient-to-r from-green-600 to-emerald-600
      hover:from-green-700 hover:to-emerald-700
      focus:ring-green-500
      shadow-sm hover:shadow-md
    `,
    warning: `
      text-white bg-gradient-to-r from-yellow-500 to-orange-500
      hover:from-yellow-600 hover:to-orange-600
      focus:ring-yellow-500
      shadow-sm hover:shadow-md
    `,
    danger: `
      text-white bg-gradient-to-r from-red-600 to-rose-600
      hover:from-red-700 hover:to-rose-700
      focus:ring-red-500
      shadow-sm hover:shadow-md
    `,
    ghost: `
      text-slate-600 dark:text-slate-400
      hover:text-slate-900 dark:hover:text-slate-100
      hover:bg-slate-100 dark:hover:bg-slate-800
      focus:ring-slate-500
    `
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2 text-sm',
    lg: 'px-6 py-3 text-base',
    xl: 'px-8 py-4 text-lg'
  };

  const iconClasses = {
    sm: 'w-3 h-3',
    md: 'w-4 h-4',
    lg: 'w-5 h-5',
    xl: 'w-6 h-6'
  };

  return (
    <button
      className={`
        ${baseClasses}
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      disabled={disabled || loading}
      {...props}
    >
      {loading && (
        <svg 
          className={`animate-spin ${iconClasses[size]} ${iconPosition === 'left' ? 'mr-2' : 'ml-2'}`}
          fill="none" 
          viewBox="0 0 24 24"
        >
          <circle 
            className="opacity-25" 
            cx="12" 
            cy="12" 
            r="10" 
            stroke="currentColor" 
            strokeWidth="4"
          />
          <path 
            className="opacity-75" 
            fill="currentColor" 
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      
      {icon && !loading && iconPosition === 'left' && (
        <span className={`${iconClasses[size]} mr-2`}>
          {icon}
        </span>
      )}
      
      {children}
      
      {icon && !loading && iconPosition === 'right' && (
        <span className={`${iconClasses[size]} ml-2`}>
          {icon}
        </span>
      )}
    </button>
  );
};

/**
 * Grupo de botones para filtros
 */
export const ButtonGroup = ({ 
  children, 
  className = '',
  orientation = 'horizontal' 
}) => {
  const orientationClasses = {
    horizontal: 'flex flex-row',
    vertical: 'flex flex-col'
  };

  return (
    <div className={`${orientationClasses[orientation]} ${className}`}>
      {React.Children.map(children, (child, index) => {
        if (!React.isValidElement(child)) return child;
        
        const isFirst = index === 0;
        const isLast = index === React.Children.count(children) - 1;
        
        let roundedClasses = '';
        if (orientation === 'horizontal') {
          if (isFirst) roundedClasses = 'rounded-l-md rounded-r-none';
          else if (isLast) roundedClasses = 'rounded-r-md rounded-l-none';
          else roundedClasses = 'rounded-none';
        } else {
          if (isFirst) roundedClasses = 'rounded-t-md rounded-b-none';
          else if (isLast) roundedClasses = 'rounded-b-md rounded-t-none';
          else roundedClasses = 'rounded-none';
        }

        return React.cloneElement(child, {
          className: `${child.props.className || ''} ${roundedClasses} ${
            !isFirst ? (orientation === 'horizontal' ? '-ml-px' : '-mt-px') : ''
          }`
        });
      })}
    </div>
  );
};

/**
 * Input de texto unificado
 */
export const Input = React.forwardRef(({ 
  label,
  error,
  helper,
  icon,
  iconPosition = 'left',
  size = 'md',
  className = '',
  ...props 
}, ref) => {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && iconPosition === 'left' && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className={`text-slate-400 ${iconSizes[size]}`}>
              {icon}
            </span>
          </div>
        )}
        
        <input
          ref={ref}
          className={`
            input-base
            ${sizes[size]}
            ${icon && iconPosition === 'left' ? 'pl-10' : ''}
            ${icon && iconPosition === 'right' ? 'pr-10' : ''}
            ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
          `}
          {...props}
        />
        
        {icon && iconPosition === 'right' && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <span className={`text-slate-400 ${iconSizes[size]}`}>
              {icon}
            </span>
          </div>
        )}
      </div>
      
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

/**
 * Select unificado
 */
export const Select = React.forwardRef(({ 
  label,
  error,
  helper,
  size = 'md',
  className = '',
  children,
  ...props 
}, ref) => {
  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-3 text-base'
  };

  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}
      
      <select
        ref={ref}
        className={`
          input-base
          ${sizes[size]}
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
        `}
        {...props}
      >
        {children}
      </select>
      
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      )}
    </div>
  );
});

Select.displayName = 'Select';

/**
 * Textarea unificado
 */
export const Textarea = React.forwardRef(({ 
  label,
  error,
  helper,
  className = '',
  rows = 3,
  ...props 
}, ref) => {
  return (
    <div className={className}>
      {label && (
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
          {label}
        </label>
      )}
      
      <textarea
        ref={ref}
        rows={rows}
        className={`
          input-base
          ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500' : ''}
        `}
        {...props}
      />
      
      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
      
      {helper && !error && (
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          {helper}
        </p>
      )}
    </div>
  );
});

Textarea.displayName = 'Textarea';
