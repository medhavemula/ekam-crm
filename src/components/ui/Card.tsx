import type { HTMLAttributes, ReactNode } from "react";

export function Card({ className = "", ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`bg-white rounded shadow-sm border border-gray-200 ${className}`} {...rest} />;
}

export function CardHeader({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <div className={`px-4 py-3 border-b border-gray-200 ${className}`}>{children}</div>;
}

export function CardBody({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <div className={`px-4 py-3 ${className}`}>{children}</div>;
}

export function CardFooter({ className = "", children }: { className?: string; children?: ReactNode }) {
  return <div className={`px-4 py-3 border-t border-gray-200 ${className}`}>{children}</div>;
}

export default Card;
