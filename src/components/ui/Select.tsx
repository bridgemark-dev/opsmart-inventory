import { forwardRef } from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helpText?: string;
  options: { value: string; label: string }[];
  placeholder?: string;
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helpText, required, options, placeholder, className = '', id, ...props }, ref) => {
    const selectId = id || label?.toLowerCase().replace(/\s+/g, '-');

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={selectId}>
            {label}
            {required && <span className="required">*</span>}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`form-control ${error ? 'error' : ''} ${className}`.trim()}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        {error && <div className="form-error visible">{error}</div>}
        {helpText && !error && <div className="form-hint">{helpText}</div>}
      </div>
    );
  }
);

Select.displayName = 'Select';
