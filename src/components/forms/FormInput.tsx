import React from "react";
import type { InputHTMLAttributes } from "react";
import { FiEye, FiEyeOff } from "react-icons/fi";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  isRequired?: boolean;
  showPasswordToggle?: boolean;
}

export const FormInput: React.FC<FormInputProps> = ({
  label,
  error,
  isRequired = false,
  className = "",
  type = "text",
  showPasswordToggle = false,
  onChange,
  onBlur,
  ...rest
}) => {
  const [visible, setVisible] = React.useState(false);
  const isPassword = type === "password" && showPasswordToggle;
  const effectiveType = isPassword ? (visible ? "text" : "password") : type;
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    // Block spaces only at the beginning of input
    if (v.startsWith(' ') && v.trimStart() !== v) {
      // Remove leading spaces but keep the rest
      v = v.trimStart();
      const syntheticEvent = { ...e, target: { ...e.target, value: v } } as React.ChangeEvent<HTMLInputElement>;
      if (onChange) {
        onChange(syntheticEvent);
      }
    } else {
      if (onChange) {
        onChange(e);
      }
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Block spaces only at the beginning of input
    if (e.key === ' ') {
      const input = e.currentTarget;
      const cursorPosition = input.selectionStart || 0;
      
      // Only block space if cursor is at the beginning (position 0)
      if (cursorPosition === 0) {
        e.preventDefault();
        return;
      }
    }
    if (rest.onKeyDown) rest.onKeyDown(e);
  };
  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    let v = e.target.value;
    if (typeof v === "string") v = v.replace(/^\s+/, "").replace(/\s+$/, "");
    if (onBlur) {
      const synthetic = { ...e, target: { ...e.target, value: v } } as React.FocusEvent<HTMLInputElement>;
      onBlur(synthetic);
    }
  };
  return (
    <div className="w-full">
      {/* The control never adopted the --field-* tokens that FormSelect and
          DatePicker use, so it stayed a dark slab on every theme. The :root
          values are the literal colours that were hardcoded here, so unthemed
          pages render exactly as before. */}
      <label className="block text-xs text-[var(--field-label)] mb-1.5">
        {label} {isRequired && <span className="text-[var(--field-invalid)]">*</span>}
      </label>
      <div className="relative">
        <input
          type={effectiveType}
          className={`w-full h-11 rounded-[var(--field-radius)] bg-[var(--field-bg)] border ${
            error ? "border-[color:var(--field-invalid)]" : "border-[color:var(--field-border)]"
          } px-3 ${isPassword ? "pr-10" : ""} py-2.5 text-[var(--field-ink)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:border-[color:var(--field-border-focus)] focus:ring-1 focus:ring-[color:var(--field-border-focus)] disabled:cursor-not-allowed disabled:bg-[var(--ov-fill-subtle)] disabled:text-[var(--ov-ink-3)] transition-colors ${className}`}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          {...rest}
        />
        {isPassword && (
          <button
            type="button"
            aria-label={visible ? "Hide password" : "Show password"}
            onClick={() => setVisible((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-[var(--ov-ink-3)] hover:text-[var(--field-ink)]"
          >
            {visible ? <FiEye size={20} /> : <FiEyeOff size={20} />}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-[var(--field-invalid)] mt-1">{error}</p>}
    </div>
  );
};

export default FormInput;
