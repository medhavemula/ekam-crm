import React from "react";

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void | Promise<void>;
}

interface PageHeaderProps {
  breadcrumbs: BreadcrumbItem[];
  className?: string;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ breadcrumbs, className = "" }) => {
  return (
    <div className={`mb-6 text-sm text-[var(--ov-deep-ink-2,#94A3B8)] ${className}`}>
      {breadcrumbs.map((item, index, array) => (
        <React.Fragment key={index}>
          {index > 0 && <span className="mx-2 opacity-50">›</span>}
          {index < array.length - 1 ? (
            <span 
              className="hover:text-[var(--ov-deep-ink,#F8FAFC)] cursor-pointer transition-colors" 
              onClick={item.onClick}
            >
              {item.label}
            </span>
          ) : (
            <span className="text-[var(--ov-deep-ink,#F8FAFC)] font-semibold">{item.label}</span>
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

export default PageHeader;
