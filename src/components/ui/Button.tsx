import type { ButtonHTMLAttributes, ReactNode } from "react";

const base = "inline-flex items-center justify-center rounded transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed";
const sizes = {
  sm: "px-2.5 py-1.5 text-sm",
  md: "px-4 py-2 text-sm",
  lg: "px-5 py-2.5 text-base",
} as const;
const variants = {
  primary: "bg-blue-600 text-white hover:bg-blue-700 focus:ring-blue-600",
  secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300 focus:ring-gray-400",
  ghost: "bg-transparent hover:bg-gray-100 text-gray-900 focus:ring-gray-300",
  link: "bg-transparent text-blue-600 underline-offset-2 hover:underline focus:ring-blue-600",
} as const;

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  size?: keyof typeof sizes;
  variant?: keyof typeof variants;
  loading?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
};

export function Button({ size = "md", variant = "primary", loading, leftIcon, rightIcon, children, className = "", ...rest }: ButtonProps) {
  return (
    <button className={`${base} ${sizes[size]} ${variants[variant]} ${className}`} {...rest}>
      {leftIcon && <span className="mr-2" aria-hidden>{leftIcon}</span>}
      <span>{loading ? "Loading..." : children}</span>
      {rightIcon && <span className="ml-2" aria-hidden>{rightIcon}</span>}
    </button>
  );
}

export default Button;
