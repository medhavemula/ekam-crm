import type { SelectHTMLAttributes } from "react";

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  label?: string;
  helpText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  wrapperClassName?: string; // extra classes for the input wrapper
  selectClassName?: string;  // extra classes for the native select
  labelClassName?: string;   // extra classes for the label text
};

export default function Select({ label, helpText, error, leftIcon, className = "", wrapperClassName = "", selectClassName = "", labelClassName = "", children, ...rest }: Props) {
  return (
    <label className={`block ${className}`}>
      {label && <div className={`mb-1 text-sm text-gray-400 ${labelClassName}`}>{label}</div>}
      <div className={`relative flex items-center gap-2 border rounded px-3 py-2 min-w-0 overflow-hidden focus-within:ring-2 focus-within:ring-blue-600 ${error ? 'border-red-500' : 'border-gray-300'} ${wrapperClassName}`}>
        {leftIcon && <span className="text-gray-500" aria-hidden>{leftIcon}</span>}
        <select className={`flex-1 min-w-0 w-full outline-none bg-transparent truncate whitespace-nowrap appearance-none pr-8 ${selectClassName}`} {...rest}>
          {children}
        </select>
        <span className="pointer-events-none absolute right-3 inset-y-0 flex items-center">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-gray-400">
            <path d="M7 10l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </span>
      </div>
      {error ? (
        <div className="mt-1 text-xs text-red-600">{error}</div>
      ) : helpText ? (
        <div className="mt-1 text-xs text-gray-500">{helpText}</div>
      ) : null}
    </label>
  );
}
