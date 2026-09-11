import type { InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & {
  label?: string;
};

export default function Checkbox({ label, className = "", ...rest }: Props) {
  return (
    <label className={`inline-flex items-center gap-2 ${className}`}>
      <input type="checkbox" className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-600" {...rest} />
      {label && <span className="text-sm text-gray-800">{label}</span>}
    </label>
  );
}
