import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', loading, fullWidth, className = '', children, disabled, ...props }, ref) => {
    const variantClass = `btn-${variant}`;
    const sizeClass = size === 'sm' ? 'btn-sm' : '';
    const widthClass = fullWidth ? 'btn-full' : '';

    return (
      <button
        ref={ref}
        className={`btn ${variantClass} ${sizeClass} ${widthClass} ${className}`.trim()}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? 'Loading…' : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
