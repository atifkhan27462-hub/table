import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  href?: string;
  active?: boolean;
}

export interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  showHome?: boolean;
  className?: string;
}

export const Breadcrumbs: React.FC<BreadcrumbsProps> = ({
  items,
  showHome = true,
  className = '',
}) => {
  return (
    <nav aria-label="Breadcrumb" className={`flex items-center text-xs text-slate-500 dark:text-slate-400 ${className}`}>
      <ol className="flex items-center space-x-1.5">
        {showHome && (
          <li className="inline-flex items-center">
            <span className="flex items-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200">
              <Home className="h-3.5 w-3.5" />
            </span>
          </li>
        )}
        {items.map((item, index) => (
          <li key={index} className="inline-flex items-center">
            {(showHome || index > 0) && (
              <ChevronRight className="h-3.5 w-3.5 text-slate-300 dark:text-slate-600 mx-1 shrink-0" />
            )}
            {item.active ? (
              <span className="font-semibold text-slate-900 dark:text-slate-100">{item.label}</span>
            ) : item.href ? (
              <a
                href={item.href}
                className="hover:text-slate-900 dark:hover:text-slate-200 transition-colors"
              >
                {item.label}
              </a>
            ) : (
              <span>{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
};
