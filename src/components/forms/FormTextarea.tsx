import React from "react";
import type { TextareaHTMLAttributes } from "react";

interface FormTextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  isRequired?: boolean;
}

export const FormTextarea: React.FC<FormTextareaProps> = ({
  label,
  error,
  isRequired = false,
  className = "",
  rows = 3,
  onChange,
  onBlur,
  ...rest
}) => {
  return (
    <div className="w-full">
      <label className="block text-xs text-[var(--field-label)] mb-1.5">
        {label} {isRequired && <span className="text-[var(--field-invalid)]">*</span>}
      </label>
      <textarea
        rows={rows}
        className={`w-full rounded-[var(--field-radius)] bg-[var(--field-bg)] border ${
          error ? "border-[color:var(--field-invalid)]" : "border-[color:var(--field-border)]"
        } px-3 py-2.5 text-[var(--field-ink)] placeholder:text-[var(--field-placeholder)] focus:outline-none focus:border-[color:var(--field-border-focus)] focus:ring-1 focus:ring-[color:var(--field-border-focus)] transition-colors resize-none ${className}`}
        style={{ minHeight: rows === 3 ? '44px' : undefined }}
        onChange={(e) => {
          let v = e.target.value;
          if (typeof v === "string" && v.startsWith(" ")) v = v.replace(/^\s+/, "");
          if (onChange) {
            const synthetic = { ...e, target: { ...e.target, value: v } } as React.ChangeEvent<HTMLTextAreaElement>;
            onChange(synthetic);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === " " && (e.currentTarget.value ?? "").length === 0) {
            e.preventDefault();
          }
          if (rest.onKeyDown) rest.onKeyDown(e);
        }}
        onBlur={(e) => {
          let v = e.target.value;
          if (typeof v === "string") v = v.replace(/^\s+/, "").replace(/\s+$/, "");
          if (onBlur) {
            const synthetic = { ...e, target: { ...e.target, value: v } } as React.FocusEvent<HTMLTextAreaElement>;
            onBlur(synthetic);
          }
        }}
        {...rest}
      />
      {error && <p className="text-xs text-[var(--field-invalid)] mt-1">{error}</p>}
    </div>
  );
};

export default FormTextarea;
