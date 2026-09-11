import type { InputHTMLAttributes, ReactNode } from "react";
import React from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label?: string;
  helpText?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  passwordToggle?: boolean;
};

export default function TextField({ label, helpText, error, leftIcon, rightIcon, passwordToggle, type = "text", className = "", ...rest }: Props) {
  const [show, setShow] = React.useState(false);
  const isPassword = type === "password";
  const effectiveType = isPassword && passwordToggle ? (show ? "text" : "password") : type;

  return (
    <label className={`block ${className}`}>
      {label && <div className="mb-1 text-sm text-gray-300">{label}</div>}
      <div className={`flex items-center gap-2 border rounded px-3 py-2 bg-[#21272D] ${error ? 'border-red-500' : 'border-gray-700'} focus-within:ring-1 focus-within:ring-orange-500`}>
        {leftIcon && <span className="text-gray-400" aria-hidden>{leftIcon}</span>}
        <input type={effectiveType} className="flex-1 outline-none bg-transparent text-white placeholder:text-gray-500" {...rest} />
        {isPassword && passwordToggle && (
          <button type="button" onClick={() => setShow((s) => !s)} className="text-xs text-gray-400">{show ? 'Hide' : 'Show'}</button>
        )}
        {rightIcon && <span className="text-gray-400" aria-hidden>{rightIcon}</span>}
      </div>
      {error ? (
        <div className="mt-1 text-xs text-red-400">{error}</div>
      ) : helpText ? (
        <div className="mt-1 text-xs text-gray-400">{helpText}</div>
      ) : null}
    </label>
  );
}
