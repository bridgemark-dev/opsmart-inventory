import { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helpText?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helpText, required, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={inputId}>
            {label}
            {required && <span className="required">*</span>}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`form-control ${error ? 'error' : ''} ${className}`.trim()}
          {...props}
        />
        {error && <div className="form-error visible">{error}</div>}
        {helpText && !error && <div className="form-hint">{helpText}</div>}
      </div>
    );
  }
);

Input.displayName = 'Input';
