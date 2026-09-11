import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
};

export default function Switch({ label, className = "", ...rest }: Props) {
  return (
    <label className={`inline-flex items-center gap-2 ${className}`}>
      <span className="relative inline-flex h-6 w-10 items-center">
        <input type="checkbox" className="peer sr-only" {...rest} />
        <span className="h-6 w-10 rounded-full bg-gray-300 peer-checked:bg-blue-600 transition-colors"></span>
        <span className="absolute left-1 top-1 h-4 w-4 rounded-full bg-white peer-checked:translate-x-4 transition-transform"></span>
      </span>
      {label && <span className="text-sm text-gray-800">{label}</span>}
    </label>
  );
}
