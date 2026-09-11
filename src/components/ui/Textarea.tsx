import type { TextareaHTMLAttributes } from "react";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label?: string;
  helpText?: string;
  error?: string;
};

export default function Textarea({ label, helpText, error, className = "", ...rest }: Props) {
  return (
    <label className={`block ${className}`}>
      {label && <div className="mb-1 text-sm text-gray-700">{label}</div>}
      <textarea className={`w-full border rounded px-3 py-2 focus:ring-2 focus:ring-blue-600 ${error ? 'border-red-500' : 'border-gray-300'}`} {...rest} />
      {error ? (
        <div className="mt-1 text-xs text-red-600">{error}</div>
      ) : helpText ? (
        <div className="mt-1 text-xs text-gray-500">{helpText}</div>
      ) : null}
    </label>
  );
}
